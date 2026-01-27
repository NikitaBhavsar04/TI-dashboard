# Quick Setup Script for Production Deployment

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Threat Advisory API - Production Setup    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker is installed" -ForegroundColor Green
    docker --version
} else {
    Write-Host "✗ Docker is not installed" -ForegroundColor Red
    Write-Host "  Please install Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Docker Compose is available
Write-Host ""
Write-Host "Checking Docker Compose..." -ForegroundColor Yellow
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker Compose is installed" -ForegroundColor Green
    docker-compose --version
} else {
    Write-Host "✗ Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
Write-Host ""
Write-Host "Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "! .env file not found, creating from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.template" "backend\.env"
    Write-Host "✓ Created .env file" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  IMPORTANT: Please edit backend\.env and add your API keys!" -ForegroundColor Yellow
    Write-Host "   Required: OPENAI_API_KEY, CORS_ORIGINS" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to edit .env now? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        notepad "backend\.env"
    }
}

# Check if config.yaml exists
Write-Host ""
Write-Host "Checking configuration files..." -ForegroundColor Yellow
if (Test-Path "backend\config.yaml") {
    Write-Host "✓ config.yaml exists" -ForegroundColor Green
} else {
    Write-Host "✗ config.yaml not found" -ForegroundColor Red
    Write-Host "  Please ensure backend/config.yaml exists" -ForegroundColor Yellow
}

# Ask deployment choice
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Choose Deployment Option                  " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Full Stack (API + OpenSearch + Dashboard)" -ForegroundColor White
Write-Host "   - Recommended for complete local testing" -ForegroundColor Gray
Write-Host ""
Write-Host "2. API Only" -ForegroundColor White
Write-Host "   - Use if you have external OpenSearch" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Install Python Dependencies Only" -ForegroundColor White
Write-Host "   - For development without Docker" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting full stack deployment..." -ForegroundColor Green
        Write-Host ""
        
        # Build images
        Write-Host "Building Docker images..." -ForegroundColor Yellow
        docker-compose build
        
        # Start services
        Write-Host ""
        Write-Host "Starting services..." -ForegroundColor Yellow
        docker-compose up -d
        
        # Wait for services to be ready
        Write-Host ""
        Write-Host "Waiting for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Check service status
        Write-Host ""
        Write-Host "Service Status:" -ForegroundColor Cyan
        docker-compose ps
        
        # Test endpoints
        Write-Host ""
        Write-Host "Testing API endpoints..." -ForegroundColor Yellow
        
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get
            Write-Host "✓ API Health Check: $($health.status)" -ForegroundColor Green
        } catch {
            Write-Host "✗ API Health Check Failed" -ForegroundColor Red
        }
        
        try {
            $opensearch = Invoke-RestMethod -Uri "http://localhost:9200" -Method Get
            Write-Host "✓ OpenSearch: Connected" -ForegroundColor Green
        } catch {
            Write-Host "✗ OpenSearch: Connection Failed" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "=============================================" -ForegroundColor Cyan
        Write-Host "  Deployment Complete!                      " -ForegroundColor Green
        Write-Host "=============================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Access your services:" -ForegroundColor White
        Write-Host "  API:                http://localhost:8000" -ForegroundColor Cyan
        Write-Host "  API Health:         http://localhost:8000/health" -ForegroundColor Cyan
        Write-Host "  OpenSearch:         http://localhost:9200" -ForegroundColor Cyan
        Write-Host "  OpenSearch Dashboard: http://localhost:5601" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "View logs:" -ForegroundColor White
        Write-Host "  docker-compose logs -f api" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Stop services:" -ForegroundColor White
        Write-Host "  docker-compose down" -ForegroundColor Gray
        Write-Host ""
    }
    
    "2" {
        Write-Host ""
        Write-Host "Building API container..." -ForegroundColor Green
        docker build -t threat-advisory-api .
        
        Write-Host ""
        Write-Host "Starting API container..." -ForegroundColor Green
        docker run -d -p 8000:8000 --env-file backend\.env --name threat-advisory-api threat-advisory-api
        
        Write-Host ""
        Write-Host "✓ API is running on http://localhost:8000" -ForegroundColor Green
        Write-Host ""
        Write-Host "View logs:" -ForegroundColor White
        Write-Host "  docker logs -f threat-advisory-api" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Stop container:" -ForegroundColor White
        Write-Host "  docker stop threat-advisory-api" -ForegroundColor Gray
        Write-Host "  docker rm threat-advisory-api" -ForegroundColor Gray
        Write-Host ""
    }
    
    "3" {
        Write-Host ""
        Write-Host "Installing Python dependencies..." -ForegroundColor Green
        
        cd backend
        
        # Check if virtual environment exists
        if (Test-Path "venv") {
            Write-Host "✓ Virtual environment exists" -ForegroundColor Green
        } else {
            Write-Host "Creating virtual environment..." -ForegroundColor Yellow
            python -m venv venv
            Write-Host "✓ Virtual environment created" -ForegroundColor Green
        }
        
        # Activate virtual environment
        Write-Host ""
        Write-Host "Activating virtual environment..." -ForegroundColor Yellow
        & .\venv\Scripts\Activate.ps1
        
        # Install dependencies
        Write-Host ""
        Write-Host "Installing dependencies..." -ForegroundColor Yellow
        pip install -r requirements.txt
        
        Write-Host ""
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
        Write-Host ""
        Write-Host "To run the API:" -ForegroundColor White
        Write-Host "  cd backend" -ForegroundColor Gray
        Write-Host "  .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
        Write-Host "  gunicorn -c gunicorn_config.py api.app:app" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Or run in development mode:" -ForegroundColor White
        Write-Host "  python api/app.py" -ForegroundColor Gray
        Write-Host ""
        
        cd ..
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Yellow
Write-Host "  - DEPLOYMENT-PRODUCTION.md (deployment guides)" -ForegroundColor Gray
Write-Host "  - READY-FOR-DEPLOYMENT.md (production checklist)" -ForegroundColor Gray
Write-Host "  - FLASK-API-QUICK-REFERENCE.md (API reference)" -ForegroundColor Gray
Write-Host ""
