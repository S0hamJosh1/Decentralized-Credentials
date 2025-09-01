// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CredentialRegistry {
    // --- Ownership
    address public owner;
    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    // --- Issuer role
    mapping(address => bool) public isIssuer;
    modifier onlyIssuer() { require(isIssuer[msg.sender], "not issuer"); _; }

    struct Credential {
        address issuer;
        uint256 issuedAt;
        bool valid;
    }

    // holder => hash => Credential
    mapping(address => mapping(bytes32 => Credential)) public credentials;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event CredentialIssued(address indexed holder, bytes32 indexed hash, address indexed issuer);
    event CredentialRevoked(address indexed holder, bytes32 indexed hash, address indexed issuer);

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true; // deployer starts as issuer
        emit IssuerAdded(msg.sender);
    }

    // ---- admin: manage issuers
    function addIssuer(address who) external onlyOwner {
        require(who != address(0), "zero addr");
        require(!isIssuer[who], "already issuer");
        isIssuer[who] = true;
        emit IssuerAdded(who);
    }

    function removeIssuer(address who) external onlyOwner {
        require(isIssuer[who], "not issuer");
        isIssuer[who] = false;
        emit IssuerRemoved(who);
    }

    // ---- core flows
    function issueCredential(address holder, bytes32 hash) external onlyIssuer {
        require(holder != address(0), "zero holder");
        require(hash != bytes32(0), "zero hash");
        require(!credentials[holder][hash].valid, "already issued");

        credentials[holder][hash] = Credential({
            issuer: msg.sender,
            issuedAt: block.timestamp,
            valid: true
        });

        emit CredentialIssued(holder, hash, msg.sender);
    }

    function revokeCredential(address holder, bytes32 hash) external onlyIssuer {
        Credential storage c = credentials[holder][hash];
        require(c.valid, "no active cred");
        // optional: only original issuer can revoke:
        // require(c.issuer == msg.sender, "only original issuer");
        c.valid = false;
        emit CredentialRevoked(holder, hash, msg.sender);
    }

    function verifyCredential(address holder, bytes32 hash) external view returns (bool) {
        return credentials[holder][hash].valid;
    }
}
