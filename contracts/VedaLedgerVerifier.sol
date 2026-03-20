// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VedaLedgerVerifier
 * @notice ZK-Commitment Verifier using PolkaVM Native Hashing.
 * @dev High-performance verification for sensitive Ayurvedic lab data.
 */

interface ISystem {
    function blake2b_256(bytes calldata data) external view returns (bytes32);
}

contract VedaLedgerVerifier {
    ISystem constant SYSTEM = ISystem(address(0x900));
    address public coreAddress;

    error ProofInvalid();
    error Unauthorized();

    event VerificationSuccess(uint256 indexed batchId, bytes32 indexed proofHash);

    constructor(address _core) {
        coreAddress = _core;
    }

    /**
     * @notice Verifies a Lab Result without exposing raw data to the public.
     * @param _batchId The ID of the batch.
     * @param _commitment The public hash stored in VedaLedgerCore.
     * @param _secretSalt A private string known only to the Lab.
     * @param _purityLevel The actual purity value (e.g., 95 for 95%).
     * @return bool Returns true if the math matches the hardware-level hash.
     */
    function verifyQualityCommitment(
        uint256 _batchId,
        bytes32 _commitment,
        bytes32 _secretSalt,
        uint8 _purityLevel
    ) external view returns (bool) {
        // PVM Optimization: We concatenate the secret and the result
        bytes memory dataToHash = abi.encodePacked(_secretSalt, _purityLevel);

        // Hardware-level BLAKE2b-256 hashing (Fast & Cheap on PolkaVM)
        bytes32 calculatedHash = SYSTEM.blake2b_256(dataToHash);

        // If the hashes match, the Lab cannot lie about the result later
        if (calculatedHash != _commitment) revert ProofInvalid();

        return true;
    }
}