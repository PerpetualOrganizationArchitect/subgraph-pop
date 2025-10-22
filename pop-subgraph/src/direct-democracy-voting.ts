import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  Initialized,
  ExecutorUpdated,
  QuorumPercentageSet,
  HatSet,
  HatToggled,
  CreatorHatSet,
  TargetAllowed,
  NewProposal,
  NewHatProposal,
  VoteCast,
  Winner,
  ProposalCleaned
} from "../generated/templates/DirectDemocracyVoting/DirectDemocracyVoting";
import {
  DirectDemocracyVotingContract,
  DirectDemocracyVotingHatPermission,
  DirectDemocracyVotingCreatorHatPermission,
  DirectDemocracyVotingTargetPermission,
  DirectDemocracyVotingQuorumChange,
  DirectDemocracyVotingExecutorChange,
  DDVProposal,
  DDVVote
} from "../generated/schema";

/**
 * Handler for Initialized event
 * Updates the DirectDemocracyVotingContract entity with initialization data.
 * The entity should already exist, created by handleOrgDeployed.
 */
export function handleInitialized(event: Initialized): void {
  let contract = DirectDemocracyVotingContract.load(event.address);

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
  let contract = DirectDemocracyVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  // Update current executor
  contract.executor = event.params.newExecutor;
  contract.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new DirectDemocracyVotingExecutorChange(changeId);

  change.directDemocracyVoting = event.address;
  change.newExecutor = event.params.newExecutor;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

/**
 * Handler for QuorumPercentageSet event
 * Updates the quorum percentage and creates a historical record
 */
export function handleQuorumPercentageSet(event: QuorumPercentageSet): void {
  let contract = DirectDemocracyVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  // Update current quorum
  contract.quorumPercentage = event.params.pct;
  contract.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new DirectDemocracyVotingQuorumChange(changeId);

  change.directDemocracyVoting = event.address;
  change.newQuorumPercentage = event.params.pct;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

/**
 * Handler for HatSet event
 * Creates or updates hat permissions (voting hats) with type information
 */
export function handleHatSet(event: HatSet): void {
  let contractAddress = event.address.toHexString();
  let hatId = event.params.hat.toString();
  let permissionId = contractAddress + "-" + hatId + "-votingHat";

  let permission = DirectDemocracyVotingHatPermission.load(permissionId);

  if (!permission) {
    permission = new DirectDemocracyVotingHatPermission(permissionId);
    permission.directDemocracyVoting = event.address;
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
 * Creates or updates hat permissions (voting hats) without type information
 */
export function handleHatToggled(event: HatToggled): void {
  let contractAddress = event.address.toHexString();
  let hatId = event.params.hatId.toString();
  let permissionId = contractAddress + "-" + hatId + "-votingHat";

  let permission = DirectDemocracyVotingHatPermission.load(permissionId);

  if (!permission) {
    permission = new DirectDemocracyVotingHatPermission(permissionId);
    permission.directDemocracyVoting = event.address;
    permission.hatId = event.params.hatId;
    // hatType is not set in HatToggled event - it remains null
  }

  permission.allowed = event.params.allowed;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;

  permission.save();
}

/**
 * Handler for CreatorHatSet event
 * Creates or updates creator hat permissions
 */
export function handleCreatorHatSet(event: CreatorHatSet): void {
  let contractAddress = event.address.toHexString();
  let hatId = event.params.hat.toString();
  let permissionId = contractAddress + "-" + hatId + "-creatorHat";

  let permission = DirectDemocracyVotingCreatorHatPermission.load(permissionId);

  if (!permission) {
    permission = new DirectDemocracyVotingCreatorHatPermission(permissionId);
    permission.directDemocracyVoting = event.address;
    permission.hatId = event.params.hat;
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

  let permission = DirectDemocracyVotingTargetPermission.load(permissionId);

  if (!permission) {
    permission = new DirectDemocracyVotingTargetPermission(permissionId);
    permission.directDemocracyVoting = event.address;
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

  let proposal = new DDVProposal(proposalId);

  proposal.proposalId = event.params.id;
  proposal.directDemocracyVoting = event.address;
  proposal.metadata = event.params.metadata;
  proposal.numOptions = event.params.numOptions;
  proposal.endTimestamp = event.params.endTs;
  proposal.createdTimestamp = event.params.created;
  proposal.isHatRestricted = false;
  proposal.restrictedHatIds = [];
  proposal.status = "Active";
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

  let proposal = new DDVProposal(proposalId);

  proposal.proposalId = event.params.id;
  proposal.directDemocracyVoting = event.address;
  proposal.metadata = event.params.metadata;
  proposal.numOptions = event.params.numOptions;
  proposal.endTimestamp = event.params.endTs;
  proposal.createdTimestamp = event.params.created;
  proposal.isHatRestricted = true;
  proposal.restrictedHatIds = event.params.hatIds;
  proposal.status = "Active";
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

  let vote = new DDVVote(voteId);

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

  vote.votedAt = event.block.timestamp;
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

  let proposal = DDVProposal.load(proposalId);

  if (!proposal) {
    // Edge case: proposal not found, skip
    return;
  }

  proposal.winningOption = event.params.winningIdx;
  proposal.isValid = event.params.valid;
  proposal.winnerAnnouncedAt = event.block.timestamp;
  proposal.status = "Ended";

  proposal.save();
}

/**
 * Handler for ProposalCleaned event
 * Marks the proposal as cleaned
 */
export function handleProposalCleaned(event: ProposalCleaned): void {
  let contractAddress = event.address.toHexString();
  let proposalId = contractAddress + "-" + event.params.id.toString();

  let proposal = DDVProposal.load(proposalId);

  if (!proposal) {
    // Edge case: proposal not found, skip
    return;
  }

  proposal.status = "Cleaned";
  proposal.cleanedAt = event.block.timestamp;

  proposal.save();
}
