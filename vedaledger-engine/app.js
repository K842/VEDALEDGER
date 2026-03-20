require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');

// --- Modular Routes ---
const batchRoutes = require('./routes/batch');
const labRoutes = require('./routes/lab');
const manufactureRoutes = require('./routes/manufacture');

// --- Validators & Services ---
const { harvestSchema } = require('./validators/schema');
const { pinJSONToIPFS } = require('./services/ipfs');
const { encryptData } = require('./services/encryption');

// ABI
const coreABI = require('./abis/VedaLedgerCore.json');

const app = express();

// --- Middleware Stack ---
app.use(cors());
app.use(express.json());

// --- Blockchain Connection (Engine Core) ---
const provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const coreContract = new ethers.Contract(
  process.env.CORE_CONTRACT_ADDRESS,
  coreABI.abi,
  wallet
);

// HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ 
    status: 'operational', 
    network: 'Polkadot Testnet',
    service: 'VedaLedger Engine Core' 
  });
});

/**
 * PHASE 1: HARVEST (Direct Entry)
 * Kept in app.js for high-speed farmer data ingestion.
 */
app.post('/api/harvest', async (req, res) => {
  const { error, value } = harvestSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      details: error.details[0].message,
    });
  }

  try {
    const { species, quantity, score, metadata } = value;
    
    // 1. Privacy Layer: Encrypt metadata
    const encrypted = encryptData(metadata);

    // 2. Storage Layer: Pin to IPFS
    const cid = await pinJSONToIPFS(encrypted);

    // 3. Consensus Layer: Hash CID for on-chain integrity
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(cid));

    // 4. Blockchain Execution
    const tx = await coreContract.recordHarvest(quantity, metadataHash, score);
    const receipt = await tx.wait();

    res.status(200).json({
      success: true,
      message: 'Harvest Authenticated & Recorded',
      cid,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber
    });
  } catch (err) {
    console.error("🚨 CRITICAL HARVEST FAILURE:", err.message);
    res.status(500).json({ success: false, error: "Consensus failure: " + err.message });
  }
});

/**
 * MODULAR ROUTE MOUNTING
 * Delegating specific logic to phase-specific controllers.
 */
app.use('/api/batch', batchRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/manufacture', manufactureRoutes);

// --- Global 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found in VedaLedger Engine" });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌿 VedaLedger Engine: Fully Operational`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Network: ${process.env.TESTNET_RPC_URL}\n`);
});