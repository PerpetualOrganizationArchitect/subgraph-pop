import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
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
  UserJoinTimeSet as UserJoinTimeSetEvent,
  EligibilityModuleAdminHatSet as EligibilityModuleAdminHatSetEvent,
  SuperAdminTransferred as SuperAdminTransferredEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent
} from "../generated/templates/EligibilityModule/EligibilityModule";
import {
  EligibilityModuleContract,
  Hat,
  WearerEligibility,
  VouchConfig,
  Vouch,
  UserJoinTime
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser } from "./utils";

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
  if (hat == null) {
    log.warning("Hat not found for hatId {} at contract {}", [
      hatId.toString(),
      contractAddress.toHexString()
    ]);
    return;
  }

  hat.defaultEligible = event.params.eligible;
  hat.defaultStanding = event.params.standing;
  hat.save();
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
  // Hat claimed by wearer after vouching threshold met
  // This is tracked in the Vouch entities, no additional action needed
  log.info("Hat claimed by wearer {} for hatId {}", [
    event.params.wearer.toHexString(),
    event.params.hatId.toString()
  ]);
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
