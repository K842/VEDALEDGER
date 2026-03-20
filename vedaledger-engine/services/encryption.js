const crypto = require('crypto');
require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Must be 32 bytes

const encryptData = (data) => {
    const iv = crypto.randomBytes(12); // Initialization Vector
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');

    // Return a combined package of IV, Tag, and Encrypted Data
    return {
        iv: iv.toString('hex'),
        content: encrypted,
        tag: authTag
    };
};

module.exports = { encryptData };