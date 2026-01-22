import os
from dotenv import load_dotenv
from opensearchpy import OpenSearch

def get_opensearch_client():
    load_dotenv()
    host = os.getenv("OPENSEARCH_HOST", "localhost")
    port = int(os.getenv("OPENSEARCH_PORT", 9200))
    username = os.getenv("OPENSEARCH_USERNAME")
    password = os.getenv("OPENSEARCH_PASSWORD")
    use_ssl = False  # Set to True if your OpenSearch uses HTTPS
    verify_certs = False
    
    # Only add http_auth if username and password are set
    client_args = {
        "hosts": [{"host": host, "port": port}],
        "use_ssl": use_ssl,
        "verify_certs": verify_certs,
        "timeout": 30,
        "max_retries": 3,
        "retry_on_timeout": True,
    }
    if username and password:
        client_args["http_auth"] = (username, password)
    return OpenSearch(**client_args)