# Google Apps Script Email Scheduling - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREAT ADVISORY PLATFORM                      │
│                         (Next.js App)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ User schedules email
                         │
                         ↓
         ┌───────────────────────────────────┐
         │  Email Scheduling Logic           │
         │  (send-advisory.js)               │
         │                                   │
         │  • Checks APPS_SCRIPT_URL         │
         │  • Generates email HTML           │
         │  • Creates tracking records       │
         └───────┬───────────────┬───────────┘
                 │               │
    If configured│               │ If not configured
                 │               │ or fallback
                 ↓               ↓
    ┌────────────────┐    ┌─────────────────┐
    │ Apps Script    │    │ Local Agenda.js │
    │ Scheduler      │    │ (Requires server│
    │ (Cloud-based)  │    │  to be running) │
    └────────┬───────┘    └────────┬────────┘
             │                     │
             │                     │
             ↓                     ↓
┌─────────────────────┐   ┌──────────────────┐
│ Google Apps Script  │   │ MongoDB + Cron   │
│ (Google Cloud)      │   │ (Local/Heroku)   │
│                     │   │                  │
│ • Stores email data │   │ • Requires 24/7  │
│ • Creates triggers  │   │   server running │
│ • Runs 24/7         │   │ • Process-based  │
└─────────┬───────────┘   └──────────┬───────┘
          │                          │
          │ Time-based trigger fires │
          │                          │
          ↓                          ↓
┌──────────────────────┐   ┌──────────────────┐
│  GmailApp.sendEmail  │   │ SMTP (nodemailer)│
│  (Native Gmail API)  │   │ (smtp.gmail.com) │
│                      │   │                  │
│ • True Gmail sending │   │ • SMTP relay     │
│ • Better delivery    │   │ • Limited trust  │
└──────────┬───────────┘   └──────────┬───────┘
           │                          │
           │                          │
           └───────────┬──────────────┘
                       │
                       ↓
              ┌─────────────────┐
              │  Client Inbox   │
              │  📧 Email        │
              └─────────────────┘
```

---

## 📊 Comparison: Apps Script vs Agenda.js

| Feature | Google Apps Script | Agenda.js (Current) |
|---------|-------------------|---------------------|
| **Requires Server Running** | ❌ No | Yes (24/7) |
| **Cloud-based** | Yes (Google Cloud) | ❌ No (Your server) |
| **Persistence** | Survives crashes | ❌ Lost on crash |
| **Email Method** | Native Gmail API | ⚠️ SMTP relay |
| **Deliverability** | Excellent | ⚠️ Good |
| **Setup Complexity** | ⚠️ Moderate | Simple |
| **Cost** | Free | Free |
| **Email Quota** | 100/day (Gmail) | SMTP limits |
| **Reliability** | Very High | ⚠️ Server-dependent |
| **Monitoring** | Apps Script UI | ⚠️ Manual logs |

---

## 🔄 Email Flow Process

### **Scheduling Flow:**

1. **User Action:**
   - User creates advisory
   - Selects recipients
   - Chooses schedule time
   - Clicks "Schedule Email"

2. **Next.js Processing:**
   - Validates recipients
   - Generates email HTML
   - Creates tracking records in MongoDB
   - Checks if `APPS_SCRIPT_URL` exists

3. **Routing Decision:**
   ```javascript
   if (APPS_SCRIPT_URL && isScheduled) {
     → Use Google Apps Script (Cloud)
   } else {
     → Use Agenda.js (Local)
   }
   ```

4. **Apps Script Scheduling:**
   - POST request to Apps Script Web App
   - Apps Script stores email data
   - Creates time-based trigger
   - Returns email ID

5. **Trigger Execution:**
   - Google Cloud fires trigger at scheduled time
   - Apps Script calls `sendScheduledEmail()`
   - Uses `GmailApp.sendEmail()` native API
   - Email sent directly from Gmail

6. **Status Updates:**
   - Apps Script updates email status
   - Optional: Webhook to Next.js backend
   - Tracking records updated in MongoDB

---

## 🗂️ File Structure

```
Threat-Advisory/
│
├── google-apps-script/
│   └── Code.gs                          # Apps Script code (deploy to script.google.com)
│
├── pages/api/emails/
│   ├── send-advisory.js                 # UPDATED - Main email endpoint
│   ├── schedule-via-apps-script.js      # NEW - Direct Apps Script API
│   ├── cancel-scheduled.js              # NEW - Cancel scheduled emails
│   └── check-scheduled-status.js        # NEW - Check email status
│
├── lib/
│   ├── appsScriptScheduler.js           # NEW - Apps Script utility
│   └── agenda.js                        # Existing - Fallback scheduler
│
├── .env.local                           # UPDATED - Added APPS_SCRIPT_URL
├── .env.example                         # UPDATED - Added Apps Script config
│
├── GOOGLE-APPS-SCRIPT-SETUP.md          # NEW - Complete setup guide
├── APPS-SCRIPT-ARCHITECTURE.md          # NEW - This file
│
└── test-apps-script.js                  # NEW - Testing script
```

---

## 🔐 Security Model

### **Apps Script Permissions:**

```
User (Gmail Account)
  ↓
Grants permission to Apps Script
  ↓
Apps Script can:
  • Read/Send emails via GmailApp
  • Create time-based triggers
  • Store data in Properties Service
  ↓
Web App accepts requests from:
  • Anyone (with the deployment URL)
  • No authentication required (can be added)
```

### **Recommended Security Enhancements:**

1. **Add API Key Authentication:**
   ```javascript
   // In Apps Script doPost()
   const authHeader = e.parameter.apiKey;
   if (authHeader !== 'YOUR_SECRET_KEY') {
     return createResponse(401, { error: 'Unauthorized' });
   }
   ```

2. **IP Whitelisting:**
   - Use Google Cloud Functions instead
   - Add IP filtering

3. **Rate Limiting:**
   - Implement request throttling
   - Track requests per IP

---

## 📈 Scalability

### **Current Limits:**

- **Gmail Account:** 100 emails/day
- **Google Workspace:** 1,500 emails/day
- **Apps Script Runtime:** 6 minutes/execution
- **Triggers:** 20 time-based triggers
- **Storage:** 500 KB in Properties Service

### **Scaling Strategies:**

1. **Multiple Gmail Accounts:**
   - Round-robin across accounts
   - 100 emails/day × N accounts

2. **Google Workspace:**
   - Upgrade to Workspace
   - 1,500 emails/day

3. **SendGrid/Mailgun Integration:**
   - For high-volume needs
   - Apps Script can call external APIs

---

## 🛠️ Monitoring & Debugging

### **Apps Script Execution Logs:**

1. Go to [script.google.com](https://script.google.com)
2. Click **Executions** (clock icon)
3. View:
   - Execution time
   - Status (success/error)
   - Logs output

### **Trigger Monitoring:**

1. Click **Triggers** (alarm clock icon)
2. View all scheduled triggers
3. Check:
   - Next run time
   - Function name
   - Status

### **Email Tracking:**

```javascript
// Check email status via API
const response = await fetch('/api/emails/check-scheduled-status', {
  method: 'GET',
  params: { emailId: 'EMAIL_123456' }
});
```

---

## Best Practices

1. **Always include fallback:**
   ```javascript
   try {
     await appsScriptScheduler.scheduleEmail(data);
   } catch (error) {
     // Fallback to Agenda.js
     await agenda.schedule(time, job, data);
   }
   ```

2. **Log everything:**
   - Apps Script: `Logger.log()`
   - Next.js: `console.log()`

3. **Test before production:**
   - Run `test-apps-script.js`
   - Verify emails are sent

4. **Monitor quotas:**
   - Check Gmail sending limits
   - Track Apps Script executions

5. **Clean up old data:**
   - Apps Script auto-deletes sent emails
   - Keep only recent records

---

## 🚀 Deployment Checklist

- [ ] Google Apps Script deployed as Web App
- [ ] `APPS_SCRIPT_URL` added to `.env.local`
- [ ] Gmail permissions granted
- [ ] Test email sent successfully
- [ ] Next.js server restarted
- [ ] Fallback to Agenda.js tested
- [ ] Production environment configured
- [ ] Monitoring setup complete

---

## 📞 Quick Reference

### **Environment Variable:**
```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

### **Test Command:**
```bash
node test-apps-script.js
```

### **Cancel Email:**
```bash
node cancel-test-email.js EMAIL_ID
```

### **Apps Script Dashboard:**
[https://script.google.com](https://script.google.com)

---

**Happy Scheduling! 🎉**
