# 📧 Google Apps Script Email Scheduler - Quick Start

## ⚡ What Was Implemented

Your Threat Advisory platform now has **cloud-based email scheduling** using Google Apps Script!

### **Problem Solved:**
- ❌ **Before:** Emails only sent when your computer is on
- ✅ **After:** Emails sent from Google's cloud 24/7

---

## 🚀 Files Created

### **1. Google Apps Script Code:**
- 📁 `google-apps-script/Code.gs` - Deploy this to script.google.com

### **2. Next.js Integration:**
- 📁 `lib/appsScriptScheduler.js` - Utility to communicate with Apps Script
- 📁 `pages/api/emails/schedule-via-apps-script.js` - Direct scheduling API
- 📁 `pages/api/emails/cancel-scheduled.js` - Cancel emails API
- 📁 `pages/api/emails/check-scheduled-status.js` - Status check API

### **3. Updated Files:**
- 📁 `pages/api/emails/send-advisory.js` - Auto-detects Apps Script
- 📁 `.env.local` - Added `APPS_SCRIPT_URL` configuration
- 📁 `.env.example` - Added Apps Script example

### **4. Documentation:**
- 📁 `GOOGLE-APPS-SCRIPT-SETUP.md` - Complete setup guide
- 📁 `APPS-SCRIPT-ARCHITECTURE.md` - Architecture & diagrams
- 📁 `QUICK-START-APPS-SCRIPT.md` - This file

### **5. Testing Scripts:**
- 📁 `test-apps-script.js` - Test the integration
- 📁 `cancel-test-email.js` - Cancel scheduled emails

---

## 🎯 Next Steps (5 Minutes Setup)

### **Step 1: Deploy Apps Script (3 minutes)**

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Copy code from `google-apps-script/Code.gs`
4. Paste into the editor
5. Click **Deploy** → **New deployment** → **Web app**
6. Set "Execute as: **Me**" and "Who has access: **Anyone**"
7. Click **Deploy**
8. **Copy the Web App URL**

### **Step 2: Configure Environment (1 minute)**

1. Open `.env.local`
2. Find: `APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`
3. Replace `YOUR_DEPLOYMENT_ID` with your actual URL
4. Save the file

### **Step 3: Test (1 minute)**

```bash
# Test the integration
node test-apps-script.js
```

**That's it! You're done! 🎉**

---

## 📖 Full Documentation

- **Setup Guide:** [GOOGLE-APPS-SCRIPT-SETUP.md](GOOGLE-APPS-SCRIPT-SETUP.md)
- **Architecture:** [APPS-SCRIPT-ARCHITECTURE.md](APPS-SCRIPT-ARCHITECTURE.md)

---

## 🔄 How It Works Now

### **Before (SMTP + Agenda.js):**
```
Your Computer → SMTP → Gmail → Client
     ↓
If computer is OFF = ❌ Emails NOT sent
```

### **After (Apps Script):**
```
Your Computer → Apps Script → Google Cloud → Gmail → Client
                     ↓
              Even if computer is OFF = ✅ Emails SENT!
```

---

## ✨ Key Features

1. **Automatic Detection:**
   - If `APPS_SCRIPT_URL` is set → Uses Apps Script
   - If not set → Falls back to Agenda.js
   - No code changes needed!

2. **Smart Fallback:**
   - If Apps Script fails → Automatically uses Agenda.js
   - Zero downtime

3. **True Gmail Sending:**
   - Uses native `GmailApp.sendEmail()`
   - Better deliverability
   - Direct from Gmail

4. **24/7 Operation:**
   - Runs on Google's servers
   - No local server needed
   - Persistent scheduling

---

## 🧪 Testing Commands

```bash
# Test Apps Script integration
node test-apps-script.js

# Cancel a scheduled email
node cancel-test-email.js EMAIL_ID_HERE

# Check email status
curl http://localhost:3000/api/emails/check-scheduled-status?emailId=EMAIL_ID
```

---

## 🎯 Usage in Your App

**No changes needed!** Just schedule emails normally:

1. Create advisory
2. Click "Send Email"
3. Select "Schedule for later"
4. Choose time
5. Click "Schedule"

The system automatically uses Apps Script if configured.

---

## 🔍 Monitoring

### **Apps Script Dashboard:**
[https://script.google.com](https://script.google.com)

- View **Executions** - See all email sends
- View **Triggers** - See scheduled emails
- View **Logs** - Debug issues

### **In Your App:**
- MongoDB tracks all emails
- Console logs show scheduling method
- Status API checks email state

---

## 💡 Pro Tips

1. **Test first:**
   ```bash
   node test-apps-script.js
   ```

2. **Monitor Apps Script:**
   - Check [script.google.com](https://script.google.com) daily
   - Review execution logs

3. **Check quotas:**
   - Gmail: 100 emails/day
   - Workspace: 1,500 emails/day

4. **Keep fallback enabled:**
   - Don't remove Agenda.js code
   - It's your safety net

---

## ❓ FAQ

**Q: Do I need to keep my computer on?**
A: No! Once deployed to Apps Script, emails send from Google's cloud.

**Q: What if Apps Script is down?**
A: System automatically falls back to Agenda.js (local scheduling).

**Q: Can I still use SMTP?**
A: Yes! Apps Script uses Gmail API, but you can still configure SMTP.

**Q: Is this free?**
A: Yes! Google Apps Script is free for personal Gmail accounts.

**Q: What about production?**
A: Deploy to Google Workspace for higher limits (1,500 emails/day).

---

## 🚨 Troubleshooting

**Issue:** "APPS_SCRIPT_URL not configured"
- **Fix:** Add URL to `.env.local` and restart server

**Issue:** "Apps Script is not accessible"
- **Fix:** Check deployment is active at script.google.com

**Issue:** "Authorization required"
- **Fix:** Run test function in Apps Script editor to grant permissions

**Full troubleshooting:** See [GOOGLE-APPS-SCRIPT-SETUP.md](GOOGLE-APPS-SCRIPT-SETUP.md#troubleshooting)

---

## 📞 Support

1. Check [GOOGLE-APPS-SCRIPT-SETUP.md](GOOGLE-APPS-SCRIPT-SETUP.md)
2. Review Apps Script execution logs
3. Test with `node test-apps-script.js`

---

## ✅ Deployment Checklist

- [ ] Apps Script deployed
- [ ] `APPS_SCRIPT_URL` configured
- [ ] Gmail permissions granted
- [ ] Test script passed
- [ ] Server restarted
- [ ] First email scheduled
- [ ] Email received successfully

---

**You're all set! Enjoy reliable 24/7 email scheduling! 🎉📧**
