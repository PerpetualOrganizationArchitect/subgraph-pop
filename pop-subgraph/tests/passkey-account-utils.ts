import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  CredentialAdded,
  CredentialRemoved,
  CredentialStatusChanged,
  GuardianUpdated,
  RecoveryDelayUpdated,
  RecoveryInitiated,
  RecoveryCompleted,
  RecoveryCancelled,
  Executed,
  BatchExecuted
} from "../generated/templates/PasskeyAccount/PasskeyAccount";

export function createCredentialAddedEvent(
  credentialId: Bytes,
  orgId: Bytes,
  createdAt: BigInt
): CredentialAdded {
  let event = changetype<CredentialAdded>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("createdAt", ethereum.Value.fromUnsignedBigInt(createdAt))
  );

  return event;
}

export function createCredentialRemovedEvent(credentialId: Bytes): CredentialRemoved {
  let event = changetype<CredentialRemoved>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );

  return event;
}

export function createCredentialStatusChangedEvent(
  credentialId: Bytes,
  active: boolean
): CredentialStatusChanged {
  let event = changetype<CredentialStatusChanged>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );
  event.parameters.push(
    new ethereum.EventParam("active", ethereum.Value.fromBoolean(active))
  );

  return event;
}

export function createGuardianUpdatedEvent(
  oldGuardian: Address,
  newGuardian: Address
): GuardianUpdated {
  let event = changetype<GuardianUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldGuardian", ethereum.Value.fromAddress(oldGuardian))
  );
  event.parameters.push(
    new ethereum.EventParam("newGuardian", ethereum.Value.fromAddress(newGuardian))
  );

  return event;
}

export function createRecoveryDelayUpdatedEvent(
  oldDelay: BigInt,
  newDelay: BigInt
): RecoveryDelayUpdated {
  let event = changetype<RecoveryDelayUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldDelay", ethereum.Value.fromUnsignedBigInt(oldDelay))
  );
  event.parameters.push(
    new ethereum.EventParam("newDelay", ethereum.Value.fromUnsignedBigInt(newDelay))
  );

  return event;
}

export function createRecoveryInitiatedEvent(
  recoveryId: Bytes,
  credentialId: Bytes,
  initiator: Address,
  executeAfter: BigInt
): RecoveryInitiated {
  let event = changetype<RecoveryInitiated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("recoveryId", ethereum.Value.fromFixedBytes(recoveryId))
  );
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );
  event.parameters.push(
    new ethereum.EventParam("initiator", ethereum.Value.fromAddress(initiator))
  );
  event.parameters.push(
    new ethereum.EventParam("executeAfter", ethereum.Value.fromUnsignedBigInt(executeAfter))
  );

  return event;
}

export function createRecoveryCompletedEvent(
  recoveryId: Bytes,
  credentialId: Bytes
): RecoveryCompleted {
  let event = changetype<RecoveryCompleted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("recoveryId", ethereum.Value.fromFixedBytes(recoveryId))
  );
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );

  return event;
}

export function createRecoveryCancelledEvent(recoveryId: Bytes): RecoveryCancelled {
  let event = changetype<RecoveryCancelled>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("recoveryId", ethereum.Value.fromFixedBytes(recoveryId))
  );

  return event;
}

export function createExecutedEvent(
  target: Address,
  value: BigInt,
  data: Bytes,
  result: Bytes
): Executed {
  let event = changetype<Executed>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("target", ethereum.Value.fromAddress(target))
  );
  event.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  );
  event.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromBytes(data))
  );
  event.parameters.push(
    new ethereum.EventParam("result", ethereum.Value.fromBytes(result))
  );

  return event;
}

export function createBatchExecutedEvent(count: BigInt): BatchExecuted {
  let event = changetype<BatchExecuted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("count", ethereum.Value.fromUnsignedBigInt(count))
  );

  return event;
}
