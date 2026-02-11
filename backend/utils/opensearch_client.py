import os
import sys
from dotenv import load_dotenv
from opensearchpy import OpenSearch

def get_opensearch_client():
    load_dotenv(override=True)

    # Prioritize OPENSEARCH_URL for AWS deployments
    opensearch_url = os.getenv("OPENSEARCH_URL")
    
    if opensearch_url:
        from urllib.parse import urlparse
        parsed = urlparse(opensearch_url)
        host = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == 'https' else 9200)
        scheme = parsed.scheme
        use_ssl = scheme == 'https'
    else:
        host = os.getenv("OPENSEARCH_HOST")
        port = int(os.getenv("OPENSEARCH_PORT", 9200))
        scheme = "https"
        use_ssl = True
    
    if not host:
        raise ValueError("OPENSEARCH_HOST or OPENSEARCH_URL must be set")
    
    username = os.getenv("OPENSEARCH_USERNAME")
    password = os.getenv("OPENSEARCH_PASSWORD")

    client_args = {
        "hosts": [{
            "host": host,
            "port": port,
            "scheme": scheme
        }],
        "use_ssl": use_ssl,
        "verify_certs": False,     # OK for dev / self-signed
        "ssl_show_warn": False,
        "timeout": 30,
        "max_retries": 3,
        "retry_on_timeout": True
    }

    if username and password:
        client_args["http_auth"] = (username, password)

    # Print debug info to stderr to avoid mixing with stdout JSON output
    print(f"[DEBUG] Connecting to {scheme}://{host}:{port} | use_ssl={use_ssl}", file=sys.stderr)

    return OpenSearch(**client_args)
if __name__ == "__main__":
    client = get_opensearch_client()

    if client.ping():
        print("✅ Connected to OpenSearch")
    else:
        print("❌ Unable to connect to OpenSearch")