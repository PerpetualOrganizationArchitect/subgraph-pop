import { newMockEvent } from "matchstick-as";
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  BeaconCreated,
  BeaconUpgraded,
  RegistryUpdated
} from "../generated/PoaManager/PoaManager";

export function createBeaconCreatedEvent(
  typeId: Bytes,
  typeName: string,
  beacon: Address,
  implementation: Address
): BeaconCreated {
  let event = changetype<BeaconCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  event.parameters.push(
    new ethereum.EventParam("typeName", ethereum.Value.fromString(typeName))
  );
  event.parameters.push(
    new ethereum.EventParam("beacon", ethereum.Value.fromAddress(beacon))
  );
  event.parameters.push(
    new ethereum.EventParam("implementation", ethereum.Value.fromAddress(implementation))
  );

  return event;
}

export function createBeaconUpgradedEvent(
  typeId: Bytes,
  newImplementation: Address,
  version: string
): BeaconUpgraded {
  let event = changetype<BeaconUpgraded>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  event.parameters.push(
    new ethereum.EventParam("newImplementation", ethereum.Value.fromAddress(newImplementation))
  );
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromString(version))
  );

  return event;
}

export function createRegistryUpdatedEvent(
  oldRegistry: Address,
  newRegistry: Address
): RegistryUpdated {
  let event = changetype<RegistryUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldRegistry", ethereum.Value.fromAddress(oldRegistry))
  );
  event.parameters.push(
    new ethereum.EventParam("newRegistry", ethereum.Value.fromAddress(newRegistry))
  );

  return event;
}
