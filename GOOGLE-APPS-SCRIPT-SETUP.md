# 🚀 Google Apps Script Email Scheduler - Setup Guide

## Overview

This guide will help you set up **Google Apps Script** for cloud-based email scheduling. With this setup, your scheduled emails will be sent from Gmail even when your local server is **offline** or **turned off**.

---

## 📋 Table of Contents

1. [Why Google Apps Script?](#why-google-apps-script)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Deployment](#deployment)
5. [Integration with Next.js](#integration-with-nextjs)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Why Google Apps Script?

### **Current Problem with SMTP/Agenda.js:**
- ❌ Requires your local server to be running 24/7
- ❌ If system crashes or shuts down, scheduled emails are lost
- ❌ SMTP relay (not true Gmail sending)
- ❌ Limited reliability for scheduled emails

### **Benefits of Google Apps Script:**
- ✅ **Runs 24/7** on Google's cloud servers
- ✅ **True Gmail sending** using native GmailApp API
- ✅ **Persistent scheduling** - survives system restarts
- ✅ **Better deliverability** - emails come directly from Gmail
- ✅ **Free** - No additional costs
- ✅ **Automatic fallback** - System falls back to Agenda.js if Apps Script is unavailable

---

## 📦 Prerequisites

1. **Google Account** with Gmail access
2. The Gmail account you want to send emails from
3. **Next.js application** already configured with email sending

---

## 🔧 Step-by-Step Setup

### **Step 1: Access Google Apps Script**

1. Go to [https://script.google.com](https://script.google.com)
2. Sign in with your Gmail account (the one that will send emails)
3. Click **"New Project"**
4. Name your project: **"Threat Advisory Email Scheduler"**

### **Step 2: Add the Script Code**

1. In the Apps Script editor, you'll see a file named `Code.gs`
2. **Delete** all existing code in `Code.gs`
3. Open the file: `google-apps-script/Code.gs` from your project
4. **Copy all the code** from that file
5. **Paste** it into the Apps Script editor's `Code.gs`
6. Click **Save** (💾 icon or `Ctrl+S`)

### **Step 3: Configure Gmail Permissions**

The script needs permission to send emails on your behalf:

1. Click **Run** (▶️ icon) to test the script
2. You'll see: *"Authorization required"*
3. Click **Review Permissions**
4. Select your Google account
5. Click **Advanced**
6. Click **"Go to Threat Advisory Email Scheduler (unsafe)"**
   - *Don't worry - this is YOUR script, it's safe*
7. Click **"Allow"**

### **Step 4: Test the Script**

1. In the Apps Script editor, select the function: **`testSendEmail`**
2. Click **Run** (▶️ icon)
3. Check the **Execution log** at the bottom
4. You should see: *"Test email sent!"*
5. Check your Gmail inbox - you should receive a test email

---

## 🚀 Deployment

### **Step 5: Deploy as Web App**

1. In Apps Script editor, click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **"Web app"**
4. Configure the deployment:
   - **Description:** "Email Scheduler v1.0"
   - **Execute as:** **Me** (your Gmail account)
   - **Who has access:** **Anyone**
     - ⚠️ This allows your Next.js app to send requests
5. Click **Deploy**
6. Click **Authorize access** (if prompted)
7. **Copy the Web App URL** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```
8. **Save this URL** - you'll need it for the next step

### **Step 6: Update Your Environment Variables**

1. Open your `.env.local` file
2. Find the line:
   ```env
   APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
3. **Replace** `YOUR_DEPLOYMENT_ID` with your actual deployment URL
4. Save the file

**Example:**
```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXX/exec
```

---

## 🔗 Integration with Next.js

The integration is **already implemented** in your codebase!

### **How It Works:**

1. **Email Scheduling Request** → Your Next.js app detects `APPS_SCRIPT_URL`
2. **Apps Script Integration** → Automatically uses Apps Script instead of Agenda.js
3. **Cloud-Based Scheduling** → Google Apps Script creates time-based triggers
4. **Automatic Sending** → Gmail sends the email at the scheduled time
5. **Status Tracking** → Updates are reflected in your MongoDB

### **Files Modified:**

- ✅ `pages/api/emails/send-advisory.js` - Updated with Apps Script integration
- ✅ `lib/appsScriptScheduler.js` - New utility module
- ✅ `pages/api/emails/schedule-via-apps-script.js` - Direct scheduling endpoint
- ✅ `pages/api/emails/cancel-scheduled.js` - Cancel endpoint
- ✅ `pages/api/emails/check-scheduled-status.js` - Status check endpoint

### **Fallback Mechanism:**

If Apps Script is unavailable, the system **automatically falls back** to the local Agenda.js scheduler.

---

## 🧪 Testing

### **Test 1: Health Check**

```bash
# Test if Apps Script is accessible
curl YOUR_APPS_SCRIPT_URL
```

**Expected response:**
```json
{
  "statusCode": 200,
  "data": {
    "status": "online",
    "service": "Threat Advisory Email Scheduler",
    "version": "1.0.0"
  }
}
```

### **Test 2: Schedule a Test Email**

1. Start your Next.js application:
   ```bash
   npm run dev
   ```

2. Create a new advisory or use an existing one

3. Click **"Send Email"** and select **"Schedule for later"**

4. Choose a time **2-3 minutes in the future**

5. Click **"Schedule"**

6. Check the console logs - you should see:
   ```
   📧 Using Google Apps Script for scheduling (cloud-based)
   ✅ Scheduled via Apps Script: EMAIL_xxxxx
   ```

7. Wait for the scheduled time and check your inbox

### **Test 3: Manual Script Testing**

In the Apps Script editor:

1. Select function: **`testScheduleEmail`**
2. Click **Run**
3. Check **Execution log**
4. You should see the email ID generated
5. Wait 2 minutes and check if email is sent

---

## 🛠️ Troubleshooting

### **Issue: "Authorization required" keeps appearing**

**Solution:**
1. Go to Apps Script editor
2. Click **Run** → Select `testSendEmail`
3. Complete the authorization process again
4. Make sure to click **"Allow"**

### **Issue: "Apps Script URL not configured"**

**Solution:**
1. Check your `.env.local` file
2. Ensure `APPS_SCRIPT_URL` is set correctly
3. Restart your Next.js server

### **Issue: Emails not being sent**

**Solution:**
1. Check Apps Script execution logs:
   - Go to Apps Script editor
   - Click **Executions** (clock icon on left sidebar)
   - Check for errors
2. Verify Gmail account has sending permissions
3. Check spam folder

### **Issue: "Failed to schedule email via Apps Script"**

**Solution:**
1. Test the Apps Script URL in browser
2. Check if deployment is still active
3. Review Apps Script logs for errors
4. System will automatically fallback to Agenda.js

### **Issue: Time-based triggers not firing**

**Solution:**
1. Go to Apps Script editor
2. Click **Triggers** (alarm clock icon)
3. Check if triggers are being created
4. Verify trigger execution times
5. Check for any disabled triggers

---

## 📊 Monitoring

### **View Scheduled Emails in Apps Script:**

1. In Apps Script editor, select function: **`clearAllData`**
   - ⚠️ **Don't run this** - it will delete all data
2. Instead, use the API endpoint:

```javascript
// From your Next.js app
const response = await fetch('/api/emails/check-scheduled-status', {
  method: 'GET',
  params: { emailId: 'YOUR_EMAIL_ID' }
});
```

### **View Triggers:**

1. Go to Apps Script editor
2. Click **Triggers** (alarm clock icon on left)
3. See all scheduled email triggers
4. Each trigger shows:
   - Function name
   - Event type (Time-driven)
   - Scheduled time
   - Status

---

## 🔐 Security Best Practices

1. **Keep your deployment URL private** - Don't commit it to Git
2. **Add request authentication** (optional):
   - Modify `doPost()` function to check for API key
   - Add `API_KEY` validation before processing requests
3. **Monitor usage** - Check Apps Script quotas
4. **Review permissions** - Regularly audit Apps Script access

---

## 📈 Quota Limits

Google Apps Script has the following limits:

| Limit | Free Tier |
|-------|-----------|
| Email Recipients/day | 100 (Gmail) |
| URL Fetch calls/day | 20,000 |
| Script runtime | 6 min/execution |
| Triggers | 20 time-based |
| Properties storage | 500 KB |

**For higher limits:** Use Google Workspace account

---

## 🎉 You're All Set!

Your Threat Advisory platform now has:
- ✅ Cloud-based email scheduling
- ✅ Persistent scheduled emails
- ✅ Automatic fallback mechanism
- ✅ True Gmail sending
- ✅ 24/7 reliability

**Next Steps:**
1. Deploy your Next.js app to production
2. Test with real advisories
3. Monitor Apps Script execution logs
4. Enjoy reliable email scheduling!

---

## 📞 Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Apps Script execution logs
3. Check Next.js server console logs
4. Verify environment variables

---

## 🔄 Updating the Script

To update your Apps Script:

1. Go to Apps Script editor
2. Make changes to `Code.gs`
3. Click **Save**
4. **Deploy** → **Manage deployments**
5. Click ✏️ (Edit) on your active deployment
6. Change version to "New version"
7. Click **Deploy**
8. **No need to update** `APPS_SCRIPT_URL` - it stays the same!

---

**Happy Scheduling! 🚀📧**
