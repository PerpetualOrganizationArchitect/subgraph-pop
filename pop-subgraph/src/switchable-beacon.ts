import { Bytes } from "@graphprotocol/graph-ts";
import {
  MirrorSet as MirrorSetEvent,
  Pinned as PinnedEvent,
  ModeChanged as ModeChangedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  OwnershipTransferStarted as OwnershipTransferStartedEvent
} from "../generated/templates/SwitchableBeacon/SwitchableBeacon";
import {
  SwitchableBeaconContract,
  BeaconModeChange,
  BeaconOwnershipChange
} from "../generated/schema";

export function handleMirrorSet(event: MirrorSetEvent): void {
  let beacon = SwitchableBeaconContract.load(event.address);
  if (!beacon) return;

  beacon.mode = "Mirror";
  beacon.mirrorBeacon = event.params.mirrorBeacon;
  beacon.pinnedImplementation = null;
  beacon.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new BeaconModeChange(changeId);
  change.beacon = event.address;
  change.newMode = "Mirror";
  change.mirrorBeacon = event.params.mirrorBeacon;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

export function handlePinned(event: PinnedEvent): void {
  let beacon = SwitchableBeaconContract.load(event.address);
  if (!beacon) return;

  beacon.mode = "Static";
  beacon.pinnedImplementation = event.params.implementation;
  beacon.mirrorBeacon = null;
  beacon.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new BeaconModeChange(changeId);
  change.beacon = event.address;
  change.newMode = "Static";
  change.pinnedImplementation = event.params.implementation;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

export function handleModeChanged(event: ModeChangedEvent): void {
  // ModeChanged fires alongside MirrorSet or Pinned, which handle the state update.
  // This handler is a no-op since the mode change is captured by the more specific events.
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let beacon = SwitchableBeaconContract.load(event.address);
  if (!beacon) return;

  beacon.owner = event.params.newOwner;
  beacon.pendingOwner = null;
  beacon.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new BeaconOwnershipChange(changeId);
  change.beacon = event.address;
  change.changeType = "Completed";
  change.previousOwner = event.params.previousOwner;
  change.newOwner = event.params.newOwner;
  change.timestamp = event.block.timestamp;
  change.blockNumber = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

export function handleOwnershipTransferStarted(event: OwnershipTransferStartedEvent): void {
  let beacon = SwitchableBeaconContract.load(event.address);
  if (!beacon) return;

  beacon.pendingOwner = event.params.newOwner;
  beacon.save();

  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new BeaconOwnershipChange(changeId);
  change.beacon = event.address;
  change.changeType = "Started";
  change.previousOwner = event.params.previousOwner;
  change.newOwner = event.params.newOwner;
  change.timestamp = event.block.timestamp;
  change.blockNumber = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}
