import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AccountCreated as AccountCreatedEvent,
  OrgRegistered as OrgRegisteredEvent,
  OrgConfigUpdated as OrgConfigUpdatedEvent,
  ExecutorUpdated as ExecutorUpdatedEvent
} from "../generated/templates/PasskeyAccountFactory/PasskeyAccountFactory";
import { PasskeyAccount as PasskeyAccountTemplate } from "../generated/templates";
import {
  PasskeyAccountFactory,
  PasskeyOrgConfig,
  PasskeyAccount
} from "../generated/schema";

// Helper to get or create PasskeyAccountFactory
function getOrCreateFactory(factoryAddress: Bytes, event: AccountCreatedEvent): PasskeyAccountFactory {
  let factory = PasskeyAccountFactory.load(factoryAddress);
  if (factory == null) {
    factory = new PasskeyAccountFactory(factoryAddress);
    factory.executor = factoryAddress; // Will be updated by ExecutorUpdated event
    factory.accountBeacon = factoryAddress; // Will be updated if needed
    factory.createdAt = event.block.timestamp;
    factory.blockNumber = event.block.number;
  }
  return factory;
}

export function handleAccountCreated(event: AccountCreatedEvent): void {
  let factoryAddress = event.address;

  // Ensure factory exists
  let factory = getOrCreateFactory(factoryAddress, event);
  factory.save();

  // Create PasskeyAccount entity
  let account = new PasskeyAccount(event.params.account);
  account.factory = factoryAddress;
  account.orgId = event.params.orgId;
  account.owner = event.params.owner;
  account.guardian = Address.zero(); // Will be updated by account events
  account.recoveryDelay = BigInt.fromI32(0); // Will be updated by account events
  account.createdAt = event.block.timestamp;
  account.blockNumber = event.block.number;
  account.transactionHash = event.transaction.hash;
  account.save();

  // Start indexing the new PasskeyAccount contract
  PasskeyAccountTemplate.create(event.params.account);
}

export function handleOrgRegistered(event: OrgRegisteredEvent): void {
  let factoryAddress = event.address;
  let orgId = event.params.orgId;

  // Create PasskeyOrgConfig entity
  let orgConfig = new PasskeyOrgConfig(orgId.toHexString());
  orgConfig.factory = factoryAddress;
  orgConfig.orgId = orgId;
  orgConfig.maxCredentialsPerAccount = event.params.maxCredentials;
  orgConfig.defaultGuardian = event.params.guardian;
  orgConfig.recoveryDelay = event.params.recoveryDelay;
  orgConfig.enabled = true;
  orgConfig.createdAt = event.block.timestamp;
  orgConfig.updatedAt = event.block.timestamp;
  orgConfig.save();
}

export function handleOrgConfigUpdated(event: OrgConfigUpdatedEvent): void {
  let orgId = event.params.orgId;

  let orgConfig = PasskeyOrgConfig.load(orgId.toHexString());
  if (orgConfig != null) {
    orgConfig.updatedAt = event.block.timestamp;
    orgConfig.save();
  }
}

export function handleFactoryExecutorUpdated(event: ExecutorUpdatedEvent): void {
  let factory = PasskeyAccountFactory.load(event.address);
  if (factory != null) {
    factory.executor = event.params.newExecutor;
    factory.save();
  }
}
