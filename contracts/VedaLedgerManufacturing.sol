// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VedaLedgerManufacturing
 * @notice Logic Engine for Mass Balance and Product Conversion.
 * @dev Prevents Digital Adulteration by enforcing input/output parity.
 */

// Interface to interact with your Core contract
interface IVedaCore {
    struct Batch {
        bytes32 species;
        uint32 totalWeightMg;
        uint32 remainingWeightMg;
        uint8 avgScore;
        uint8 stage; // Enum Stage represented as uint8
        uint256[] collectionIds;
    }
    function batches(uint256 id) external view returns (bytes32, uint32, uint32, uint8, uint8);
    function updateBatchWeight(uint256 id, uint32 newWeight, uint8 newStage) external;
}

contract VedaLedgerManufacturing {
    IVedaCore public coreContract;
    address public admin;

    // Standard Conversion Ratios (Extract Ratios) 
    // Example: 5 means 5kg raw = 1kg extract (5:1)
    mapping(bytes32 => uint32) public extractionRatios;

    error InsufficientRawMaterial();
    error Unauthorized();
    error BatchNotTested();

    event ProductsManifested(uint256 indexed batchId, uint32 unitsCreated, uint32 mgConsumed);

    constructor(address _coreAddress) {
        coreContract = IVedaCore(_coreAddress);
        admin = msg.sender;
        
        // Initialize default ratios (can be updated by Admin/AYUSH)
        extractionRatios[keccak256("Ashwagandha")] = 5; 
        extractionRatios[keccak256("Tulsi")] = 4;
    }

    /**
     * @notice Converts raw batch weight into final retail products.
     * @param _batchId The source batch ID from Core.
     * @param _unitCount How many bottles/packs are being made.
     * @param _mgPerUnit How many milligrams of the herb are in each unit.
     */
    function manifestProducts(
        uint256 _batchId, 
        uint32 _unitCount, 
        uint32 _mgPerUnit
    ) external {
        // 1. Fetch data from Core
        (bytes32 species, , uint32 remainingMg, , uint8 stage) = coreContract.batches(_batchId);

        // 2. Security Gate: Must be Tested (Stage 2) or already Processed
        if (stage < 2) revert BatchNotTested();

        // 3. Calculate Mass Balance
        // totalNeeded = (units * dose) * extractionRatio
        uint32 ratio = extractionRatios[species] == 0 ? 1 : extractionRatios[species];
        uint32 rawMaterialNeeded = (_unitCount * _mgPerUnit) * ratio;

        if (remainingMg < rawMaterialNeeded) revert InsufficientRawMaterial();

        // 4. Update Core Contract State
        uint32 newRemaining = remainingMg - rawMaterialNeeded;
        
        // Stage 5 = Manufactured
        coreContract.updateBatchWeight(_batchId, newRemaining, 5);

        emit ProductsManifested(_batchId, _unitCount, rawMaterialNeeded);
    }

    function setExtractionRatio(string memory _species, uint32 _ratio) external {
        if (msg.sender != admin) revert Unauthorized();
        extractionRatios[keccak256(abi.encodePacked(_species))] = _ratio;
    }
}