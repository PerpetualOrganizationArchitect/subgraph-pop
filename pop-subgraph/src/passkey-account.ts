import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  CredentialAdded as CredentialAddedEvent,
  CredentialRemoved as CredentialRemovedEvent,
  CredentialStatusChanged as CredentialStatusChangedEvent,
  GuardianUpdated as GuardianUpdatedEvent,
  RecoveryDelayUpdated as RecoveryDelayUpdatedEvent,
  RecoveryInitiated as RecoveryInitiatedEvent,
  RecoveryCompleted as RecoveryCompletedEvent,
  RecoveryCancelled as RecoveryCancelledEvent,
  Executed as ExecutedEvent,
  BatchExecuted as BatchExecutedEvent
} from "../generated/templates/PasskeyAccount/PasskeyAccount";
import {
  PasskeyAccount,
  PasskeyCredential,
  RecoveryRequest,
  PasskeyExecution,
  PasskeyBatchExecution,
  GuardianChange
} from "../generated/schema";

export function handleCredentialAdded(event: CredentialAddedEvent): void {
  let accountAddress = event.address;
  let credentialId = accountAddress.toHexString() + "-" + event.params.credentialId.toHexString();

  let credential = new PasskeyCredential(credentialId);
  credential.account = accountAddress;
  credential.credentialId = event.params.credentialId;
  credential.active = true;
  credential.signCount = BigInt.fromI32(0);
  credential.createdAt = event.params.createdAt;
  credential.blockNumber = event.block.number;
  credential.save();
}

export function handleCredentialRemoved(event: CredentialRemovedEvent): void {
  let accountAddress = event.address;
  let credentialId = accountAddress.toHexString() + "-" + event.params.credentialId.toHexString();

  let credential = PasskeyCredential.load(credentialId);
  if (credential != null) {
    credential.active = false;
    credential.removedAt = event.block.timestamp;
    credential.save();
  }
}

export function handleCredentialStatusChanged(event: CredentialStatusChangedEvent): void {
  let accountAddress = event.address;
  let credentialId = accountAddress.toHexString() + "-" + event.params.credentialId.toHexString();

  let credential = PasskeyCredential.load(credentialId);
  if (credential != null) {
    credential.active = event.params.active;
    credential.save();
  }
}

export function handleGuardianUpdated(event: GuardianUpdatedEvent): void {
  let accountAddress = event.address;

  // Update account guardian
  let account = PasskeyAccount.load(accountAddress);
  if (account != null) {
    account.guardian = event.params.newGuardian;
    account.save();
  }

  // Create historical change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new GuardianChange(changeId);
  change.account = accountAddress;
  change.oldGuardian = event.params.oldGuardian;
  change.newGuardian = event.params.newGuardian;
  change.timestamp = event.block.timestamp;
  change.blockNumber = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

export function handleRecoveryDelayUpdated(event: RecoveryDelayUpdatedEvent): void {
  let accountAddress = event.address;

  let account = PasskeyAccount.load(accountAddress);
  if (account != null) {
    account.recoveryDelay = event.params.newDelay;
    account.save();
  }
}

export function handleRecoveryInitiated(event: RecoveryInitiatedEvent): void {
  let accountAddress = event.address;
  let requestId = accountAddress.toHexString() + "-" + event.params.recoveryId.toHexString();

  let request = new RecoveryRequest(requestId);
  request.account = accountAddress;
  request.recoveryId = event.params.recoveryId;
  request.credentialId = event.params.credentialId;
  request.initiator = event.params.initiator;
  request.executeAfter = event.params.executeAfter;
  request.status = "PENDING";
  request.createdAt = event.block.timestamp;
  request.blockNumber = event.block.number;
  request.transactionHash = event.transaction.hash;
  request.save();
}

export function handleRecoveryCompleted(event: RecoveryCompletedEvent): void {
  let accountAddress = event.address;
  let requestId = accountAddress.toHexString() + "-" + event.params.recoveryId.toHexString();

  let request = RecoveryRequest.load(requestId);
  if (request != null) {
    request.status = "COMPLETED";
    request.completedAt = event.block.timestamp;
    request.save();
  }
}

export function handleRecoveryCancelled(event: RecoveryCancelledEvent): void {
  let accountAddress = event.address;
  let requestId = accountAddress.toHexString() + "-" + event.params.recoveryId.toHexString();

  let request = RecoveryRequest.load(requestId);
  if (request != null) {
    request.status = "CANCELLED";
    request.cancelledAt = event.block.timestamp;
    request.save();
  }
}

export function handleExecuted(event: ExecutedEvent): void {
  let accountAddress = event.address;
  let executionId = event.transaction.hash.concatI32(event.logIndex.toI32());

  let execution = new PasskeyExecution(executionId);
  execution.account = accountAddress;
  execution.target = event.params.target;
  execution.value = event.params.value;
  execution.data = event.params.data;
  execution.result = event.params.result;
  execution.timestamp = event.block.timestamp;
  execution.blockNumber = event.block.number;
  execution.transactionHash = event.transaction.hash;
  execution.save();
}

export function handleBatchExecuted(event: BatchExecutedEvent): void {
  let accountAddress = event.address;
  let executionId = event.transaction.hash.concatI32(event.logIndex.toI32());

  let execution = new PasskeyBatchExecution(executionId);
  execution.account = accountAddress;
  execution.count = event.params.count;
  execution.timestamp = event.block.timestamp;
  execution.blockNumber = event.block.number;
  execution.transactionHash = event.transaction.hash;
  execution.save();
}
