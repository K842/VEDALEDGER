const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // 1. Contract Addresses (From your successful deployment)
  const coreAddr = "0x204E0B6A67f6EB0A3d3e61fDC2E2393E6D55ea86";
  const manufAddr = "0xcdAc9CA6D6394b32DbE506744Df78e684B33691C";

  console.log("=== VedaLedger Linking Script ===");
  console.log("Core Address:         ", coreAddr);
  console.log("Manufacturing Address:", manufAddr);

  // 2. Get the Core Contract Instance
  const CoreFactory = await hre.ethers.getContractFactory("VedaLedgerCore");
  const core = CoreFactory.attach(coreAddr);

  console.log("\nAuthorizing Manufacturing in Core...");

  try {
    // 🔥 We use the name you mentioned earlier: updateBatchWeight logic depends on this
    // If you renamed the setter function, change 'setManufacturingContract' below:
    const authTx = await core.setManufacturingContract(manufAddr);
    
    console.log("Waiting for transaction confirmation...");
    await authTx.wait();

    console.log("✅ SUCCESS: Manufacturing is now authorized in VedaLedgerCore.");
  } catch (error) {
    console.error("\n❌ Error linking contracts:");
    console.error("Check if the function name is 'setManufacturingContract' in your .sol file.");
    console.error(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});