from flask import Blueprint, request, jsonify
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import os
import datetime
from utils.common import logger, read_yaml
from utils.opensearch_client import get_opensearch_client
from collectors.feeds import fetch_rss
from collectors.iocs import extract_iocs
from collectors.page import fetch_page_text
import manual_advisory

bp = Blueprint('test_pipeline', __name__)

# Get OpenSearch client and config
os_client = get_opensearch_client()
cfg = read_yaml("config.yaml")
RAW_INDEX = os.getenv("OPENSEARCH_RAW_INDEX", cfg.get("opensearch", {}).get("raw_index", "ti-raw-articles"))
ADV_INDEX = os.getenv("OPENSEARCH_ADVISORY_INDEX", cfg.get("opensearch", {}).get("advisory_index", "ti-generated-advisories"))


@bp.route('/db-health', methods=['GET'])
def db_health():
    """Check OpenSearch database health and connection"""
    try:
        # Ping the cluster
        if not os_client.ping():
            return jsonify({
                'status': 503,
                'connected': False,
                'error': 'OpenSearch connection failed'
            }), 503
        
        # Get cluster health
        health = os_client.cluster.health()
        
        # Get list of indices
        indices = list(os_client.indices.get_alias(index="*").keys())
        
        return jsonify({
            'status': 200,
            'connected': True,
            'cluster': 'running',
            'cluster_status': health.get('status', 'unknown'),
            'indices': indices
        }), 200
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return jsonify({
            'status': 503,
            'error': str(e)
        }), 503


@bp.route('/fetch-feeds', methods=['POST'])
def fetch_feeds():
    """Fetch articles from all configured RSS feeds"""
    try:
        cfg = read_yaml("config.yaml")
        feed_urls = cfg.get("feeds", {}).get("urls", [])
        
        if not feed_urls:
            return jsonify({
                'error': 'No feed URLs configured in config.yaml'
            }), 400
        
        # Fetch articles from RSS feeds
        articles = fetch_rss(feed_urls, seen_ids=set(), per_feed=10, days_back=7)
        
        # Format articles for API response
        formatted_articles = []
        for article in articles:
            formatted_articles.append({
                'id': article.get('id'),
                'title': article.get('title'),
                'summary': article.get('summary'),
                'article_url': article.get('link'),
                'source': article.get('source'),
                'article_text': '',  # Not fetched yet
                'nested_links': [],
                'cves': article.get('cves', []),
                'incident_key': None
            })
        
        return jsonify({
            'articles_fetched': len(formatted_articles),
            'articles': formatted_articles
        }), 200
    except Exception as e:
        logger.error(f"Feed fetching failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/extract-iocs-from-text', methods=['POST'])
def extract_iocs_from_text():
    """Extract IOCs from provided text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'text field is required'}), 400
        
        iocs = extract_iocs(text)
        
        return jsonify({'iocs': iocs}), 200
    except Exception as e:
        logger.error(f"IOC extraction failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/fetch-and-store', methods=['POST'])
def fetch_and_store():
    """Fetch articles from feeds and store in OpenSearch"""
    try:
        data = request.get_json()
        feed_urls = data.get('feed_urls', [])
        
        if not feed_urls:
            cfg = read_yaml("config.yaml")
            feed_urls = cfg.get("feeds", {}).get("urls", [])
        
        if not feed_urls:
            return jsonify({
                'error': 'No feed URLs provided or configured'
            }), 400
        
        # Fetch articles
        articles = fetch_rss(feed_urls, seen_ids=set(), per_feed=10, days_back=7)
        
        # Store in OpenSearch
        stored_count = 0
        for article in articles:
            try:
                # Fetch full article text
                article_text = fetch_page_text(article.get('link', ''), max_chars=20000)
                
                doc = {
                    'id': article.get('id'),
                    'title': article.get('title'),
                    'summary': article.get('summary'),
                    'article_url': article.get('link'),
                    'article_text': article_text,
                    'source': article.get('source'),
                    'nested_links': [],
                    'cves': article.get('cves', []),
                    'incident_key': None,
                    'created_at': datetime.datetime.utcnow().isoformat() + 'Z'
                }
                
                os_client.index(
                    index=RAW_INDEX,
                    id=doc['id'],
                    body=doc,
                    refresh='wait_for'
                )
                stored_count += 1
            except Exception as e:
                logger.warning(f"Failed to store article {article.get('id')}: {e}")
        
        return jsonify({
            'status': 200,
            'articles_fetched': len(articles),
            'articles_stored': stored_count,
            'message': f'Articles stored in {RAW_INDEX} index'
        }), 200
    except Exception as e:
        logger.error(f"Fetch and store failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/list-raw-articles', methods=['GET'])
def list_raw_articles():
    """List raw articles from OpenSearch"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        result = os_client.search(
            index=RAW_INDEX,
            body={
                'size': limit,
                'from': offset,
                'sort': [{'created_at': {'order': 'desc'}}],
                'query': {'match_all': {}}
            }
        )
        
        articles = []
        for hit in result.get('hits', {}).get('hits', []):
            source = hit['_source']
            articles.append({
                'id': source.get('id'),
                'title': source.get('title'),
                'summary': source.get('summary'),
                'source': source.get('source'),
                'article_url': source.get('article_url'),
                'cves': source.get('cves', []),
                'created_at': source.get('created_at')
            })
        
        total = result.get('hits', {}).get('total', {}).get('value', 0)
        
        return jsonify({
            'status': 200,
            'count': len(articles),
            'total': total,
            'articles': articles
        }), 200
    except Exception as e:
        logger.error(f"List raw articles failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/generate-from-text', methods=['POST'])
def generate_from_text():
    """Generate advisory from provided article data"""
    try:
        data = request.get_json()
        article_id = data.get('article_id')
        title = data.get('title')
        summary = data.get('summary')
        article_url = data.get('article_url')
        source = data.get('source')
        
        if not all([article_id, title]):
            return jsonify({
                'error': 'article_id and title are required'
            }), 400
        
        # First, store the article in raw index if it doesn't exist
        try:
            article_text = fetch_page_text(article_url, max_chars=20000) if article_url else summary
            
            doc = {
                'id': article_id,
                'title': title,
                'summary': summary or '',
                'article_url': article_url or '',
                'article_text': article_text,
                'source': source or 'Manual',
                'nested_links': [],
                'cves': [],
                'incident_key': None,
                'created_at': datetime.datetime.utcnow().isoformat() + 'Z'
            }
            
            os_client.index(
                index=RAW_INDEX,
                id=doc['id'],
                body=doc,
                refresh='wait_for'
            )
        except Exception as e:
            logger.warning(f"Failed to store raw article: {e}")
        
        # Generate advisory
        advisory = manual_advisory.generate_advisory(article_id)
        
        return jsonify({
            'status': 200,
            'advisory_id': advisory.get('advisory_id'),
            'title': advisory.get('title'),
            'criticality': advisory.get('criticality'),
            'cves': advisory.get('cves', []),
            'stored': True
        }), 200
    except Exception as e:
        logger.error(f"Generate from text failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/store-advisory', methods=['POST'])
def store_advisory():
    """Store a manually created advisory in OpenSearch"""
    try:
        data = request.get_json()
        advisory_id = data.get('advisory_id')
        
        if not advisory_id:
            return jsonify({
                'error': 'advisory_id is required'
            }), 400
        
        # Store in OpenSearch
        os_client.index(
            index=ADV_INDEX,
            id=advisory_id,
            body=data,
            refresh='wait_for'
        )
        
        return jsonify({
            'status': 201,
            'message': 'Advisory stored successfully',
            'advisory_id': advisory_id
        }), 201
    except Exception as e:
        logger.error(f"Store advisory failed: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/list-advisories', methods=['GET'])
def list_advisories():
    """List generated advisories from OpenSearch"""
    try:
        limit = int(request.args.get('limit', 10))
        offset = int(request.args.get('offset', 0))
        
        result = os_client.search(
            index=ADV_INDEX,
            body={
                'size': limit,
                'from': offset,
                'sort': [{'created_at': {'order': 'desc'}}],
                'query': {'match_all': {}}
            }
        )
        
        advisories = []
        for hit in result.get('hits', {}).get('hits', []):
            source = hit['_source']
            advisories.append({
                'advisory_id': source.get('advisory_id'),
                'title': source.get('title'),
                'criticality': source.get('criticality'),
                'threat_type': source.get('threat_type'),
                'cves': source.get('cves', []),
                'tlp': source.get('tlp'),
                'status': source.get('status'),
                'created_at': source.get('created_at')
            })
        
        total = result.get('hits', {}).get('total', {}).get('value', 0)
        
        return jsonify({
            'status': 200,
            'count': len(advisories),
            'total': total,
            'advisories': advisories
        }), 200
    except Exception as e:
        logger.error(f"List advisories failed: {e}")
        return jsonify({'error': str(e)}), 500
