#!/usr/bin/env powershell
# Backend Setup Script for Threat-Advisory
# Run this to set up the Python backend

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Threat-Advisory Backend Setup" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Set UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = "utf-8"

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[+] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://www.python.org" -ForegroundColor Yellow
    exit 1
}

# Get script directory
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $backendDir
Write-Host "[+] Working directory: $(Get-Location)" -ForegroundColor Green

# Create virtual environment
if (-not (Test-Path "venv")) {
    Write-Host "[*] Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "[+] Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "[*] Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "[*] Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "[+] Dependencies installed" -ForegroundColor Green

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "[!] Creating .env file..." -ForegroundColor Yellow
    @"
# Hugging Face API Key (Required)
HF_API_KEY=your_hugging_face_api_key_here

# Optional: OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Logging
LOG_LEVEL=INFO
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "[!] IMPORTANT: Update .env with your API keys" -ForegroundColor Yellow
    Write-Host "   Edit: backend/.env" -ForegroundColor Yellow
}

# Create necessary directories
$directories = @("workspace", "data/cache", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "[+] Created directory: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Backend Setup Complete!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit backend/.env and add your Hugging Face API key"
Write-Host "2. Test: python generate_advisories.py 1"
Write-Host "3. Start the main app: cd .. && npm run dev"
Write-Host ""
