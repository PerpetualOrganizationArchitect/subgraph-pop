import { BigInt, Bytes, DataSourceContext } from "@graphprotocol/graph-ts";
import {
  OrgRegistered as OrgRegisteredEvent,
  MetaUpdated as MetaUpdatedEvent,
  ContractRegistered as ContractRegisteredEvent,
  AutoUpgradeSet as AutoUpgradeSetEvent,
  HatsTreeRegistered as HatsTreeRegisteredEvent
} from "../generated/templates/OrgRegistry/OrgRegistry";
import {
  OrgRegistryContract,
  Organization,
  OrgMetaUpdate,
  RegisteredContract,
  AutoUpgradeChange
} from "../generated/schema";
import { OrgMetadata as OrgMetadataTemplate } from "../generated/templates";
import { getOrCreateRole } from "./utils";

/**
 * Helper function to create an IPFS file data source for org metadata.
 * Uses DataSourceContext to pass the orgId to the handler so it can
 * link the metadata back to the organization.
 *
 * NOTE: Currently disabled because the contract stores bytes32 sha256 digest,
 * but The Graph needs a proper IPFS CIDv0 string (base58 encoded).
 * Converting bytes32 → CID requires base58 encoding which is complex in AssemblyScript.
 *
 * TODO: Either:
 * 1. Store full CID string in contract events
 * 2. Implement base58 encoding in AssemblyScript
 * 3. Use an off-chain indexer to fetch metadata
 */
function createIpfsDataSource(metadataHash: Bytes, orgId: Bytes): void {
  // Skip if metadataHash is empty (all zeros)
  if (metadataHash.equals(Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000"))) {
    return;
  }

  // DISABLED: Cannot convert bytes32 to valid IPFS CID without base58 encoding
  // The hex string is not a valid CID format and will cause indexing errors
  //
  // To properly support IPFS metadata:
  // - Contract should emit the full CID string (e.g., "QmXyz...")
  // - Or implement base58 encoding: prepend 0x1220 to bytes32, then base58 encode
  //
  // For now, metadata must be indexed through other means (e.g., off-chain)

  // let ipfsHash = metadataHash.toHexString();
  // let context = new DataSourceContext();
  // context.setBytes("orgId", orgId);
  // OrgMetadataTemplate.createWithContext(ipfsHash, context);
}

/**
 * Helper function to get or create the OrgRegistryContract singleton
 */
function getOrCreateOrgRegistry(contractAddress: Bytes, timestamp: BigInt, blockNumber: BigInt): OrgRegistryContract {
  let registry = OrgRegistryContract.load(contractAddress);
  if (!registry) {
    registry = new OrgRegistryContract(contractAddress);
    registry.totalOrgs = BigInt.fromI32(0);
    registry.totalContracts = BigInt.fromI32(0);
    registry.createdAt = timestamp;
    registry.createdAtBlock = blockNumber;
    registry.save();
  }
  return registry;
}

/**
 * Handles OrgRegistered event
 * Updates the Organization entity with name and metadata from OrgRegistry
 * Also triggers IPFS indexing for the metadata content
 */
export function handleOrgRegistered(event: OrgRegisteredEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let name = event.params.name;
  let metadataHash = event.params.metadataHash;

  // Get or create registry
  let registry = getOrCreateOrgRegistry(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );

  // Increment total orgs for this registration
  registry.totalOrgs = registry.totalOrgs.plus(BigInt.fromI32(1));
  registry.save();

  // Load or create Organization (OrgRegistered may fire before OrgDeployed)
  let org = Organization.load(orgId);
  if (!org) {
    org = new Organization(orgId);
  }
  org.name = name.toString();
  org.metadataHash = metadataHash;

  // Link to metadata entity (will be populated when IPFS content is indexed)
  // Use hex string as the metadata ID
  let metadataId = metadataHash.toHexString();
  org.metadata = metadataId;

  org.lastUpdatedAt = event.block.timestamp;
  org.save();

  // Create IPFS file data source to fetch and index the metadata content
  // This is resilient - if IPFS is slow/unavailable, main indexing continues
  createIpfsDataSource(metadataHash, orgId);
}

/**
 * Handles MetaUpdated event
 * Updates the org's metadata and creates a history record
 * Also triggers IPFS indexing for the new metadata content
 */
export function handleMetaUpdated(event: MetaUpdatedEvent): void {
  let orgId = event.params.orgId;
  let newName = event.params.newName;
  let newMetadataHash = event.params.newMetadataHash;

  // Load Organization
  let org = Organization.load(orgId);
  if (org) {
    org.name = newName.toString();
    org.metadataHash = newMetadataHash;

    // Link to new metadata entity (will be populated when IPFS content is indexed)
    let metadataId = newMetadataHash.toHexString();
    org.metadata = metadataId;

    org.lastUpdatedAt = event.block.timestamp;
    org.save();

    // Create history record
    let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
    let update = new OrgMetaUpdate(updateId);

    update.organization = orgId;
    update.orgId = orgId;
    update.newName = newName.toString();
    update.newMetadataHash = newMetadataHash;
    update.updatedAt = event.block.timestamp;
    update.updatedAtBlock = event.block.number;
    update.transactionHash = event.transaction.hash;

    update.save();

    // Create IPFS file data source for the new metadata
    // This is resilient - if IPFS is slow/unavailable, main indexing continues
    createIpfsDataSource(newMetadataHash, orgId);
  }
}

/**
 * Handles ContractRegistered event
 * Creates a new RegisteredContract entity and updates counters
 */
export function handleContractRegistered(event: ContractRegisteredEvent): void {
  let contractAddress = event.address;
  let contractId = event.params.contractId;
  let orgId = event.params.orgId;
  let typeId = event.params.typeId;
  let proxy = event.params.proxy;
  let beacon = event.params.beacon;
  let autoUpgrade = event.params.autoUpgrade;
  let owner = event.params.owner;

  // Get or create registry
  let registry = getOrCreateOrgRegistry(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );

  // Create registered contract entity
  let registeredContract = new RegisteredContract(contractId);
  registeredContract.orgRegistry = contractAddress;
  registeredContract.organization = orgId;
  registeredContract.orgId = orgId;
  registeredContract.typeId = typeId;
  registeredContract.proxy = proxy;
  registeredContract.beacon = beacon;
  registeredContract.autoUpgrade = autoUpgrade;
  registeredContract.owner = owner;
  registeredContract.registeredAt = event.block.timestamp;
  registeredContract.registeredAtBlock = event.block.number;
  registeredContract.lastUpdatedAt = event.block.timestamp;
  registeredContract.transactionHash = event.transaction.hash;
  registeredContract.save();

  // Update registry total contracts
  registry.totalContracts = registry.totalContracts.plus(BigInt.fromI32(1));
  registry.save();
}

/**
 * Handles AutoUpgradeSet event
 * Updates the contract's autoUpgrade status and creates a history record
 */
export function handleAutoUpgradeSet(event: AutoUpgradeSetEvent): void {
  let contractAddress = event.address;
  let contractId = event.params.contractId;
  let enabled = event.params.enabled;

  // Load and update registered contract
  let registeredContract = RegisteredContract.load(contractId);
  if (registeredContract) {
    registeredContract.autoUpgrade = enabled;
    registeredContract.lastUpdatedAt = event.block.timestamp;
    registeredContract.save();
  }

  // Create history record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new AutoUpgradeChange(changeId);

  change.orgRegistry = contractAddress;
  change.contract = contractId;
  change.contractId = contractId;
  change.enabled = enabled;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

/**
 * Handles HatsTreeRegistered event
 * Updates the Organization with topHatId and roleHatIds
 * Note: Organization already has topHatId/roleHatIds from OrgDeployed,
 * but this event can update them if the hats tree is modified
 */
export function handleHatsTreeRegistered(event: HatsTreeRegisteredEvent): void {
  let orgId = event.params.orgId;
  let topHatId = event.params.topHatId;
  let roleHatIds = event.params.roleHatIds;

  // Load and update Organization
  let org = Organization.load(orgId);
  if (org) {
    org.topHatId = topHatId;
    org.roleHatIds = roleHatIds;
    org.lastUpdatedAt = event.block.timestamp;
    org.save();

    // Create Role entities for topHatId and all roleHatIds
    getOrCreateRole(orgId, topHatId, event);

    for (let i = 0; i < roleHatIds.length; i++) {
      getOrCreateRole(orgId, roleHatIds[i], event);
    }
  }
}
