#!/usr/bin/env python3
"""
Run all feed collectors (RSS, Reddit, Telegram) SEQUENTIALLY to avoid file conflicts.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging

logger = logging.getLogger("feed_runner")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)

def main():
    logger.info("[RUNNER] ========== Starting All Feed Collectors ==========")
    
    logger.info("[RUNNER] Starting RSS fetcher")
    try:
        import rss_fetcher
        rss_fetcher.main()
        logger.info("[RUNNER] ✓ RSS fetcher done")
    except Exception as e:
        logger.exception(f"[RUNNER] ✗ RSS failed: {e}")
    
    logger.info("[RUNNER] Starting Reddit fetcher")
    try:
        import reddit_fetcher
        reddit_fetcher.main()
        logger.info("[RUNNER] ✓ Reddit fetcher done")
    except Exception as e:
        logger.exception(f"[RUNNER] ✗ Reddit failed: {e}")
    
    logger.info("[RUNNER] Starting Telegram fetcher")
    try:
        import telegram_fetcher
        telegram_fetcher.run_once()
        logger.info("[RUNNER] ✓ Telegram fetcher done")
    except Exception as e:
        logger.exception(f"[RUNNER] ✗ Telegram failed: {e}")
    
    logger.info("[RUNNER] ========== All feeds completed ==========")

if __name__ == "__main__":
    main()