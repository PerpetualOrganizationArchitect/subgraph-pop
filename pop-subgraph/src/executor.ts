import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  CallerSet as CallerSetEvent,
  BatchExecuted as BatchExecutedEvent,
  CallExecuted as CallExecutedEvent,
  Swept as SweptEvent,
  HatsSet as HatsSetEvent,
  HatMinterAuthorized as HatMinterAuthorizedEvent,
  HatsMinted as HatsMintedEvent,
  Paused as PausedEvent,
  Unpaused as UnpausedEvent,
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/templates/Executor/Executor";
import {
  ExecutorContract,
  CallerChange,
  BatchExecution,
  CallExecution,
  ExecutorSweep,
  HatMinterAuthorization,
  HatsMintedEvent as HatsMintedEntity,
  ExecutorOwnershipTransfer,
  Proposal,
  DDVProposal,
  Account
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser, createPauseEvent, getOrCreateRoleWearer, recordUserHatChange, shouldCreateRoleWearer } from "./utils";

export function handleInitialized(event: InitializedEvent): void {
  // Initialization handled in org-deployer.ts
  // This event just confirms the contract is initialized
}

export function handleCallerSet(event: CallerSetEvent): void {
  let contractAddress = event.address;

  // Update the ExecutorContract entity
  let executor = ExecutorContract.load(contractAddress);
  if (executor) {
    executor.allowedCaller = event.params.caller;
    executor.save();
  }

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new CallerChange(changeId);

  change.executor = contractAddress;
  change.newCaller = event.params.caller;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handleBatchExecuted(event: BatchExecutedEvent): void {
  let contractAddress = event.address;
  let proposalId = event.params.proposalId;

  // Create batch execution record
  let batchId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let batch = new BatchExecution(batchId);

  batch.executor = contractAddress;
  batch.proposalId = proposalId;
  batch.callCount = event.params.calls;
  batch.executedAt = event.block.timestamp;
  batch.executedAtBlock = event.block.number;
  batch.transactionHash = event.transaction.hash;

  // Try to link to a proposal if it exists
  // First check HybridVoting proposals
  let executor = ExecutorContract.load(contractAddress);
  if (executor) {
    // Get the HybridVoting contract address from the organization
    // The proposal ID should match across voting contracts
    let orgId = executor.organization;

    // Try HybridVoting proposal (format: hybridVoting-proposalId)
    // We need to search for a proposal with this ID
    // Since we don't know which voting contract, we'll try to find by proposalId
    // This is a best-effort linking

    // Note: In practice, we would need to know which voting contract executed
    // For now, we leave hybridProposal and ddvProposal as null
    // and could be enhanced later with additional event data
  }

  batch.save();
}

export function handleCallExecuted(event: CallExecutedEvent): void {
  let contractAddress = event.address;
  let proposalId = event.params.proposalId;
  let callIndex = event.params.index;

  // Create call execution record
  // Use txHash-logIndex-callIndex for unique ID since multiple calls in same tx
  let callId = event.transaction.hash.concatI32(event.logIndex.toI32()).concat(
    Bytes.fromByteArray(Bytes.fromBigInt(callIndex))
  );
  let call = new CallExecution(callId);

  call.executor = contractAddress;
  call.proposalId = proposalId;
  call.callIndex = callIndex;
  call.target = event.params.target;
  call.value = event.params.value;
  call.executedAt = event.block.timestamp;
  call.executedAtBlock = event.block.number;
  call.transactionHash = event.transaction.hash;

  // Find the batch execution to link to
  // The batch event is emitted after all calls, so we look for it in the same tx
  // We use a pattern of txHash-logIndex where logIndex would be after all call events
  // For simplicity, we'll construct the batch ID based on expected pattern
  // Note: BatchExecuted comes after CallExecuted events
  let batchId = event.transaction.hash.concatI32(event.logIndex.toI32() + 1);
  call.batch = batchId;

  call.save();
}

export function handleSwept(event: SweptEvent): void {
  let contractAddress = event.address;

  // Create sweep record
  let sweepId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let sweep = new ExecutorSweep(sweepId);

  sweep.executor = contractAddress;
  sweep.to = event.params.to;
  sweep.amount = event.params.amount;
  sweep.sweptAt = event.block.timestamp;
  sweep.sweptAtBlock = event.block.number;
  sweep.transactionHash = event.transaction.hash;

  sweep.save();
}

export function handleHatsSet(event: HatsSetEvent): void {
  let contractAddress = event.address;

  // Update the ExecutorContract entity
  let executor = ExecutorContract.load(contractAddress);
  if (executor) {
    executor.hatsContract = event.params.hats;
    executor.save();
  }
}

export function handleHatMinterAuthorized(event: HatMinterAuthorizedEvent): void {
  let contractAddress = event.address;
  let minter = event.params.minter;

  // Create or update minter authorization
  let authId = contractAddress.toHexString() + "-" + minter.toHexString();
  let auth = HatMinterAuthorization.load(authId);

  if (!auth) {
    auth = new HatMinterAuthorization(authId);
    auth.executor = contractAddress;
    auth.minter = minter;
  }

  auth.authorized = event.params.authorized;
  auth.updatedAt = event.block.timestamp;
  auth.updatedAtBlock = event.block.number;
  auth.transactionHash = event.transaction.hash;

  auth.save();
}

export function handleHatsMinted(event: HatsMintedEvent): void {
  let contractAddress = event.address;
  let recipient = event.params.user;

  // Create hats minted event record
  let mintId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let mint = new HatsMintedEntity(mintId);

  mint.executor = contractAddress;
  mint.recipient = recipient;
  mint.recipientUsername = getUsernameForAddress(recipient);
  mint.hatIds = event.params.hatIds;
  mint.mintedAt = event.block.timestamp;
  mint.mintedAtBlock = event.block.number;
  mint.transactionHash = event.transaction.hash;

  // Link to Account if exists
  let account = Account.load(recipient);
  if (account) {
    mint.recipientAccount = recipient;
  }

  // Link to User entity if we can determine the organization
  let executor = ExecutorContract.load(contractAddress);
  if (executor) {
    let user = getOrCreateUser(
      executor.organization,
      recipient,
      event.block.timestamp,
      event.block.number
    );
    mint.recipientUser = user.id;

    // Create RoleWearers for each minted hat (only for user-facing hats to non-system addresses)
    let hatIds = event.params.hatIds;
    for (let i = 0; i < hatIds.length; i++) {
      let hatId = hatIds[i];
      // Only create RoleWearer for eligible combinations (not system contracts, not system hats)
      if (shouldCreateRoleWearer(executor.organization, hatId, recipient)) {
        getOrCreateRoleWearer(
          executor.organization,
          hatId,
          recipient,
          event
        );
        recordUserHatChange(user, hatId, true, event);
      }
    }
    user.save();
  }

  mint.save();
}

export function handlePaused(event: PausedEvent): void {
  let executor = ExecutorContract.load(event.address);
  if (!executor) {
    return;
  }

  // Update contract
  executor.isPaused = true;
  executor.save();

  // Create pause event record using consolidated PauseEvent entity
  createPauseEvent(
    event.address,
    "Executor",
    executor.organization,
    true,
    event.params.account,
    event
  );
}

export function handleUnpaused(event: UnpausedEvent): void {
  let executor = ExecutorContract.load(event.address);
  if (!executor) {
    return;
  }

  // Update contract
  executor.isPaused = false;
  executor.save();

  // Create unpause event record using consolidated PauseEvent entity
  createPauseEvent(
    event.address,
    "Executor",
    executor.organization,
    false,
    event.params.account,
    event
  );
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let contractAddress = event.address;

  // Update contract
  let executor = ExecutorContract.load(contractAddress);
  if (executor) {
    executor.owner = event.params.newOwner;
    executor.save();
  }

  // Create transfer record
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new ExecutorOwnershipTransfer(transferId);

  transfer.executor = contractAddress;
  transfer.previousOwner = event.params.previousOwner;
  transfer.newOwner = event.params.newOwner;
  transfer.transferredAt = event.block.timestamp;
  transfer.transferredAtBlock = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}
