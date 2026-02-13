#!/usr/bin/env python3
"""
Multi-Client IOC IP Sweep

Flow:
1. Fetch advisory using advisory_id
2. Extract public IP IOCs
3. Fetch clients from MongoDB
4. For each client:
   - Search their OpenSearch firewall index
   - If IOC found, record match
5. Return structured JSON result
"""

import sys
import os
import json
import ipaddress
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

# --------------------------------------------------
# Path bootstrap
# --------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.opensearch_client import get_opensearch_client
from utils.common import logger

# --------------------------------------------------
# ENV
# --------------------------------------------------
load_dotenv()

# --------------------------------------------------
# CONSTANTS
# --------------------------------------------------
ADVISORY_INDEX = "ti-generated-advisories"
LOOKBACK_DAYS = 14

TIME_FIELD = "timestamp"
SRC_IP_FIELD = "data.srcip"
DST_IP_FIELD = "data.dstip"

# --------------------------------------------------
# OPENSEARCH CLIENT
# --------------------------------------------------
os_client = get_opensearch_client()

# --------------------------------------------------
# MONGODB CLIENT
# --------------------------------------------------
# Support multiple MongoDB connection formats for Docker and local
MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")

if not MONGO_URI:
    # Build from components (for Docker/K8s deployments)
    mongo_host = os.getenv("MONGODB_HOST", "localhost")
    mongo_port = os.getenv("MONGODB_PORT", "27017")
    mongo_user = os.getenv("MONGODB_USER", "")
    mongo_pass = os.getenv("MONGODB_PASSWORD", "")
    mongo_auth_source = os.getenv("MONGODB_AUTH_SOURCE", "admin")

    if mongo_user and mongo_pass:
        MONGO_URI = f"mongodb://{mongo_user}:{mongo_pass}@{mongo_host}:{mongo_port}/?authSource={mongo_auth_source}"
    else:
        MONGO_URI = f"mongodb://{mongo_host}:{mongo_port}"

MONGO_DB_NAME = os.getenv("MONGO_DB") or os.getenv("MONGODB_DB", "soc")

logger.info(f"[MONGO] Connecting to MongoDB at: {MONGO_URI.replace(os.getenv('MONGODB_PASSWORD', ''), '***') if MONGO_URI else 'Not configured'}")

try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test connection
    mongo_client.server_info()
    mongo_db = mongo_client[MONGO_DB_NAME]
    clients_collection = mongo_db["clients"]
    logger.info(f"[MONGO] Successfully connected to database: {MONGO_DB_NAME}")
except Exception as e:
    logger.error(f"[MONGO] Failed to connect to MongoDB: {e}")
    logger.error("[MONGO] IP Sweep requires MongoDB connection to fetch client data")
    logger.error("[MONGO] Please ensure MongoDB is running and MONGO_URI or MONGODB_HOST is configured in .env")
    raise RuntimeError(f"MongoDB connection failed: {e}")

# --------------------------------------------------
# HELPERS
# --------------------------------------------------
def is_public_ip(ip: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip)
        return not (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_multicast
            or ip_obj.is_reserved
            or ip_obj.is_link_local
        )
    except ValueError:
        return False


# --------------------------------------------------
# FETCH ADVISORY VIA advisory_id FIELD
# --------------------------------------------------
def fetch_ip_iocs(advisory_id: str):
    advisory_id = advisory_id.strip()

    logger.info("Fetching advisory via advisory_id: %s", advisory_id)

    query = {
        "size": 1,
        "query": {
            "term": {
                "advisory_id": advisory_id
            }
        }
    }

    res = os_client.search(index=ADVISORY_INDEX, body=query)
    hits = res.get("hits", {}).get("hits", [])

    if not hits:
        logger.error("Advisory not found: %s", advisory_id)
        return []

    advisory_doc = hits[0]["_source"]
    iocs = advisory_doc.get("iocs", [])

    ips = []
    for ioc in iocs:
        if ioc.get("type") in ("ipv4", "ipv6"):
            ip = ioc.get("value")
            if ip and is_public_ip(ip):
                ips.append(ip)

    return ips


# --------------------------------------------------
# SEARCH CLIENT FIREWALL INDEX
# --------------------------------------------------
def search_client_index(client_index: str, ip: str):
    time_from = (datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    query = {
        "size": 5,
        "query": {
            "bool": {
                "must": [
                    {
                        "range": {
                            TIME_FIELD: {
                                "gte": time_from
                            }
                        }
                    },
                    {
                        "bool": {
                            "should": [
                                {"term": {SRC_IP_FIELD: ip}},
                                {"term": {DST_IP_FIELD: ip}}
                            ],
                            "minimum_should_match": 1
                        }
                    }
                ]
            }
        },
        "_source": [
            TIME_FIELD,
            SRC_IP_FIELD,
            DST_IP_FIELD
        ]
    }

    return os_client.search(
        index=client_index,
        body=query
    )["hits"]["hits"]


# --------------------------------------------------
# DIAGNOSTICS
# --------------------------------------------------
def check_opensearch_indices():
    """List all available OpenSearch indices"""
    try:
        response = os_client.cat.indices(format='json')
        indices = [idx['index'] for idx in response if not idx['index'].startswith('.')]
        logger.info("[OPENSEARCH] Available indices: %s", indices)
        return indices
    except Exception as e:
        logger.error("[OPENSEARCH] Failed to list indices: %s", e)
        return []

def verify_index_exists(index_name: str) -> bool:
    """Check if an index exists in OpenSearch"""
    try:
        exists = os_client.indices.exists(index=index_name)
        return exists
    except Exception as e:
        logger.error("[OPENSEARCH] Error checking index '%s': %s", index_name, e)
        return False

# --------------------------------------------------
# MAIN SWEEP LOGIC
# --------------------------------------------------
def sweep_advisory(advisory_id: str):

    result = {
        "advisory_id": advisory_id,
        "checked_at": datetime.utcnow().isoformat(),
        "impacted_clients": []
    }

    # Diagnostic: Check MongoDB connection and list clients
    logger.info("[DIAGNOSTIC] Checking MongoDB connection...")
    try:
        client_count = clients_collection.count_documents({})
        logger.info("[DIAGNOSTIC] MongoDB connected. Found %d client(s) in collection", client_count)
    except Exception as e:
        logger.error("[DIAGNOSTIC] MongoDB connection failed: %s", e)
        return result

    # Diagnostic: List available OpenSearch indices
    logger.info("[DIAGNOSTIC] Checking available OpenSearch indices...")
    available_indices = check_opensearch_indices()

    ips = fetch_ip_iocs(advisory_id)

    if not ips:
        logger.info("No public IP IOCs found.")
        return result

    logger.info("Found IP IOCs: %s", ips)

    clients = list(clients_collection.find({}))
    logger.info("[IP-SWEEP] Fetched %d client(s) from MongoDB", len(clients))

    # Log each client's details
    for client in clients:
        logger.info("[IP-SWEEP] Client found: ID=%s, Name=%s, FW_Index=%s",
                   client.get("client_id"),
                   client.get("client_name"),
                   client.get("fw_index"))

    for client in clients:

        client_id = client.get("client_id")
        client_name = client.get("client_name")
        client_index = client.get("fw_index")

        if not client_index:
            logger.warning("[IP-SWEEP] Client '%s' (%s) has no fw_index configured, skipping", client_name, client_id)
            continue

        logger.info("Checking client: %s (%s) with index: %s", client_name, client_id, client_index)

        # Verify index exists in OpenSearch
        if client_index not in available_indices:
            logger.error("[IP-SWEEP] Index '%s' does NOT EXIST in OpenSearch! Client '%s' cannot be checked.", client_index, client_name)
            logger.error("[IP-SWEEP] Available indices: %s", available_indices)
            continue
        else:
            logger.info("[IP-SWEEP] Index '%s' EXISTS in OpenSearch, proceeding with search", client_index)

        client_matches = []

        for ip in ips:
            logger.info("[IP-SWEEP] Searching for IP '%s' in index '%s' (Client: %s)", ip, client_index, client_name)
            hits = search_client_index(client_index, ip)

            if hits:
                logger.info("[IP-SWEEP] [MATCH] Found %d match(es) for IP '%s' in index '%s'", len(hits), ip, client_index)
            else:
                logger.info("[IP-SWEEP] [NO-MATCH] No matches for IP '%s' in index '%s'", ip, client_index)

            for hit in hits:
                src = hit["_source"]

                matched_field = (
                    "srcip"
                    if src.get("data", {}).get("srcip") == ip
                    else "dstip"
                )

                client_matches.append({
                    "ioc": ip,
                    "matched_field": matched_field,
                    "log_index": hit["_index"],
                    "timestamp": src.get(TIME_FIELD)
                })

        if client_matches:
            logger.info("[IP-SWEEP] [IMPACTED] Client '%s' is IMPACTED with %d total match(es)", client_name, len(client_matches))
            result["impacted_clients"].append({
                "client_id": client_id,
                "client_name": client_name,
                "matches": client_matches
            })
        else:
            logger.info("[IP-SWEEP] [CLEAN] Client '%s' has no matches", client_name)

    # Summary
    total_impacted = len(result["impacted_clients"])
    if total_impacted > 0:
        logger.info("[IP-SWEEP] SUMMARY: %d client(s) impacted by advisory %s", total_impacted, advisory_id)
        for impacted in result["impacted_clients"]:
            logger.info("[IP-SWEEP]   - %s: %d match(es)", impacted["client_name"], len(impacted["matches"]))
    else:
        logger.info("[IP-SWEEP] SUMMARY: No clients impacted by advisory %s", advisory_id)

    return result


# --------------------------------------------------
# ENTRY
# --------------------------------------------------
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        logger.error("Usage: python ip_sweep.py <advisory_id>")
        sys.exit(1)

    advisory_id = sys.argv[1]

    logger.info("Starting multi-client sweep for advisory: %s", advisory_id)

    output = sweep_advisory(advisory_id)

    print(json.dumps(output, indent=2))
