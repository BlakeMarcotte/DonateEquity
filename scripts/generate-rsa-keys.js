const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate RSA key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

// Save keys to files
const keysDir = path.join(__dirname, '..', 'keys');
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir);
}

fs.writeFileSync(path.join(keysDir, 'docusign_public.pem'), publicKey);
fs.writeFileSync(path.join(keysDir, 'docusign_private.pem'), privateKey);

console.log('RSA Key Pair Generated Successfully!\n');
console.log('Public Key saved to: keys/docusign_public.pem');
console.log('Private Key saved to: keys/docusign_private.pem\n');
console.log('Next steps:');
console.log('1. Copy the PUBLIC key from keys/docusign_public.pem');
console.log('2. Go to https://admindemo.docusign.com/');
console.log('3. Navigate to Integrations → Apps and Keys');
console.log('4. Find your app (Integration Key: 67399cbc-c092-4c0a-b55c-1669631af04e)');
console.log('5. In the "RSA Keypairs" section, click "Add RSA Keypair"');
console.log('6. Paste the PUBLIC key content');
console.log('7. Copy the PRIVATE key content to your .env.local file as DOCUSIGN_PRIVATE_KEY');
console.log('\nIMPORTANT: The private key in .env.local should be on a single line with \\n for line breaks');
console.log('\nExample format for .env.local:');
console.log('DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBADANBgkqh...\\n-----END RSA PRIVATE KEY-----"');