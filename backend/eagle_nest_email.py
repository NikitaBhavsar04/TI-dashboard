#!/usr/bin/env python3
"""
Eagle Nest Email Sender
Generates HTML from Eagle Nest advisory JSON and sends via email
"""

import os
import sys
import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from pathlib import Path

from utils.common import logger, read_yaml, ensure_dir, sanitize_filename
from renderer.render import render_html


def load_eagle_nest_advisory(advisory_id: str, workspace: str) -> dict:
    """Load Eagle Nest advisory JSON"""
    eagle_nest_path = os.path.join(workspace, "eagle_nest", f"{advisory_id}.json")
    
    if not os.path.exists(eagle_nest_path):
        raise FileNotFoundError(f"Advisory not found: {advisory_id}")
    
    with open(eagle_nest_path, "r", encoding="utf-8") as f:
        return json.load(f)


def convert_to_context(advisory: dict) -> dict:
    """Convert Eagle Nest JSON to template context format"""
    
    # Executive summary handling
    exec_summary_parts = advisory.get("exec_summary_parts", [])
    if not exec_summary_parts and advisory.get("exec_summary"):
        exec_summary_parts = [p.strip() for p in advisory["exec_summary"].split("\n\n") if p.strip()]
    
    context = {
        # Identity
        "advisory_id": advisory.get("advisory_id"),
        "title": advisory.get("title"),
        "full_title": advisory.get("full_title") or advisory.get("title"),
        "published": advisory.get("published"),
        
        # Classification
        "criticality": advisory.get("criticality", "MEDIUM"),
        "threat_type": advisory.get("threat_type"),
        "tlp": advisory.get("tlp", "AMBER"),
        
        # Executive Summary
        "exec_summary": advisory.get("exec_summary", ""),
        "exec_summary_parts": exec_summary_parts,
        
        # Business Impact
        "affected_product": advisory.get("affected_product"),
        "vendor": advisory.get("vendor"),
        "sectors": advisory.get("sectors", []),
        "regions": advisory.get("regions", []),
        
        # Intelligence
        "cves": advisory.get("cves", []),
        "cvss": advisory.get("cvss", {}),
        "mitre": advisory.get("mitre", []),
        "mbc": advisory.get("mbc", []),
        
        # Response
        "recommendations": advisory.get("recommendations", []),
        "patch_details": advisory.get("patch_details", []),
        
        # References
        "references": advisory.get("references", []),
        
        # Metadata
        "source": "Eagle Nest (Manual Generation)",
    }
    
    return context


def send_email(
    recipients: list,
    subject: str,
    html_content: str,
    html_path: str,
    custom_message: str = "",
    smtp_config: dict = None
):
    """Send email with HTML advisory"""
    
    if not smtp_config:
        raise ValueError("SMTP configuration required")
    
    # Create message
    msg = MIMEMultipart('alternative')
    msg['From'] = smtp_config.get('from_email', smtp_config['username'])
    msg['To'] = ', '.join(recipients)
    msg['Subject'] = subject
    
    # Add custom message if provided
    if custom_message:
        html_content = f"""
        <div style="background-color: #eff6ff; padding: 20px; margin-bottom: 30px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e40af;">Message from Security Team</h3>
            <p style="margin-bottom: 0; color: #1e3a8a;">{custom_message}</p>
        </div>
        {html_content}
        """
    
    # Attach HTML
    html_part = MIMEText(html_content, 'html')
    msg.attach(html_part)
    
    # Send email
    try:
        server = smtplib.SMTP(smtp_config['host'], smtp_config['port'])
        server.starttls()
        server.login(smtp_config['username'], smtp_config['password'])
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {len(recipients)} recipients")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise


def main():
    """Main entry point for email sending"""
    
    try:
        # Read input from stdin (sent by Node.js API)
        input_data = json.loads(sys.stdin.read())
        
        advisory_id = input_data['advisory_id']
        recipients = input_data['recipients']
        subject = input_data['subject']
        custom_message = input_data.get('custom_message', '')
        
        # Load config
        cfg = read_yaml("config.yaml")
        workspace = cfg.get("workspace", "./workspace")
        
        # Load advisory
        advisory = load_eagle_nest_advisory(advisory_id, workspace)
        logger.info(f"Loaded Eagle Nest advisory: {advisory_id}")
        
        # Convert to context format
        context = convert_to_context(advisory)
        
        # Generate HTML
        html_filename = f"{sanitize_filename(advisory_id)}_email.html"
        html_path = os.path.join(workspace, "email_cache", html_filename)
        ensure_dir(os.path.dirname(html_path))
        
        render_html("templates", context, html_path)
        logger.info(f"HTML generated: {html_path}")
        
        # Read HTML content
        with open(html_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        
        # Get SMTP config
        smtp_config = {
            'host': os.getenv('SMTP_HOST', cfg.get('email', {}).get('smtp_host')),
            'port': int(os.getenv('SMTP_PORT', cfg.get('email', {}).get('smtp_port', 587))),
            'username': os.getenv('SMTP_USER', cfg.get('email', {}).get('smtp_user')),
            'password': os.getenv('SMTP_PASS', cfg.get('email', {}).get('smtp_pass')),
            'from_email': os.getenv('EMAIL_FROM', cfg.get('email', {}).get('from_email'))
        }
        
        # Validate SMTP config
        if not all([smtp_config['host'], smtp_config['username'], smtp_config['password']]):
            raise ValueError("SMTP configuration incomplete. Check config.yaml or environment variables.")
        
        # Send email
        send_email(
            recipients=recipients,
            subject=subject,
            html_content=html_content,
            html_path=html_path,
            custom_message=custom_message,
            smtp_config=smtp_config
        )
        
        # Return success
        result = {
            "success": True,
            "html_path": html_path,
            "recipients_count": len(recipients)
        }
        
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"Email sending failed: {e}")
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)


if __name__ == "__main__":
    main()
