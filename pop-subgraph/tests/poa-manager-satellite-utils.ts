import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  UpgradeReceived,
  ContractTypeReceived,
  AdminCallReceived,
  PauseSet
} from "../generated/PoaManagerSatellite/PoaManagerSatellite";

export function createUpgradeReceivedEvent(
  typeId: Bytes,
  newImpl: Address,
  version: string,
  origin: BigInt
): UpgradeReceived {
  let event = changetype<UpgradeReceived>(newMockEvent());

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
  event.parameters.push(
    new ethereum.EventParam(
      "origin",
      ethereum.Value.fromUnsignedBigInt(origin)
    )
  );

  return event;
}

export function createContractTypeReceivedEvent(
  typeId: Bytes,
  typeName: string,
  impl: Address,
  origin: BigInt
): ContractTypeReceived {
  let event = changetype<ContractTypeReceived>(newMockEvent());

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
  event.parameters.push(
    new ethereum.EventParam(
      "origin",
      ethereum.Value.fromUnsignedBigInt(origin)
    )
  );

  return event;
}

export function createAdminCallReceivedEvent(
  target: Address,
  data: Bytes,
  origin: BigInt
): AdminCallReceived {
  let event = changetype<AdminCallReceived>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  );
  event.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromBytes(data))
  );
  event.parameters.push(
    new ethereum.EventParam(
      "origin",
      ethereum.Value.fromUnsignedBigInt(origin)
    )
  );

  return event;
}

export function createSatellitePauseSetEvent(paused: boolean): PauseSet {
  let event = changetype<PauseSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("paused", ethereum.Value.fromBoolean(paused))
  );

  return event;
}
