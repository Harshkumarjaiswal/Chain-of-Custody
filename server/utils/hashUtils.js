const crypto = require('crypto');
const fs = require('fs');

const generateHash = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', (err) => reject(err));
    });
};

const verifyHash = async (filePath, originalHash) => {
    const currentHash = await generateHash(filePath);
    return {
        isValid: currentHash === originalHash,
        currentHash,
        originalHash
    };
};

module.exports = { generateHash, verifyHash };
