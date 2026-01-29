#!/usr/bin/env python3
"""
Verify that no localhost or 127.0.0.1 hardcoded defaults remain in connection files
"""
import os
import re
from pathlib import Path

# Files that should NOT have localhost/127.0.0.1 as defaults
CRITICAL_FILES = [
    "backend/test_opensearch_connection.py",
    "backend/utils/opensearch_client.py",
    "backend/tools/opensearch.py",
    "backend/get_sample_articles.py",
    "lib/opensearchClient.js",
    "lib/agenda.js",
    "lib/agenda_fixed.js",
    "lib/agenda_clean.js",
    "pages/api/generated-advisory/[advisory_id].ts",
    "pages/api/manual-advisory/generate.ts",
    "pages/api/raw-articles/index.ts",
    "cron-scheduler.js",
]

# Patterns that indicate problematic localhost usage
PROBLEMATIC_PATTERNS = [
    r'getenv\(["\']OPENSEARCH_HOST["\']\s*,\s*["\']localhost["\']',
    r'getenv\(["\']OPENSEARCH_HOST["\']\s*,\s*["\']127\.0\.0\.1["\']',
    r'OPENSEARCH_HOST\s*\|\|\s*["\']localhost["\']',
    r'OPENSEARCH_HOST\s*\|\|\s*["\']127\.0\.0\.1["\']',
    r'mongodb://localhost:',
    r'http://localhost:3000["\']',
    r'host\s*in\s*\{["\']localhost["\'],\s*["\']127\.0\.0\.1["\']\}',
]

def check_file(filepath):
    """Check a single file for problematic patterns"""
    if not os.path.exists(filepath):
        return f"❌ File not found: {filepath}"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    issues = []
    for pattern in PROBLEMATIC_PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            # Get line number
            line_num = content[:match.start()].count('\n') + 1
            issues.append(f"  Line {line_num}: {match.group()}")
    
    return issues

def main():
    print("🔍 Verifying Localhost Removal...\n")
    
    os.chdir(Path(__file__).parent)
    
    all_clear = True
    
    for filepath in CRITICAL_FILES:
        result = check_file(filepath)
        
        if isinstance(result, str):
            print(result)
            all_clear = False
        elif result:
            print(f"⚠️  {filepath}:")
            for issue in result:
                print(issue)
            all_clear = False
        else:
            print(f"✅ {filepath}")
    
    print("\n" + "="*60)
    
    if all_clear:
        print("✅ SUCCESS: No localhost/127.0.0.1 hardcoded defaults found!")
        print("All connection files properly use environment variables.")
    else:
        print("❌ ISSUES FOUND: Some files still have localhost defaults")
        print("Please review the files listed above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
