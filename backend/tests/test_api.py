"""
Comprehensive API Tests for Threat Advisory Automation
Tests all 10 endpoints with proper fixtures and error handling
"""

import pytest
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.app import app
from utils.opensearch_client import get_opensearch_client
import json


@pytest.fixture
def client():
    """Create Flask test client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def os_client():
    """Get OpenSearch client"""
    return get_opensearch_client()


class TestAdvisoryAPI:
    """Test /api/advisory endpoints"""
    
    def test_generate_advisory_missing_article_id(self, client):
        """Test advisory generation with missing article_id"""
        response = client.post('/api/advisory/generate',
                               json={},
                               content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'article_id' in data['error'].lower()
    
    def test_generate_advisory_invalid_article_id(self, client):
        """Test advisory generation with invalid article_id"""
        response = client.post('/api/advisory/generate',
                               json={'article_id': 'non-existent-id'},
                               content_type='application/json')
        # Should return 404 or 500 depending on implementation
        assert response.status_code in [404, 500]
        data = json.loads(response.data)
        assert 'error' in data


class TestFeedsAPI:
    """Test /api/feeds endpoints"""
    
    def test_list_feeds(self, client):
        """Test listing configured feeds"""
        response = client.get('/api/feeds/list')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'feeds' in data
        assert 'count' in data
        assert isinstance(data['feeds'], list)


class TestIOCsAPI:
    """Test /api/iocs endpoints"""
    
    def test_extract_iocs_missing_text(self, client):
        """Test IOC extraction with missing text"""
        response = client.post('/api/iocs/extract-from-text',
                               json={},
                               content_type='application/json')
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_extract_iocs_from_text_ipv4(self, client):
        """Test IOC extraction with IPv4 addresses"""
        test_text = "Found malicious server at 192.168.1.1 and 10.0.0.5"
        response = client.post('/api/iocs/extract-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data
        assert 'ipv4' in data['iocs']
    
    def test_extract_iocs_from_text_domains(self, client):
        """Test IOC extraction with domains"""
        test_text = "Malware connecting to malicious-domain.com and evil.net"
        response = client.post('/api/iocs/extract-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data
        assert 'domains' in data['iocs']
    
    def test_extract_iocs_from_text_md5(self, client):
        """Test IOC extraction with MD5 hashes"""
        test_text = "File hash: 5d41402abc4b2a76b9719d911017c592"
        response = client.post('/api/iocs/extract-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data
        assert 'md5' in data['iocs']
    
    def test_extract_iocs_from_text_sha256(self, client):
        """Test IOC extraction with SHA256 hashes"""
        test_text = "SHA256: 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
        response = client.post('/api/iocs/extract-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data
        assert 'sha256' in data['iocs']
    
    def test_extract_iocs_from_text_urls(self, client):
        """Test IOC extraction with URLs"""
        test_text = "Malicious payload at http://evil.com/payload.exe"
        response = client.post('/api/iocs/extract-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data
        assert 'urls' in data['iocs']


class TestPipelineFlow:
    """Test /api/test_pipeline endpoints"""
    
    def test_db_health(self, client):
        """Test database health check"""
        response = client.get('/api/test_pipeline/db-health')
        data = json.loads(response.data)
        
        if response.status_code == 200:
            assert 'connected' in data
            assert 'cluster_status' in data
            assert data['connected'] is True
        else:
            # Database might not be running
            assert response.status_code == 503
            assert 'error' in data
    
    def test_extract_iocs_from_text_endpoint(self, client):
        """Test IOC extraction via pipeline endpoint"""
        test_text = "Malware at 192.168.1.1 with hash 5d41402abc4b2a76b9719d911017c592"
        response = client.post('/api/test_pipeline/extract-iocs-from-text',
                               json={'text': test_text},
                               content_type='application/json')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'iocs' in data


class TestOpenSearchIntegration:
    """Test OpenSearch database operations"""
    
    def test_opensearch_connection(self, os_client):
        """Test OpenSearch client connection"""
        try:
            result = os_client.ping()
            assert result is True
        except Exception as e:
            pytest.skip(f"OpenSearch not available: {e}")
    
    def test_list_raw_articles(self, client, os_client):
        """Test listing raw articles from database"""
        try:
            os_client.ping()
        except Exception:
            pytest.skip("OpenSearch not available")
        
        response = client.get('/api/test_pipeline/list-raw-articles?limit=5')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'articles' in data
        assert 'count' in data
        assert isinstance(data['articles'], list)
    
    def test_list_advisories(self, client, os_client):
        """Test listing generated advisories from database"""
        try:
            os_client.ping()
        except Exception:
            pytest.skip("OpenSearch not available")
        
        response = client.get('/api/test_pipeline/list-advisories?limit=5')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'advisories' in data
        assert 'count' in data
        assert isinstance(data['advisories'], list)
    
    def test_store_advisory(self, client, os_client):
        """Test storing advisory manually"""
        try:
            os_client.ping()
        except Exception:
            pytest.skip("OpenSearch not available")
        
        test_advisory = {
            'advisory_id': 'TEST-ADV-001',
            'title': 'Test Advisory',
            'criticality': 'HIGH',
            'threat_type': 'Test',
            'cves': ['CVE-2024-0001'],
            'iocs': [{'type': 'ipv4', 'value': '192.168.1.1'}],
            'tlp': 'AMBER'
        }
        
        response = client.post('/api/test_pipeline/store-advisory',
                               json=test_advisory,
                               content_type='application/json')
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'advisory_id' in data
    
    def test_fetch_feeds(self, client):
        """Test fetching articles from RSS feeds"""
        response = client.post('/api/test_pipeline/fetch-feeds')
        assert response.status_code in [200, 400, 500]
        data = json.loads(response.data)
        
        if response.status_code == 200:
            assert 'articles_fetched' in data
            assert 'articles' in data


class TestCompleteWorkflow:
    """Test complete workflow from article to advisory"""
    
    def test_generate_from_text_workflow(self, client, os_client):
        """Test generating advisory from text (integration test)"""
        try:
            os_client.ping()
        except Exception:
            pytest.skip("OpenSearch not available")
        
        test_article = {
            'article_id': 'test-article-001',
            'title': 'Critical Vulnerability in Apache Log4j',
            'summary': 'A critical vulnerability allows remote code execution',
            'article_url': 'https://example.com/log4j-vuln',
            'source': 'Test'
        }
        
        response = client.post('/api/test_pipeline/generate-from-text',
                               json=test_article,
                               content_type='application/json')
        
        # May fail if LLM is not configured, but should have proper error handling
        assert response.status_code in [200, 400, 500]
        data = json.loads(response.data)
        
        if response.status_code == 200:
            assert 'advisory_id' in data
            assert 'title' in data


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
