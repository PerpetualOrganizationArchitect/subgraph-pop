import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  CrossChainUpgradeDispatched as CrossChainUpgradeDispatchedEvent,
  CrossChainAddTypeDispatched as CrossChainAddTypeDispatchedEvent,
  CrossChainAdminCallDispatched as CrossChainAdminCallDispatchedEvent,
  SatelliteRegistered as SatelliteRegisteredEvent,
  SatelliteRemoved as SatelliteRemovedEvent,
  PauseSet as PauseSetEvent
} from "../generated/PoaManagerHub/PoaManagerHub";
import {
  PoaManagerHubContract,
  SatelliteRegistration,
  CrossChainUpgradeDispatch,
  CrossChainAddTypeDispatch,
  CrossChainAdminCallDispatch
} from "../generated/schema";

function getOrCreateHub(address: Bytes, timestamp: BigInt, blockNumber: BigInt): PoaManagerHubContract {
  let hub = PoaManagerHubContract.load(address);
  if (!hub) {
    hub = new PoaManagerHubContract(address);
    hub.paused = false;
    hub.createdAt = timestamp;
    hub.createdAtBlock = blockNumber;
    hub.save();
  }
  return hub;
}

export function handleCrossChainUpgradeDispatched(event: CrossChainUpgradeDispatchedEvent): void {
  let hub = getOrCreateHub(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let dispatch = new CrossChainUpgradeDispatch(id);
  dispatch.hub = hub.id;
  dispatch.typeId = event.params.typeId;
  dispatch.newImplementation = event.params.newImpl;
  dispatch.version = event.params.version;
  dispatch.dispatchedAt = event.block.timestamp;
  dispatch.dispatchedAtBlock = event.block.number;
  dispatch.transactionHash = event.transaction.hash;
  dispatch.save();
}

export function handleCrossChainAddTypeDispatched(event: CrossChainAddTypeDispatchedEvent): void {
  let hub = getOrCreateHub(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let dispatch = new CrossChainAddTypeDispatch(id);
  dispatch.hub = hub.id;
  dispatch.typeId = event.params.typeId;
  dispatch.typeName = event.params.typeName;
  dispatch.implementation = event.params.impl;
  dispatch.dispatchedAt = event.block.timestamp;
  dispatch.dispatchedAtBlock = event.block.number;
  dispatch.transactionHash = event.transaction.hash;
  dispatch.save();
}

export function handleCrossChainAdminCallDispatched(event: CrossChainAdminCallDispatchedEvent): void {
  let hub = getOrCreateHub(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let dispatch = new CrossChainAdminCallDispatch(id);
  dispatch.hub = hub.id;
  dispatch.target = event.params.target;
  dispatch.data = event.params.data;
  dispatch.dispatchedAt = event.block.timestamp;
  dispatch.dispatchedAtBlock = event.block.number;
  dispatch.transactionHash = event.transaction.hash;
  dispatch.save();
}

export function handleSatelliteRegistered(event: SatelliteRegisteredEvent): void {
  let hub = getOrCreateHub(event.address, event.block.timestamp, event.block.number);

  let domain = event.params.domain;
  let satId = event.address.toHexString() + "-" + domain.toString();
  let sat = new SatelliteRegistration(satId);
  sat.hub = hub.id;
  sat.domain = domain.toI32();
  sat.satellite = event.params.satellite;
  sat.active = true;
  sat.registeredAt = event.block.timestamp;
  sat.registeredAtBlock = event.block.number;
  sat.transactionHash = event.transaction.hash;
  sat.save();
}

export function handleSatelliteRemoved(event: SatelliteRemovedEvent): void {
  let domain = event.params.domain;
  let satId = event.address.toHexString() + "-" + domain.toString();
  let sat = SatelliteRegistration.load(satId);
  if (sat) {
    sat.active = false;
    sat.removedAt = event.block.timestamp;
    sat.save();
  }
}

export function handleHubPauseSet(event: PauseSetEvent): void {
  let hub = getOrCreateHub(event.address, event.block.timestamp, event.block.number);
  hub.paused = event.params.paused;
  hub.save();
}
