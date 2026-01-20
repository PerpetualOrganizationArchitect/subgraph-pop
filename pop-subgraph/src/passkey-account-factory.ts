import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AccountCreated as AccountCreatedEvent,
  GlobalConfigUpdated as GlobalConfigUpdatedEvent,
  PoaManagerUpdated as PoaManagerUpdatedEvent,
  PausedStateChanged as PausedStateChangedEvent
} from "../generated/templates/PasskeyAccountFactory/PasskeyAccountFactory";
import { PasskeyAccount as PasskeyAccountTemplate } from "../generated/templates";
import {
  PasskeyAccountFactory,
  PasskeyAccount
} from "../generated/schema";

export function handleAccountCreated(event: AccountCreatedEvent): void {
  let factoryAddress = event.address;

  // Factory should already exist from InfrastructureDeployed event
  let factory = PasskeyAccountFactory.load(factoryAddress);
  if (factory == null) {
    return;
  }

  // Create PasskeyAccount entity
  let account = new PasskeyAccount(event.params.account);
  account.factory = factoryAddress;
  account.initialCredentialId = event.params.credentialId;
  account.owner = event.params.owner;
  account.guardian = Address.zero(); // Will be updated by GuardianUpdated event
  account.recoveryDelay = BigInt.fromI32(0); // Will be updated by account events
  account.createdAt = event.block.timestamp;
  account.blockNumber = event.block.number;
  account.transactionHash = event.transaction.hash;
  account.save();

  // Start indexing the new PasskeyAccount contract
  PasskeyAccountTemplate.create(event.params.account);
}

export function handleGlobalConfigUpdated(event: GlobalConfigUpdatedEvent): void {
  let factory = PasskeyAccountFactory.load(event.address);
  if (factory != null) {
    factory.poaGuardian = event.params.guardian;
    factory.recoveryDelay = event.params.recoveryDelay;
    factory.maxCredentialsPerAccount = event.params.maxCredentials;
    factory.save();
  }
}

export function handlePoaManagerUpdated(event: PoaManagerUpdatedEvent): void {
  let factory = PasskeyAccountFactory.load(event.address);
  if (factory != null) {
    factory.poaManager = event.params.newPoaManager;
    factory.save();
  }
}

export function handlePausedStateChanged(event: PausedStateChangedEvent): void {
  let factory = PasskeyAccountFactory.load(event.address);
  if (factory != null) {
    factory.paused = event.params.paused;
    factory.save();
  }
}
