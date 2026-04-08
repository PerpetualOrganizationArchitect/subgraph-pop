import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  UpgradeReceived as UpgradeReceivedEvent,
  ContractTypeReceived as ContractTypeReceivedEvent,
  AdminCallReceived as AdminCallReceivedEvent,
  PauseSet as PauseSetEvent
} from "../generated/PoaManagerSatellite/PoaManagerSatellite";
import {
  PoaManagerSatelliteContract,
  CrossChainUpgradeReceived,
  CrossChainContractTypeReceived,
  CrossChainAdminCallReceived
} from "../generated/schema";

function getOrCreateSatellite(address: Bytes, timestamp: BigInt, blockNumber: BigInt): PoaManagerSatelliteContract {
  let sat = PoaManagerSatelliteContract.load(address);
  if (!sat) {
    sat = new PoaManagerSatelliteContract(address);
    sat.paused = false;
    sat.createdAt = timestamp;
    sat.createdAtBlock = blockNumber;
    sat.save();
  }
  return sat;
}

export function handleUpgradeReceived(event: UpgradeReceivedEvent): void {
  let sat = getOrCreateSatellite(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let received = new CrossChainUpgradeReceived(id);
  received.satellite = sat.id;
  received.typeId = event.params.typeId;
  received.newImplementation = event.params.newImpl;
  received.version = event.params.version;
  received.originDomain = event.params.origin.toI32();
  received.receivedAt = event.block.timestamp;
  received.receivedAtBlock = event.block.number;
  received.transactionHash = event.transaction.hash;
  received.save();
}

export function handleContractTypeReceived(event: ContractTypeReceivedEvent): void {
  let sat = getOrCreateSatellite(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let received = new CrossChainContractTypeReceived(id);
  received.satellite = sat.id;
  received.typeId = event.params.typeId;
  received.typeName = event.params.typeName;
  received.implementation = event.params.impl;
  received.originDomain = event.params.origin.toI32();
  received.receivedAt = event.block.timestamp;
  received.receivedAtBlock = event.block.number;
  received.transactionHash = event.transaction.hash;
  received.save();
}

export function handleAdminCallReceived(event: AdminCallReceivedEvent): void {
  let sat = getOrCreateSatellite(event.address, event.block.timestamp, event.block.number);

  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let received = new CrossChainAdminCallReceived(id);
  received.satellite = sat.id;
  received.target = event.params.target;
  received.data = event.params.data;
  received.originDomain = event.params.origin.toI32();
  received.receivedAt = event.block.timestamp;
  received.receivedAtBlock = event.block.number;
  received.transactionHash = event.transaction.hash;
  received.save();
}

export function handleSatellitePauseSet(event: PauseSetEvent): void {
  let sat = getOrCreateSatellite(event.address, event.block.timestamp, event.block.number);
  sat.paused = event.params.paused;
  sat.save();
}
