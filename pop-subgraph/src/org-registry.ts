import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  OrgRegistered as OrgRegisteredEvent,
  MetaUpdated as MetaUpdatedEvent,
  ContractRegistered as ContractRegisteredEvent,
  AutoUpgradeSet as AutoUpgradeSetEvent,
  HatsTreeRegistered as HatsTreeRegisteredEvent
} from "../generated/OrgRegistry/OrgRegistry";
import {
  OrgRegistryContract,
  Organization,
  OrgMetaUpdate,
  RegisteredContract,
  AutoUpgradeChange
} from "../generated/schema";
import { getOrCreateRole } from "./utils";

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
  org.lastUpdatedAt = event.block.timestamp;
  org.save();
}

/**
 * Handles MetaUpdated event
 * Updates the org's metadata and creates a history record
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
