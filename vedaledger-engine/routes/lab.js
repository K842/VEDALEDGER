const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

// Import Core ABI (Since certifyBatch is in the Core contract)
const coreABI = require('../abis/VedaLedgerCore.json');
const CORE_ADDRESS = process.env.CORE_CONTRACT_ADDRESS;

/**
 * PHASE 3: LAB QUALITY (Security Layer)
 * URL: POST http://localhost:3000/api/lab/certify
 */
router.post('/certify', async (req, res) => {
    const { batchId, secretSalt, passed } = req.body; 

    // Quick internal validation for required fields
    if (!batchId || !secretSalt) {
        return res.status(400).json({ success: false, error: "Missing batchId or secretSalt" });
    }

    try {
        const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const coreContract = new ethers.Contract(CORE_ADDRESS, coreABI.abi, wallet);

        // 1. Convert salt to hex string instead of raw bytes to stabilize memory
        const reportHex = ethers.hexlify(ethers.toUtf8Bytes(secretSalt));

        // 2. Call certifyBatch with a manual gas limit
        console.log(`--- Certifying Batch ${batchId} ---`);

        const tx = await coreContract.certifyBatch(
            batchId, 
            reportHex, 
            passed
        );

        const receipt = await tx.wait();

        res.status(200).json({
            success: true,
            message: "Batch Certified via PVM BLAKE2b Hash",
            txHash: tx.hash,
            status: passed ? "PASSED" : "REJECTED"
        });
    } catch (err) {
        console.error("🚨 LAB ERROR:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;