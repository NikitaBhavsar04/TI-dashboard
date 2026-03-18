#!/usr/bin/env bash
set -e

if [ "${ENABLE_ARTICLE_FETCHER:-1}" = "0" ]; then
  echo "[article-fetcher] Disabled (ENABLE_ARTICLE_FETCHER=0). Idling."
  exec tail -f /dev/null
fi

echo "[article-fetcher] Started. Waiting for 09:00 IST (03:30 UTC) daily."

while true; do
  now_sec=$(date -u +%s)
  target_sec=$(date -u -d "today 03:30 UTC" +%s 2>/dev/null || echo 0)
  if [ "$target_sec" -le "$now_sec" ]; then
    target_sec=$(( target_sec + 86400 ))
  fi
  sleep_sec=$(( target_sec - now_sec ))
  echo "[article-fetcher] Next run in ${sleep_sec}s (at 03:30 UTC / 09:00 IST)"
  sleep "$sleep_sec"
  echo "[article-fetcher] === Starting all_feeds.py at $(date -u) ==="
  python /app/backend/all_feeds.py || echo "[article-fetcher] all_feeds.py exited non-zero"
  echo "[article-fetcher] === Completed at $(date -u) ==="
  sleep 60
done
