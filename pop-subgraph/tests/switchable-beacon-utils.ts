import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import {
  MirrorSet,
  Pinned,
  ModeChanged,
  OwnershipTransferred,
  OwnershipTransferStarted
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

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let event = changetype<OwnershipTransferred>(newMockEvent());

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
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferStarted {
  let event = changetype<OwnershipTransferStarted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("previousOwner", ethereum.Value.fromAddress(previousOwner))
  );
  event.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  );

  return event;
}
