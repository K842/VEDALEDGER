const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const archiver = require('archiver');
const { ethers } = require('ethers');
const { manufactureSchema } = require('../validators/schema');

const manufABI = require('../abis/VedaLedgerManufacturing.json');
const MANUF_ADDRESS = process.env.MANUF_CONTRACT_ADDRESS;

router.post('/manifest', async (req, res) => {
    const { error, value } = manufactureSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { batchId, unitCount, mgPerUnit } = value;

    try {
        const provider = new ethers.JsonRpcProvider(process.env.POLKADOT_HUB_RPC);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const manufContract = new ethers.Contract(MANUF_ADDRESS, manufABI.abi, wallet);

        console.log(`--- Executing Mass Balance for Batch ${batchId} ---`);

        // 1. Trigger Blockchain Mass Balance Check
        const tx = await manufContract.manifestProducts(batchId, unitCount, mgPerUnit);
        await tx.wait();

        // 2. Generate Unique IDs and QRs
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`VedaLedger_Batch_${batchId}_QRs.zip`);
        archive.pipe(res);

        for (let i = 0; i < unitCount; i++) {
            const productID = uuidv4();
            const qrData = `https://vedaledger.io/verify/${productID}?batch=${batchId}`;
            
            // Create QR Buffer
            const qrBuffer = await QRCode.toBuffer(qrData);
            
            // Append to ZIP
            archive.append(qrBuffer, { name: `Product_${productID}.png` });
        }

        console.log(`✅ Successfully generated ${unitCount} unique QR codes.`);
        await archive.finalize();

    } catch (err) {
        res.status(500).json({ error: "Manufacturing failed: " + err.message });
    }
});

module.exports = router;