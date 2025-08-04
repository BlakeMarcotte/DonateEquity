#!/usr/bin/env node

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('DocuSign Integration Setup Helper');
console.log('=================================\n');

const questions = [
  { key: 'DOCUSIGN_INTEGRATION_KEY', prompt: 'Enter your Integration Key (Client ID): ' },
  { key: 'DOCUSIGN_USER_ID', prompt: 'Enter your User ID (from profile): ' },
  { key: 'DOCUSIGN_API_ACCOUNT_ID', prompt: 'Enter your API Account ID: ' }
];

let config = {};
let currentQuestion = 0;

function askQuestion() {
  if (currentQuestion >= questions.length) {
    generateConsentUrl();
    return;
  }

  const q = questions[currentQuestion];
  rl.question(q.prompt, (answer) => {
    config[q.key] = answer.trim();
    currentQuestion++;
    askQuestion();
  });
}

function generateConsentUrl() {
  const integrationKey = config.DOCUSIGN_INTEGRATION_KEY;
  const redirectUri = 'https://localhost';
  
  // For sandbox environment
  const consentUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('\n✅ Configuration gathered!\n');
  console.log('Next steps:');
  console.log('1. Update your .env.local with these values:');
  console.log('   DOCUSIGN_INTEGRATION_KEY=' + config.DOCUSIGN_INTEGRATION_KEY);
  console.log('   DOCUSIGN_USER_ID=' + config.DOCUSIGN_USER_ID);
  console.log('   DOCUSIGN_API_ACCOUNT_ID=' + config.DOCUSIGN_API_ACCOUNT_ID);
  console.log('   (Also add your RSA private key as DOCUSIGN_PRIVATE_KEY)');
  console.log('\n2. Grant consent by visiting this URL:');
  console.log('   ' + consentUrl);
  console.log('\n3. After granting consent, copy the authorization code from the redirect URL');
  console.log('4. Exchange the code using: curl -X POST http://localhost:3000/api/docusign/exchange-code -H "Content-Type: application/json" -d \'{"code": "YOUR_CODE"}\'');
  
  rl.close();
}

console.log('Please have your DocuSign Developer Dashboard open.\n');
askQuestion();