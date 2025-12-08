import { Address, BigInt, Bytes, DataSourceContext, log } from "@graphprotocol/graph-ts";
import { HatMetadata as HatMetadataTemplate } from "../generated/templates";
import {
  EligibilityModuleInitialized as EligibilityModuleInitializedEvent,
  HatCreatedWithEligibility as HatCreatedWithEligibilityEvent,
  WearerEligibilityUpdated as WearerEligibilityUpdatedEvent,
  BulkWearerEligibilityUpdated as BulkWearerEligibilityUpdatedEvent,
  DefaultEligibilityUpdated as DefaultEligibilityUpdatedEvent,
  VouchConfigSet as VouchConfigSetEvent,
  Vouched as VouchedEvent,
  VouchRevoked as VouchRevokedEvent,
  HatClaimed as HatClaimedEvent,
  HatMetadataUpdated as HatMetadataUpdatedEvent,
  UserJoinTimeSet as UserJoinTimeSetEvent,
  EligibilityModuleAdminHatSet as EligibilityModuleAdminHatSetEvent,
  SuperAdminTransferred as SuperAdminTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
  VouchingRateLimitExceededEvent as VouchingRateLimitExceededEventEvent,
  NewUserVouchingRestrictedEvent as NewUserVouchingRestrictedEventEvent
} from "../generated/templates/EligibilityModule/EligibilityModule";
import {
  EligibilityModuleContract,
  Hat,
  WearerEligibility,
  VouchConfig,
  Vouch,
  UserJoinTime,
  VouchingRestrictionEvent,
  HatAutoMintEvent,
  HatClaimEvent,
  HatMetadataUpdateEvent
} from "../generated/schema";
import {
  getUsernameForAddress,
  getOrCreateUser,
  linkHatToRole,
  getOrCreateRoleWearer,
  linkWearerEligibilityToRoleWearer,
  recordUserHatChange,
  shouldCreateRoleWearer
} from "./utils";

/**
 * Helper function to convert bytes32 sha256 digest to IPFS CIDv0.
 *
 * CIDv0 = base58( 0x1220 + sha256_digest )
 * - 0x12 = sha2-256 multicodec
 * - 0x20 = 32 bytes length
 * - sha256_digest = 32 bytes (the bytes32 from contract)
 */
function bytes32ToCid(hash: Bytes): string {
  // Create the multihash by prepending 0x1220 header
  let prefix = Bytes.fromHexString("0x1220");

  // Concatenate prefix + hash (34 bytes total)
  let multihash = new Bytes(34);
  for (let i = 0; i < 2; i++) {
    multihash[i] = prefix[i];
  }
  for (let i = 0; i < 32; i++) {
    multihash[i + 2] = hash[i];
  }

  // Base58 encode to get CIDv0 (starts with "Qm")
  return multihash.toBase58();
}

/**
 * Helper function to create an IPFS file data source for hat metadata.
 * Uses DataSourceContext to pass the hatEntityId to the handler so it can
 * link the metadata back to the hat.
 *
 * The contract stores bytes32 which is the sha256 digest from the IPFS CID.
 * We convert it back to CIDv0 format for The Graph to fetch.
 */
function createHatIpfsDataSource(metadataCID: Bytes, hatEntityId: string): void {
  // Skip if metadataCID is empty (all zeros)
  if (metadataCID.equals(Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000"))) {
    return;
  }

  // Convert bytes32 sha256 digest to IPFS CIDv0 string
  let ipfsCid = bytes32ToCid(metadataCID);

  // Create context to pass hatEntityId to the IPFS handler
  let context = new DataSourceContext();
  context.setString("hatEntityId", hatEntityId);

  // Create the file data source with context
  // If IPFS is unavailable or slow, this will be retried automatically
  // and won't block the main chain indexing
  HatMetadataTemplate.createWithContext(ipfsCid, context);
}

export function handleEligibilityModuleInitialized(
  event: EligibilityModuleInitializedEvent
): void {
  let contract = EligibilityModuleContract.load(event.address);
  if (contract == null) {
    log.warning("EligibilityModuleContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.superAdmin = event.params.superAdmin;
  contract.hatsContract = event.params.hatsContract;
  contract.save();
}

export function handleHatCreatedWithEligibility(
  event: HatCreatedWithEligibilityEvent
): void {
  let contractAddress = event.address;
  let hatId = event.params.newHatId;
  let hatIdString = hatId.toString();

  let hatEntityId = contractAddress.toHexString() + "-" + hatIdString;
  let hat = new Hat(hatEntityId);

  hat.hatId = hatId;
  hat.parentHatId = event.params.parentHatId;
  hat.eligibilityModule = contractAddress;
  hat.creator = event.params.creator;
  hat.creatorUsername = getUsernameForAddress(event.params.creator);

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.creator,
      event.block.timestamp,
      event.block.number
    );
    hat.creatorUser = user.id;
  }

  hat.defaultEligible = event.params.defaultEligible;
  hat.defaultStanding = event.params.defaultStanding;
  hat.mintedCount = event.params.mintedCount;
  hat.createdAt = event.block.timestamp;
  hat.createdAtBlock = event.block.number;
  hat.transactionHash = event.transaction.hash;

  hat.save();

  // Link Hat to Role entity
  if (eligibilityModule) {
    linkHatToRole(eligibilityModule.organization, hatId, hatEntityId, event);
  }
}

export function handleWearerEligibilityUpdated(
  event: WearerEligibilityUpdatedEvent
): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let wearer = event.params.wearer;

  let wearerEligibilityId = contractAddress.toHexString() + "-" + hatId.toString() + "-" + wearer.toHexString();
  let wearerEligibility = WearerEligibility.load(wearerEligibilityId);

  if (wearerEligibility == null) {
    wearerEligibility = new WearerEligibility(wearerEligibilityId);
    wearerEligibility.eligibilityModule = contractAddress;
    wearerEligibility.hat = contractAddress.toHexString() + "-" + hatId.toString();
    wearerEligibility.wearer = wearer;
    wearerEligibility.hatId = hatId;
  }

  wearerEligibility.eligible = event.params.eligible;
  wearerEligibility.standing = event.params.standing;
  wearerEligibility.hasSpecificRules = true;
  wearerEligibility.admin = event.params.admin;
  wearerEligibility.adminUsername = getUsernameForAddress(event.params.admin);
  wearerEligibility.wearerUsername = getUsernameForAddress(wearer);

  // Link to User entities
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    // Link wearer
    let wearerUser = getOrCreateUser(
      eligibilityModule.organization,
      wearer,
      event.block.timestamp,
      event.block.number
    );
    wearerEligibility.wearerUser = wearerUser.id;

    // Link admin
    let adminUser = getOrCreateUser(
      eligibilityModule.organization,
      event.params.admin,
      event.block.timestamp,
      event.block.number
    );
    wearerEligibility.adminUser = adminUser.id;
  }

  wearerEligibility.updatedAt = event.block.timestamp;
  wearerEligibility.updatedAtBlock = event.block.number;
  wearerEligibility.transactionHash = event.transaction.hash;

  wearerEligibility.save();
}

export function handleBulkWearerEligibilityUpdated(
  event: BulkWearerEligibilityUpdatedEvent
): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let wearers = event.params.wearers;
  let eligible = event.params.eligible;
  let standing = event.params.standing;
  let admin = event.params.admin;

  // Get organization for User linking
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);

  for (let i = 0; i < wearers.length; i++) {
    let wearer = wearers[i];
    let wearerEligibilityId = contractAddress.toHexString() + "-" + hatId.toString() + "-" + wearer.toHexString();
    let wearerEligibility = WearerEligibility.load(wearerEligibilityId);

    if (wearerEligibility == null) {
      wearerEligibility = new WearerEligibility(wearerEligibilityId);
      wearerEligibility.eligibilityModule = contractAddress;
      wearerEligibility.hat = contractAddress.toHexString() + "-" + hatId.toString();
      wearerEligibility.wearer = wearer;
      wearerEligibility.hatId = hatId;
    }

    wearerEligibility.eligible = eligible;
    wearerEligibility.standing = standing;
    wearerEligibility.hasSpecificRules = true;
    wearerEligibility.admin = admin;
    wearerEligibility.adminUsername = getUsernameForAddress(admin);
    wearerEligibility.wearerUsername = getUsernameForAddress(wearer);

    // Link to User entities
    if (eligibilityModule) {
      // Link wearer
      let wearerUser = getOrCreateUser(
        eligibilityModule.organization,
        wearer,
        event.block.timestamp,
        event.block.number
      );
      wearerEligibility.wearerUser = wearerUser.id;

      // Link admin
      let adminUser = getOrCreateUser(
        eligibilityModule.organization,
        admin,
        event.block.timestamp,
        event.block.number
      );
      wearerEligibility.adminUser = adminUser.id;
    }

    wearerEligibility.updatedAt = event.block.timestamp;
    wearerEligibility.updatedAtBlock = event.block.number;
    wearerEligibility.transactionHash = event.transaction.hash;

    wearerEligibility.save();
  }
}

export function handleDefaultEligibilityUpdated(
  event: DefaultEligibilityUpdatedEvent
): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let hatEntityId = contractAddress.toHexString() + "-" + hatId.toString();

  let hat = Hat.load(hatEntityId);
  let isNewHat = hat == null;

  if (hat == null) {
    // Hat doesn't exist yet - this happens when hats are created via HatsTreeSetup
    // (which creates hats directly on Hats Protocol, not via createHatWithEligibility)
    // Create the Hat entity with available information from the event
    hat = new Hat(hatEntityId);
    hat.hatId = hatId;
    hat.parentHatId = BigInt.fromI32(0); // Unknown - HatsTreeSetup doesn't emit parent info
    hat.level = 0; // Unknown - will be 0 for top-level hats
    hat.eligibilityModule = contractAddress;
    hat.creator = event.params.admin; // Use admin as creator
    hat.creatorUsername = getUsernameForAddress(event.params.admin);

    // Link to User entity if EligibilityModuleContract exists
    let eligibilityModule = EligibilityModuleContract.load(contractAddress);
    if (eligibilityModule) {
      let user = getOrCreateUser(
        eligibilityModule.organization,
        event.params.admin,
        event.block.timestamp,
        event.block.number
      );
      hat.creatorUser = user.id;
    }

    hat.defaultEligible = event.params.eligible;
    hat.defaultStanding = event.params.standing;
    hat.mintedCount = BigInt.fromI32(0); // Unknown - will be updated if minting events occur
    hat.createdAt = event.block.timestamp;
    hat.createdAtBlock = event.block.number;
    hat.transactionHash = event.transaction.hash;
    hat.save();

    log.info("Created Hat entity from DefaultEligibilityUpdated for hatId {} at contract {}", [
      hatId.toString(),
      contractAddress.toHexString()
    ]);
  } else {
    // Hat exists - just update the eligibility fields
    hat.defaultEligible = event.params.eligible;
    hat.defaultStanding = event.params.standing;
    hat.save();
  }

  // Link Hat to Role entity if this is a new hat
  // This ensures Role.hat is set even when hats are created via HatsTreeSetup
  if (isNewHat) {
    let eligibilityModule = EligibilityModuleContract.load(contractAddress);
    if (eligibilityModule) {
      linkHatToRole(eligibilityModule.organization, hatId, hatEntityId, event);
    }
  }
}

export function handleVouchConfigSet(event: VouchConfigSetEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let vouchConfigId = contractAddress.toHexString() + "-" + hatId.toString();

  let vouchConfig = VouchConfig.load(vouchConfigId);
  if (vouchConfig == null) {
    vouchConfig = new VouchConfig(vouchConfigId);
    vouchConfig.eligibilityModule = contractAddress;
    vouchConfig.hat = contractAddress.toHexString() + "-" + hatId.toString();
    vouchConfig.hatId = hatId;
  }

  vouchConfig.quorum = i32(event.params.quorum.toI32());
  vouchConfig.membershipHatId = event.params.membershipHatId;
  vouchConfig.enabled = event.params.enabled;
  vouchConfig.combinesWithHierarchy = event.params.combineWithHierarchy;
  vouchConfig.updatedAt = event.block.timestamp;
  vouchConfig.updatedAtBlock = event.block.number;
  vouchConfig.transactionHash = event.transaction.hash;

  vouchConfig.save();
}

export function handleVouched(event: VouchedEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let wearer = event.params.wearer;
  let voucher = event.params.voucher;

  let vouchId = contractAddress.toHexString() + "-" + hatId.toString() + "-" + wearer.toHexString() + "-" + voucher.toHexString();
  let vouch = new Vouch(vouchId);

  vouch.eligibilityModule = contractAddress;
  vouch.vouchConfig = contractAddress.toHexString() + "-" + hatId.toString();
  vouch.wearerEligibility = contractAddress.toHexString() + "-" + hatId.toString() + "-" + wearer.toHexString();
  vouch.hatId = hatId;
  vouch.wearer = wearer;
  vouch.wearerUsername = getUsernameForAddress(wearer);
  vouch.voucher = voucher;
  vouch.voucherUsername = getUsernameForAddress(voucher);
  vouch.vouchCount = i32(event.params.newCount.toI32());
  vouch.isActive = true;

  // Link to User entities
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    // Link wearer
    let wearerUser = getOrCreateUser(
      eligibilityModule.organization,
      wearer,
      event.block.timestamp,
      event.block.number
    );
    vouch.wearerUser = wearerUser.id;

    // Link voucher
    let voucherUser = getOrCreateUser(
      eligibilityModule.organization,
      voucher,
      event.block.timestamp,
      event.block.number
    );
    vouch.voucherUser = voucherUser.id;
  }

  vouch.createdAt = event.block.timestamp;
  vouch.createdAtBlock = event.block.number;
  vouch.transactionHash = event.transaction.hash;

  vouch.save();
}

export function handleVouchRevoked(event: VouchRevokedEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let wearer = event.params.wearer;
  let voucher = event.params.voucher;

  let vouchId = contractAddress.toHexString() + "-" + hatId.toString() + "-" + wearer.toHexString() + "-" + voucher.toHexString();
  let vouch = Vouch.load(vouchId);

  if (vouch == null) {
    log.warning("Vouch not found for revocation: {}", [vouchId]);
    return;
  }

  vouch.isActive = false;
  vouch.vouchCount = i32(event.params.newCount.toI32());
  vouch.revokedAt = event.block.timestamp;
  vouch.revokedAtBlock = event.block.number;

  vouch.save();
}

export function handleHatClaimed(event: HatClaimedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let claim = new HatClaimEvent(id);

  let contractAddress = event.address;
  let hatId = event.params.hatId;

  claim.eligibilityModule = contractAddress;
  claim.wearer = event.params.wearer;
  claim.wearerUsername = getUsernameForAddress(event.params.wearer);
  claim.hatId = hatId;
  claim.hat = contractAddress.toHexString() + "-" + hatId.toString();
  claim.claimedAt = event.block.timestamp;
  claim.claimedAtBlock = event.block.number;
  claim.transactionHash = event.transaction.hash;

  // Link to User entity and create RoleWearer
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    // Skip RoleWearer creation if EligibilityModule is claiming for itself (system contract)
    // This avoids timing issues with Organization entity not being fully saved yet
    if (event.params.wearer.equals(contractAddress)) {
      claim.save();
      return;
    }

    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.wearer,
      event.block.timestamp,
      event.block.number
    );
    claim.wearerUser = user.id;

    // Only create RoleWearer for user-facing hats to non-system addresses
    if (shouldCreateRoleWearer(eligibilityModule.organization, hatId, event.params.wearer)) {
      // Create RoleWearer entity
      getOrCreateRoleWearer(
        eligibilityModule.organization,
        hatId,
        event.params.wearer,
        event
      );

      // Record the hat change on the user
      recordUserHatChange(user, hatId, true, event);

      // Update join method if this is their first hat
      if (user.joinMethod == null) {
        user.joinMethod = "HatClaim";
        user.save();
      }
    }
  }

  claim.save();
}

export function handleUserJoinTimeSet(event: UserJoinTimeSetEvent): void {
  let contractAddress = event.address;
  let user = event.params.user;

  let userJoinTimeId = contractAddress.toHexString() + "-" + user.toHexString();
  let userJoinTime = UserJoinTime.load(userJoinTimeId);

  if (userJoinTime == null) {
    userJoinTime = new UserJoinTime(userJoinTimeId);
    userJoinTime.eligibilityModule = contractAddress;
    userJoinTime.user = user;
  }

  userJoinTime.joinTime = event.params.joinTime;
  userJoinTime.setAt = event.block.timestamp;
  userJoinTime.setAtBlock = event.block.number;
  userJoinTime.transactionHash = event.transaction.hash;

  userJoinTime.save();
}

export function handleEligibilityModuleAdminHatSet(
  event: EligibilityModuleAdminHatSetEvent
): void {
  let contract = EligibilityModuleContract.load(event.address);
  if (contract == null) {
    log.warning("EligibilityModuleContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.eligibilityModuleAdminHat = event.params.hatId;
  contract.save();
}

export function handleSuperAdminTransferred(
  event: SuperAdminTransferredEvent
): void {
  let contract = EligibilityModuleContract.load(event.address);
  if (contract == null) {
    log.warning("EligibilityModuleContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.superAdmin = event.params.newSuperAdmin;
  contract.save();
}

export function handlePaused(event: PausedEvent): void {
  let contract = EligibilityModuleContract.load(event.address);
  if (contract == null) {
    log.warning("EligibilityModuleContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.isPaused = true;
  contract.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  let contract = EligibilityModuleContract.load(event.address);
  if (contract == null) {
    log.warning("EligibilityModuleContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.isPaused = false;
  contract.save();
}

export function handleVouchingRateLimitExceeded(
  event: VouchingRateLimitExceededEventEvent
): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let restriction = new VouchingRestrictionEvent(id);

  restriction.eligibilityModule = event.address;
  restriction.user = event.params.user;
  restriction.userUsername = getUsernameForAddress(event.params.user);
  restriction.restrictionType = "RateLimit";
  restriction.eventAt = event.block.timestamp;
  restriction.eventAtBlock = event.block.number;
  restriction.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(event.address);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.user,
      event.block.timestamp,
      event.block.number
    );
    restriction.userUser = user.id;
  }

  restriction.save();
}

export function handleNewUserVouchingRestricted(
  event: NewUserVouchingRestrictedEventEvent
): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let restriction = new VouchingRestrictionEvent(id);

  restriction.eligibilityModule = event.address;
  restriction.user = event.params.user;
  restriction.userUsername = getUsernameForAddress(event.params.user);
  restriction.restrictionType = "NewUser";
  restriction.eventAt = event.block.timestamp;
  restriction.eventAtBlock = event.block.number;
  restriction.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(event.address);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.user,
      event.block.timestamp,
      event.block.number
    );
    restriction.userUser = user.id;
  }

  restriction.save();
}

export function handleHatMetadataUpdated(
  event: HatMetadataUpdatedEvent
): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;
  let hatEntityId = contractAddress.toHexString() + "-" + hatId.toString();

  let hat = Hat.load(hatEntityId);
  if (hat == null) {
    log.warning("Hat not found for metadata update: {}", [hatEntityId]);
    return;
  }

  // Update hat metadata fields
  hat.name = event.params.name;
  hat.metadataCID = event.params.metadataCID;
  hat.metadataUpdatedAt = event.block.timestamp;
  hat.metadataUpdatedAtBlock = event.block.number;

  // Link to IPFS metadata entity (will be populated when IPFS content is fetched)
  let metadataCID = event.params.metadataCID;
  if (!metadataCID.equals(Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000"))) {
    hat.metadata = bytes32ToCid(metadataCID);
  }

  hat.save();

  // Create event entity for history tracking
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let metadataEvent = new HatMetadataUpdateEvent(eventId);
  metadataEvent.eligibilityModule = contractAddress;
  metadataEvent.hat = hatEntityId;
  metadataEvent.hatId = hatId;
  metadataEvent.name = event.params.name;
  metadataEvent.metadataCID = event.params.metadataCID;
  metadataEvent.updatedBy = event.transaction.from;
  metadataEvent.updatedAt = event.block.timestamp;
  metadataEvent.updatedAtBlock = event.block.number;
  metadataEvent.transactionHash = event.transaction.hash;
  metadataEvent.save();

  // Trigger IPFS fetch for metadata content
  createHatIpfsDataSource(metadataCID, hatEntityId);
}
