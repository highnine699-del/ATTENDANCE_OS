#!/usr/bin/env python3
"""
Attendance OS — Portal Scraper
Copyright © 2025 Josiah. All rights reserved.
Licensed under the MIT License.

Scrapes attendance data from att3.lmu.edu.ng and writes to attendance.json
Run via GitHub Actions workflow or locally with PORTAL_USERNAME/PORTAL_PASSWORD env vars
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
from bs4 import BeautifulSoup


# Configuration
PORTAL_URL = "https://att3.lmu.edu.ng"
LOGIN_URL = f"{PORTAL_URL}/login"
ATTENDANCE_URL = f"{PORTAL_URL}/student/attendance"
OUTPUT_FILE = "attendance.json"
THRESHOLD_PERCENT = 75
WARNING_PERCENT = 80


class PortalScraper:
    def __init__(self):
        self.username = os.environ.get("PORTAL_USERNAME")
        self.password = os.environ.get("PORTAL_PASSWORD")
        self.telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN")
        self.telegram_chat_id = os.environ.get("TELEGRAM_CHAT_ID")
        
        if not self.username or not self.password:
            raise ValueError("PORTAL_USERNAME and PORTAL_PASSWORD environment variables required")
        
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })

    def login(self) -> bool:
        """Login to the student portal"""
        print(f"[{datetime.now().isoformat()}] Logging in to {PORTAL_URL}...")
        
        # Get login page first to capture any CSRF tokens
        try:
            response = self.session.get(LOGIN_URL, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Failed to reach login page: {e}")
            return False
        
        # Parse login page to find form fields
        soup = BeautifulSoup(response.text, "lxml")
        
        # Try common field names for username/password
        username_field = None
        password_field = None
        csrf_field = None
        csrf_value = None
        
        # Look for input fields
        for input_tag in soup.find_all("input"):
            name = input_tag.get("name", "").lower()
            input_type = input_tag.get("type", "").lower()
            
            if "username" in name or "user" in name or "matric" in name or "email" in name:
                username_field = input_tag.get("name")
            elif "password" in name or "pass" in name:
                password_field = input_tag.get("name")
            elif input_type == "hidden" and ("csrf" in name or "token" in name):
                csrf_field = input_tag.get("name")
                csrf_value = input_tag.get("value")
        
        # Fallback to common defaults if not found
        if not username_field:
            username_field = "username"
        if not password_field:
            password_field = "password"
        
        # Prepare login payload
        login_data = {
            username_field: self.username,
            password_field: self.password,
        }
        
        if csrf_field and csrf_value:
            login_data[csrf_field] = csrf_value
        
        # Submit login
        try:
            response = self.session.post(
                LOGIN_URL,
                data=login_data,
                allow_redirects=True,
                timeout=30
            )
            response.raise_for_status()
            
            # Check if login was successful (no login form on page, or redirect to dashboard)
            if "login" in response.url.lower() or "invalid" in response.text.lower():
                print("Login failed - credentials may be incorrect")
                return False
            
            print(f"[{datetime.now().isoformat()}] Login successful")
            return True
            
        except requests.RequestException as e:
            print(f"Login request failed: {e}")
            return False

    def scrape_attendance(self) -> Optional[Dict]:
        """Scrape attendance data from the portal"""
        print(f"[{datetime.now().isoformat()}] Fetching attendance page...")
        
        try:
            response = self.session.get(ATTENDANCE_URL, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Failed to fetch attendance page: {e}")
            return None
        
        soup = BeautifulSoup(response.text, "lxml")
        
        # Find the attendance table using the same heuristic as the extension
        table = None
        for t in soup.find_all("table"):
            table_text = t.get_text()
            if re.search(r"course|attendance|percentage|units", table_text, re.IGNORECASE):
                table = t
                break
        
        if not table:
            # Fallback to first table if heuristic fails
            table = soup.find("table")
        
        if not table:
            print("No attendance table found on page")
            return None
        
        # Parse table rows
        courses = []
        tbody = table.find("tbody")
        if not tbody:
            tbody = table  # Some tables don't have explicit tbody
        
        rows = tbody.find_all("tr")
        
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 8:
                continue
            
            try:
                # Same cell mapping as extension content-scraper.js
                course_code = cells[1].get_text(strip=True)
                units_text = cells[2].get_text(strip=True)
                total_classes_text = cells[4].get_text(strip=True)
                attended_text = cells[5].get_text(strip=True)
                suppressed_text = cells[6].get_text(strip=True)
                percentage_text = cells[7].get_text(strip=True)
                
                # Parse numeric values (same logic as extension)
                units = self._parse_int(units_text)
                total_classes = self._parse_int(total_classes_text)
                attended = self._parse_int(attended_text)
                suppressed = self._parse_int(suppressed_text)
                percentage = self._parse_float(percentage_text)
                
                courses.append({
                    "courseCode": course_code,
                    "units": units,
                    "totalClasses": total_classes,
                    "attended": attended,
                    "suppressed": suppressed,
                    "percentage": percentage
                })
                
            except Exception as e:
                print(f"Row parse error: {e}")
                continue
        
        # Extract semester info (lecture weeks from body text)
        semester_info = {}
        body_text = soup.get_text()
        lecture_weeks_match = re.search(r"LECTURE_WEEKS\s*[:=]\s*(\d+)", body_text, re.IGNORECASE)
        if lecture_weeks_match:
            semester_info["lectureWeeks"] = int(lecture_weeks_match.group(1))
        
        print(f"[{datetime.now().isoformat()}] Scraped {len(courses)} courses")
        
        return {
            "courses": courses,
            "semesterInfo": semester_info
        }

    def _parse_int(self, text: str) -> int:
        """Parse integer from text, removing non-numeric chars (same as extension)"""
        cleaned = re.sub(r"[^0-9\-]+", "", str(text or ""))
        try:
            return int(cleaned)
        except ValueError:
            return 0

    def _parse_float(self, text: str) -> float:
        """Parse float from text, removing non-numeric chars (same as extension)"""
        cleaned = re.sub(r"[^0-9\.\-]+", "", str(text or ""))
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def load_previous_data(self) -> Optional[Dict]:
        """Load previous attendance.json to compare for alerts"""
        try:
            with open(OUTPUT_FILE, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def write_attendance_json(self, data: Dict):
        """Write attendance data to JSON file"""
        output = {
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
            "courses": data["courses"],
            "semesterInfo": data.get("semesterInfo", {})
        }
        
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output, f, indent=2)
        
        print(f"[{datetime.now().isoformat()}] Wrote attendance.json")

    def send_telegram_alert(self, message: str) -> bool:
        """Send alert via Telegram bot"""
        if not self.telegram_token or not self.telegram_chat_id:
            print("Telegram credentials not configured, skipping alert")
            return False
        
        url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
        payload = {
            "chat_id": self.telegram_chat_id,
            "text": message,
            "parse_mode": "HTML"
        }
        
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            print(f"[{datetime.now().isoformat()}] Telegram alert sent")
            return True
        except requests.RequestException as e:
            print(f"Failed to send Telegram alert: {e}")
            return False

    def check_threshold_crossings(self, new_data: Dict, previous_data: Optional[Dict]) -> List[str]:
        """Check if any course crossed below threshold"""
        alerts = []
        
        if not previous_data or "courses" not in previous_data:
            return alerts
        
        previous_courses = {c["courseCode"]: c for c in previous_data.get("courses", [])}
        
        for course in new_data["courses"]:
            code = course["courseCode"]
            new_pct = course["percentage"]
            
            if code in previous_courses:
                old_pct = previous_courses[code]["percentage"]
                
                # Check if crossed below 75%
                if old_pct >= THRESHOLD_PERCENT and new_pct < THRESHOLD_PERCENT:
                    alerts.append(
                        f"⚠️ <b>{code}</b> dropped below {THRESHOLD_PERCENT}%: {old_pct}% → {new_pct}%"
                    )
        
        return alerts

    def send_daily_digest(self, data: Dict) -> bool:
        """Send daily digest of courses below warning threshold"""
        at_risk = [c for c in data["courses"] if c["percentage"] < WARNING_PERCENT]
        
        if not at_risk:
            return True
        
        message = f"📊 <b>Daily Attendance Digest</b>\n\n"
        message += f"Courses below {WARNING_PERCENT}%:\n"
        
        for course in sorted(at_risk, key=lambda c: c["percentage"]):
            message += f"• <b>{course['courseCode']}</b>: {course['percentage']}% "
            message += f"({course['attended']}/{course['totalClasses']})\n"
        
        return self.send_telegram_alert(message)

    def run(self) -> bool:
        """Main execution flow"""
        try:
            # Login
            if not self.login():
                return False
            
            # Load previous data for comparison
            previous_data = self.load_previous_data()
            
            # Scrape attendance
            data = self.scrape_attendance()
            if not data:
                return False
            
            # Check for threshold crossings
            threshold_alerts = self.check_threshold_crossings(data, previous_data)
            for alert in threshold_alerts:
                self.send_telegram_alert(alert)
            
            # Send daily digest if it's the first run of the day (after 6am WAT)
            now = datetime.now(timezone.utc)
            # WAT is UTC+1, so 6am WAT = 5am UTC
            if now.hour == 5 and now.minute < 30:  # Within 30min window
                self.send_daily_digest(data)
            
            # Write output
            self.write_attendance_json(data)
            
            print(f"[{datetime.now().isoformat()}] Scrape completed successfully")
            return True
            
        except Exception as e:
            print(f"Scrape failed with error: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    scraper = PortalScraper()
    success = scraper.run()
    sys.exit(0 if success else 1)
