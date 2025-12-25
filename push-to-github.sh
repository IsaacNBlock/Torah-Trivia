#!/bin/bash
# Script to push code to GitHub
# Usage: ./push-to-github.sh YOUR_REPO_URL

REPO_URL=$1

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./push-to-github.sh YOUR_REPO_URL"
  echo "Example: ./push-to-github.sh https://github.com/yourusername/torah-trivia.git"
  exit 1
fi

echo "🔗 Adding remote repository..."
git remote add origin "$REPO_URL" 2>/dev/null || git remote set-url origin "$REPO_URL"

echo "📤 Pushing code to GitHub..."
git push -u origin main

echo "✅ Done! Your code is now on GitHub."




