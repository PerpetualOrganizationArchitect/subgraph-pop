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
  ProposalExecuted,
  ClassesReplaced
} from "../generated/templates/HybridVoting/HybridVoting";
import {
  HybridVotingContract,
  HybridVotingTargetPermission,
  HybridVotingQuorumChange,
  HatPermission,
  Proposal,
  Vote,
  VotingClass,
  VotingClassChange
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser, createHatPermission, createExecutorChange, getOrCreateRole } from "./utils";

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

  // Create historical record using consolidated ExecutorChange entity
  createExecutorChange(
    event.address,
    "HybridVoting",
    contract.organization,
    event.params.newExec,
    event
  );
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
  let contract = HybridVotingContract.load(event.address);
  if (!contract) {
    return;
  }

  // Determine role based on hatType: 0 = Creator, 1+ = Voter classes
  let permissionRole = event.params.hatType == 0 ? "Creator" : "Voter";

  // Create or update consolidated HatPermission entity
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hat.toString() +
    "-" +
    permissionRole;

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "HybridVoting";
    permission.organization = contract.organization;
    permission.hatId = event.params.hat;
    permission.permissionRole = permissionRole;
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hat, event);
  permission.role = role.id;

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
  let contract = HybridVotingContract.load(event.address);
  if (!contract) {
    return;
  }

  // HatToggled doesn't have hatType, default to Voter role
  let permissionRole = "Voter";

  // Create or update consolidated HatPermission entity
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hatId.toString() +
    "-" +
    permissionRole;

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "HybridVoting";
    permission.organization = contract.organization;
    permission.hatId = event.params.hatId;
    permission.permissionRole = permissionRole;
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hatId, event);
  permission.role = role.id;

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
  // Creator is no longer in event, use transaction.from
  proposal.creator = event.transaction.from;
  proposal.creatorUsername = getUsernameForAddress(event.transaction.from);

  // Link to User entity
  let votingContract = HybridVotingContract.load(event.address);
  if (votingContract) {
    let user = getOrCreateUser(
      votingContract.organization,
      event.transaction.from,
      event.block.timestamp,
      event.block.number
    );
    proposal.creatorUser = user.id;
  }

  proposal.title = event.params.title.toString();
  proposal.descriptionHash = event.params.descriptionHash;
  proposal.numOptions = event.params.numOptions;
  proposal.startTimestamp = event.params.created;
  proposal.endTimestamp = event.params.endTs;
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
  // Creator is no longer in event, use transaction.from
  proposal.creator = event.transaction.from;
  proposal.creatorUsername = getUsernameForAddress(event.transaction.from);

  // Link to User entity
  let votingContract = HybridVotingContract.load(event.address);
  if (votingContract) {
    let user = getOrCreateUser(
      votingContract.organization,
      event.transaction.from,
      event.block.timestamp,
      event.block.number
    );
    proposal.creatorUser = user.id;
  }

  proposal.title = event.params.title.toString();
  proposal.descriptionHash = event.params.descriptionHash;
  proposal.numOptions = event.params.numOptions;
  proposal.startTimestamp = event.params.created;
  proposal.endTimestamp = event.params.endTs;
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
  vote.voterUsername = getUsernameForAddress(event.params.voter);

  // Link to User entity and increment totalVotes
  let votingContract = HybridVotingContract.load(event.address);
  if (votingContract) {
    let user = getOrCreateUser(
      votingContract.organization,
      event.params.voter,
      event.block.timestamp,
      event.block.number
    );
    vote.voterUser = user.id;
    user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1));
    user.save();
  }

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

// ============================================================================
// CLASS CONFIGURATION HANDLERS
// ============================================================================

/**
 * Handler for ClassesReplaced event
 * Creates VotingClass entities for each class in the configuration
 * and records the change in VotingClassChange
 */
export function handleClassesReplaced(event: ClassesReplaced): void {
  let contract = HybridVotingContract.load(event.address);

  if (!contract) {
    // Edge case: contract doesn't exist yet (OrgDeployed not processed)
    // Skip this update - the contract will be created by OrgDeployed
    return;
  }

  let version = event.params.version;
  let contractAddress = event.address.toHexString();

  // Mark all previous VotingClass entities for this contract as inactive
  // (We can't query for them directly in AssemblyScript, so we'll just create new ones)
  // The isActive field will help queries filter for current classes

  // Create VotingClass entities for each class in the new configuration
  let classes = event.params.classes;
  for (let i = 0; i < classes.length; i++) {
    let classConfig = classes[i];
    let classId = contractAddress + "-" + version.toString() + "-" + i.toString();

    let votingClass = new VotingClass(classId);
    votingClass.hybridVoting = event.address;
    votingClass.version = version;
    votingClass.classIndex = i;

    // Map strategy enum: 0 = DIRECT, 1 = ERC20_BAL
    if (classConfig.strategy == 0) {
      votingClass.strategy = "DIRECT";
    } else {
      votingClass.strategy = "ERC20_BAL";
    }

    votingClass.slicePct = classConfig.slicePct;
    votingClass.quadratic = classConfig.quadratic;
    votingClass.minBalance = classConfig.minBalance;
    votingClass.asset = classConfig.asset;
    votingClass.hatIds = classConfig.hatIds;
    votingClass.isActive = true; // New classes are active
    votingClass.createdAt = event.block.timestamp;
    votingClass.createdAtBlock = event.block.number;
    votingClass.transactionHash = event.transaction.hash;

    votingClass.save();
  }

  // Update contract's classVersion
  contract.classVersion = version;
  contract.save();

  // Create immutable VotingClassChange record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new VotingClassChange(changeId);

  change.hybridVoting = event.address;
  change.version = version;
  change.classesHash = event.params.classesHash;
  change.numClasses = classes.length;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}
