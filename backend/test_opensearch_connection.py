from opensearchpy import OpenSearch
import sys

try:
    client = OpenSearch(
        hosts=[{"host": "localhost", "port": 9200}],
        http_auth=None,     # keep None if security disabled
        use_ssl=False,
        verify_certs=False
    )

    # 1️⃣ Ping OpenSearch
    if client.ping():
        print("✅ OpenSearch is reachable (PING OK)")
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

    print("\n🎯 Connection test SUCCESSFUL")

except Exception as e:
    print("\n❌ Connection test FAILED")
    print(str(e))
