import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized,
  CallerSet,
  BatchExecuted,
  CallExecuted,
  Swept,
  HatsSet,
  HatMinterAuthorized,
  HatsMinted,
  Paused,
  Unpaused,
  OwnershipTransferred
} from "../generated/templates/Executor/Executor";

export function createInitializedEvent(version: BigInt): Initialized {
  let event = changetype<Initialized>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromUnsignedBigInt(version))
  );

  return event;
}

export function createCallerSetEvent(caller: Address): CallerSet {
  let event = changetype<CallerSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("caller", ethereum.Value.fromAddress(caller))
  );

  return event;
}

export function createBatchExecutedEvent(
  proposalId: BigInt,
  calls: BigInt
): BatchExecuted {
  let event = changetype<BatchExecuted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("proposalId", ethereum.Value.fromUnsignedBigInt(proposalId))
  );
  event.parameters.push(
    new ethereum.EventParam("calls", ethereum.Value.fromUnsignedBigInt(calls))
  );

  return event;
}

export function createCallExecutedEvent(
  proposalId: BigInt,
  index: BigInt,
  target: Address,
  value: BigInt
): CallExecuted {
  let event = changetype<CallExecuted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("proposalId", ethereum.Value.fromUnsignedBigInt(proposalId))
  );
  event.parameters.push(
    new ethereum.EventParam("index", ethereum.Value.fromUnsignedBigInt(index))
  );
  event.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  );
  event.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  );

  return event;
}

export function createSweptEvent(to: Address, amount: BigInt): Swept {
  let event = changetype<Swept>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  );
  event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );

  return event;
}

export function createHatsSetEvent(hats: Address): HatsSet {
  let event = changetype<HatsSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hats", ethereum.Value.fromAddress(hats))
  );

  return event;
}

export function createHatMinterAuthorizedEvent(
  minter: Address,
  authorized: boolean
): HatMinterAuthorized {
  let event = changetype<HatMinterAuthorized>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("minter", ethereum.Value.fromAddress(minter))
  );
  event.parameters.push(
    new ethereum.EventParam("authorized", ethereum.Value.fromBoolean(authorized))
  );

  return event;
}

export function createHatsMintedEvent(
  user: Address,
  hatIds: BigInt[]
): HatsMinted {
  let event = changetype<HatsMinted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("user", ethereum.Value.fromAddress(user))
  );
  event.parameters.push(
    new ethereum.EventParam("hatIds", ethereum.Value.fromUnsignedBigIntArray(hatIds))
  );

  return event;
}

export function createPausedEvent(account: Address): Paused {
  let event = changetype<Paused>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  );

  return event;
}

export function createUnpausedEvent(account: Address): Unpaused {
  let event = changetype<Unpaused>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
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
