import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# ==============================
# CONFIGURATION
# ==============================

SMTP_SERVER = "smtp.office365.com"
SMTP_PORT = 587

EMAIL_ADDRESS = "threatintelligence@forensiccybertech.com"
EMAIL_PASSWORD = "fclfyqfvzqpktmgm"

# ==============================
# CREATE MESSAGE
# ==============================

msg = MIMEMultipart("alternative")
msg["From"] = EMAIL_ADDRESS
msg["To"] = "prince.prajapati@forensiccybertech.com"
msg["Subject"] = "Microsoft 365 SMTP Test"

html_content = """
<html>
  <body>
    <h2>SMTP Test Successful</h2>
    <p>If you receive this, SMTP is working.</p>
  </body>
</html>
"""

msg.attach(MIMEText(html_content, "html"))

# ==============================
# SEND EMAIL
# ==============================

try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.starttls()
    server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
    server.sendmail(EMAIL_ADDRESS, msg["To"], msg.as_string())
    server.quit()
    print("Email sent successfully!")

except Exception as e:
    print("Error occurred:")
    print(e)