const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000/api';
const TRIALS = 3;

async function runMasterAudit() {
    console.log("🚀 INITIALIZING VEDALEDGER MASTER AUDIT [TRIPLE-LOOP MODE]");
    console.log("-------------------------------------------------------");

    let report = [];
    let successCount = 0;
    let failCount = 0;

    const logResult = (item, status, details) => {
        if (status === "PASS") successCount++;
        else failCount++;
        report.push({ item, status, details });
        console.log(`${status === "PASS" ? "✅" : "❌"} ${item}: ${status}`);
    };

    for (let i = 1; i <= TRIALS; i++) {
        console.log(`\n--- ROUND ${i} of ${TRIALS} ---`);

        // 1. TEST: HARVEST (PHASE 1)
        try {
            const harvestRes = await axios.post(`${BASE_URL}/harvest`, {
                species: "Ashwagandha",
                quantity: 100,
                score: 95,
                metadata: { farmerName: `Farmer_${i}`, gps: "20.14, 85.67", harvestDate: new Date().toISOString() }
            });
            logResult(`Phase 1: Record Harvest (Trial ${i})`, "PASS", `CID: ${harvestRes.data.cid}`);
            
            // 2. TEST: SPECIES MISMATCH PROTECTION (SECURITY)
            try {
                await axios.post(`${BASE_URL}/batch/create`, {
                    collectionIds: [1], // Assuming ID 1 exists
                    species: "Tulsi", // Intentional mismatch
                    location: "Warehouse_X"
                });
                logResult(`Security: Species Mismatch Gate (Trial ${i})`, "FAIL", "Engine allowed mixing different species!");
            } catch (err) {
                logResult(`Security: Species Mismatch Gate (Trial ${i})`, "PASS", "Engine correctly blocked mixed species.");
            }

            // 3. TEST: SECURE BATCHING (PHASE 2)
            try {
                const batchRes = await axios.post(`${BASE_URL}/batch/create`, {
                    collectionIds: [1], 
                    species: "Ashwagandha",
                    location: "Odisha_Central"
                });
                const bId = batchRes.data.batchId;
                logResult(`Phase 2: Secure Batching (Trial ${i})`, "PASS", `BatchID: ${bId}`);

                // 4. TEST: LAB ZK-COMMITMENT (PHASE 3)
                try {
                    await axios.post(`${BASE_URL}/lab/certify`, {
                        batchId: bId,
                        purityValue: 98,
                        secretSalt: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
                        passed: true
                    });
                    logResult(`Phase 3: Lab ZK-Commitment (Trial ${i})`, "PASS", "Hash stored on-chain.");

                    // 5. TEST: MASS BALANCE (PHASE 5)
                    try {
                        // Attempting to manifest 50,000kg from a 100kg batch (Should Fail)
                        await axios.post(`${BASE_URL}/manufacture/manifest`, {
                            batchId: bId, unitCount: 1000, mgPerUnit: 1000000
                        });
                        logResult(`Phase 5: Mass Balance Gate (Trial ${i})`, "FAIL", "Engine allowed over-production!");
                    } catch (err) {
                        logResult(`Phase 5: Mass Balance Gate (Trial ${i})`, "PASS", "Engine blocked excess production.");
                    }

                    // 6. TEST: QR GENERATION & UUID (OUTPUT)
                    try {
                        const qrRes = await axios.post(`${BASE_URL}/manufacture/manifest`, {
                            batchId: bId, unitCount: 5, mgPerUnit: 500
                        });
                        if (qrRes.status === 200) {
                            logResult(`Output: QR ZIP Generation (Trial ${i})`, "PASS", "ZIP Archive created.");
                        }
                    } catch (err) {
                        logResult(`Output: QR ZIP Generation (Trial ${i})`, "FAIL", err.message);
                    }

                } catch (err) {
                    logResult(`Phase 3: Lab Test (Trial ${i})`, "FAIL", err.message);
                }

            } catch (err) {
                logResult(`Phase 2: Batching (Trial ${i})`, "FAIL", err.message);
            }

        } catch (err) {
            logResult(`Phase 1: Harvest (Trial ${i})`, "FAIL", err.message);
        }
    }

    // --- FINAL AUDIT REPORT ---
    console.log("\n==============================");
    console.log("📊 FINAL AUDIT SUMMARY");
    console.log(`TOTAL PASSES: ${successCount}`);
    console.log(`TOTAL FAILURES: ${failCount}`);
    console.log("==============================");
    
    if (failCount > 0) {
        console.log("🛑 CRITICAL ERRORS DETECTED:");
        report.filter(r => r.status === "FAIL").forEach(f => {
            console.log(`- [${f.item}]: ${f.details}`);
        });
    } else {
        console.log("🌟 ALL SYSTEMS OPERATIONAL. READY FOR FULL STAKEHOLDER THROTTLE.");
    }
}

runMasterAudit();