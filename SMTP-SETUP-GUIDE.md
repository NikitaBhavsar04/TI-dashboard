# Gmail SMTP Setup Guide for Threat Advisory System

## Current Issue
The SMTP authentication is failing with error:
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

## Solution Steps

### 1. Verify Gmail Account Setup
1. **Enable 2-Factor Authentication** on your Google account:
   - Go to https://myaccount.google.com/security
   - Turn on 2-Step Verification if not already enabled

### 2. Generate New App Password
1. **Access App Passwords**:
   - Go to https://myaccount.google.com/apppasswords
   - OR Search "App passwords" in your Google Account settings

2. **Create App Password**:
   - Select app: "Mail"
   - Select device: "Other (custom name)"
   - Enter name: "Threat Advisory System"

3. **Copy the Generated Password**:
   - Google will show a 16-character password like: `abcd efgh ijkl mnop`
   - **Important**: Copy this EXACTLY as shown (with or without spaces)

### 3. Update .env File
Replace the current SMTP_PASS in your `.env` file with the new App Password:

**Option A - If App Password has spaces:**
```bash
SMTP_PASS=abcdefghijklmnop
```
(Remove all spaces)

**Option B - If you want to keep the format:**
```bash
SMTP_PASS="abcd efgh ijkl mnop"
```
(Use double quotes if keeping spaces)

### 4. Current .env Configuration
Your current settings:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=threatintelligence@forensiccybertech.com
SMTP_PASS=hbtsqbewcwsmgapf
```

### 5. Test the Configuration
After updating the password, run:
```bash
node test-smtp-config.js
```

### 6. Alternative SMTP Settings (if needed)
If issues persist, try these Gmail settings:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
```

## Troubleshooting

### Common Issues:
1. **2FA not enabled** - Enable 2-Factor Authentication first
2. **Using account password** - Must use App Password, not your regular Gmail password
3. **Spaces in password** - Remove spaces or use quotes
4. **Old App Password** - Generate a new one if the current one is old

### Security Notes:
- App Passwords are account-specific
- Each app/device should have its own App Password
- App Passwords bypass 2FA for the specific app
- You can revoke App Passwords anytime from your Google Account

## Once Fixed:
The email tracking system will work perfectly:
✅ Emails will send with embedded tracking pixels
✅ Link clicks will be tracked automatically  
✅ Analytics will show open and click rates
✅ All tracking uses your production domain

## Testing After Fix:
1. Run `node test-smtp-config.js` - Should show ✅ success
2. Send a test advisory email from your admin panel
3. Check email tracking in the analytics dashboard
