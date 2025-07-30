#!/bin/bash

# Deploy Firebase Security Rules
# Usage: ./scripts/deploy-security-rules.sh

set -e

echo "🔒 Deploying Firebase Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Deploy Firestore rules
echo "📄 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

# Deploy Storage rules
echo "🗄️  Deploying Storage security rules..."
firebase deploy --only storage

echo "✅ Security rules deployed successfully!"
echo ""
echo "🔍 You can view your rules in the Firebase Console:"
echo "- Firestore Rules: https://console.firebase.google.com/project/$(firebase use --json | jq -r '.default')/firestore/rules"
echo "- Storage Rules: https://console.firebase.google.com/project/$(firebase use --json | jq -r '.default')/storage/rules"