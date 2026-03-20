// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VedaLedgerCore_PVM
 * @author Senior Web3 Architect
 * @notice Final Production Core for Ayurvedic Traceability on PolkaVM.
 * @dev Integrates ISystem Precompiles (0x900) for BLAKE2b and Origin Security.
 */

// Polkadot Hub PVM-exclusive Precompile
interface ISystem {
    function blake2b_256(bytes calldata data) external view returns (bytes32);
    function callerIsOrigin() external view returns (bool);
}

contract VedaLedgerCore {
    ISystem constant SYSTEM = ISystem(address(0x900));
    
    // --- Access Control (Minimalist Internal Roles) ---
    address public admin;
    address public manufacturingContractAddress;
    mapping(address => uint8) public roles; // 1: Farmer, 2: Aggregator, 3: Lab, 4: Manufacturer

    // --- State Machine ---
    enum Stage { Harvested, Aggregated, Tested, Rejected, Processed, Manufactured }

    struct Collection {
        address farmer;
        Stage stage;
        uint8 qualityScore;
        uint32 quantityKg;
        uint32 timestamp;
        bytes32 metadataHash; // IPFS CID
    }

    struct Batch {
        bytes32 species;
        uint32 totalWeightMg;     // Mass Balance in Milligrams
        uint32 remainingWeightMg; // Remaining for Manufacturing
        uint8 avgScore;
        Stage stage;
        uint256[] collectionIds;
    }

    // --- State Variables ---
    uint256 private _cCounter;
    mapping(uint256 => Collection) public collections;
    mapping(uint256 => Batch) public batches;
    mapping(uint256 => bytes32) public productQRs; // ProductID to QR Hash
    mapping(uint256 => bytes32) public batchReportHashes; // Batch ID to Lab Report Hash (Audit Trail)

    // --- Custom Errors ---
    error Unauthorized();
    error InvalidStage(uint8 current);
    error MassBalanceViolation();
    error PVMOriginRequired();

    // --- Events ---
    event VedaStateChanged(uint256 indexed id, Stage indexed stage);
    event MassBalanceUpdated(uint256 indexed batchId, uint32 remainingMg);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyRole(uint8 role) {
        if (roles[msg.sender] != role) revert Unauthorized();
        _;
    }

    // --- PHASE 1: Farmer Collection ---
    function recordHarvest(
        uint32 _qty,
        bytes32 _mHash,
        uint8 _score
    ) external onlyRole(1) {
        // PVM SECURITY: Ensure call comes from an EOA, not a proxy/contract
        if (!SYSTEM.callerIsOrigin()) revert PVMOriginRequired();
        
        unchecked { _cCounter++; }
        uint256 id = _cCounter;

        collections[id] = Collection({
            farmer: msg.sender,
            stage: Stage.Harvested,
            qualityScore: _score,
            quantityKg: _qty,
            timestamp: uint32(block.timestamp),
            metadataHash: _mHash
        });

        emit VedaStateChanged(id, Stage.Harvested);
    }

    // --- PHASE 2: Aggregation (Co-op) ---
    function aggregateToBatch(
        uint256[] calldata _ids,
        bytes32 _species
    ) external onlyRole(2) returns (uint256 bId) {
        uint32 tWeightKg;
        uint256 tScore;
        
        for (uint256 i = 0; i < _ids.length; ) {
            Collection storage col = collections[_ids[i]];
            if (col.stage != Stage.Harvested) revert InvalidStage(uint8(col.stage));
            
            col.stage = Stage.Aggregated;
            tWeightKg += col.quantityKg;
            tScore += col.qualityScore;
            unchecked { ++i; }
        }

        bId = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        uint32 weightMg = tWeightKg * 1000000;

        batches[bId].species = _species;
        batches[bId].totalWeightMg = weightMg;
        batches[bId].remainingWeightMg = weightMg;
        batches[bId].avgScore = uint8(tScore / _ids.length);
        batches[bId].stage = Stage.Aggregated;
        batches[bId].collectionIds = _ids;

        emit VedaStateChanged(bId, Stage.Aggregated);
    }

    // --- PHASE 3: Lab Quality (PVM Blake2 Hashing) ---
    function certifyBatch(uint256 _bId, bytes calldata _rawReport, bool _pass) external onlyRole(3) {
        Batch storage b = batches[_bId];
        if (b.stage != Stage.Aggregated) revert InvalidStage(uint8(b.stage));

        // PVM EXCLUSIVE: Generate high-speed BLAKE2 hash of the raw lab report
        bytes32 reportHash = SYSTEM.blake2b_256(_rawReport);
        batchReportHashes[_bId] = reportHash;
        
        b.stage = _pass ? Stage.Tested : Stage.Rejected;
        emit VedaStateChanged(_bId, b.stage);
    }

    // --- PHASE 5: Manufacturing (Mass Balance Engine) ---
    function createProduct(
        uint256 _bId, 
        uint32 _count, 
        uint32 _mgPerUnit
    ) external onlyRole(4) {
        Batch storage b = batches[_bId];
        if (b.stage != Stage.Tested && b.stage != Stage.Processed) revert InvalidStage(uint8(b.stage));

        uint32 totalRequired = _count * _mgPerUnit;
        if (b.remainingWeightMg < totalRequired) revert MassBalanceViolation();

        // Deduct from digital inventory
        b.remainingWeightMg -= totalRequired;
        b.stage = Stage.Manufactured;

        emit MassBalanceUpdated(_bId, b.remainingWeightMg);
    }

    // --- Admin Functions ---
    function setRole(address _act, uint8 _role) external {
        if (msg.sender != admin) revert Unauthorized();
        roles[_act] = _role;
    }

    function setManufacturingContract(address _manufacturing) external {
        if (msg.sender != admin) revert Unauthorized();
        manufacturingContractAddress = _manufacturing;
    }

    function updateBatchWeight(uint256 _id, uint32 _newWeight, uint8 _newStage) external {
        // SECURITY: Only the Manufacturing contract address should be allowed to call this
        if (msg.sender != manufacturingContractAddress) revert Unauthorized();
        batches[_id].remainingWeightMg = _newWeight;
        batches[_id].stage = Stage(_newStage);
    }

}