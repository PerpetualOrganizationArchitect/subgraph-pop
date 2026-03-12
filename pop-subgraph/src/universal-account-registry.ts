import { Address, BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  UserRegistered as UserRegisteredEvent,
  UsernameChanged as UsernameChangedEvent,
  UserDeleted as UserDeletedEvent,
  BatchRegistered as BatchRegisteredEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PasskeyFactoryUpdated as PasskeyFactoryUpdatedEvent
} from "../generated/templates/UniversalAccountRegistry/UniversalAccountRegistry";
import {
  UniversalAccountRegistry,
  Account,
  UsernameChange,
  AccountDeletion,
  BatchRegistration,
  RegistryOwnershipTransfer,
  NameReservation
} from "../generated/schema";

/**
 * Try to reserve a username. Returns true if the name is canonical for this owner.
 * Handles cross-chain ordering: earlier timestamp always wins.
 */
function tryReserveUsername(username: string, owner: Bytes, timestamp: BigInt): boolean {
  let nameKey = "user-" + username.toLowerCase();
  let reservation = NameReservation.load(nameKey);

  if (reservation && reservation.active) {
    if (reservation.owner.equals(owner)) {
      // Same user re-registering on another chain — canonical
      return true;
    }

    if (timestamp < reservation.reservedAt) {
      // Current event is earlier — take ownership from previous holder
      let previousOwner = Account.load(reservation.owner);
      if (previousOwner) {
        previousOwner.isCanonicalName = false;
        previousOwner.save();
      }
      reservation.owner = owner;
      reservation.chain = dataSource.network();
      reservation.reservedAt = timestamp;
      reservation.save();
      return true;
    }

    // Name is taken by someone else who registered earlier — reject
    return false;
  }

  // Name is available (no reservation or inactive) — reserve it
  if (!reservation) {
    reservation = new NameReservation(nameKey);
    reservation.type = "username";
  }
  reservation.name = username;
  reservation.owner = owner;
  reservation.chain = dataSource.network();
  reservation.reservedAt = timestamp;
  reservation.active = true;
  reservation.save();
  return true;
}

/**
 * Release a username reservation if the given owner is the current holder.
 */
function releaseUsername(username: string, owner: Bytes): void {
  let nameKey = "user-" + username.toLowerCase();
  let reservation = NameReservation.load(nameKey);
  if (reservation && reservation.active && reservation.owner.equals(owner)) {
    reservation.active = false;
    reservation.save();
  }
}

export function handleInitialized(event: InitializedEvent): void {
  let contractAddress = event.address;

  // Create or load registry entity (singleton)
  let registry = UniversalAccountRegistry.load(contractAddress);
  if (!registry) {
    registry = new UniversalAccountRegistry(contractAddress);
    registry.owner = Address.zero(); // Will be set by first OwnershipTransferred event
    registry.totalAccounts = BigInt.fromI32(0);
    registry.createdAt = event.block.timestamp;
    registry.createdAtBlock = event.block.number;
    registry.save();
  }
}

export function handleUserRegistered(event: UserRegisteredEvent): void {
  let contractAddress = event.address;
  let userAddress = event.params.user;
  let username = event.params.username;

  // Load or create registry
  let registry = UniversalAccountRegistry.load(contractAddress);
  if (!registry) {
    registry = new UniversalAccountRegistry(contractAddress);
    registry.owner = Address.zero();
    registry.totalAccounts = BigInt.fromI32(0);
    registry.createdAt = event.block.timestamp;
    registry.createdAtBlock = event.block.number;
  }

  // Check if account already exists (same user on another chain)
  let account = Account.load(userAddress);
  if (account) {
    // Account already exists — don't overwrite canonical name or re-increment
    registry.save();

    // Still create the change record for audit trail
    let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
    let change = new UsernameChange(changeId);
    change.registry = contractAddress;
    change.account = userAddress;
    change.user = userAddress;
    change.newUsername = username;
    change.changedAt = event.block.timestamp;
    change.changedAtBlock = event.block.number;
    change.transactionHash = event.transaction.hash;
    change.save();
    return;
  }

  // Try to reserve the name
  let isCanonical = tryReserveUsername(username, userAddress, event.block.timestamp);

  // Create new account
  account = new Account(userAddress);
  account.registry = contractAddress;
  account.user = userAddress;
  account.username = username;
  account.isCanonicalName = isCanonical;
  account.isDeleted = false;
  account.registeredAt = event.block.timestamp;
  account.registeredAtBlock = event.block.number;
  account.lastUpdatedAt = event.block.timestamp;
  account.save();

  // Increment total accounts
  registry.totalAccounts = registry.totalAccounts.plus(BigInt.fromI32(1));
  registry.save();

  // Create username change record (for registration, oldUsername is null)
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new UsernameChange(changeId);

  change.registry = contractAddress;
  change.account = userAddress;
  change.user = userAddress;
  change.newUsername = username;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handleUsernameChanged(event: UsernameChangedEvent): void {
  let contractAddress = event.address;
  let userAddress = event.params.user;
  let newUsername = event.params.newUsername;

  // Load account
  let account = Account.load(userAddress);
  if (!account) {
    // Account should exist, but create if not found
    account = new Account(userAddress);
    account.registry = contractAddress;
    account.user = userAddress;
    account.isCanonicalName = false;
    account.isDeleted = false;
    account.registeredAt = event.block.timestamp;
    account.registeredAtBlock = event.block.number;
  }

  let oldUsername = account.username;

  // Release old name reservation (only if this account was the canonical owner)
  releaseUsername(oldUsername, userAddress);

  // Try to reserve the new name
  let isCanonical = tryReserveUsername(newUsername, userAddress, event.block.timestamp);

  account.username = newUsername;
  account.isCanonicalName = isCanonical;
  account.lastUpdatedAt = event.block.timestamp;
  account.save();

  // Create username change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new UsernameChange(changeId);

  change.registry = contractAddress;
  change.account = userAddress;
  change.user = userAddress;
  change.oldUsername = oldUsername;
  change.newUsername = newUsername;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handleUserDeleted(event: UserDeletedEvent): void {
  let contractAddress = event.address;
  let userAddress = event.params.user;
  let oldUsername = event.params.oldUsername;

  // Load registry
  let registry = UniversalAccountRegistry.load(contractAddress);
  if (registry) {
    // Decrement total accounts
    registry.totalAccounts = registry.totalAccounts.minus(BigInt.fromI32(1));
    registry.save();
  }

  // Release name reservation
  releaseUsername(oldUsername, userAddress);

  // Update account
  let account = Account.load(userAddress);
  if (account) {
    account.isDeleted = true;
    account.isCanonicalName = false;
    account.deletedAt = event.block.timestamp;
    account.deletedAtBlock = event.block.number;
    account.lastUpdatedAt = event.block.timestamp;
    account.save();
  }

  // Create account deletion record
  let deletionId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let deletion = new AccountDeletion(deletionId);

  deletion.registry = contractAddress;
  deletion.user = userAddress;
  deletion.username = oldUsername;
  deletion.deletedAt = event.block.timestamp;
  deletion.deletedAtBlock = event.block.number;
  deletion.transactionHash = event.transaction.hash;

  deletion.save();
}

export function handleBatchRegistered(event: BatchRegisteredEvent): void {
  let contractAddress = event.address;
  let count = event.params.count;

  // Update registry total accounts
  let registry = UniversalAccountRegistry.load(contractAddress);
  if (registry) {
    registry.totalAccounts = registry.totalAccounts.plus(count);
    registry.save();
  }

  // Create batch registration record
  let batchId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let batch = new BatchRegistration(batchId);

  batch.registry = contractAddress;
  batch.count = count;
  batch.registeredAt = event.block.timestamp;
  batch.registeredAtBlock = event.block.number;
  batch.transactionHash = event.transaction.hash;

  batch.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let contractAddress = event.address;

  // Update registry owner
  let registry = UniversalAccountRegistry.load(contractAddress);
  if (registry) {
    registry.owner = event.params.newOwner;
    registry.save();
  }

  // Create ownership transfer record
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new RegistryOwnershipTransfer(transferId);

  transfer.registry = contractAddress;
  transfer.previousOwner = event.params.previousOwner;
  transfer.newOwner = event.params.newOwner;
  transfer.transferredAt = event.block.timestamp;
  transfer.transferredAtBlock = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}

export function handlePasskeyFactoryUpdated(event: PasskeyFactoryUpdatedEvent): void {
  let registry = UniversalAccountRegistry.load(event.address);
  if (registry) {
    registry.passkeyFactory = event.params.factory;
    registry.save();
  }
}
