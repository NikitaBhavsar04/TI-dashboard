"""
Configuration file for Reddit API credentials and settings
"""
import os

# Reddit API Credentials - loaded from environment variables (optional for public access)
REDDIT_CLIENT_ID = os.getenv('REDDIT_CLIENT_ID')
REDDIT_CLIENT_SECRET = os.getenv('REDDIT_CLIENT_SECRET')
REDDIT_USER_AGENT = os.getenv('REDDIT_USER_AGENT', 'python:cybersecurity-feed:v1.0 (by /u/anonymous)')

# API Mode: 'oauth' requires credentials, 'public' uses JSON endpoints (no auth)
API_MODE = 'public' if not REDDIT_CLIENT_ID else 'oauth'

# Subreddits to monitor
SUBREDDITS = [
    'cybersecurity',
    'netsec',
    'hacking',
    'threatintel',
    'blueteamsec',
    'redteamsec',
    'malware'
]

# Reddit API endpoints
REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token'
REDDIT_API_BASE = 'https://oauth.reddit.com'

# API settings
MAX_POSTS_PER_SUBREDDIT = 100
REQUEST_TIMEOUT = 30