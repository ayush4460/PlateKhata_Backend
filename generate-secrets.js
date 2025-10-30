const crypto = require('crypto');

console.log('🔐 Generating Secure JWT Secrets...\n');

// Generate JWT_SECRET (64 characters)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=');
console.log(jwtSecret);
console.log('');

// Generate JWT_REFRESH_SECRET (64 characters)
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_REFRESH_SECRET=');
console.log(jwtRefreshSecret);
console.log('');

console.log('Copy these to your .env file\n');
console.log('These are cryptographically secure random strings');