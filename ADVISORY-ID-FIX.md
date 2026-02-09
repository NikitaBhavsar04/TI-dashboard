# Advisory Generation Troubleshooting

## Issue: "Advisory not found" Error

The error occurs because the system is trying to fetch an advisory with an article ID instead of an advisory ID.

### ID Formats:
- **Article ID**: Long hex string (e.g., `0e08fc7810c9e8a64e1615f53b6bbeb37d38913c`)
- **Advisory ID**: Formatted string (e.g., `SOC-TA-20260205-143000`)

### What's Happening:
1. You click "Generate Advisory" on a raw article page
2. The Python script (`manual_advisory.py`) should generate an advisory and save it to OpenSearch with an advisory_id
3. The frontend should redirect to the editor with the advisory_id
4. **Problem**: The advisory_id is not being returned or is in the wrong format

### Debugging Steps:

#### 1. Check Browser Console
Open browser DevTools (F12) and look for these log messages:
```
[RAW-ARTICLE] Full API response: {...}
[RAW-ARTICLE] Extracted IDs: { advisory_id: ..., article_id: ... }
```

#### 2. Check if Advisory Was Saved
The advisory should be in OpenSearch index: `ti-generated-advisories`

You can verify with a curl command:
```bash
curl -k -u admin:admin https://localhost:9200/ti-generated-advisories/_search?pretty
```

#### 3. Check Python Script Output
If you're running locally, check the terminal where `npm run dev` is running for Python output:
```
[MANUAL-ADVISORY] Generating advisory for article: ...
[MANUAL-ADVISORY] ✅ Advisory indexed: SOC-TA-20260205-143000
```

### Common Causes:

#### A. Python Script Not Running
- **Symptom**: Fallback advisory is generated (generic content)
- **Solution**: Ensure Python is installed and `manual_advisory.py` is executable
- **Check**: Look for `[MANUAL-ADVISORY]` logs in terminal

#### B. Advisory Generated But ID Not Returned
- **Symptom**: Advisory exists in OpenSearch but frontend can't find it
- **Solution**: Check the API response format in `/api/manual-advisory/generate.ts`
- **Fix**: Ensure the response includes `advisory.advisory_id`

#### C. Wrong ID Being Passed
- **Symptom**: You see article ID in URL instead of advisory ID
- **Solution**: System now validates ID format and shows helpful error

### Immediate Fix:

The code has been updated to:
1. **Validate ID format** before redirecting to editor
2. **Show clear error messages** if wrong ID type is detected
3. **Add detailed logging** to track the advisory generation flow

### Next Steps:
1. Try generating an advisory again
2. Check the browser console for detailed logs
3. Look for the advisory_id in the console output
4. If you see an error about "invalid ID format", it means the advisory wasn't generated properly

### Manual Workaround:
If you need to edit an existing advisory:
1. Get the advisory_id from OpenSearch (should be format: `SOC-TA-YYYYMMDD-HHMMSS`)
2. Navigate to: `/admin/advisory-editor?advisory_id=<your-advisory-id>`
