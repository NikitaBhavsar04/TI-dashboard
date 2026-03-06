import os
import json
import logging
import requests
import time
from typing import Optional, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()  # Load .env file if present
except ImportError:
    pass

try:
    import msal
except ImportError:
    msal = None

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    boto3 = None
    ClientError = NoCredentialsError = Exception

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
LOG = logging.getLogger("mailer")

GRAPH_SEND_ENDPOINT = "https://graph.microsoft.com/v1.0/users/{from_email}/sendMail"


def load_private_key_from_file(path: str, password: str = None) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def load_private_key_from_aws(secret_name: str, region_name: str = None) -> str:
    """Load private key from AWS Secrets Manager with retry logic."""
    if not boto3:
        raise RuntimeError("boto3 not installed; pip install boto3")
    
    client = boto3.client("secretsmanager", region_name=region_name) if region_name else boto3.client("secretsmanager")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = client.get_secret_value(SecretId=secret_name)
            if "SecretString" in resp:
                return resp["SecretString"]
            return resp["SecretBinary"].decode("utf-8")
        except ClientError as e:
            if attempt == max_retries - 1:
                LOG.error(f"Failed to retrieve secret {secret_name}: {e}")
                raise
            time.sleep(2 ** attempt)  # exponential backoff
        except NoCredentialsError:
            raise RuntimeError("AWS credentials not configured. Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or use IAM role.")


def acquire_token_with_cert(tenant_id: str, client_id: str, private_key: str, thumbprint: str, scope: str) -> str:
    """Acquire access token using certificate authentication with caching (Option B)."""
    if not msal:
        raise RuntimeError("msal not installed; pip install msal")
    
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    client_cred = {"private_key": private_key, "thumbprint": thumbprint}
    
    # MSAL handles token caching automatically
    app = msal.ConfidentialClientApplication(
        client_id=client_id, 
        authority=authority, 
        client_credential=client_cred
    )
    
    token = app.acquire_token_silent(scopes=[scope], account=None)
    if not token:
        LOG.info("No cached token found, acquiring new token")
        token = app.acquire_token_for_client(scopes=[scope])
    
    if "access_token" not in token:
        error_desc = token.get("error_description", "Unknown error")
        error_code = token.get("error", "unknown_error")
        LOG.error(f"Failed to acquire token: {error_code} - {error_desc}")
        raise RuntimeError(f"Token acquisition failed: {error_desc}")
    
    LOG.info("Successfully acquired access token")
    return token["access_token"]


def acquire_token_with_client_secret(tenant_id: str, client_id: str, client_secret: str, scope: str) -> str:
    """Acquire access token using client secret authentication (Option A)."""
    if not msal:
        raise RuntimeError("msal not installed; pip install msal")
    
    authority = f"https://login.microsoftonline.com/{tenant_id}"
    
    # MSAL handles token caching automatically
    app = msal.ConfidentialClientApplication(
        client_id=client_id,
        authority=authority,
        client_credential=client_secret
    )
    
    token = app.acquire_token_silent(scopes=[scope], account=None)
    if not token:
        LOG.info("No cached token found, acquiring new token")
        token = app.acquire_token_for_client(scopes=[scope])
    
    if "access_token" not in token:
        error_desc = token.get("error_description", "Unknown error")
        error_code = token.get("error", "unknown_error")
        LOG.error(f"Failed to acquire token: {error_code} - {error_desc}")
        raise RuntimeError(f"Token acquisition failed: {error_desc}")
    
    LOG.info("Successfully acquired access token")
    return token["access_token"]


def send_mail(access_token: str, from_email: str, to_email: str, subject: str, body_text: str, 
              save_to_sent: bool = True, is_html: bool = False, cc_emails: Optional[list] = None, 
              bcc_emails: Optional[list] = None, attachments: Optional[list] = None) -> Dict[str, Any]:
    """Send email via Microsoft Graph API with comprehensive options."""
    url = GRAPH_SEND_ENDPOINT.format(from_email=from_email)
    headers = {
        "Authorization": f"Bearer {access_token}", 
        "Content-Type": "application/json",
        "User-Agent": "ThreatIntelligence-Dashboard/1.0"
    }
    
    to_recipients = [{"emailAddress": {"address": to_email}}]
    cc_recipients = [{"emailAddress": {"address": email}} for email in (cc_emails or [])]
    bcc_recipients = [{"emailAddress": {"address": email}} for email in (bcc_emails or [])]
    
    payload = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "HTML" if is_html else "Text", 
                "content": body_text
            },
            "toRecipients": to_recipients
        },
        "saveToSentItems": save_to_sent
    }
    
    if cc_recipients:
        payload["message"]["ccRecipients"] = cc_recipients
    if bcc_recipients:
        payload["message"]["bccRecipients"] = bcc_recipients
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
            
            if resp.status_code == 202:  # Accepted
                LOG.info(f"Email sent successfully to {to_email}")
                return {"status": "success", "message": "Email sent", "response_code": resp.status_code}
            elif resp.status_code >= 400:
                error_detail = resp.text
                try:
                    error_json = resp.json()
                    error_detail = error_json.get("error", {}).get("message", error_detail)
                except:
                    pass
                
                if attempt == max_retries - 1:
                    LOG.error(f"sendMail failed after {max_retries} attempts: {resp.status_code} - {error_detail}")
                    resp.raise_for_status()
                else:
                    LOG.warning(f"Attempt {attempt + 1} failed: {resp.status_code} - {error_detail}. Retrying...")
                    time.sleep(2 ** attempt)
                    continue
            
            return {"status": "success", "message": "Email sent", "response_code": resp.status_code}
            
        except requests.exceptions.Timeout:
            if attempt == max_retries - 1:
                raise RuntimeError("Email sending timed out after multiple attempts")
            LOG.warning(f"Timeout on attempt {attempt + 1}, retrying...")
            time.sleep(2 ** attempt)
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise RuntimeError(f"Network error sending email: {e}")
            LOG.warning(f"Network error on attempt {attempt + 1}: {e}. Retrying...")
            time.sleep(2 ** attempt)
    
    raise RuntimeError("Failed to send email after all retry attempts")


def validate_config() -> Dict[str, str]:
    """Validate and return configuration from environment variables (supports both auth methods)."""
    config = {
        "tenant_id": os.environ.get("TENANT_ID"),
        "client_id": os.environ.get("CLIENT_ID"),
        "cert_thumb": os.environ.get("CERT_THUMBPRINT"),
        "cert_path": os.environ.get("CERT_PATH", "scripts/mailer.pem"),
        "client_secret": os.environ.get("CLIENT_SECRET"),
        "prefer_client_secret": os.environ.get("PREFER_CLIENT_SECRET", "false").lower() == "true",
        "graph_scope": os.environ.get("GRAPH_SCOPE", "https://graph.microsoft.com/.default"),
        "from_email": os.environ.get("FROM_EMAIL"),
        "aws_secret": os.environ.get("AWS_MAILER_SECRET_NAME"),
        "aws_region": os.environ.get("AWS_REGION"),
    }
    
    # Basic required fields
    basic_required = ["tenant_id", "client_id", "from_email"]
    basic_missing = [k for k in basic_required if not config[k]]
    
    if basic_missing:
        LOG.error(f"Missing required environment variables: {', '.join(basic_missing).upper()}")
        raise SystemExit(1)
    
    # Check authentication method availability
    has_cert = config["cert_thumb"] and (config["aws_secret"] or os.path.exists(config["cert_path"]))
    has_secret = config["client_secret"] and config["client_secret"] != "your-client-secret-from-azure-ad"
    
    if not has_cert and not has_secret:
        LOG.error("No authentication method available!")
        LOG.error("Need either:")
        LOG.error("  Certificate: CERT_THUMBPRINT + (CERT_PATH file OR AWS_MAILER_SECRET_NAME)")
        LOG.error("  Client Secret: CLIENT_SECRET")
        raise SystemExit(1)
    
    # Validate thumbprint format if using certificates
    if has_cert and config["cert_thumb"]:
        thumb = config["cert_thumb"]
        if not (len(thumb) == 40 and all(c in '0123456789ABCDEFabcdef' for c in thumb)):
            LOG.warning(f"CERT_THUMBPRINT format may be invalid: {thumb}")
    
    return config


def send_test_email(config: Dict[str, str]) -> bool:
    """Send a test email using certificate or client secret authentication with fallback."""
    # Determine authentication methods available
    has_cert = config["cert_thumb"] and (config["aws_secret"] or os.path.exists(config["cert_path"]))
    has_secret = config["client_secret"] and config["client_secret"] != "your-client-secret-from-azure-ad"
    
    auth_method_used = None
    token = None
    
    # Try authentication methods based on preference and availability
    if config["prefer_client_secret"] and has_secret:
        # Prefer client secret if explicitly requested
        try:
            LOG.info("🔧 Using client secret authentication (preferred)...")
            token = acquire_token_with_client_secret(
                tenant_id=config["tenant_id"],
                client_id=config["client_id"],
                client_secret=config["client_secret"],
                scope=config["graph_scope"]
            )
            auth_method_used = "Client Secret (Option A)"
        except Exception as e:
            LOG.warning(f"Client secret auth failed: {e}")
            if has_cert:
                LOG.info("Falling back to certificate authentication...")
            else:
                LOG.error("No fallback authentication method available")
                return False
    
    # Try certificate authentication if no token yet
    if not token and has_cert:
        try:
            LOG.info("🔒 Trying certificate authentication...")
            
            # Load private key
            if config["aws_secret"]:
                LOG.info(f"Loading private key from AWS Secrets Manager: {config['aws_secret']}")
                private_key = load_private_key_from_aws(config["aws_secret"], region_name=config["aws_region"])
            else:
                LOG.info(f"Loading private key from file: {config['cert_path']}")
                private_key = load_private_key_from_file(config["cert_path"])
            
            token = acquire_token_with_cert(
                tenant_id=config["tenant_id"],
                client_id=config["client_id"],
                private_key=private_key,
                thumbprint=config["cert_thumb"],
                scope=config["graph_scope"]
            )
            auth_method_used = "Certificate (Option B)"
            
        except Exception as e:
            LOG.warning(f"Certificate auth failed: {e}")
            if has_secret and not config["prefer_client_secret"]:
                LOG.info("Falling back to client secret authentication...")
            else:
                LOG.error("Certificate authentication failed and no fallback available")
                return False
    
    # Try client secret as fallback if still no token
    if not token and has_secret and not config["prefer_client_secret"]:
        try:
            LOG.info("🔧 Trying client secret authentication (fallback)...")
            token = acquire_token_with_client_secret(
                tenant_id=config["tenant_id"],
                client_id=config["client_id"],
                client_secret=config["client_secret"],
                scope=config["graph_scope"]
            )
            auth_method_used = "Client Secret (Option A - Fallback)"
            
        except Exception as e:
            LOG.error(f"Both authentication methods failed. Client secret error: {e}")
            return False
    
    if not token:
        LOG.error("Failed to acquire access token with any available method")
        return False
    
    try:
        # Send test email
        to_email = os.environ.get("TO_EMAIL") or os.environ.get("TEST_TO_EMAIL") or config["from_email"]
        subject = os.environ.get("TEST_SUBJECT", f"✅ ThreatIntel Mailer - {auth_method_used} Test")
        
        body = f"""This is a test message from the ThreatIntelligence Dashboard mailer system.

🔐 Authentication: {auth_method_used}
📧 From: {config['from_email']}
🏢 Tenant: {config['tenant_id']}
⚙️  Client: {config['client_id']}"""

        if "Certificate" in auth_method_used:
            body += f"""
📜 Cert Thumbprint: {config['cert_thumb'][:8]}..."""
        
        body += f"""
🕐 Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

If you received this email, your Microsoft Graph authentication is working correctly!"""
        
        result = send_mail(
            access_token=token,
            from_email=config["from_email"],
            to_email=to_email,
            subject=subject,
            body_text=body
        )
        
        LOG.info(f"✅ Test email sent successfully to {to_email}")
        LOG.info(f"🔐 Authentication method used: {auth_method_used}")
        return True
        
    except Exception as e:
        LOG.error(f"❌ Test email failed: {e}")
        return False


def main():
    """Main function with comprehensive error handling."""
    LOG.info("=== ThreatIntelligence Dashboard - Microsoft Graph Mailer ===")
    
    try:
        config = validate_config()
        LOG.info(f"Configuration loaded. From: {config['from_email']}, Tenant: {config['tenant_id']}")
        
        success = send_test_email(config)
        if success:
            LOG.info("🎉 Mailer test completed successfully!")
            return 0
        else:
            LOG.error("💥 Mailer test failed. Check logs above for details.")
            return 1
            
    except KeyboardInterrupt:
        LOG.info("\n⏹️  Test cancelled by user")
        return 130
    except Exception as e:
        LOG.error(f"💥 Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    raise SystemExit(exit_code)