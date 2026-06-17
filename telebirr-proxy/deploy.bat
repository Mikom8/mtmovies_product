@echo off
REM Telebirr Proxy Deployment Script for Windows
REM This script helps you deploy the proxy to Render via GitHub

echo ========================================
echo Telebirr Proxy Deployment Helper
echo ========================================
echo.

REM Check if git is initialized
if not exist .git (
    echo Initializing Git repository...
    git init
    git branch -M main
) else (
    echo Git already initialized
)

REM Add files
echo Adding files to Git...
git add .

REM Get commit message
set /p commit_msg="Enter commit message (default: 'Update proxy'): "
if "%commit_msg%"=="" set commit_msg=Update proxy

echo Committing changes...
git commit -m "%commit_msg%"

REM Check if remote exists
git remote | find "origin" >nul
if errorlevel 1 (
    echo.
    echo No remote repository found.
    echo Please create a GitHub repository first, then enter the URL:
    set /p repo_url="GitHub repo URL (e.g., https://github.com/username/telebirr-proxy.git): "
    
    if not "%repo_url%"=="" (
        git remote add origin "%repo_url%"
        echo Remote added: %repo_url%
    ) else (
        echo No URL provided. Exiting.
        pause
        exit /b 1
    )
)

REM Push to GitHub
echo.
echo Pushing to GitHub...
git push -u origin main

if errorlevel 0 (
    echo.
    echo ========================================
    echo Successfully pushed to GitHub!
    echo ========================================
    echo.
    echo Next Steps:
    echo 1. Go to https://render.com
    echo 2. Click 'New +' - 'Web Service'
    echo 3. Connect your GitHub repository
    echo 4. Render will auto-detect settings from render.yaml
    echo 5. Click 'Create Web Service'
    echo 6. Copy your Render URL (e.g., https://telebirr-proxy.onrender.com^)
    echo 7. Add it to Railway as TELEBIRR_PROXY_URL environment variable
    echo.
    echo Deployment complete!
) else (
    echo.
    echo Push failed. Please check:
    echo - GitHub authentication is set up
    echo - Repository exists and is accessible
    echo - You have push permissions
)

echo.
pause
