import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
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
import {
  HybridVotingContract,
  HybridVotingHatPermission,
  HybridVotingTargetPermission,
  HybridVotingQuorumChange,
  HybridVotingExecutorChange,
  Proposal,
  Vote
} from "../generated/schema";

/**
 * Handler for Initialized event
 * Updates the HybridVotingContract entity with initialization data.
 * The entity should already exist, created by handleOrgDeployed.
 */
export function handleInitialized(event: Initialized): void {
  let contract = HybridVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  // Update initialization data
  // Note: executor, quorum, hats will be set by their respective events
  contract.save();
}

/**
 * Handler for ExecutorUpdated event
 * Updates the executor address and creates a historical record
 */
export function handleExecutorUpdated(event: ExecutorUpdated): void {
  let contract = HybridVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  // Update current executor
  contract.executor = event.params.newExec;
  contract.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new HybridVotingExecutorChange(changeId);

  change.hybridVoting = event.address;
  change.newExecutor = event.params.newExec;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

/**
 * Handler for QuorumSet event
 * Updates the quorum percentage and creates a historical record
 */
export function handleQuorumSet(event: QuorumSet): void {
  let contract = HybridVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  // Update current quorum
  contract.quorum = event.params.pct;
  contract.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new HybridVotingQuorumChange(changeId);

  change.hybridVoting = event.address;
  change.newQuorum = event.params.pct;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

/**
 * Handler for HatSet event
 * Creates or updates hat permissions with type information
 */
export function handleHatSet(event: HatSet): void {
  let contractAddress = event.address.toHexString();
  let hatId = event.params.hat.toString();
  let permissionId = contractAddress + "-" + hatId;

  let permission = HybridVotingHatPermission.load(permissionId);

  if (!permission) {
    permission = new HybridVotingHatPermission(permissionId);
    permission.hybridVoting = event.address;
    permission.hatId = event.params.hat;
  }

  permission.allowed = event.params.allowed;
  permission.hatType = event.params.hatType;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;

  permission.save();
}

/**
 * Handler for HatToggled event
 * Creates or updates hat permissions (without type information)
 */
export function handleHatToggled(event: HatToggled): void {
  let contractAddress = event.address.toHexString();
  let hatId = event.params.hatId.toString();
  let permissionId = contractAddress + "-" + hatId;

  let permission = HybridVotingHatPermission.load(permissionId);

  if (!permission) {
    permission = new HybridVotingHatPermission(permissionId);
    permission.hybridVoting = event.address;
    permission.hatId = event.params.hatId;
    permission.hatType = null; // No type info in this event
  }

  permission.allowed = event.params.allowed;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;

  permission.save();
}

/**
 * Handler for TargetAllowed event
 * Creates or updates target permissions
 */
export function handleTargetAllowed(event: TargetAllowed): void {
  let contractAddress = event.address.toHexString();
  let targetAddress = event.params.target.toHexString();
  let permissionId = contractAddress + "-" + targetAddress;

  let permission = HybridVotingTargetPermission.load(permissionId);

  if (!permission) {
    permission = new HybridVotingTargetPermission(permissionId);
    permission.hybridVoting = event.address;
    permission.target = event.params.target;
  }

  permission.allowed = event.params.allowed;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;

  permission.save();
}

// ============================================================================
// PROPOSAL HANDLERS
// ============================================================================

/**
 * Handler for NewProposal event
 * Creates a new unrestricted proposal
 */
export function handleNewProposal(event: NewProposal): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();

  let proposal = new Proposal(proposalId);

  proposal.proposalId = event.params.id;
  proposal.hybridVoting = event.address;
  proposal.creator = event.params.creator;
  proposal.metadata = event.params.metadata;
  proposal.numOptions = event.params.numOptions;
  proposal.endTimestamp = event.params.endTs;
  proposal.createdTimestamp = event.params.created;
  proposal.hasExecutionBatches = event.params.hasExecutionBatches;
  proposal.isHatRestricted = false;
  proposal.restrictedHatIds = [];
  proposal.status = "Active";
  proposal.wasExecuted = false;
  proposal.createdAtBlock = event.block.number;
  proposal.transactionHash = event.transaction.hash;

  proposal.save();
}

/**
 * Handler for NewHatProposal event
 * Creates a new hat-restricted proposal
 */
export function handleNewHatProposal(event: NewHatProposal): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();

  let proposal = new Proposal(proposalId);

  proposal.proposalId = event.params.id;
  proposal.hybridVoting = event.address;
  proposal.creator = event.params.creator;
  proposal.metadata = event.params.metadata;
  proposal.numOptions = event.params.numOptions;
  proposal.endTimestamp = event.params.endTs;
  proposal.createdTimestamp = event.params.created;
  proposal.hasExecutionBatches = event.params.hasExecutionBatches;
  proposal.isHatRestricted = true;
  proposal.restrictedHatIds = event.params.hatIds;
  proposal.status = "Active";
  proposal.wasExecuted = false;
  proposal.createdAtBlock = event.block.number;
  proposal.transactionHash = event.transaction.hash;

  proposal.save();
}

/**
 * Handler for VoteCast event
 * Records a vote on a proposal
 */
export function handleVoteCast(event: VoteCast): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();
  let voterAddress = event.params.voter.toHexString();
  let voteId = proposalId + "-" + voterAddress;

  let vote = new Vote(voteId);

  vote.proposal = proposalId;
  vote.voter = event.params.voter;

  // Convert uint8[] arrays to Int arrays for optionIndexes and optionWeights
  let indexes: i32[] = [];
  for (let i = 0; i < event.params.idxs.length; i++) {
    indexes.push(event.params.idxs[i]);
  }
  vote.optionIndexes = indexes;

  let weights: i32[] = [];
  for (let i = 0; i < event.params.weights.length; i++) {
    weights.push(event.params.weights[i]);
  }
  vote.optionWeights = weights;

  vote.classRawPowers = event.params.classRawPowers;
  vote.votedAt = event.params.timestamp;
  vote.votedAtBlock = event.block.number;
  vote.transactionHash = event.transaction.hash;

  vote.save();
}

/**
 * Handler for Winner event
 * Marks the winning option and updates proposal status
 */
export function handleWinner(event: Winner): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();

  let proposal = Proposal.load(proposalId);

  if (!proposal) {
    // Edge case: proposal not found, skip
    return;
  }

  proposal.winningOption = event.params.winningIdx;
  proposal.isValid = event.params.valid;
  proposal.winnerAnnouncedAt = event.params.timestamp;

  // Update status based on whether it was executed
  if (event.params.executed) {
    proposal.status = "Executed";
    proposal.wasExecuted = true;
  } else {
    proposal.status = "Ended";
  }

  proposal.save();
}

/**
 * Handler for ProposalExecuted event
 * Marks the proposal as executed and records execution details
 */
export function handleProposalExecuted(event: ProposalExecuted): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();

  let proposal = Proposal.load(proposalId);

  if (!proposal) {
    // Edge case: proposal not found, skip
    return;
  }

  proposal.wasExecuted = true;
  proposal.status = "Executed";
  proposal.executedAt = event.block.timestamp;
  proposal.executedCallsCount = event.params.numCalls;

  proposal.save();
}
