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
  RegisteredOrg,
  OrgMetaUpdate,
  RegisteredContract,
  AutoUpgradeChange
} from "../generated/schema";

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
 * Creates a new RegisteredOrg entity and updates the registry
 */
export function handleOrgRegistered(event: OrgRegisteredEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let executor = event.params.executor;
  let metaData = event.params.metaData;

  // Get or create registry
  let registry = getOrCreateOrgRegistry(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );

  // Check if org already exists (could be an update from setOrgExecutor)
  let org = RegisteredOrg.load(orgId);
  if (!org) {
    // New org registration
    org = new RegisteredOrg(orgId);
    org.orgRegistry = contractAddress;
    org.executor = executor;
    org.metaData = metaData;
    org.contractCount = BigInt.fromI32(0);
    org.registeredAt = event.block.timestamp;
    org.registeredAtBlock = event.block.number;
    org.lastUpdatedAt = event.block.timestamp;
    org.transactionHash = event.transaction.hash;

    // Increment total orgs
    registry.totalOrgs = registry.totalOrgs.plus(BigInt.fromI32(1));
    registry.save();
  } else {
    // Update executor (from setOrgExecutor)
    org.executor = executor;
    org.lastUpdatedAt = event.block.timestamp;
  }

  org.save();
}

/**
 * Handles MetaUpdated event
 * Updates the org's metadata and creates a history record
 */
export function handleMetaUpdated(event: MetaUpdatedEvent): void {
  let orgId = event.params.orgId;
  let newMetaData = event.params.newMetaData;

  // Load org
  let org = RegisteredOrg.load(orgId);
  if (org) {
    org.metaData = newMetaData;
    org.lastUpdatedAt = event.block.timestamp;
    org.save();
  }

  // Create history record
  let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let update = new OrgMetaUpdate(updateId);

  update.org = orgId;
  update.orgId = orgId;
  update.newMetaData = newMetaData;
  update.updatedAt = event.block.timestamp;
  update.updatedAtBlock = event.block.number;
  update.transactionHash = event.transaction.hash;

  update.save();
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
  registeredContract.org = orgId;
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

  // Update org contract count
  let org = RegisteredOrg.load(orgId);
  if (org) {
    org.contractCount = org.contractCount.plus(BigInt.fromI32(1));
    org.lastUpdatedAt = event.block.timestamp;
    org.save();
  }
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
 * Updates the org with topHatId and roleHatIds
 */
export function handleHatsTreeRegistered(event: HatsTreeRegisteredEvent): void {
  let orgId = event.params.orgId;
  let topHatId = event.params.topHatId;
  let roleHatIds = event.params.roleHatIds;

  // Load and update org
  let org = RegisteredOrg.load(orgId);
  if (org) {
    org.topHatId = topHatId;
    org.roleHatIds = roleHatIds;
    org.lastUpdatedAt = event.block.timestamp;
    org.save();
  }
}
