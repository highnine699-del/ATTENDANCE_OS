/**
 * Attendance OS — Cloudflare Worker Scrape Proxy
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 * 
 * Stateless proxy for portal login and attendance scraping.
 * Credentials are never persisted - request-scoped only.
 */

const PORTAL_URL = "https://att3.lmu.edu.ng";
const LOGIN_URL = `${PORTAL_URL}/login`;
const ATTENDANCE_URL = `${PORTAL_URL}/student/attendance`;
const ALLOWED_ORIGINS = [
  "https://highnine699-del.github.io",
  "http://localhost"
];

// Rate limiting: 6 requests per IP per 60 seconds
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW = 60; // seconds

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleCors(request);
    }

    // Only accept POST /api/scrape
    if (request.method !== "POST" || new URL(request.url).pathname !== "/api/scrape") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Check origin
    const origin = request.headers.get("Origin");
    if (!isOriginAllowed(origin)) {
      return new Response("Origin not allowed", { status: 403 });
    }

    try {
      const body = await request.json();
      let { username, password } = body;

      // Validate credentials
      if (!username || !password || typeof username !== "string" || typeof password !== "string") {
        return corsResponse(origin, JSON.stringify({
          success: false,
          error: "Username and password required"
        }), 400);
      }

      // Rate limiting by IP
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      const rateLimitResult = await checkRateLimit(env, clientIP);
      if (!rateLimitResult.allowed) {
        return corsResponse(origin, JSON.stringify({
          success: false,
          error: "Too many requests. Please wait before trying again."
        }), 429);
      }

      // Perform login and scrape
      const result = await loginAndScrape(username, password);

      // Explicitly clear credentials
      username = null;
      password = null;

      return corsResponse(origin, JSON.stringify(result), result.success ? 200 : 401);

    } catch (error) {
      // Generic error - never leak details
      return corsResponse(origin, JSON.stringify({
        success: false,
        error: "Sync failed, try again"
      }), 500);
    }
  }
};

function handleCors(request) {
  const origin = request.headers.get("Origin");
  if (!isOriginAllowed(origin)) {
    return new Response("Origin not allowed", { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    }
  });
}

function corsResponse(origin, body, status) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed));
}

async function checkRateLimit(env, clientIP) {
  if (!env.RATE_LIMIT) {
    // If KV not configured, allow all (fallback)
    return { allowed: true };
  }

  const key = `ratelimit:${clientIP}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW;

  try {
    const existing = await env.RATE_LIMIT.get(key);
    let requests = [];

    if (existing) {
      requests = JSON.parse(existing);
      // Filter out requests outside the current window
      requests = requests.filter(timestamp => timestamp > windowStart);
    }

    if (requests.length >= RATE_LIMIT_MAX) {
      return { allowed: false };
    }

    // Add current request
    requests.push(now);
    await env.RATE_LIMIT.put(key, JSON.stringify(requests), {
      expirationTtl: RATE_LIMIT_WINDOW + 10
    });

    return { allowed: true };
  } catch (error) {
    // On KV error, allow request (fail open)
    return { allowed: true };
  }
}

async function loginAndScrape(username, password) {
  let sessionCookie = null;

  try {
    // Step 1: GET login page to capture CSRF token
    const loginPageResponse = await fetch(LOGIN_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!loginPageResponse.ok) {
      return { success: false, error: "Failed to reach portal" };
    }

    const loginPageHTML = await loginPageResponse.text();
    const csrfToken = extractCsrfToken(loginPageHTML);
    const usernameField = extractFieldName(loginPageHTML, ["username", "user", "matric", "email"]);
    const passwordField = extractFieldName(loginPageHTML, ["password", "pass"]);

    // Step 2: POST login credentials
    const loginData = {};
    loginData[usernameField] = username;
    loginData[passwordField] = password;
    if (csrfToken) {
      loginData[csrfToken.name] = csrfToken.value;
    }

    const loginResponse = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: new URLSearchParams(loginData),
      redirect: "manual"
    });

    // Extract session cookie from Set-Cookie header
    const setCookieHeader = loginResponse.headers.get("Set-Cookie");
    if (setCookieHeader) {
      sessionCookie = extractSessionCookie(setCookieHeader);
    }

    // Check for login failure
    if (loginResponse.status === 302 || loginResponse.status === 301) {
      const location = loginResponse.headers.get("Location");
      if (location && location.toLowerCase().includes("login")) {
        return { success: false, error: "Invalid portal credentials" };
      }
    }

    // Step 3: GET attendance page with session cookie
    const attendanceHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    if (sessionCookie) {
      attendanceHeaders["Cookie"] = sessionCookie;
    }

    const attendanceResponse = await fetch(ATTENDANCE_URL, {
      headers: attendanceHeaders
    });

    if (!attendanceResponse.ok) {
      return { success: false, error: "Failed to fetch attendance data" };
    }

    const attendanceHTML = await attendanceResponse.text();

    // Check if we were redirected back to login (failed session)
    if (attendanceHTML.toLowerCase().includes("login") && !attendanceHTML.toLowerCase().includes("attendance")) {
      return { success: false, error: "Invalid portal credentials" };
    }

    // Step 4: Parse attendance table
    const courses = parseAttendanceTable(attendanceHTML);
    const semesterInfo = parseSemesterInfo(attendanceHTML);

    return {
      success: true,
      attendance: courses,
      semesterInfo,
      scrapedAt: new Date().toISOString()
    };

  } catch (error) {
    return { success: false, error: "Sync failed, try again" };
  } finally {
    // Explicitly clear credentials
    username = null;
    password = null;
    sessionCookie = null;
  }
}

function extractCsrfToken(html) {
  const tokenRegex = /<input[^>]*type=["']hidden["'][^>]*name=["']([^"']*(?:csrf|token)[^"']*)["'][^>]*value=["']([^"']+)["'][^>]*>/i;
  const match = html.match(tokenRegex);
  if (match) {
    return { name: match[1], value: match[2] };
  }
  return null;
}

function extractFieldName(html, keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`<input[^>]*name=["']([^"']*${keyword}[^"']*)["'][^>]*>`, "i");
    const match = html.match(regex);
    if (match) {
      return match[1];
    }
  }
  // Fallback to first keyword
  return keywords[0];
}

function extractSessionCookie(setCookieHeader) {
  // Extract the session cookie (usually the first one that looks like a session ID)
  const cookies = setCookieHeader.split(", ");
  for (const cookie of cookies) {
    if (cookie.includes("session") || cookie.includes("PHPSESSID") || cookie.includes("laravel")) {
      return cookie.split(";")[0];
    }
  }
  // Fallback: return first cookie
  return cookies[0].split(";")[0];
}

function parseAttendanceTable(html) {
  const courses = [];

  // Find the attendance table using heuristic
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let bestTable = null;
  let bestScore = 0;

  let tableMatch;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHTML = tableMatch[1];
    const tableText = tableHTML.toLowerCase();
    
    // Score table based on keyword presence
    let score = 0;
    if (tableText.includes("course")) score += 3;
    if (tableText.includes("attendance")) score += 3;
    if (tableText.includes("percentage")) score += 2;
    if (tableText.includes("units")) score += 1;

    if (score > bestScore) {
      bestScore = score;
      bestTable = tableHTML;
    }
  }

  if (!bestTable) {
    return courses;
  }

  // Parse table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(bestTable)) !== null) {
    const rowHTML = rowMatch[1];
    
    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
      cells.push(cellMatch[1].trim());
    }

    if (cells.length < 8) continue;

    try {
      // Same cell mapping as extension content-scraper.js
      const courseCode = cells[1];
      const units = parseIntValue(cells[2]);
      const totalClasses = parseIntValue(cells[4]);
      const attended = parseIntValue(cells[5]);
      const suppressed = parseIntValue(cells[6]);
      const percentage = parseFloatValue(cells[7]);

      courses.push({
        courseCode,
        units,
        totalClasses,
        attended,
        suppressed,
        percentage
      });
    } catch (e) {
      // Skip malformed rows
    }
  }

  return courses;
}

function parseSemesterInfo(html) {
  const semesterInfo = {};
  
  // Extract lecture weeks from body text
  const lectureWeeksRegex = /LECTURE_WEEKS\s*[:=]\s*(\d+)/i;
  const match = html.match(lectureWeeksRegex);
  if (match) {
    semesterInfo.lectureWeeks = parseInt(match[1], 10);
  }

  return semesterInfo;
}

function parseIntValue(text) {
  const cleaned = String(text || "").replace(/[^0-9\-]+/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFloatValue(text) {
  const cleaned = String(text || "").replace(/[^0-9\.\-]+/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}
