import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  CrossChainUpgradeDispatched,
  CrossChainAddTypeDispatched,
  CrossChainAdminCallDispatched,
  SatelliteRegistered,
  SatelliteRemoved,
  PauseSet
} from "../generated/PoaManagerHub/PoaManagerHub";

export function createCrossChainUpgradeDispatchedEvent(
  typeId: Bytes,
  newImpl: Address,
  version: string
): CrossChainUpgradeDispatched {
  let event = changetype<CrossChainUpgradeDispatched>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  event.parameters.push(
    new ethereum.EventParam("newImpl", ethereum.Value.fromAddress(newImpl))
  );
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromString(version))
  );

  return event;
}

export function createCrossChainAddTypeDispatchedEvent(
  typeId: Bytes,
  typeName: string,
  impl: Address
): CrossChainAddTypeDispatched {
  let event = changetype<CrossChainAddTypeDispatched>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  event.parameters.push(
    new ethereum.EventParam("typeName", ethereum.Value.fromString(typeName))
  );
  event.parameters.push(
    new ethereum.EventParam("impl", ethereum.Value.fromAddress(impl))
  );

  return event;
}

export function createCrossChainAdminCallDispatchedEvent(
  target: Address,
  data: Bytes
): CrossChainAdminCallDispatched {
  let event = changetype<CrossChainAdminCallDispatched>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  );
  event.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromBytes(data))
  );

  return event;
}

export function createSatelliteRegisteredEvent(
  domain: BigInt,
  satellite: Address
): SatelliteRegistered {
  let event = changetype<SatelliteRegistered>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("domain", ethereum.Value.fromUnsignedBigInt(domain))
  );
  event.parameters.push(
    new ethereum.EventParam("satellite", ethereum.Value.fromAddress(satellite))
  );

  return event;
}

export function createSatelliteRemovedEvent(
  domain: BigInt
): SatelliteRemoved {
  let event = changetype<SatelliteRemoved>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("domain", ethereum.Value.fromUnsignedBigInt(domain))
  );

  return event;
}

export function createPauseSetEvent(paused: boolean): PauseSet {
  let event = changetype<PauseSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("paused", ethereum.Value.fromBoolean(paused))
  );

  return event;
}
