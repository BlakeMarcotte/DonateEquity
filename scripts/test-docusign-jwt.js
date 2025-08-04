#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testJWT() {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  
  console.log('Testing JWT authentication with:');
  console.log('Integration Key:', integrationKey);
  console.log('User ID:', userId);
  console.log('Has Private Key:', !!privateKey);
  
  // Create a JWT manually
  const jwt = require('jsonwebtoken');
  
  const jwtPayload = {
    iss: integrationKey,
    sub: userId,
    aud: 'account-d.docusign.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    scope: 'signature impersonation'
  };
  
  const token = jwt.sign(jwtPayload, privateKey, { algorithm: 'RS256' });
  
  console.log('\nJWT Token created successfully');
  
  // Try to exchange it
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  });
  
  console.log('\nExchanging JWT for access token...');
  
  const response = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  
  const responseText = await response.text();
  
  if (!response.ok) {
    console.error('\nFailed:', response.status, responseText);
  } else {
    const data = JSON.parse(responseText);
    console.log('\n✅ SUCCESS! JWT authentication is working!');
    console.log('\nAdd this to your .env.local:');
    console.log(`DOCUSIGN_ACCESS_TOKEN=${data.access_token}`);
    console.log(`\nToken expires in ${data.expires_in / 3600} hours`);
  }
}

testJWT().catch(console.error);