import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import {
  MirrorSet,
  Pinned,
  ModeChanged,
  OwnerTransferred,
  OwnershipTransferStarted,
  OwnershipTransferCancelled
} from "../generated/templates/SwitchableBeacon/SwitchableBeacon";

export function createMirrorSetEvent(mirrorBeacon: Address): MirrorSet {
  let event = changetype<MirrorSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("mirrorBeacon", ethereum.Value.fromAddress(mirrorBeacon))
  );

  return event;
}

export function createPinnedEvent(implementation: Address): Pinned {
  let event = changetype<Pinned>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("implementation", ethereum.Value.fromAddress(implementation))
  );

  return event;
}

export function createModeChangedEvent(mode: i32): ModeChanged {
  let event = changetype<ModeChanged>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("mode", ethereum.Value.fromI32(mode))
  );

  return event;
}

export function createOwnerTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnerTransferred {
  let event = changetype<OwnerTransferred>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("previousOwner", ethereum.Value.fromAddress(previousOwner))
  );
  event.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  );

  return event;
}

export function createOwnershipTransferStartedEvent(
  pendingOwner: Address
): OwnershipTransferStarted {
  let event = changetype<OwnershipTransferStarted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("pendingOwner", ethereum.Value.fromAddress(pendingOwner))
  );

  return event;
}

export function createOwnershipTransferCancelledEvent(
  cancelledOwner: Address
): OwnershipTransferCancelled {
  let event = changetype<OwnershipTransferCancelled>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("cancelledOwner", ethereum.Value.fromAddress(cancelledOwner))
  );

  return event;
}
