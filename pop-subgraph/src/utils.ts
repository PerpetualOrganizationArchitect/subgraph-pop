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
  Role,
  RoleWearer,
  Hat,
  ExecutorContract,
  EligibilityModuleContract,
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
  permissionRole: string,
  allowed: boolean,
  hatType: i32 | null,
  event: ethereum.Event
): HatPermission {
  let id =
    contractAddress.toHexString() +
    "-" +
    hatId.toString() +
    "-" +
    permissionRole;
  let permission = HatPermission.load(id);
  if (permission == null) {
    permission = new HatPermission(id);
    permission.contractAddress = contractAddress;
    permission.contractType = contractType;
    permission.organization = orgId;
    permission.hatId = hatId;
    permission.permissionRole = permissionRole;
  }

  // Get or create the Role entity and link it
  let role = getOrCreateRole(orgId, hatId, event);
  permission.role = role.id;

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

/**
 * Get or create a Role entity for a given organization and hat ID
 * Roles aggregate permissions and wearers for a hat within an organization
 */
export function getOrCreateRole(
  orgId: Bytes,
  hatId: BigInt,
  event: ethereum.Event
): Role {
  let roleId = orgId.toHexString() + "-" + hatId.toString();
  let role = Role.load(roleId);

  if (role == null) {
    role = new Role(roleId);
    role.organization = orgId;
    role.hatId = hatId;
    role.createdAt = event.block.timestamp;
    role.createdAtBlock = event.block.number;
    role.transactionHash = event.transaction.hash;
    role.save();
  }

  return role as Role;
}

/**
 * Link a Hat entity to its corresponding Role entity
 * Called when a Hat is created via HatCreatedWithEligibility
 */
export function linkHatToRole(
  orgId: Bytes,
  hatId: BigInt,
  hatEntityId: string,
  event: ethereum.Event
): Role {
  let role = getOrCreateRole(orgId, hatId, event);
  role.hat = hatEntityId;
  role.save();
  return role;
}

/**
 * Get or create a RoleWearer entity for a user wearing a role
 */
export function getOrCreateRoleWearer(
  orgId: Bytes,
  hatId: BigInt,
  wearerAddress: Address,
  event: ethereum.Event
): RoleWearer {
  let roleWearerId =
    orgId.toHexString() +
    "-" +
    hatId.toString() +
    "-" +
    wearerAddress.toHexString();
  let roleWearer = RoleWearer.load(roleWearerId);

  if (roleWearer == null) {
    // Ensure Role exists
    let role = getOrCreateRole(orgId, hatId, event);

    // Ensure User exists
    let user = getOrCreateUser(
      orgId,
      wearerAddress,
      event.block.timestamp,
      event.block.number
    );

    roleWearer = new RoleWearer(roleWearerId);
    roleWearer.role = role.id;
    roleWearer.user = user.id;
    roleWearer.wearer = wearerAddress;
    roleWearer.wearerUsername = getUsernameForAddress(wearerAddress);
    roleWearer.addedAt = event.block.timestamp;
    roleWearer.addedAtBlock = event.block.number;
    roleWearer.isActive = true;
    roleWearer.transactionHash = event.transaction.hash;
    roleWearer.save();
  }

  return roleWearer as RoleWearer;
}

/**
 * Update a RoleWearer's active status (for when hats are removed)
 */
export function updateRoleWearerStatus(
  orgId: Bytes,
  hatId: BigInt,
  wearerAddress: Address,
  isActive: boolean,
  event: ethereum.Event
): RoleWearer | null {
  let roleWearerId =
    orgId.toHexString() +
    "-" +
    hatId.toString() +
    "-" +
    wearerAddress.toHexString();
  let roleWearer = RoleWearer.load(roleWearerId);

  if (roleWearer != null) {
    roleWearer.isActive = isActive;
    if (!isActive) {
      roleWearer.removedAt = event.block.timestamp;
    }
    roleWearer.save();
  }

  return roleWearer;
}

/**
 * Link a WearerEligibility entity to its RoleWearer
 */
export function linkWearerEligibilityToRoleWearer(
  orgId: Bytes,
  hatId: BigInt,
  wearerAddress: Address,
  wearerEligibilityId: string
): void {
  let roleWearerId =
    orgId.toHexString() +
    "-" +
    hatId.toString() +
    "-" +
    wearerAddress.toHexString();
  let roleWearer = RoleWearer.load(roleWearerId);

  if (roleWearer != null) {
    roleWearer.wearerEligibility = wearerEligibilityId;
    roleWearer.save();
  }
}

/**
 * Check if an address is a system contract for an organization.
 * System contracts (Executor, EligibilityModule) should not be indexed as RoleWearers.
 */
export function isSystemContract(orgId: Bytes, address: Address): boolean {
  let org = Organization.load(orgId);
  if (!org) return false;

  // Check if address is the Executor contract
  let executorContractRef = org.executorContract;
  if (executorContractRef) {
    let executor = ExecutorContract.load(executorContractRef);
    if (executor && executor.id.equals(address)) return true;
  }

  // Check if address is the EligibilityModule contract
  let eligibilityModuleRef = org.eligibilityModule;
  if (eligibilityModuleRef) {
    let eligibility = EligibilityModuleContract.load(eligibilityModuleRef);
    if (eligibility && eligibility.id.equals(address)) return true;
  }

  return false;
}

/**
 * Check if a hat ID is a user-facing role hat (not a system hat).
 * System hats include: Top Hat (worn by Executor), Eligibility Admin Hat (worn by EligibilityModule).
 * User-facing hats are those in the Organization.roleHatIds array.
 */
export function isUserFacingRoleHat(orgId: Bytes, hatId: BigInt): boolean {
  let org = Organization.load(orgId);
  if (!org) return false;

  // Top Hat is a system hat - never create RoleWearer for it
  let topHatId = org.topHatId;
  if (topHatId && topHatId.equals(hatId)) return false;

  // Check if hat is in roleHatIds (explicitly user-facing)
  let roleHatIds = org.roleHatIds;
  if (roleHatIds) {
    for (let i = 0; i < roleHatIds.length; i++) {
      if (roleHatIds[i].equals(hatId)) return true;
    }
  }

  // Check for eligibility admin hat
  let eligibilityModuleRef = org.eligibilityModule;
  if (eligibilityModuleRef) {
    let eligibility = EligibilityModuleContract.load(eligibilityModuleRef);
    if (eligibility) {
      let adminHat = eligibility.eligibilityModuleAdminHat;
      if (adminHat && adminHat.equals(hatId)) return false;
    }
  }

  // For dynamic hats not in roleHatIds, allow them (future expansion)
  return true;
}

/**
 * Combined check for RoleWearer creation eligibility.
 * Returns true if a RoleWearer should be created for this hat and address combination.
 */
export function shouldCreateRoleWearer(
  orgId: Bytes,
  hatId: BigInt,
  wearerAddress: Address
): boolean {
  // Skip if recipient is a system contract
  if (isSystemContract(orgId, wearerAddress)) return false;

  // Skip if hat is not user-facing
  if (!isUserFacingRoleHat(orgId, hatId)) return false;

  return true;
}
