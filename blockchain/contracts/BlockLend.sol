// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BlockLend {
    address public owner;
    uint256 public assetCount;

    struct AssetRecord {
        string assetId;
        string name;
        string assetType;
        uint256 quantity;
        string location;
        bool active;
        uint256 updatedAt;
    }

    struct AssetTransaction {
        string assetId;
        string action;
        string txHash;
        uint256 timestamp;
    }

    mapping(bytes32 => AssetRecord) private assetRecords;
    mapping(bytes32 => bool) private assetExists;
    mapping(bytes32 => AssetTransaction[]) private assetTransactions;

    event AssetRegistered(
        string indexed assetId,
        string name,
        string assetType,
        uint256 quantity,
        uint256 timestamp
    );

    event AssetUpdated(
        string indexed assetId,
        bool active,
        uint256 timestamp
    );

    event AssetTransactionRecorded(
        string indexed assetId,
        string action,
        string txHash,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerAsset(
        string memory assetId,
        string memory name,
        string memory assetType,
        uint256 quantity,
        string memory location
    ) external onlyOwner returns (bytes32) {
        require(bytes(assetId).length > 0, "assetId is required");
        bytes32 key = keccak256(bytes(assetId));
        require(!assetExists[key], "Asset already exists");

        assetRecords[key] = AssetRecord({
            assetId: assetId,
            name: name,
            assetType: assetType,
            quantity: quantity,
            location: location,
            active: true,
            updatedAt: block.timestamp
        });
        assetExists[key] = true;
        assetCount++;

        emit AssetRegistered(assetId, name, assetType, quantity, block.timestamp);
        return key;
    }

    function updateAsset(
        string memory assetId,
        string memory name,
        string memory assetType,
        uint256 quantity,
        string memory location,
        bool active
    ) external onlyOwner {
        bytes32 key = keccak256(bytes(assetId));
        require(assetExists[key], "Asset not found");

        AssetRecord storage record = assetRecords[key];
        record.name = name;
        record.assetType = assetType;
        record.quantity = quantity;
        record.location = location;
        record.active = active;
        record.updatedAt = block.timestamp;

        emit AssetUpdated(assetId, active, block.timestamp);
    }

    function recordTransaction(
        string memory assetId,
        string memory action,
        string memory txHash
    ) external onlyOwner {
        bytes32 key = keccak256(bytes(assetId));
        require(assetExists[key], "Asset not found");

        assetTransactions[key].push(
            AssetTransaction({
                assetId: assetId,
                action: action,
                txHash: txHash,
                timestamp: block.timestamp
            })
        );

        emit AssetTransactionRecorded(assetId, action, txHash, block.timestamp);
    }

    function getAsset(
        string memory assetId
    )
        external
        view
        returns (
            string memory,
            string memory,
            string memory,
            uint256,
            string memory,
            bool,
            uint256
        )
    {
        bytes32 key = keccak256(bytes(assetId));
        require(assetExists[key], "Asset not found");

        AssetRecord memory record = assetRecords[key];
        return (
            record.assetId,
            record.name,
            record.assetType,
            record.quantity,
            record.location,
            record.active,
            record.updatedAt
        );
    }

    function getAssetTransactionCount(string memory assetId) external view returns (uint256) {
        bytes32 key = keccak256(bytes(assetId));
        require(assetExists[key], "Asset not found");
        return assetTransactions[key].length;
    }

    function isAssetRegistered(string memory assetId) external view returns (bool) {
        return assetExists[keccak256(bytes(assetId))];
    }
}
