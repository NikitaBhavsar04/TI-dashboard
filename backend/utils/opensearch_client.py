import os
from dotenv import load_dotenv
from opensearchpy import OpenSearch

def get_opensearch_client():
    load_dotenv(override=True)

    host = os.getenv("OPENSEARCH_HOST", "localhost")
    port = int(os.getenv("OPENSEARCH_PORT", 9200))
    username = os.getenv("OPENSEARCH_USERNAME")
    password = os.getenv("OPENSEARCH_PASSWORD")

    # -------------------------------------------------
    # STRICT RULE BASED ON HOST
    # -------------------------------------------------
    if host in {"localhost", "127.0.0.1"}:
        scheme = "http"
        use_ssl = False
    else:
        scheme = "https"
        use_ssl = True

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

    print(f"[DEBUG] Connecting to {scheme}://{host}:{port} | use_ssl={use_ssl}")

    return OpenSearch(**client_args)
if __name__ == "__main__":
    client = get_opensearch_client()

    if client.ping():
        print("✅ Connected to OpenSearch")
    else:
        print("❌ Unable to connect to OpenSearch")