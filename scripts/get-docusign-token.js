#!/usr/bin/env node

// Script to get DocuSign access token using JWT authentication
// This assumes consent has already been granted

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function getJWTToken() {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const authServer = 'https://account-d.docusign.com';

  if (!integrationKey || !userId || !privateKey) {
    console.error('Missing required environment variables');
    return;
  }

  // Create JWT
  const jwtPayload = {
    iss: integrationKey,
    sub: userId,
    aud: authServer,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: 'signature impersonation'
  };

  const token = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });

  // Exchange JWT for access token
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  });

  const response = await fetch(`${authServer}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get token:', error);
    
    if (error.includes('consent_required')) {
      console.log('\nConsent required! Please visit this URL to grant consent:');
      console.log(`${authServer}/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://localhost`);
    }
    return;
  }

  const data = await response.json();
  console.log('\nSuccess! Add this to your .env.local file:');
  console.log(`DOCUSIGN_ACCESS_TOKEN=${data.access_token}`);
  console.log(`\nToken expires in ${data.expires_in / 3600} hours`);
}

getJWTToken().catch(console.error);