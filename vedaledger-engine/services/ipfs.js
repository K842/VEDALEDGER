const axios = require('axios');
require('dotenv').config();

const pinJSONToIPFS = async (jsonData) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
    try {
        const response = await axios.post(url, jsonData, {
            headers: {
                pinata_api_key: process.env.PINATA_API_KEY,
                pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
            }
        });
        return response.data.IpfsHash; // This is your CID
    } catch (error) {
        console.error("IPFS Upload Error:", error);
        throw error;
    }
};

module.exports = { pinJSONToIPFS };