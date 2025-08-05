#!/bin/bash

echo "Deploying Firebase Storage rules..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Deploy storage rules
firebase deploy --only storage

echo "Storage rules deployed successfully!"