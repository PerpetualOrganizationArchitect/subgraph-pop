import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  QuickJoined as QuickJoinedEvent,
  QuickJoinedByMaster as QuickJoinedByMasterEvent,
  ExecutorUpdated as ExecutorUpdatedEvent,
  HatToggled as HatToggledEvent,
  MemberHatIdsUpdated as MemberHatIdsUpdatedEvent,
  AddressesUpdated as AddressesUpdatedEvent
} from "../generated/templates/QuickJoin/QuickJoin";
import {
  QuickJoinContract,
  QuickJoinMemberHat,
  QuickJoinEvent,
  QuickJoinExecutorChange,
  QuickJoinAddressUpdate
} from "../generated/schema";
import { QuickJoin as QuickJoinBinding } from "../generated/templates/QuickJoin/QuickJoin";

export function handleInitialized(event: InitializedEvent): void {
  let contract = QuickJoinContract.load(event.address);
  if (contract == null) {
    log.warning("QuickJoinContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  // Bind to contract to read initial state
  let quickJoinContract = QuickJoinBinding.bind(event.address);

  let executorResult = quickJoinContract.try_executor();
  if (!executorResult.reverted) {
    contract.executor = executorResult.value;
  }

  let hatsResult = quickJoinContract.try_hats();
  if (!hatsResult.reverted) {
    contract.hatsContract = hatsResult.value;
  }

  let registryResult = quickJoinContract.try_accountRegistry();
  if (!registryResult.reverted) {
    contract.accountRegistry = registryResult.value;
  }

  let masterResult = quickJoinContract.try_masterDeployAddress();
  if (!masterResult.reverted) {
    contract.masterDeployAddress = masterResult.value;
  }

  contract.save();
}

export function handleQuickJoined(event: QuickJoinedEvent): void {
  let contractAddress = event.address;
  let joinEventId = contractAddress.toHexString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let joinEvent = new QuickJoinEvent(joinEventId);
  joinEvent.quickJoin = contractAddress;
  joinEvent.user = event.params.user;
  joinEvent.usernameCreated = event.params.usernameCreated;
  joinEvent.hatIds = event.params.hatIds;
  joinEvent.isMasterDeployJoin = false;
  joinEvent.joinedAt = event.block.timestamp;
  joinEvent.joinedAtBlock = event.block.number;
  joinEvent.transactionHash = event.transaction.hash;

  joinEvent.save();
}

export function handleQuickJoinedByMaster(event: QuickJoinedByMasterEvent): void {
  let contractAddress = event.address;
  let joinEventId = contractAddress.toHexString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

  let joinEvent = new QuickJoinEvent(joinEventId);
  joinEvent.quickJoin = contractAddress;
  joinEvent.user = event.params.user;
  joinEvent.master = event.params.master;
  joinEvent.usernameCreated = event.params.usernameCreated;
  joinEvent.hatIds = event.params.hatIds;
  joinEvent.isMasterDeployJoin = true;
  joinEvent.joinedAt = event.block.timestamp;
  joinEvent.joinedAtBlock = event.block.number;
  joinEvent.transactionHash = event.transaction.hash;

  joinEvent.save();
}

export function handleExecutorUpdated(event: ExecutorUpdatedEvent): void {
  let contract = QuickJoinContract.load(event.address);
  if (contract == null) {
    log.warning("QuickJoinContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.executor = event.params.newExecutor;
  contract.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new QuickJoinExecutorChange(changeId);
  change.quickJoin = event.address;
  change.newExecutor = event.params.newExecutor;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handleHatToggled(event: HatToggledEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;

  let memberHatId = contractAddress.toHexString() + "-" + hatId.toString();
  let memberHat = QuickJoinMemberHat.load(memberHatId);

  if (memberHat == null) {
    memberHat = new QuickJoinMemberHat(memberHatId);
    memberHat.quickJoin = contractAddress;
    memberHat.hatId = hatId;
  }

  memberHat.allowed = event.params.allowed;
  memberHat.setAt = event.block.timestamp;
  memberHat.setAtBlock = event.block.number;
  memberHat.transactionHash = event.transaction.hash;

  memberHat.save();
}

export function handleMemberHatIdsUpdated(event: MemberHatIdsUpdatedEvent): void {
  let contractAddress = event.address;
  let hatIds = event.params.hatIds;

  // Update all member hats based on the new list
  for (let i = 0; i < hatIds.length; i++) {
    let hatId = hatIds[i];
    let memberHatId = contractAddress.toHexString() + "-" + hatId.toString();
    let memberHat = QuickJoinMemberHat.load(memberHatId);

    if (memberHat == null) {
      memberHat = new QuickJoinMemberHat(memberHatId);
      memberHat.quickJoin = contractAddress;
      memberHat.hatId = hatId;
      memberHat.allowed = true; // Assume allowed if in the list
    }

    memberHat.setAt = event.block.timestamp;
    memberHat.setAtBlock = event.block.number;
    memberHat.transactionHash = event.transaction.hash;

    memberHat.save();
  }
}

export function handleAddressesUpdated(event: AddressesUpdatedEvent): void {
  let contract = QuickJoinContract.load(event.address);
  if (contract == null) {
    log.warning("QuickJoinContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.hatsContract = event.params.hats;
  contract.accountRegistry = event.params.registry;
  contract.masterDeployAddress = event.params.master;
  contract.save();

  // Create historical record
  let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let update = new QuickJoinAddressUpdate(updateId);
  update.quickJoin = event.address;
  update.hatsContract = event.params.hats;
  update.accountRegistry = event.params.registry;
  update.masterDeployAddress = event.params.master;
  update.updatedAt = event.block.timestamp;
  update.updatedAtBlock = event.block.number;
  update.transactionHash = event.transaction.hash;

  update.save();
}
