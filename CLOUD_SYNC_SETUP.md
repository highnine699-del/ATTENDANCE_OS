# Cloud Sync Setup Guide

Attendance OS now supports cloud-based attendance sync via GitHub Actions, enabling mobile users to access attendance data without the Chrome extension.

## Architecture Overview

```
┌──────────────────────────┐
│  Chrome Extension        │
│  Desktop only (unchanged) │
└──────────────┬───────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Attendance OS PWA               │
│  - Extension present? → use it   │
│  - Else → fetch attendance.json  │
└──────────────┬──────────────────┘
               ▲
               │
       ┌───────┴────────┐
       │ attendance.json │
       └───────┬────────┘
               ▲
               │ GitHub Actions
     ┌─────────┴──────────┐
     │  Scrapes portal    │
     │  Writes JSON       │
     │  Commits to repo   │
     └────────────────────┘
```

## Setup Instructions

### 1. Repository Settings

**Make the repository private** - it contains portal login credentials in GitHub Secrets.

### 2. GitHub Secrets Configuration

Navigate to: **Settings → Secrets and variables → Actions**

Add the following secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `PORTAL_USERNAME` | Your LMU portal matric number/username | Yes |
| `PORTAL_PASSWORD` | Your LMU portal password | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (from @BotFather) | Optional |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Optional |

### 3. Telegram Alerts (Optional)

To receive alerts when attendance drops below 75%:

1. Open Telegram and message `@BotFather`
2. Send `/newbot` and follow the prompts
3. Copy the bot token (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Add as `TELEGRAM_BOT_TOKEN` in GitHub Secrets
5. Send a message to your new bot
6. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in your browser
7. Find your `chat_id` in the response (format: `123456789`)
8. Add as `TELEGRAM_CHAT_ID` in GitHub Secrets

### 4. Enable GitHub Actions Workflow

The workflow is already configured in `.github/workflows/scrape-attendance.yml`.

**Schedule:** Runs 5x/day during class hours (WAT):
- 6am WAT (5am UTC)
- 9am WAT (8am UTC)
- 12pm WAT (11am UTC)
- 3pm WAT (2pm UTC)
- 6pm WAT (5pm UTC)

**Manual Trigger:** You can also run the workflow manually from the Actions tab.

### 5. Verify Setup

1. Go to the **Actions** tab in your GitHub repository
2. Click **Scrape Attendance** workflow
3. Click **Run workflow** → **Run workflow** to test manually
4. Check the workflow logs for success/failure
5. Verify `attendance.json` was updated in the repo root

## Local Testing

To test the scraper locally:

```bash
cd scraper
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python scrape.py
```

## PWA Behavior

### Desktop with Extension
- Badge shows "⚡ Extension"
- Data syncs via Chrome extension (existing behavior)
- No changes to extension functionality

### Mobile / Without Extension
- Badge shows "☁️ Cloud Sync"
- Data fetches from `attendance.json`
- Shows last updated timestamp from JSON
- "Install Extension" button opens Chrome Web Store

### Sync Module
- **Sync from Extension**: Uses Chrome extension (desktop only)
- **Sync from Cloud**: Fetches from GitHub-hosted JSON (mobile-friendly)
- **Paste from Portal**: Manual paste fallback (unchanged)
- **Manual Entry**: Manual entry fallback (unchanged)

## Data Format

`attendance.json` shape (matches extension scraped format):

```json
{
  "lastUpdated": "2026-07-01T10:00:00Z",
  "courses": [
    {
      "courseCode": "EEE102",
      "units": 2,
      "totalClasses": 13,
      "attended": 10,
      "suppressed": 0,
      "percentage": 77
    }
  ],
  "semesterInfo": {
    "lectureWeeks": 13
  }
}
```

## Troubleshooting

### Workflow fails with login error
- Verify `PORTAL_USERNAME` and `PORTAL_PASSWORD` secrets are correct
- Check if portal credentials have changed
- Review workflow logs for specific error messages

### Telegram alerts not working
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
- Ensure you've messaged the bot at least once
- Test the bot API: `https://api.telegram.org/bot<TOKEN>/getMe`

### attendance.json not updating
- Check workflow run status in Actions tab
- Verify the workflow has permission to push to the repo
- Ensure repo is not set to read-only for Actions

### PWA shows old data
- Clear browser cache and reload
- Check if GitHub Pages has deployed the latest commit
- Verify `attendance.json` was actually updated in the repo

## Security Notes

- **Never commit credentials** to git - use GitHub Secrets only
- **Keep repository private** - secrets are exposed to Actions runners
- **Rotate credentials** if they're ever compromised
- **Review workflow logs** - don't expose sensitive data in print statements

## Cost & Limits

- GitHub Actions free tier: 2,000 minutes/month
- This workflow: ~10-15 minutes/month total (5 runs/day × ~2-3 min each)
- Well within free tier limits
- ~240 commits/month from JSON updates (cosmetic, uses `[skip ci]`)

## Support

For issues with:
- **Portal scraping**: Check scraper logs in Actions tab
- **GitHub Actions**: Review GitHub Actions documentation
- **Telegram alerts**: Verify bot token and chat ID
- **PWA behavior**: Check browser console for errors
