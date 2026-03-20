// check-role.js
const hre = require("hardhat");

async function main() {
  const coreAddr = "0x204E0B6A67f6EB0A3d3e61fDC2E2393E6D55ea86";
  const auditWallet = "0x6375a7eE823601c85835f358785816A3e35381a3";
  
  const Core = await hre.ethers.getContractFactory("VedaLedgerCore");
  const core = Core.attach(coreAddr);

  const role = await core.roles(auditWallet);
  const admin = await core.admin();

  console.log("--- Blockchain State ---");
  console.log("Core Address: ", coreAddr);
  console.log("Admin Address:", admin);
  console.log("Audit Wallet: ", auditWallet);
  console.log("Current Role: ", role.toString(), role == 1 ? "(✅ FARMER)" : "(❌ NOT AUTHORIZED)");
}

main().catch(console.error);