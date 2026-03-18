// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CredentialRegistry {
    struct CredentialRecord {
        bytes32 credentialHash;
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt;
        string verificationCode;
        string templateId;
        bool exists;
    }

    address public owner;
    mapping(address => bool) public approvedIssuers;
    mapping(string => CredentialRecord) private credentials;

    event IssuerApprovalUpdated(address indexed issuer, bool approved);
    event CredentialIssued(
        string indexed credentialId,
        bytes32 indexed credentialHash,
        address indexed issuer,
        string verificationCode,
        string templateId
    );
    event CredentialRevoked(string indexed credentialId, address indexed issuer, uint64 revokedAt);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can perform this action.");
        _;
    }

    modifier onlyApprovedIssuer() {
        require(approvedIssuers[msg.sender], "Only approved issuers can perform this action.");
        _;
    }

    constructor(address initialOwner) {
        owner = initialOwner == address(0) ? msg.sender : initialOwner;
    }

    function updateIssuerApproval(address issuer, bool approved) external onlyOwner {
        require(issuer != address(0), "Issuer wallet cannot be the zero address.");

        approvedIssuers[issuer] = approved;
        emit IssuerApprovalUpdated(issuer, approved);
    }

    function issueCredential(
        string calldata credentialId,
        bytes32 credentialHash,
        string calldata verificationCode,
        string calldata templateId
    ) external onlyApprovedIssuer {
        require(bytes(credentialId).length > 0, "Credential id is required.");
        require(credentialHash != bytes32(0), "Credential hash is required.");

        CredentialRecord storage record = credentials[credentialId];
        require(!record.exists, "Credential already exists.");

        credentials[credentialId] = CredentialRecord({
            credentialHash: credentialHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            revokedAt: 0,
            verificationCode: verificationCode,
            templateId: templateId,
            exists: true
        });

        emit CredentialIssued(credentialId, credentialHash, msg.sender, verificationCode, templateId);
    }

    function revokeCredential(string calldata credentialId) external onlyApprovedIssuer {
        CredentialRecord storage record = credentials[credentialId];
        require(record.exists, "Credential not found.");
        require(record.revokedAt == 0, "Credential is already revoked.");

        record.revokedAt = uint64(block.timestamp);
        emit CredentialRevoked(credentialId, msg.sender, record.revokedAt);
    }

    function getCredentialRecord(string calldata credentialId)
        external
        view
        returns (
            bytes32 credentialHash,
            address issuer,
            uint64 issuedAt,
            uint64 revokedAt,
            string memory verificationCode,
            string memory templateId,
            bool exists
        )
    {
        CredentialRecord storage record = credentials[credentialId];

        return (
            record.credentialHash,
            record.issuer,
            record.issuedAt,
            record.revokedAt,
            record.verificationCode,
            record.templateId,
            record.exists
        );
    }
}
