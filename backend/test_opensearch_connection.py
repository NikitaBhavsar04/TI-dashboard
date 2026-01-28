from opensearchpy import OpenSearch
import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    # Prioritize OPENSEARCH_URL for AWS deployments
    opensearch_url = os.getenv("OPENSEARCH_URL")
    
    if opensearch_url:
        # Parse URL to extract host, port, and scheme
        from urllib.parse import urlparse
        parsed = urlparse(opensearch_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == 'https' else 9200)
        use_ssl = parsed.scheme == 'https'
    else:
        # Fallback to individual env vars
        host = os.getenv("OPENSEARCH_HOST")
        port = int(os.getenv("OPENSEARCH_PORT", "9200"))
        use_ssl = True  # Default to SSL for production
    
    if not host:
        raise ValueError("OPENSEARCH_HOST or OPENSEARCH_URL must be set in environment variables")
    
    username = os.getenv("OPENSEARCH_USERNAME")
    password = os.getenv("OPENSEARCH_PASSWORD")
    
    http_auth = (username, password) if username and password else None
    
    client = OpenSearch(
        hosts=[{"host": host, "port": port}],
        http_auth=http_auth,
        use_ssl=use_ssl,
        verify_certs=False
    )
    
    print(f"Connecting to: {host}:{port} (SSL: {use_ssl})")

    # 1️⃣ Ping OpenSearch
    if client.ping():
        print("OpenSearch is reachable (PING OK)")
    else:
        print("❌ Ping failed")
        sys.exit(1)

    # 2️⃣ Cluster health
    health = client.cluster.health()
    print("\n📊 Cluster Health:")
    print(f"Status: {health['status']}")
    print(f"Nodes: {health['number_of_nodes']}")
    print(f"Active shards: {health['active_shards']}")

    # 3️⃣ Get cluster info
    info = client.info()
    print("\nℹ️ Cluster Info:")
    print(f"Cluster name: {info['cluster_name']}")
    print(f"OpenSearch version: {info['version']['number']}")

    print("\nConnection test SUCCESSFUL")

except Exception as e:
    print("\n❌ Connection test FAILED")
    print(str(e))
