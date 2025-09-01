// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Minimal Credential Registry:
 * - Issuer calls register() with a hash of the credential (CID from Ceramic/IPFS)
 * - Verifier can check if a credential hash was issued
 */
contract MinimalRegistry {
    event CredentialRegistered(bytes32 indexed credHash, address indexed issuer);

    mapping(bytes32 => address) public issuerOf;

    function register(bytes32 credHash) external {
        require(issuerOf[credHash] == address(0), "Already registered");
        issuerOf[credHash] = msg.sender;
        emit CredentialRegistered(credHash, msg.sender);
    }

    function isIssued(bytes32 credHash) external view returns (bool) {
        return issuerOf[credHash] != address(0);
    }
}
