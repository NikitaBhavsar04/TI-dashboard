"""
MITRE TAXII 2.1 Server Connector
Simple version using only requests library
"""

import requests
import json
import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MITRETAXIIConnector:
    """
    Connects to MITRE ATT&CK TAXII 2.1 server using requests library.
    No external TAXII dependencies needed.
    """
    
    def __init__(self, discovery_url: str = "https://cti-taxii.mitre.org/taxii2/", 
                 api_root: str = "https://cti-taxii.mitre.org/taxii2", 
                 cache_dir: Path = None):
        """
        Initialize the TAXII connector.
        
        Args:
            discovery_url: Discovery endpoint URL
            api_root: API root URL for collections
            cache_dir: Directory to cache downloaded data
        """
        self.discovery_url = discovery_url
        self.api_root = api_root
        
        # Set default cache directory if not provided
        if cache_dir is None:
            self.cache_dir = Path("backend/data/mitre_cache")
        else:
            self.cache_dir = cache_dir
        
        # Ensure cache directory exists
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Smart development environment detection
        is_development = (
            os.getenv('NODE_ENV') == 'development' or
            os.getenv('DISABLE_SSL_VERIFY') == 'true' or
            os.getenv('VERCEL') is None and  # Not on Vercel (production platform)
            ('localhost' in os.getcwd() or 'venv' in os.getcwd() or 'Scripts' in os.environ.get('PATH', ''))
        )
        
        # Create requests session with SSL handling
        self.session = requests.Session()
        
        # Configure SSL verification based on environment
        if is_development:
            self.session.verify = False
            logger.info("[TAXII] Development environment detected, SSL verification disabled")
        else:
            self.session.verify = True
            logger.info("[TAXII] Production environment, SSL verification enabled")
        
        # Set required headers for TAXII 2.1
        self.session.headers.update({
            'Accept': 'application/taxii+json;version=2.1',
            'Content-Type': 'application/taxii+json;version=2.1',
            'User-Agent': 'MITRE-TAXII-Connector/2.1'
        })
        
        logger.info(f"Initializing MITRE TAXII 2.1 Connector")
        logger.info(f"Discovery URL: {discovery_url}")
        logger.info(f"API Root: {api_root}")
        logger.info(f"Cache Directory: {cache_dir}")
    
    def test_connection(self) -> Dict:
        """
        Test the connection to TAXII 2.1 server.
        
        Returns:
            Dictionary with connection status and server info
        """
        result = {
            "connected": False,
            "server_info": {},
            "error": None
        }
        
        try:
            logger.info("Testing connection to MITRE TAXII 2.1 server...")
            logger.info(f"Endpoint: {self.discovery_url}")
            
            # Test discovery endpoint with SSL fallback
            response = None
            try:
                response = self.session.get(self.discovery_url, timeout=15)
            except requests.exceptions.SSLError as e:
                logger.warning(f"[TAXII] SSL error, retrying without verification: {e}")
                original_verify = self.session.verify
                self.session.verify = False
                try:
                    response = self.session.get(self.discovery_url, timeout=15)
                finally:
                    self.session.verify = original_verify
            
            if response.status_code == 200:
                data = response.json()
                result["connected"] = True
                result["server_info"] = {
                    "title": data.get("title", "N/A"),
                    "description": data.get("description", "N/A"),
                    "default": data.get("default", "N/A"),
                    "api_roots": data.get("api_roots", [])
                }
                logger.info("✓ Connection test PASSED")
                logger.info(f"✓ Server: {result['server_info']['title']}")
            else:
                result["error"] = f"HTTP {response.status_code}: {response.text}"
                logger.error(f"✗ Connection test FAILED: {result['error']}")
                
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"✗ Connection test FAILED: {result['error']}")
        
        return result
    
    def list_collections(self) -> List[Dict]:
        """
        List all available collections on the TAXII server.
        
        Returns:
            List of collections with their details
        """
        collections_info = []
        
        try:
            logger.info("Fetching available collections...")
            
            # Get collections from TAXII 2.1 endpoint
            url = f"{self.api_root}/collections/"
            logger.info(f"URL: {url}")
            
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            collections = data.get("collections", [])
            
            for collection in collections:
                info = {
                    "id": collection.get("id"),
                    "title": collection.get("title"),
                    "description": collection.get("description"),
                    "can_read": collection.get("can_read", False),
                    "can_write": collection.get("can_write", False),
                    "media_types": collection.get("media_types", [])
                }
                collections_info.append(info)
                logger.info(f"  - {info['title']}")
            
            logger.info(f"✓ Found {len(collections_info)} collections")
            
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
        
        return collections_info
    
    def fetch_collection(self, collection_id: str, use_cache: bool = True, 
                        limit: Optional[int] = None) -> Dict:
        """
        Fetch STIX objects from a specific collection.
        
        Args:
            collection_id: ID of the collection to fetch
            use_cache: Whether to use cached data if available
            limit: Limit number of objects to fetch (None = all)
            
        Returns:
            Dictionary containing fetched objects and metadata
        """
        # Sanitize collection ID for filename
        safe_id = collection_id.replace('x-mitre-collection--', '')
        cache_file = self.cache_dir / f"{safe_id}.json"
        
        # Check cache
        if use_cache and cache_file.exists():
            cache_age = datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)
            if cache_age < timedelta(hours=24):
                logger.info(f"Using cached data (age: {cache_age})")
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        
        # Fetch fresh data
        try:
            logger.info(f"Fetching collection: {collection_id}")
            logger.info("⏳ Downloading... (this may take 1-2 minutes)")
            
            # Build URL for TAXII 2.1
            url = f"{self.api_root}/collections/{collection_id}/objects/"
            logger.info(f"URL: {url}")
            
            # Add limit parameter if specified
            params = {}
            if limit:
                params['limit'] = limit
            
            # Fetch data with SSL fallback
            logger.info(f"  Fetching objects...")
            response = None
            try:
                response = self.session.get(url, params=params, timeout=120)
            except requests.exceptions.SSLError as e:
                logger.warning(f"[TAXII] SSL error, retrying without verification: {e}")
                original_verify = self.session.verify
                self.session.verify = False
                try:
                    response = self.session.get(url, params=params, timeout=120)
                finally:
                    self.session.verify = original_verify
            
            response.raise_for_status()
            
            data = response.json()
            
            # Extract objects from response
            all_objects = data.get('objects', [])
            
            logger.info(f"  ✓ Fetched {len(all_objects)} objects")
            
            result = {
                "collection_id": collection_id,
                "fetched_at": datetime.now().isoformat(),
                "object_count": len(all_objects),
                "objects": all_objects
            }
            
            # Save to cache
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
            
            logger.info(f"✓ Total fetched: {len(all_objects)} objects")
            logger.info(f"✓ Saved to cache: {cache_file}")
            
            return result
            
        except requests.exceptions.Timeout:
            logger.error("Request timed out. The server might be slow or overloaded.")
            return {
                "collection_id": collection_id,
                "error": "Request timeout",
                "objects": []
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {str(e)}")
            return {
                "collection_id": collection_id,
                "error": str(e),
                "objects": []
            }
        except Exception as e:
            logger.error(f"Error fetching collection: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "collection_id": collection_id,
                "error": str(e),
                "objects": []
            }
    
    def get_techniques(self, use_cache: bool = True) -> List[Dict]:
        """
        Get ATT&CK techniques from the MITRE collection.
        
        Args:
            use_cache: Whether to use cached data if available
            
        Returns:
            List of extracted techniques
        """
        # MITRE collection ID for Enterprise ATT&CK
        enterprise_collection_id = "x-mitre-collection--23aa0df3-2713-4b17-bd07-9b1b0ace6d9c"
        
        # Fetch the collection data
        data = self.fetch_collection(enterprise_collection_id, use_cache=use_cache)
        
        techniques = []
        
        for obj in data.get('objects', []):
            if obj.get('type') == 'attack-pattern':
                # Extract external ID (e.g., T1059)
                external_id = "N/A"
                external_url = "N/A"
                for ref in obj.get('external_references', []):
                    if ref.get('source_name') == 'mitre-attack':
                        external_id = ref.get('external_id', 'N/A')
                        external_url = ref.get('url', 'N/A')
                        break
                
                # Extract tactics
                tactics = []
                for phase in obj.get('kill_chain_phases', []):
                    tactics.append(phase.get('phase_name', ''))
                
                # Get description (truncated)
                description = obj.get('description', 'N/A')
                if len(description) > 200:
                    description = description[:200] + "..."
                
                technique = {
                    "external_id": external_id,
                    "id": external_id,  # alias for compatibility
                    "name": obj.get('name', 'N/A'),
                    "description": description,
                    "tactics": tactics,
                    "url": external_url,
                    "created": obj.get('created', 'N/A'),
                    "modified": obj.get('modified', 'N/A'),
                    "version": obj.get('x_mitre_version', 'N/A')
                }
                
                techniques.append(technique)
        
        logger.info(f"✓ Extracted {len(techniques)} techniques")
        return techniques
    
    def get_statistics(self, data: Dict) -> Dict:
        """
        Get statistics about the fetched data.
        
        Args:
            data: Dictionary containing STIX objects
            
        Returns:
            Dictionary with statistics
        """
        objects = data.get('objects', [])
        
        # Count object types
        type_counts = {}
        for obj in objects:
            obj_type = obj.get('type', 'unknown')
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
        
        return {
            "total_objects": len(objects),
            "fetched_at": data.get('fetched_at', 'N/A'),
            "collection_id": data.get('collection_id', 'N/A'),
            "object_types": type_counts
        }


if __name__ == "__main__":
    print("This is a module. Run test_connection.py to test the connector.")