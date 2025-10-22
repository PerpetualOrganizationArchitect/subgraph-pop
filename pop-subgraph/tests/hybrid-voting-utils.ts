import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized,
  ExecutorUpdated,
  QuorumSet,
  HatSet,
  HatToggled,
  TargetAllowed,
  NewProposal,
  NewHatProposal,
  VoteCast,
  Winner,
  ProposalExecuted
} from "../generated/templates/HybridVoting/HybridVoting";

/**
 * Creates a mock Initialized event
 */
export function createInitializedEvent(version: BigInt): Initialized {
  let event = changetype<Initialized>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromUnsignedBigInt(version))
  );

  return event;
}

/**
 * Creates a mock ExecutorUpdated event
 */
export function createExecutorUpdatedEvent(newExec: Address): ExecutorUpdated {
  let event = changetype<ExecutorUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("newExec", ethereum.Value.fromAddress(newExec))
  );

  return event;
}

/**
 * Creates a mock QuorumSet event
 */
export function createQuorumSetEvent(pct: i32): QuorumSet {
  let event = changetype<QuorumSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("pct", ethereum.Value.fromI32(pct))
  );

  return event;
}

/**
 * Creates a mock HatSet event
 */
export function createHatSetEvent(
  hatType: i32,
  hat: BigInt,
  allowed: boolean
): HatSet {
  let event = changetype<HatSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hatType", ethereum.Value.fromI32(hatType))
  );
  event.parameters.push(
    new ethereum.EventParam("hat", ethereum.Value.fromUnsignedBigInt(hat))
  );
  event.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  );

  return event;
}

/**
 * Creates a mock HatToggled event
 */
export function createHatToggledEvent(
  hatId: BigInt,
  allowed: boolean
): HatToggled {
  let event = changetype<HatToggled>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hatId", ethereum.Value.fromUnsignedBigInt(hatId))
  );
  event.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  );

  return event;
}

/**
 * Creates a mock TargetAllowed event
 */
export function createTargetAllowedEvent(
  target: Address,
  allowed: boolean
): TargetAllowed {
  let event = changetype<TargetAllowed>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  );
  event.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  );

  return event;
}

/**
 * Creates a mock NewProposal event
 */
export function createNewProposalEvent(
  id: BigInt,
  creator: Address,
  metadata: Bytes,
  numOptions: i32,
  endTs: i64,
  created: i64,
  hasExecutionBatches: boolean
): NewProposal {
  let event = changetype<NewProposal>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  );
  event.parameters.push(
    new ethereum.EventParam("metadata", ethereum.Value.fromBytes(metadata))
  );
  event.parameters.push(
    new ethereum.EventParam("numOptions", ethereum.Value.fromI32(numOptions))
  );
  event.parameters.push(
    new ethereum.EventParam("endTs", ethereum.Value.fromI32(endTs as i32))
  );
  event.parameters.push(
    new ethereum.EventParam("created", ethereum.Value.fromI32(created as i32))
  );
  event.parameters.push(
    new ethereum.EventParam("hasExecutionBatches", ethereum.Value.fromBoolean(hasExecutionBatches))
  );

  return event;
}

/**
 * Creates a mock NewHatProposal event
 */
export function createNewHatProposalEvent(
  id: BigInt,
  creator: Address,
  metadata: Bytes,
  numOptions: i32,
  endTs: i64,
  created: i64,
  hatIds: BigInt[],
  hasExecutionBatches: boolean
): NewHatProposal {
  let event = changetype<NewHatProposal>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("creator", ethereum.Value.fromAddress(creator))
  );
  event.parameters.push(
    new ethereum.EventParam("metadata", ethereum.Value.fromBytes(metadata))
  );
  event.parameters.push(
    new ethereum.EventParam("numOptions", ethereum.Value.fromI32(numOptions))
  );
  event.parameters.push(
    new ethereum.EventParam("endTs", ethereum.Value.fromI32(endTs as i32))
  );
  event.parameters.push(
    new ethereum.EventParam("created", ethereum.Value.fromI32(created as i32))
  );
  event.parameters.push(
    new ethereum.EventParam("hatIds", ethereum.Value.fromUnsignedBigIntArray(hatIds))
  );
  event.parameters.push(
    new ethereum.EventParam("hasExecutionBatches", ethereum.Value.fromBoolean(hasExecutionBatches))
  );

  return event;
}

/**
 * Creates a mock VoteCast event
 */
export function createVoteCastEvent(
  id: BigInt,
  voter: Address,
  idxs: i32[],
  weights: i32[],
  classRawPowers: BigInt[],
  timestamp: i64
): VoteCast {
  let event = changetype<VoteCast>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("voter", ethereum.Value.fromAddress(voter))
  );
  event.parameters.push(
    new ethereum.EventParam("idxs", ethereum.Value.fromI32Array(idxs))
  );
  event.parameters.push(
    new ethereum.EventParam("weights", ethereum.Value.fromI32Array(weights))
  );
  event.parameters.push(
    new ethereum.EventParam("classRawPowers", ethereum.Value.fromUnsignedBigIntArray(classRawPowers))
  );
  event.parameters.push(
    new ethereum.EventParam("timestamp", ethereum.Value.fromI32(timestamp as i32))
  );

  return event;
}

/**
 * Creates a mock Winner event
 */
export function createWinnerEvent(
  id: BigInt,
  winningIdx: BigInt,
  valid: boolean,
  executed: boolean,
  timestamp: i64
): Winner {
  let event = changetype<Winner>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("winningIdx", ethereum.Value.fromUnsignedBigInt(winningIdx))
  );
  event.parameters.push(
    new ethereum.EventParam("valid", ethereum.Value.fromBoolean(valid))
  );
  event.parameters.push(
    new ethereum.EventParam("executed", ethereum.Value.fromBoolean(executed))
  );
  event.parameters.push(
    new ethereum.EventParam("timestamp", ethereum.Value.fromI32(timestamp as i32))
  );

  return event;
}

/**
 * Creates a mock ProposalExecuted event
 */
export function createProposalExecutedEvent(
  id: BigInt,
  winningIdx: BigInt,
  numCalls: BigInt
): ProposalExecuted {
  let event = changetype<ProposalExecuted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("winningIdx", ethereum.Value.fromUnsignedBigInt(winningIdx))
  );
  event.parameters.push(
    new ethereum.EventParam("numCalls", ethereum.Value.fromUnsignedBigInt(numCalls))
  );

  return event;
}
