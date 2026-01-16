# Raw Articles Feed Feature

## Overview
This feature allows admin users to fetch, view, and manage raw security threat articles from RSS feeds directly within the admin dashboard.

## Files Created/Modified

### API Endpoints
1. **`/api/raw-articles`** (`pages/api/raw-articles/index.ts`)
   - `GET`: Fetches articles from `backend/workspace/raw_articles.json`
   - Returns article count and last fetched timestamp
   - Admin authentication required

2. **`/api/raw-articles/fetch`** (`pages/api/raw-articles/fetch.ts`)
   - `POST`: Runs `raw_article_fetcher.py` to fetch new articles
   - Executes Python script and returns output
   - Admin authentication required

### Pages
3. **`/admin/raw-articles`** (`pages/admin/raw-articles.tsx`)
   - Displays all raw articles in a searchable, filterable UI
   - Features:
     - Search by title, source, summary, or CVEs
     - Filter by status (NEW, PROCESSED, REJECTED)
     - View article details (full text, nested links, CVEs)
     - "Fetch New Articles" button to run the Python fetcher
     - Stats dashboard showing total articles, new articles, CVE count
     - Expandable article cards with full content

4. **`/admin`** (`pages/admin/index.tsx`)
   - Added "Threat Intelligence" section with "Raw Articles Feed" button
   - Reorganized quick actions into 4 columns

## Usage

### Access Raw Articles
1. Log in as admin/super_admin
2. Go to Admin Dashboard
3. Click "Raw Articles Feed" button under "Threat Intelligence"

### Fetch New Articles
1. On the Raw Articles page, click "Fetch New Articles"
2. The Python script will run in the background
3. New articles will be added to `backend/workspace/raw_articles.json`
4. Page will automatically refresh to show new articles

### Search & Filter
- **Search**: Type in the search box to filter by title, source, summary, or CVE
- **Filter**: Select status from dropdown (All Status, New, Processed, Rejected)
- **Expand**: Click "Show More" on any article to see full text and nested links

## Data Storage
- **Location**: `backend/workspace/raw_articles.json`
- **Seen IDs**: `backend/workspace/seen_items_rss.json`
- **Config**: `backend/config.yaml` (workspace path, RSS sources)

## Python Script
- **File**: `raw_article_fetcher.py`
- **Purpose**: Fetches articles from RSS feeds configured in `backend/config.yaml`
- **Features**:
  - Multi-threaded fetching (8 workers)
  - Extracts article text, CVEs, nested links
  - Filters by keywords (positive/negative)
  - De-duplicates based on URL hash
  - Collects articles from last 14 days

## UI Features
- **Stats Cards**: Total articles, new articles, CVE count, last fetched time
- **Status Badges**: Color-coded (NEW=green, PROCESSED=blue, REJECTED=red)
- **Expandable Cards**: Click to show full article text and nested links
- **External Links**: Direct links to original articles
- **CVE Tags**: Display all CVEs found in articles

## Security
- Admin/super_admin authentication required for all endpoints
- Token verification on API routes
- No public access to raw articles data

## Dependencies
- Python 3.x
- Python packages: `requests`, `feedparser`, `beautifulsoup4`, `python-dateutil`, `PyYAML`
- All dependencies already configured in the project
