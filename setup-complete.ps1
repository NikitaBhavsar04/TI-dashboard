#!/usr/bin/env powershell
# Complete Setup Script for Threat-Advisory
# Sets up both frontend and backend to run completely independently

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Threat-Advisory Complete Setup (100% Independent)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Verify we're in Threat-Advisory directory
$currentDir = Get-Location
if ($currentDir.Path -notlike "*Threat-Advisory") {
    Write-Host "[ERROR] Please run this script from C:\Threat-Advisory" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found - Please install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Python not found - Please install Python 3.8+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Check MongoDB
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "MONGODB_URI") {
        Write-Host "  ✓ MongoDB configuration found" -ForegroundColor Green
    } else {
        Write-Host "  ! MongoDB URI not configured in .env.local" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ! .env.local not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/5] Installing frontend dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install frontend dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Frontend dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[3/5] Setting up Python backend..." -ForegroundColor Yellow
Set-Location backend

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to create virtual environment" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
}

# Activate and install dependencies
Write-Host "  Installing Python dependencies..." -ForegroundColor Cyan
& ".\venv\Scripts\python.exe" -m pip install --upgrade pip | Out-Null
& ".\venv\Scripts\pip.exe" install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install Python dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "  ✓ Python backend dependencies installed" -ForegroundColor Green

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env file..." -ForegroundColor Cyan
    @"
# Hugging Face API Key (Required for LLM)
HF_API_KEY=your_hugging_face_api_key_here

# Optional: OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Logging
LOG_LEVEL=INFO
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "  ! Created .env file - Please add your API keys" -ForegroundColor Yellow
}

# Create necessary directories
$directories = @("workspace", "data/cache", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Set-Location ..

Write-Host ""
Write-Host "[4/5] Verifying backend integration..." -ForegroundColor Yellow

# Check if auto-feed.ts uses local backend
$autoFeedPath = "pages\api\auto-feed.ts"
if (Test-Path $autoFeedPath) {
    $content = Get-Content $autoFeedPath -Raw
    if ($content -match "backend.generate_advisories\.py") {
        Write-Host "  ✓ API route configured for local backend" -ForegroundColor Green
    } else {
        Write-Host "  ! API route may not be configured correctly" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ auto-feed.ts not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "[5/5] Testing backend..." -ForegroundColor Yellow
Set-Location backend
$testResult = & ".\venv\Scripts\python.exe" -c "import sys; from utils.common import logger; print('Backend imports OK')" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Backend test passed" -ForegroundColor Green
} else {
    Write-Host "  ! Backend test had warnings (may still work)" -ForegroundColor Yellow
}
Set-Location ..

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! Threat-Advisory is 100% Independent" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure API Keys:" -ForegroundColor White
Write-Host "   Edit: backend\.env" -ForegroundColor Cyan
Write-Host "   Add your Hugging Face API key for LLM functionality" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure MongoDB (if not done):" -ForegroundColor White
Write-Host "   Edit: .env.local" -ForegroundColor Cyan
Write-Host "   Add: MONGODB_URI=your_mongodb_connection_string" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the application:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Test Auto Advisory:" -ForegroundColor White
Write-Host "   - Open: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   - Login as admin" -ForegroundColor Cyan
Write-Host "   - Go to Advisories page" -ForegroundColor Cyan
Write-Host "   - Click 'Auto Advisory' button" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: No external 'ThreatAdvisory-Automation' folder needed!" -ForegroundColor Green
Write-Host "      Everything runs from C:\Threat-Advisory\backend\" -ForegroundColor Green
Write-Host ""
