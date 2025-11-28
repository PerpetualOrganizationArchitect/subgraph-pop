import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Account, User } from "../generated/schema";

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
