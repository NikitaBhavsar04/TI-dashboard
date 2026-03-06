/**
 * Microsoft Graph API Email Sender - Certificate Authentication
 *
 * Uses certificate-based authentication (Option B) instead of client secrets.
 * Integrates with the certificate setup from scripts/generate_cert.py
 *
 * Required env vars:
 *   TENANT_ID           — Your Azure AD tenant ID
 *   CLIENT_ID           — App Registration client ID  
 *   CERT_THUMBPRINT     — Certificate thumbprint (SHA1)
 *   CERT_PATH           — Path to mailer.pem file
 *   FROM_EMAIL          — The M365 mailbox to send from
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Check if Graph mailer is properly configured (either certificate or client secret)
 */
function isGraphMailerAvailable() {
  const basicRequired = ['TENANT_ID', 'CLIENT_ID', 'FROM_EMAIL'];
  const basicMissing = basicRequired.filter(key => !process.env[key]);
  
  if (basicMissing.length > 0) {
    console.log(`🔍 Graph mailer not available - missing: ${basicMissing.join(', ')}`);
    return false;
  }
  
  // Check if we have either certificate OR client secret authentication
  const hasCertificate = process.env.CERT_THUMBPRINT && 
                         fs.existsSync(process.env.CERT_PATH || 'scripts/mailer.pem');
  
  const hasClientSecret = process.env.CLIENT_SECRET && 
                          process.env.CLIENT_SECRET !== 'your-client-secret-from-azure-ad';
  
  if (!hasCertificate && !hasClientSecret) {
    console.log('🔍 Graph mailer not available - need either CERT_THUMBPRINT + certificate file OR CLIENT_SECRET');
    return false;
  }
  
  if (hasCertificate && hasClientSecret) {
    console.log('✅ Graph mailer ready - both certificate AND client secret available');
  } else if (hasCertificate) {
    console.log('✅ Graph mailer ready - certificate authentication available');
  } else {
    console.log('✅ Graph mailer ready - client secret authentication available');
  }
  
  return true;
}

/**
 * Get an OAuth access token using certificate or client secret authentication.
 * Tries certificate authentication first, then falls back to client secret.
 */
async function getAccessToken() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const preferClientSecret = process.env.PREFER_CLIENT_SECRET === 'true';

  if (!tenantId || !clientId) {
    throw new Error('Missing TENANT_ID or CLIENT_ID in .env');
  }

  // Choose authentication method based on preference and availability
  if (preferClientSecret) {
    console.log('🔧 Using client secret authentication (preferred)');
    return await getAccessTokenWithClientSecret();
  }

  // Try certificate first, fallback to client secret
  try {
    console.log('🔒 Trying certificate authentication...');
    return await getAccessTokenWithCertificate();
  } catch (error) {
    console.log('⚠️  Certificate auth failed, trying client secret fallback...');
    console.log('   Certificate error:', error.message.split('\n')[0]);
    
    try {
      return await getAccessTokenWithClientSecret();
    } catch (secretError) {
      throw new Error(
        `Both authentication methods failed:\n` +
        `Certificate: ${error.message.split('\n')[0]}\n` +
        `Client Secret: ${secretError.message.split('\n')[0]}`
      );
    }
  }
}

/**
 * Option B: Certificate-based authentication (more secure)
 */
async function getAccessTokenWithCertificate() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const certThumbprint = process.env.CERT_THUMBPRINT;
  const certPath = process.env.CERT_PATH || 'scripts/mailer.pem';

  if (!certThumbprint) {
    throw new Error('Missing CERT_THUMBPRINT for certificate authentication');
  }

  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificate file not found: ${certPath}`);
  }

  // Load private key
  const privateKey = fs.readFileSync(certPath, 'utf8');
  
  // Create JWT client assertion
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  
  const jwtHeader = {
    alg: 'RS256',
    typ: 'JWT',
    x5t: certThumbprint
  };
  
  const jwtPayload = {
    aud: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    exp: Math.floor(Date.now() / 1000) + (10 * 60), // 10 minutes
    iss: clientId,
    jti: crypto.randomUUID(),
    nbf: Math.floor(Date.now() / 1000),
    sub: clientId
  };
  
  const clientAssertion = jwt.sign(jwtPayload, privateKey, { 
    algorithm: 'RS256',
    header: jwtHeader 
  });

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: clientAssertion,
    scope: 'https://graph.microsoft.com/.default'
  }).toString();

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Certificate auth failed: ${data.error_description || JSON.stringify(data)}`);
  }

  console.log('✅ Certificate authentication successful');
  return data.access_token;
}

/**
 * Option A: Client secret authentication (simpler, works immediately)
 */
async function getAccessTokenWithClientSecret() {
  const tenantId = process.env.TENANT_ID;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientSecret || clientSecret === 'your-client-secret-from-azure-ad') {
    throw new Error('Missing or placeholder CLIENT_SECRET in .env');
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
    throw new Error(`Client secret auth failed: ${data.error_description || JSON.stringify(data)}`);
  }

  console.log('✅ Client secret authentication successful');
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
  const sender = options.from || process.env.FROM_EMAIL || process.env.SMTP_USER;
  if (!sender) throw new Error('Sender email (FROM_EMAIL, SMTP_USER, or options.from) is required');

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

module.exports = { sendMailViaGraph, isGraphMailerAvailable };
