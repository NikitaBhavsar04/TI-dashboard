/**
 * Microsoft Graph API Email Sender
 *
 * Replaces SMTP/nodemailer for Microsoft 365 tenants where SMTP AUTH is disabled.
 * Uses OAuth 2.0 client credentials flow (app-only auth) — no SMTP AUTH needed.
 *
 * Required env vars:
 *   AZURE_TENANT_ID     — Your Azure AD tenant ID (found in Azure Portal → Azure AD → Overview)
 *   AZURE_CLIENT_ID     — App Registration client ID
 *   AZURE_CLIENT_SECRET — App Registration client secret
 *   SMTP_USER           — The M365 mailbox to send from (e.g. threatintelligence@forensiccybertech.com)
 *
 * Azure App Registration setup (one-time):
 *   1. Azure Portal → Azure Active Directory → App registrations → New registration
 *   2. API permissions → Add permission → Microsoft Graph → Application permissions → Mail.Send → Grant admin consent
 *   3. Certificates & secrets → New client secret → copy the value
 */

const https = require('https');

/**
 * Get an OAuth access token using client credentials flow.
 */
async function getAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Missing Azure credentials. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in .env'
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default'
  }).toString();

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to get access token: ${data.error_description || JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Send an email via Microsoft Graph API.
 *
 * @param {Object} options
 * @param {string|string[]} options.to       - Recipient(s) email address(es)
 * @param {string|string[]} [options.cc]     - CC email address(es)
 * @param {string|string[]} [options.bcc]    - BCC email address(es)
 * @param {string} options.subject           - Email subject
 * @param {string} options.html              - HTML body
 * @param {string} [options.from]            - Sender email (defaults to SMTP_USER)
 * @returns {Promise<void>}
 */
async function sendMailViaGraph(options) {
  const sender = options.from || process.env.SMTP_USER;
  if (!sender) throw new Error('Sender email (SMTP_USER or options.from) is required');

  const toArray = Array.isArray(options.to)
    ? options.to
    : options.to.split(',').map(e => e.trim()).filter(Boolean);

  const toRecipients = toArray.map(email => ({
    emailAddress: { address: email }
  }));

  const ccRecipients = options.cc
    ? (Array.isArray(options.cc) ? options.cc : options.cc.split(',').map(e => e.trim()).filter(Boolean))
        .map(email => ({ emailAddress: { address: email } }))
    : [];

  const bccRecipients = options.bcc
    ? (Array.isArray(options.bcc) ? options.bcc : options.bcc.split(',').map(e => e.trim()).filter(Boolean))
        .map(email => ({ emailAddress: { address: email } }))
    : [];

  const payload = {
    message: {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.html
      },
      toRecipients,
      ...(ccRecipients.length > 0 && { ccRecipients }),
      ...(bccRecipients.length > 0 && { bccRecipients })
    },
    saveToSentItems: true
  };

  const accessToken = await getAccessToken();

  const graphUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`;

  const response = await fetch(graphUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Graph API sendMail failed (${response.status}): ${errBody}`);
  }

  // 202 Accepted = success (Graph sendMail returns no body on success)
  console.log(`[GRAPH-MAILER] Email sent to ${toArray.join(', ')} via Microsoft Graph API`);
}

/**
 * Check if Graph API credentials are configured.
 */
function isGraphMailerAvailable() {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  );
}

module.exports = { sendMailViaGraph, isGraphMailerAvailable };
