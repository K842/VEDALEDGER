const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const network = await hre.ethers.provider.getNetwork();

  console.log("=== VedaLedger PVM Deployment ===");
  console.log("Network:  ", hre.network.name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", hre.ethers.formatEther(balance), "PAS\n");

  if (balance === 0n) {
    console.log("ERROR: No balance! Get testnet PAS/DOT from faucet.");
    process.exit(1);
  }

  // --- 1. CORE ADDRESS SETUP ---
  const rawCoreAddr = "0x204E0B6A67f6EB0A3d3e61fDC2E2393E6D55ea86";
  const coreAddr = hre.ethers.getAddress(rawCoreAddr); 
  console.log("✅ Using existing VedaLedgerCore at:", coreAddr);

  // --- 2. DEPLOY MANUFACTURING ---
  console.log("\nDeploying VedaLedgerManufacturing...");
  const ManufFactory = await hre.ethers.getContractFactory("VedaLedgerManufacturing");
  const manufacturing = await ManufFactory.deploy(coreAddr);
  await manufacturing.waitForDeployment();
  const manufAddr = await manufacturing.getAddress();
  console.log("✅ VedaLedgerManufacturing at:", manufAddr);

  // --- 3. DEPLOY VERIFIER (The ZK-Shield) ---
  console.log("\nDeploying VedaLedgerVerifier...");
  const VerifierFactory = await hre.ethers.getContractFactory("VedaLedgerVerifier");
  const verifier = await VerifierFactory.deploy(coreAddr);
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("✅ VedaLedgerVerifier at:", verifierAddr);

  // --- 4. FINAL STEPS: LINKING & AUTHORIZATION ---
  console.log("\n=== Final Steps: Linking Ecosystem ===");
  const CoreFactory = await hre.ethers.getContractFactory("VedaLedgerCore");
  const core = CoreFactory.attach(coreAddr);

  // Link Manufacturing to Core
  const authTx = await core.setManufacturingContract(manufAddr);
  await authTx.wait();
  console.log("✅ Manufacturing contract authorized in Core!");

  // --- 🧪 TEST-ONLY AUTHORIZATION BLOCK ---
  // THIS IS FOR AUDIT/TESTING PURPOSES ONLY.
  // AUTHORIZING THE AUDIT WALLET AS A FARMER (ROLE 1)
  const AUDIT_WALLET = "0x6375a7eE823601c85835f358785816A3e35381a3";
  console.log(`🔑 Testing Auth: Setting ${AUDIT_WALLET} as Farmer (Role 1)...`);
  
  
  const roleTx = await core.setRole(AUDIT_WALLET, 1);
  await roleTx.wait();
  console.log("✅ Audit Wallet ready for master-audit.js!");
  const role = await vedaLedgerCore.roles(FARMER_ADDR);
  console.log("Role for farmer address:", role.toString());  // should print 1


  /* 🌿 SUSTAINABLE PRODUCTION METHOD:
     In a real supply chain, remove the hardcoded block above. 
     Instead, build a "Governance" or "Onboarding" UI where the Admin 
     manually authorizes Farmers after verifying their legal credentials.
     Example: await core.setRole(newFarmerAddress, 1);
  */
  // ----------------------------------------

  // --- SUMMARY ---
  console.log("\n=== Deployment Summary ===");
  console.log("Core:           ", coreAddr);
  console.log("Manufacturing:  ", manufAddr);
  console.log("Verifier:       ", verifierAddr);
  console.log("Audit Wallet:   ", AUDIT_WALLET, "(Authorized: Farmer)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});