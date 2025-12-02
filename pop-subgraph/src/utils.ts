// Utility functions for subgraph event handlers
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  Account,
  User,
  HatPermission,
  ExecutorChange,
  PauseEvent,
  UserHatChange,
  Organization,
} from "../generated/schema";

/**
 * Helper function to get username for an address from UniversalAccountRegistry
 * Returns null if the account doesn't exist or is deleted
 */
export function getUsernameForAddress(address: Address): string | null {
  let account = Account.load(address);
  if (account && !account.isDeleted) {
    return account.username;
  }
  return null;
}

/**
 * Get or create a User entity for a given organization and address
 * Updates the user's last active timestamp and username
 */
export function getOrCreateUser(
  orgId: Bytes,
  userAddress: Address,
  timestamp: BigInt,
  blockNumber: BigInt
): User {
  let userId = orgId.toHexString() + "-" + userAddress.toHexString();
  let user = User.load(userId);

  if (user == null) {
    user = new User(userId);
    user.organization = orgId;
    user.address = userAddress;
    user.participationTokenBalance = BigInt.fromI32(0);
    user.totalVotes = BigInt.fromI32(0);
    user.totalTasksCompleted = BigInt.fromI32(0);
    user.totalTasksCancelled = BigInt.fromI32(0);
    user.totalModulesCompleted = BigInt.fromI32(0);
    user.totalClaimsAmount = BigInt.fromI32(0);
    user.totalPaymentsAmount = BigInt.fromI32(0);
    user.totalTokenRequestsAmount = BigInt.fromI32(0);
    user.firstSeenAt = timestamp;
    user.firstSeenAtBlock = blockNumber;
    // Membership tracking fields
    user.currentHatIds = [];
    user.membershipStatus = "Active";
  }

  // Update last active timestamp
  user.lastActiveAt = timestamp;
  user.lastActiveAtBlock = blockNumber;

  // Update username from Account if available
  let account = Account.load(userAddress);
  if (account && !account.isDeleted) {
    user.account = userAddress;
    user.username = account.username;
  }

  user.save();
  return user as User;
}

/**
 * Create a consolidated HatPermission entity
 * Used by: HybridVoting, DirectDemocracyVoting, ParticipationToken, QuickJoin, EducationHub
 */
export function createHatPermission(
  contractAddress: Address,
  contractType: string,
  orgId: Bytes,
  hatId: BigInt,
  role: string,
  allowed: boolean,
  hatType: i32 | null,
  event: ethereum.Event
): HatPermission {
  let id =
    contractAddress.toHexString() +
    "-" +
    hatId.toString() +
    "-" +
    role;
  let permission = new HatPermission(id);
  permission.contractAddress = contractAddress;
  permission.contractType = contractType;
  permission.organization = orgId;
  permission.hatId = hatId;
  permission.role = role;
  permission.allowed = allowed;
  if (hatType !== null) {
    permission.hatType = hatType;
  }
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;
  permission.save();
  return permission;
}

/**
 * Create a consolidated ExecutorChange entity
 * Used by: DirectDemocracyVoting, QuickJoin, EducationHub
 */
export function createExecutorChange(
  contractAddress: Address,
  contractType: string,
  orgId: Bytes,
  newExecutor: Address,
  event: ethereum.Event
): ExecutorChange {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new ExecutorChange(id);
  change.contractAddress = contractAddress;
  change.contractType = contractType;
  change.organization = orgId;
  change.newExecutor = newExecutor;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
  return change;
}

/**
 * Create a consolidated PauseEvent entity
 * Used by: Executor, EducationHub
 */
export function createPauseEvent(
  contractAddress: Address,
  contractType: string,
  orgId: Bytes,
  isPaused: boolean,
  account: Address,
  event: ethereum.Event
): PauseEvent {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let pauseEvent = new PauseEvent(id);
  pauseEvent.contractAddress = contractAddress;
  pauseEvent.contractType = contractType;
  pauseEvent.organization = orgId;
  pauseEvent.isPaused = isPaused;
  pauseEvent.account = account;
  pauseEvent.eventAt = event.block.timestamp;
  pauseEvent.eventAtBlock = event.block.number;
  pauseEvent.transactionHash = event.transaction.hash;
  pauseEvent.save();
  return pauseEvent;
}

/**
 * Record a hat change for a user and update their currentHatIds
 */
export function recordUserHatChange(
  user: User,
  hatId: BigInt,
  added: boolean,
  event: ethereum.Event
): UserHatChange {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let hatChange = new UserHatChange(id);
  hatChange.user = user.id;
  hatChange.hatId = hatId;
  hatChange.added = added;
  hatChange.changedAt = event.block.timestamp;
  hatChange.changedAtBlock = event.block.number;
  hatChange.transactionHash = event.transaction.hash;
  hatChange.save();

  // Update user's currentHatIds
  let currentHats = user.currentHatIds;
  if (added) {
    // Add hat if not already present
    let found = false;
    for (let i = 0; i < currentHats.length; i++) {
      if (currentHats[i].equals(hatId)) {
        found = true;
        break;
      }
    }
    if (!found) {
      currentHats.push(hatId);
      user.currentHatIds = currentHats;
    }
  } else {
    // Remove hat if present
    let newHats: BigInt[] = [];
    for (let i = 0; i < currentHats.length; i++) {
      if (!currentHats[i].equals(hatId)) {
        newHats.push(currentHats[i]);
      }
    }
    user.currentHatIds = newHats;
  }

  user.save();
  return hatChange;
}

/**
 * Get the organization ID from a contract address by loading the related entity
 * and traversing to the organization
 */
export function getOrgIdFromContract(contractAddress: Address): Bytes | null {
  let org = Organization.load(contractAddress);
  if (org) {
    return org.id;
  }
  return null;
}
