#!/bin/bash

# Quick DocuSign authentication script
echo "DocuSign Quick Authentication Helper"
echo "===================================="
echo ""
echo "Step 1: Open this URL in your browser to grant consent:"
echo ""
echo "https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=67399cbc-c092-4c0a-b55c-1669631af04e&redirect_uri=https%3A%2F%2Flocalhost"
echo ""
echo "Step 2: After granting consent, you'll be redirected to https://localhost?code=XXXXXX"
echo "        Copy the authorization code from the URL"
echo ""
read -p "Paste your authorization code here: " AUTH_CODE

if [ -z "$AUTH_CODE" ]; then
    echo "No code provided. Exiting."
    exit 1
fi

echo ""
echo "Exchanging authorization code for access token..."
echo ""

# Exchange the code
RESPONSE=$(curl -s -X POST http://localhost:3000/api/docusign/exchange-code \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$AUTH_CODE\"}")

# Check if successful
if echo "$RESPONSE" | grep -q "accessToken"; then
    TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "Success! Your access token is:"
    echo "$TOKEN"
    echo ""
    echo "Add this line to your .env.local file:"
    echo "DOCUSIGN_ACCESS_TOKEN=$TOKEN"
    echo ""
    echo "Then restart your Next.js development server."
else
    echo "Error occurred:"
    echo "$RESPONSE"
fi