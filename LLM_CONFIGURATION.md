# LLM Configuration Guide - Fixing Rate Limit Errors

## Problem: OpenRouter API Rate Limit

You're seeing this error because the free tier OpenRouter model `tngtech/deepseek-r1t-chimera:free` has limited requests per minute and is temporarily rate-limited.

```
Error code: 429 - 'tngtech/deepseek-r1t-chimera:free is temporarily rate-limited upstream'
```

## Solutions

### Option 1: Wait and Retry (Quickest)
- **Wait 2-5 minutes** and try generating the advisory again
- Free tier models reset their rate limits every few minutes

### Option 2: Use a Different Free Model (Recommended)
Change the model in your configuration file to avoid rate limits.

1. Open `backend/config.yaml`
2. Find the `openrouter` section (around line 324-326):
```yaml
openrouter:
  enabled: true
  model: tngtech/deepseek-r1t-chimera:free
```

3. Replace with one of these alternative FREE models:

**Recommended Options:**
```yaml
# Option A: Meta Llama (Good balance of speed and quality)
openrouter:
  enabled: true
  model: meta-llama/llama-3.2-3b-instruct:free

# Option B: Google Gemini Flash (Fast, good quality)
openrouter:
  enabled: true
  model: google/gemini-flash-1.5:free

# Option C: Microsoft Phi-3 (Smaller, faster)
openrouter:
  enabled: true
  model: microsoft/phi-3-mini-128k-instruct:free

# Option D: Mistral (Good for technical content)
openrouter:
  enabled: true
  model: mistralai/mistral-7b-instruct:free
```

4. Save the file and try generating the advisory again

### Option 3: Add Your OpenRouter API Key with Credits
If you need unlimited access:

1. Go to https://openrouter.ai/settings/integrations
2. Add credits to your account
3. Your API key (already in `.env`) will work without rate limits
4. You can also use premium models like:
   - `openai/gpt-4-turbo`
   - `anthropic/claude-3.5-sonnet`
   - `google/gemini-pro-1.5`

## Current Configuration

Your current configuration is in:
- **Config File:** `backend/config.yaml`
- **API Key:** `.env` file (OPENROUTER_API_KEY)
- **Current Model:** `tngtech/deepseek-r1t-chimera:free`

## Testing the Configuration

After changing the model, test it by:

1. Restart your Next.js development server:
```bash
npm run dev
```

2. Try generating an advisory from a raw article

3. Check the console for confirmation:
```
[LLM] Using OpenRouter model: <your-new-model>
```

## Alternative: Use Local LLM (Advanced)

If you want to avoid API rate limits entirely, you can run a local LLM using Ollama:

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3`
3. Update `backend/config.yaml`:
```yaml
ollama:
  enabled: true
  host: http://localhost:11434
  model: llama3:latest

openrouter:
  enabled: false
```

## Monitoring Usage

You can monitor your OpenRouter usage at:
- Dashboard: https://openrouter.ai/activity
- Credits: https://openrouter.ai/credits

## Need Help?

If you continue experiencing issues:
1. Check that your `.env` file has the correct `OPENROUTER_API_KEY`
2. Verify the model name is correct (check https://openrouter.ai/models)
3. Ensure your `backend/config.yaml` syntax is valid YAML
4. Restart the development server after configuration changes
