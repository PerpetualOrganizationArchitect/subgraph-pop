import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized,
  ToggleModuleInitialized,
  HatToggled,
  AdminTransferred
} from "../generated/templates/ToggleModule/ToggleModule";

export function createInitializedEvent(version: BigInt): Initialized {
  let event = changetype<Initialized>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromUnsignedBigInt(version))
  );

  return event;
}

export function createToggleModuleInitializedEvent(admin: Address): ToggleModuleInitialized {
  let event = changetype<ToggleModuleInitialized>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("admin", ethereum.Value.fromAddress(admin))
  );

  return event;
}

export function createHatToggledEvent(
  hatId: BigInt,
  newStatus: boolean
): HatToggled {
  let event = changetype<HatToggled>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hatId", ethereum.Value.fromUnsignedBigInt(hatId))
  );
  event.parameters.push(
    new ethereum.EventParam("newStatus", ethereum.Value.fromBoolean(newStatus))
  );

  return event;
}

export function createAdminTransferredEvent(
  oldAdmin: Address,
  newAdmin: Address
): AdminTransferred {
  let event = changetype<AdminTransferred>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldAdmin", ethereum.Value.fromAddress(oldAdmin))
  );
  event.parameters.push(
    new ethereum.EventParam("newAdmin", ethereum.Value.fromAddress(newAdmin))
  );

  return event;
}
