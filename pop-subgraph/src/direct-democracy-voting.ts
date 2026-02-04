import { Address, Bytes, BigInt, DataSourceContext } from "@graphprotocol/graph-ts";
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
  DirectDemocracyVotingTargetPermission,
  DirectDemocracyVotingQuorumChange,
  HatPermission,
  DDVProposal,
  DDVVote
} from "../generated/schema";
import { ProposalMetadata as ProposalMetadataTemplate } from "../generated/templates";
import { getUsernameForAddress, loadExistingUser, createExecutorChange, getOrCreateRole } from "./utils";

// Zero hash constant for comparison
const ZERO_HASH = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000");

/**
 * Convert bytes32 sha256 digest to IPFS CIDv0.
 * CIDv0 = base58( 0x1220 + sha256_digest )
 */
function bytes32ToCid(hash: Bytes): string {
  let prefix = Bytes.fromHexString("0x1220");
  let multihash = new Bytes(34);
  for (let i = 0; i < 2; i++) {
    multihash[i] = prefix[i];
  }
  for (let i = 0; i < 32; i++) {
    multihash[i + 2] = hash[i];
  }
  return multihash.toBase58();
}

/**
 * Create IPFS data source for proposal metadata.
 */
function createProposalMetadataDataSource(descriptionHash: Bytes, proposalEntityId: string): void {
  // Skip if hash is empty (all zeros)
  if (descriptionHash.equals(ZERO_HASH)) {
    return;
  }

  // Convert bytes32 to IPFS CIDv0
  let ipfsCid = bytes32ToCid(descriptionHash);

  // Create context to pass proposal info to the IPFS handler
  let context = new DataSourceContext();
  context.setString("proposalEntityId", proposalEntityId);
  context.setString("proposalType", "ddv");

  // Create the file data source
  ProposalMetadataTemplate.createWithContext(ipfsCid, context);
}

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

  // Create historical record using consolidated ExecutorChange entity
  createExecutorChange(
    event.address,
    "DirectDemocracyVoting",
    contract.organization,
    event.params.newExecutor,
    event
  );
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
  let contract = DirectDemocracyVotingContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Voter role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hat.toString() +
    "-Voter";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "DirectDemocracyVoting";
    permission.organization = contract.organization;
    permission.hatId = event.params.hat;
    permission.permissionRole = "Voter";
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
 * Creates or updates hat permissions (voting hats) without type information
 */
export function handleHatToggled(event: HatToggled): void {
  let contract = DirectDemocracyVotingContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Voter role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hatId.toString() +
    "-Voter";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "DirectDemocracyVoting";
    permission.organization = contract.organization;
    permission.hatId = event.params.hatId;
    permission.permissionRole = "Voter";
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
 * Handler for CreatorHatSet event
 * Creates or updates creator hat permissions
 */
export function handleCreatorHatSet(event: CreatorHatSet): void {
  let contract = DirectDemocracyVotingContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Creator role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hat.toString() +
    "-Creator";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "DirectDemocracyVoting";
    permission.organization = contract.organization;
    permission.hatId = event.params.hat;
    permission.permissionRole = "Creator";
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hat, event);
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
  proposal.title = event.params.title.toString();
  proposal.descriptionHash = event.params.descriptionHash;
  proposal.numOptions = event.params.numOptions;
  proposal.startTimestamp = event.params.created;
  proposal.endTimestamp = event.params.endTs;
  proposal.isHatRestricted = false;
  proposal.restrictedHatIds = [];
  proposal.status = "Active";
  proposal.createdAtBlock = event.block.number;
  proposal.transactionHash = event.transaction.hash;

  // Set metadata link - entity will be created by IPFS handler if content exists
  if (!event.params.descriptionHash.equals(ZERO_HASH)) {
    let metadataCid = bytes32ToCid(event.params.descriptionHash);
    proposal.metadata = metadataCid;
  }

  proposal.save();

  // Trigger IPFS fetch for proposal metadata (description and option names)
  createProposalMetadataDataSource(event.params.descriptionHash, proposalId);
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
  proposal.title = event.params.title.toString();
  proposal.descriptionHash = event.params.descriptionHash;
  proposal.numOptions = event.params.numOptions;
  proposal.startTimestamp = event.params.created;
  proposal.endTimestamp = event.params.endTs;
  proposal.isHatRestricted = true;
  proposal.restrictedHatIds = event.params.hatIds;
  proposal.status = "Active";
  proposal.createdAtBlock = event.block.number;
  proposal.transactionHash = event.transaction.hash;

  // Set metadata link - entity will be created by IPFS handler if content exists
  if (!event.params.descriptionHash.equals(ZERO_HASH)) {
    let metadataCid = bytes32ToCid(event.params.descriptionHash);
    proposal.metadata = metadataCid;
  }

  proposal.save();

  // Trigger IPFS fetch for proposal metadata (description and option names)
  createProposalMetadataDataSource(event.params.descriptionHash, proposalId);
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

  // DDVVote is immutable - check if already exists to prevent duplicate creation
  let existingVote = DDVVote.load(voteId);
  if (existingVote != null) {
    return;
  }

  let vote = new DDVVote(voteId);

  vote.proposal = proposalId;
  vote.voter = event.params.voter;
  vote.voterUsername = getUsernameForAddress(event.params.voter);

  // Link to User entity and increment totalVotes
  let votingContract = DirectDemocracyVotingContract.load(event.address);
  if (votingContract) {
    let user = loadExistingUser(
      votingContract.organization,
      event.params.voter,
      event.block.timestamp,
      event.block.number
    );
    if (user) {
      vote.voterUser = user.id;
      user.totalVotes = user.totalVotes.plus(BigInt.fromI32(1));
      user.save();
    }
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
