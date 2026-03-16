# PowerShell script to build agent.exe

$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $AgentDir

Write-Host "--- Starting Agent Build Process ---" -ForegroundColor Cyan

# 1. Check for Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

# 2. Setup Virtual Environment (using .venv for cleanliness)
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv .venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\.venv\Scripts\Activate.ps1"

# 3. Install Dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller

# 4. Run PyInstaller
Write-Host "Building executable..." -ForegroundColor Yellow
pyinstaller agent.spec --clean --noconfirm

# 5. Check Result
if (Test-Path "dist/agent.exe") {
    Write-Host "Build successful! Executable found at: agent\dist\agent.exe" -ForegroundColor Green
} else {
    Write-Error "Build failed. Executable not found in dist directory."
}

Write-Host "--- Build Finished ---" -ForegroundColor Cyan
