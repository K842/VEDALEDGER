const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { batchSchema } = require('../validators/schema');

// Import ABIs and Config
const coreABI = require('../abis/VedaLedgerCore.json');
const CORE_ADDRESS = process.env.CORE_CONTRACT_ADDRESS;

/**
 * PHASE 2: BATCHING (Consensus Layer)
 * URL: POST http://localhost:3000/api/batch/
 */
router.post('/', async (req, res) => {
    // 1. Structural Validation
    const { error, value } = batchSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, details: error.details[0].message });

    const { collectionIds, species } = value;

    try {
        const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const coreContract = new ethers.Contract(CORE_ADDRESS, coreABI.abi, wallet);

        // 2. Data Transformation
        const speciesBytes = ethers.encodeBytes32String(species);

        // 3. Blockchain Execution (aggregateToBatch)
        console.log(`--- Executing Batching for ${species} on PolkaVM ---`);
        const tx = await coreContract.aggregateToBatch(collectionIds, speciesBytes);
        const receipt = await tx.wait();

        // 4. Extract BatchID from VedaStateChanged event (First argument)
        const batchId = receipt.logs[0].args[0].toString();

        res.status(200).json({
            success: true,
            batchId: batchId,
            txHash: tx.hash,
            message: "Aggregation Complete on PolkaVM"
        });
    } catch (err) {
        console.error("🚨 BATCHING ERROR:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;