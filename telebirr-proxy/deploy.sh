#!/bin/bash

# Telebirr Proxy Deployment Script
# This script helps you deploy the proxy to Render via GitHub

echo "🚀 Telebirr Proxy Deployment Helper"
echo "===================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
    git branch -M main
else
    echo "✅ Git already initialized"
fi

# Add files
echo "📝 Adding files to Git..."
git add .

# Get commit message
echo ""
read -p "Enter commit message (default: 'Update proxy'): " commit_msg
commit_msg=${commit_msg:-"Update proxy"}

echo "💾 Committing changes..."
git commit -m "$commit_msg"

# Check if remote exists
if ! git remote | grep -q origin; then
    echo ""
    echo "🔗 No remote repository found."
    echo "Please create a GitHub repository first, then enter the URL:"
    read -p "GitHub repo URL (e.g., https://github.com/username/telebirr-proxy.git): " repo_url
    
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
        echo "✅ Remote added: $repo_url"
    else
        echo "❌ No URL provided. Exiting."
        exit 1
    fi
fi

# Push to GitHub
echo ""
echo "⬆️  Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Go to https://render.com"
    echo "2. Click 'New +' → 'Web Service'"
    echo "3. Connect your GitHub repository"
    echo "4. Render will auto-detect settings from render.yaml"
    echo "5. Click 'Create Web Service'"
    echo "6. Copy your Render URL (e.g., https://telebirr-proxy.onrender.com)"
    echo "7. Add it to Railway as TELEBIRR_PROXY_URL environment variable"
    echo ""
    echo "🎉 Deployment complete!"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "- GitHub authentication is set up"
    echo "- Repository exists and is accessible"
    echo "- You have push permissions"
fi
