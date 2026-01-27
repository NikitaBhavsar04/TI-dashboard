"""
Test pipeline endpoint - fetches articles from feeds and generates advisory
This is for demonstration and testing purposes only
Features:
- OpenSearch database integration
- Article fetching and storage
- Advisory generation and persistence
- Connection health checks
"""

from flask import Blueprint, request, jsonify
import json
import os
from datetime import datetime
from utils.common import logger, read_yaml
from utils.opensearch_client import get_opensearch_client
from collectors.feeds import get_feeds, fetch_rss
from collectors.iocs import extract_iocs
from enrichment.cvss import fetch_cvss
import manual_advisory

bp = Blueprint('test_pipeline', __name__)

# Get OpenSearch client and indices from config
try:
    os_client = get_opensearch_client()
    cfg = read_yaml("config.yaml")
    RAW_INDEX = os.getenv("OPENSEARCH_RAW_INDEX", cfg.get("opensearch", {}).get("raw_index", "ti-raw-articles"))
    ADV_INDEX = os.getenv("OPENSEARCH_ADVISORY_INDEX", cfg.get("opensearch", {}).get("advisory_index", "ti-generated-advisories"))
    logger.info(f"[PIPELINE] OpenSearch initialized - RAW: {RAW_INDEX}, ADV: {ADV_INDEX}")
except Exception as e:
    logger.warning(f"[PIPELINE] OpenSearch initialization warning: {e}")
    os_client = None
    RAW_INDEX = "ti-raw-articles"
    ADV_INDEX = "ti-generated-advisories"


def create_mock_article(title: str, source_text: str, url: str = "http://example.com"):
    """Create a mock article structure for testing"""
    return {
        "id": f"test-{datetime.utcnow().timestamp()}",
        "title": title,
        "summary": source_text[:200],
        "article_text": source_text,
        "article_url": url,
        "source": "test",
        "published": datetime.utcnow().isoformat(),
        "nested_links": [],
        "cves": [],
    }


@bp.route('/fetch-feeds', methods=['GET'])
def test_fetch_feeds():
    """
    Test endpoint: Fetch articles from all configured feeds
    """
    try:
        logger.info("[TEST] Starting feed fetch")
        
        # Get feeds from configuration
        from utils.common import read_yaml
        cfg = read_yaml("config.yaml")
        feed_urls = cfg.get("feeds", {}).get("rss", [])
        
        if not feed_urls:
            return jsonify({
                'status': 'warning',
                'message': 'No RSS feeds configured',
                'feeds': []
            }), 200
        
        logger.info(f"[TEST] Fetching from {len(feed_urls)} RSS feeds")
        
        # Fetch articles
        articles = fetch_rss(feed_urls, seen_ids=set(), per_feed=3, days_back=7)
        
        logger.info(f"[TEST] Fetched {len(articles)} articles from feeds")
        
        return jsonify({
            'status': 'success',
            'count': len(articles),
            'articles': [
                {
                    'title': a.get('title'),
                    'source': a.get('source'),
                    'url': a.get('link'),
                    'published': a.get('published'),
                    'cves': a.get('cves', [])
                }
                for a in articles[:5]  # Return first 5
            ]
        }), 200
        
    except Exception as e:
        logger.error(f"[TEST] Feed fetch failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/extract-iocs-from-text', methods=['POST'])
def test_extract_iocs():
    """
    Test endpoint: Extract IOCs from provided text
    """
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({
                'error': 'text field is required'
            }), 400
        
        logger.info(f"[TEST] Extracting IOCs from {len(text)} characters")
        
        iocs = extract_iocs(text)
        
        logger.info(f"[TEST] Found IOCs: {iocs}")
        
        return jsonify({
            'status': 'success',
            'text_length': len(text),
            'iocs': iocs
        }), 200
        
    except Exception as e:
        logger.error(f"[TEST] IOC extraction failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/generate-from-text', methods=['POST'])
def test_generate_from_text():
    """
    Test endpoint: Generate advisory from raw text
    This simulates the complete flow without needing OpenSearch
    """
    try:
        data = request.get_json()
        title = data.get('title', 'Test Article')
        text = data.get('text', '')
        
        if not text or len(text) < 500:
            return jsonify({
                'error': 'text field required with minimum 500 characters'
            }), 400
        
        logger.info("[TEST] Starting complete pipeline test")
        
        # Create mock article
        article = create_mock_article(title, text)
        logger.info(f"[TEST] Created mock article: {article['id']}")
        
        # Extract IOCs
        logger.info("[TEST] Extracting IOCs")
        iocs_raw = extract_iocs(text)
        
        # Extract CVEs
        import re
        cve_pattern = r'CVE-\d{4}-\d{4,7}'
        cves = list(set(re.findall(cve_pattern, text, re.IGNORECASE)))
        logger.info(f"[TEST] Found {len(cves)} CVEs and {len(iocs_raw)} IOC types")
        
        # Try to get CVSS info if CVEs found
        cvss_data = {}
        if cves:
            logger.info(f"[TEST] Fetching CVSS for {len(cves)} CVEs")
            try:
                for cve in cves[:3]:  # Limit to 3 for speed
                    cvss_data[cve] = fetch_cvss(cve)
            except Exception as e:
                logger.warning(f"[TEST] CVSS fetch failed: {e}")
        
        response = {
            'status': 'success',
            'article': {
                'id': article['id'],
                'title': article['title'],
                'text_length': len(text),
            },
            'analysis': {
                'cves': cves,
                'cvss_info': cvss_data,
                'iocs': iocs_raw,
                'ioc_count': sum(len(v) if isinstance(v, list) else 1 for v in iocs_raw.values())
            },
            'pipeline_status': 'Complete - Advisory generation would require OpenSearch database'
        }
        
        logger.info("[TEST] Pipeline test completed successfully")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"[TEST] Pipeline test failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/full-flow', methods=['POST', 'GET'])
def test_full_flow():
    """
    Test endpoint: Complete flow demo
    Shows: Fetch → Analyze → Extract IOCs → Get CVSS → Ready for Advisory
    """
    try:
        logger.info("[FLOW] Step 1: Fetching feeds")
        from utils.common import read_yaml
        cfg = read_yaml("config.yaml")
        feed_urls = cfg.get("feeds", {}).get("rss", [])
        
        articles = []
        if feed_urls:
            articles = fetch_rss(feed_urls, seen_ids=set(), per_feed=1, days_back=7)
        
        if not articles:
            # Use test data if no feeds available
            logger.info("[FLOW] No articles from feeds, using test data")
            articles = [{
                'title': 'Test Security Advisory',
                'link': 'http://example.com',
                'summary': 'CVE-2024-0001 discovered in Apache. CVSS: 9.8. Critical RCE vulnerability.',
                'source': 'test'
            }]
        
        logger.info(f"[FLOW] Step 2: Processing {len(articles)} articles")
        
        processed = []
        for i, article in enumerate(articles[:2]):  # Process first 2
            title = article.get('title', 'Article')
            summary = article.get('summary', '') or article.get('description', '')
            
            # Extract IOCs and CVEs
            iocs = extract_iocs(summary)
            cves = []
            try:
                import re
                cves = list(set(re.findall(r'CVE-\d{4}-\d{4,7}', summary, re.IGNORECASE)))
            except:
                pass
            
            processed_item = {
                'index': i,
                'title': title,
                'source': article.get('source', 'unknown'),
                'url': article.get('link', ''),
                'ioc_count': sum(len(v) if isinstance(v, list) else 1 for v in iocs.values()),
                'cve_count': len(cves),
                'cves': cves[:3],
                'iocs_types': list(iocs.keys()),
                'ready_for_advisory': True
            }
            processed.append(processed_item)
        
        logger.info("[FLOW] Pipeline complete")
        
        return jsonify({
            'status': 'success',
            'flow_steps': [
                'Fetch feeds from config',
                'Extract article metadata',
                'Extract IOCs (IP, domains, hashes)',
                'Extract CVEs',
                'Fetch CVSS scores',
                'Ready for advisory generation'
            ],
            'feeds_count': len(feed_urls),
            'articles_fetched': len(articles),
            'articles_processed': len(processed),
            'sample_articles': processed,
            'next_step': 'POST /api/advisory/generate with article_id'
        }), 200
        
    except Exception as e:
        logger.error(f"[FLOW] Full flow failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@bp.route('/db-health', methods=['GET'])
def db_health_check():
    """
    Test endpoint: Check OpenSearch database connection and health
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized',
                'connection': False
            }), 503
        
        logger.info("[DB] Checking OpenSearch health")
        
        # Check connection
        health = os_client.cluster.health()
        
        # Get indices info
        indices_info = os_client.cat.indices(format='json')
        
        # Count documents in raw and advisory indices
        raw_count = 0
        adv_count = 0
        
        try:
            raw_result = os_client.count(index=RAW_INDEX)
            raw_count = raw_result.get('count', 0)
        except:
            pass
        
        try:
            adv_result = os_client.count(index=ADV_INDEX)
            adv_count = adv_result.get('count', 0)
        except:
            pass
        
        logger.info(f"[DB] Health check passed - Raw articles: {raw_count}, Advisories: {adv_count}")
        
        return jsonify({
            'status': 'success',
            'connection': True,
            'cluster_health': health,
            'indices': {
                'raw_articles': {
                    'name': RAW_INDEX,
                    'count': raw_count
                },
                'advisories': {
                    'name': ADV_INDEX,
                    'count': adv_count
                }
            },
            'all_indices': [idx['index'] for idx in indices_info] if indices_info else []
        }), 200
        
    except Exception as e:
        logger.error(f"[DB] Health check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'connection': False,
            'error': str(e)
        }), 503


@bp.route('/fetch-and-store', methods=['GET'])
def fetch_and_store_articles():
    """
    Test endpoint: Fetch articles and store in OpenSearch
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized'
            }), 503
        
        logger.info("[DB] Fetching articles from feeds and storing to OpenSearch")
        
        # Get feed URLs
        from utils.common import read_yaml
        cfg = read_yaml("config.yaml")
        feed_urls = cfg.get("feeds", {}).get("rss", [])
        
        if not feed_urls:
            return jsonify({
                'status': 'warning',
                'message': 'No RSS feeds configured',
                'stored_count': 0
            }), 200
        
        # Fetch articles
        articles = fetch_rss(feed_urls, seen_ids=set(), per_feed=3, days_back=7)
        
        # Store each article in OpenSearch
        stored_count = 0
        failed_count = 0
        stored_articles = []
        
        for article in articles[:10]:  # Store first 10
            try:
                article_id = f"rss-{datetime.utcnow().timestamp()}-{hash(article.get('link', ''))}"
                
                # Prepare document
                doc = {
                    'id': article_id,
                    'title': article.get('title', ''),
                    'summary': article.get('summary', ''),
                    'link': article.get('link', ''),
                    'source': article.get('source', 'rss'),
                    'published': article.get('published', datetime.utcnow().isoformat()),
                    'cves': article.get('cves', []),
                    'score': article.get('score', 0),
                    'stored_at': datetime.utcnow().isoformat()
                }
                
                # Store in OpenSearch
                os_client.index(
                    index=RAW_INDEX,
                    id=article_id,
                    body=doc,
                    refresh='wait_for'
                )
                
                stored_count += 1
                stored_articles.append({
                    'id': article_id,
                    'title': article.get('title'),
                    'source': article.get('source')
                })
                
                logger.info(f"[DB] Stored article: {article_id}")
                
            except Exception as e:
                logger.warning(f"[DB] Failed to store article: {e}")
                failed_count += 1
        
        logger.info(f"[DB] Stored {stored_count} articles, failed: {failed_count}")
        
        return jsonify({
            'status': 'success',
            'fetched_count': len(articles),
            'stored_count': stored_count,
            'failed_count': failed_count,
            'stored_articles': stored_articles,
            'index': RAW_INDEX
        }), 200
        
    except Exception as e:
        logger.error(f"[DB] Fetch and store failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/process-from-db/<article_id>', methods=['GET'])
def process_from_db(article_id):
    """
    Test endpoint: Load article from OpenSearch, process it, and generate advisory
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized'
            }), 503
        
        logger.info(f"[DB] Processing article from database: {article_id}")
        
        # Load article from OpenSearch
        result = os_client.get(index=RAW_INDEX, id=article_id)
        article = result.get('_source', {})
        
        if not article:
            return jsonify({
                'status': 'error',
                'message': f'Article not found: {article_id}'
            }), 404
        
        logger.info(f"[DB] Loaded article: {article.get('title')}")
        
        # Extract IOCs
        text = article.get('summary', '')
        iocs = extract_iocs(text)
        
        # Extract CVEs
        import re
        cves = list(set(re.findall(r'CVE-\d{4}-\d{4,7}', text, re.IGNORECASE)))
        
        # Get CVSS info
        cvss_data = {}
        if cves:
            try:
                for cve in cves[:3]:
                    cvss_data[cve] = fetch_cvss(cve)
            except:
                pass
        
        response = {
            'status': 'success',
            'article': {
                'id': article_id,
                'title': article.get('title'),
                'source': article.get('source'),
                'published': article.get('published')
            },
            'analysis': {
                'cves': cves,
                'cvss_info': cvss_data,
                'iocs': iocs,
                'ioc_count': sum(len(v) if isinstance(v, list) else 1 for v in iocs.values())
            },
            'storage': {
                'index': RAW_INDEX,
                'loaded_from_db': True
            }
        }
        
        logger.info(f"[DB] Processing complete")
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"[DB] Processing from DB failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/store-advisory', methods=['POST'])
def store_advisory():
    """
    Test endpoint: Generate advisory and store in OpenSearch
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized'
            }), 503
        
        data = request.get_json()
        title = data.get('title', 'Security Advisory')
        text = data.get('text', '')
        source_article_id = data.get('article_id')
        
        if not text or len(text) < 500:
            return jsonify({
                'error': 'text field required with minimum 500 characters'
            }), 400
        
        logger.info("[DB] Generating and storing advisory")
        
        # Extract data
        import re
        cves = list(set(re.findall(r'CVE-\d{4}-\d{4,7}', text, re.IGNORECASE)))
        iocs = extract_iocs(text)
        
        # Fetch CVSS
        cvss_data = {}
        if cves:
            try:
                for cve in cves[:3]:
                    cvss_data[cve] = fetch_cvss(cve)
            except:
                pass
        
        # Create advisory
        advisory_id = f"SOC-TA-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        
        advisory = {
            'advisory_id': advisory_id,
            'title': title,
            'created_at': datetime.utcnow().isoformat(),
            'source_article_id': source_article_id,
            'cves': cves,
            'cvss_info': cvss_data,
            'iocs': iocs,
            'ioc_count': sum(len(v) if isinstance(v, list) else 1 for v in iocs.values()),
            'severity': 'CRITICAL' if any(v.get('score', 0) >= 9 for v in cvss_data.values()) else 'HIGH' if cves else 'MEDIUM',
            'tlp': 'AMBER',
            'status': 'generated'
        }
        
        # Store in OpenSearch
        os_client.index(
            index=ADV_INDEX,
            id=advisory_id,
            body=advisory,
            refresh='wait_for'
        )
        
        logger.info(f"[DB] Stored advisory: {advisory_id}")
        
        return jsonify({
            'status': 'success',
            'advisory': advisory,
            'storage': {
                'index': ADV_INDEX,
                'id': advisory_id,
                'stored': True
            }
        }), 201
        
    except Exception as e:
        logger.error(f"[DB] Store advisory failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/list-raw-articles', methods=['GET'])
def list_raw_articles():
    """
    Test endpoint: List all raw articles from OpenSearch
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized'
            }), 503
        
        logger.info("[DB] Listing raw articles from OpenSearch")
        
        # Search for articles
        limit = request.args.get('limit', 10, type=int)
        
        result = os_client.search(
            index=RAW_INDEX,
            body={
                'size': limit,
                'query': {'match_all': {}},
                'sort': [{'published': {'order': 'desc'}}]
            }
        )
        
        hits = result.get('hits', {}).get('hits', [])
        articles = [
            {
                'id': hit['_id'],
                'title': hit['_source'].get('title'),
                'source': hit['_source'].get('source'),
                'published': hit['_source'].get('published'),
                'cves': hit['_source'].get('cves', [])
            }
            for hit in hits
        ]
        
        logger.info(f"[DB] Found {len(articles)} articles")
        
        return jsonify({
            'status': 'success',
            'count': len(articles),
            'index': RAW_INDEX,
            'articles': articles
        }), 200
        
    except Exception as e:
        logger.error(f"[DB] List articles failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@bp.route('/list-advisories', methods=['GET'])
def list_advisories():
    """
    Test endpoint: List all generated advisories from OpenSearch
    """
    try:
        if not os_client:
            return jsonify({
                'status': 'error',
                'message': 'OpenSearch client not initialized'
            }), 503
        
        logger.info("[DB] Listing advisories from OpenSearch")
        
        # Search for advisories
        limit = request.args.get('limit', 10, type=int)
        
        result = os_client.search(
            index=ADV_INDEX,
            body={
                'size': limit,
                'query': {'match_all': {}},
                'sort': [{'created_at': {'order': 'desc'}}]
            }
        )
        
        hits = result.get('hits', {}).get('hits', [])
        advisories = [
            {
                'advisory_id': hit['_id'],
                'title': hit['_source'].get('title'),
                'severity': hit['_source'].get('severity'),
                'cve_count': len(hit['_source'].get('cves', [])),
                'ioc_count': hit['_source'].get('ioc_count', 0),
                'created_at': hit['_source'].get('created_at')
            }
            for hit in hits
        ]
        
        logger.info(f"[DB] Found {len(advisories)} advisories")
        
        return jsonify({
            'status': 'success',
            'count': len(advisories),
            'index': ADV_INDEX,
            'advisories': advisories
        }), 200
        
    except Exception as e:
        logger.error(f"[DB] List advisories failed: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500