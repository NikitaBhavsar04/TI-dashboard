# ============================================================================
# Telegram API Configuration
# Get credentials from https://my.telegram.org/auth
# ============================================================================

API_ID = 38624614  # Integer value
API_HASH = "8474ab0b2e6dad94d0425ef6fc2004d7"  # String value
PHONE_NUMBER = "+918200789803"  # Your phone number with country code (e.g., +1 for US, +91 for India)

# Session file for authentication (will be created automatically)
SESSION_NAME = "telegram_scraper_session"

# Telegram Channels to Monitor
TELEGRAM_CHANNELS = [
    # Cybersecurity & Hacking Channels
    "IsacaRuSec",  # https://t.me/IsacaRuSec
    "ICTlive",  # https://t.me/ICTlive
    "ctinow",  # https://t.me/ctinow
    "defcon_news",  # https://t.me/defcon_news
    "aqinfo",  # https://t.me/aqinfo
    "bizone_channel",  # https://t.me/bizone_channel
    "threatinteltrends",  # https://t.me/threatinteltrends
    "linuxgram",  # https://t.me/linuxgram
    "cybdetective",  # https://t.me/cybdetective
    "CyberBankSa",  # https://t.me/CyberBankSa
    "hackersarena11",  # https://t.me/hackersarena11
    "HackerS_AsyLum",  # https://t.me/HackerS_AsyLum
    "Cyber_Security_Channel",  # https://t.me/Cyber_Security_Channel
    "topcybersecurity",  # https://t.me/topcybersecurity
    # Private channel by ID (from https://t.me/c/1381726456/24151)
    # Note: For private channels, you need to be a member first
    # 1381726456,  # Uncomment if you're a member
]

# Scraping Configuration
MAX_MESSAGES_PER_CHANNEL = 100  # Number of recent messages to fetch
MESSAGE_LIMIT_PER_RUN = 50  # Limit per fetch operation
FETCH_MEDIA = False  # Whether to download media files
FETCH_REPLIES = False  # Whether to fetch replies to messages

# Output Configuration
OUTPUT_FILE = "telegram_cyber_feeds.json"
OUTPUT_FORMAT = "json"  # Options: json, csv, sqlite

# Filter Keywords (optional - for content filtering)
KEYWORDS = [
    "vulnerability", "exploit", "zero-day", "CVE", "security",
    "malware", "ransomware", "breach", "hack", "threat",
    "phishing", "cybersecurity", "infosec", "CTF", "penetration testing"
]