import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  handleInitialized,
  handleExecutorUpdated,
  handleQuorumSet,
  handleHatSet,
  handleHatToggled,
  handleTargetAllowed,
  handleNewProposal,
  handleNewHatProposal,
  handleVoteCast,
  handleWinner,
  handleProposalExecuted
} from "../src/hybrid-voting";
import {
  createInitializedEvent,
  createExecutorUpdatedEvent,
  createQuorumSetEvent,
  createHatSetEvent,
  createHatToggledEvent,
  createTargetAllowedEvent,
  createNewProposalEvent,
  createNewHatProposalEvent,
  createVoteCastEvent,
  createWinnerEvent,
  createProposalExecutedEvent
} from "./hybrid-voting-utils";
import { Organization, HybridVotingContract, TaskManager } from "../generated/schema";

/**
 * Helper function to create necessary entities for hybrid voting tests.
 * Creates an Organization, TaskManager, and HybridVotingContract entity.
 */
function setupHybridVotingContract(contractAddress: Address): void {
  // Create Organization entity
  let orgId = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
  );
  let organization = new Organization(orgId);
  organization.orgId = orgId;
  organization.executor = Address.fromString("0x0000000000000000000000000000000000000001");
  organization.directDemocracyVoting = Address.fromString("0x0000000000000000000000000000000000000003");
  organization.quickJoin = Address.fromString("0x0000000000000000000000000000000000000004");
  organization.participationToken = Address.fromString("0x0000000000000000000000000000000000000005");
  organization.educationHub = Address.fromString("0x0000000000000000000000000000000000000007");
  organization.paymentManager = Address.fromString("0x0000000000000000000000000000000000000008");
  organization.deployedAt = BigInt.fromI32(1000);
  organization.deployedAtBlock = BigInt.fromI32(100);
  organization.transactionHash = Bytes.fromHexString("0xabcd");

  // Create TaskManager entity (required by Organization schema)
  let taskManagerAddress = Address.fromString("0x0000000000000000000000000000000000000006");
  let taskManager = new TaskManager(taskManagerAddress);
  taskManager.organization = orgId;
  taskManager.createdAt = BigInt.fromI32(1000);
  taskManager.createdAtBlock = BigInt.fromI32(100);
  taskManager.transactionHash = Bytes.fromHexString("0xabcd");

  // Create HybridVotingContract entity
  let hybridVoting = new HybridVotingContract(contractAddress);
  hybridVoting.organization = orgId;
  hybridVoting.executor = Address.zero();
  hybridVoting.quorum = 0;
  hybridVoting.hats = Address.zero();
  hybridVoting.createdAt = BigInt.fromI32(1000);
  hybridVoting.createdAtBlock = BigInt.fromI32(100);

  // Link organization to entities
  organization.taskManager = taskManagerAddress;
  organization.hybridVoting = contractAddress;

  // Save entities
  taskManager.save();
  hybridVoting.save();
  organization.save();
}

describe("HybridVoting", () => {
  afterEach(() => {
    clearStore();
  });

  describe("Initialized", () => {
    test("HybridVotingContract exists after initialization", () => {
      let version = BigInt.fromI32(1);
      let event = createInitializedEvent(version);

      // Setup contract first (simulating OrgDeployed)
      setupHybridVotingContract(event.address);

      handleInitialized(event);

      assert.entityCount("HybridVotingContract", 1);

      // Verify contract still exists with default values
      let contractId = event.address.toHexString();
      assert.fieldEquals(
        "HybridVotingContract",
        contractId,
        "executor",
        "0x0000000000000000000000000000000000000000"
      );
      assert.fieldEquals("HybridVotingContract", contractId, "quorum", "0");
    });
  });

  describe("ExecutorUpdated", () => {
    test("Executor updated and historical record created", () => {
      let newExecutor = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let event = createExecutorUpdatedEvent(newExecutor);

      // Setup contract first (simulating OrgDeployed)
      setupHybridVotingContract(event.address);

      // Update the executor
      handleExecutorUpdated(event);

      // Verify contract was updated
      let contractId = event.address.toHexString();
      assert.fieldEquals(
        "HybridVotingContract",
        contractId,
        "executor",
        "0x0000000000000000000000000000000000000001"
      );

      // Verify historical record was created
      assert.entityCount("HybridVotingExecutorChange", 1);
    });

    test("Executor update skips if contract doesn't exist", () => {
      let newExecutor = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let event = createExecutorUpdatedEvent(newExecutor);
      handleExecutorUpdated(event);

      // Verify contract was NOT created (edge case handling)
      assert.entityCount("HybridVotingContract", 0);
      assert.entityCount("HybridVotingExecutorChange", 0);
    });

    test("Multiple executor updates tracked historically", () => {
      let executor1 = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let event1 = createExecutorUpdatedEvent(executor1);
      event1.logIndex = BigInt.fromI32(1);

      // Setup contract first (simulating OrgDeployed)
      setupHybridVotingContract(event1.address);

      // First update
      handleExecutorUpdated(event1);

      // Second update
      let executor2 = Address.fromString(
        "0x0000000000000000000000000000000000000002"
      );
      let event2 = createExecutorUpdatedEvent(executor2);
      event2.logIndex = BigInt.fromI32(2);
      handleExecutorUpdated(event2);

      // Verify both changes are tracked
      assert.entityCount("HybridVotingExecutorChange", 2);

      // Verify current executor is the latest
      let contractId = event1.address.toHexString();
      assert.fieldEquals(
        "HybridVotingContract",
        contractId,
        "executor",
        "0x0000000000000000000000000000000000000002"
      );
    });
  });

  describe("QuorumSet", () => {
    test("Quorum set and historical record created", () => {
      let event = createQuorumSetEvent(51);

      // Setup contract first (simulating OrgDeployed)
      setupHybridVotingContract(event.address);

      handleQuorumSet(event);

      let contractId = event.address.toHexString();
      assert.fieldEquals("HybridVotingContract", contractId, "quorum", "51");
      assert.entityCount("HybridVotingQuorumChange", 1);
    });

    test("Quorum change skips if contract doesn't exist", () => {
      let event = createQuorumSetEvent(51);
      handleQuorumSet(event);

      // Verify contract was NOT created (edge case handling)
      assert.entityCount("HybridVotingContract", 0);
      assert.entityCount("HybridVotingQuorumChange", 0);
    });

    test("Multiple quorum changes tracked historically", () => {
      let event1 = createQuorumSetEvent(51);
      event1.logIndex = BigInt.fromI32(1);

      // Setup contract first (simulating OrgDeployed)
      setupHybridVotingContract(event1.address);

      handleQuorumSet(event1);

      let event2 = createQuorumSetEvent(60);
      event2.logIndex = BigInt.fromI32(2);
      handleQuorumSet(event2);

      assert.entityCount("HybridVotingQuorumChange", 2);

      let contractId = event1.address.toHexString();
      assert.fieldEquals("HybridVotingContract", contractId, "quorum", "60");
    });
  });

  describe("HatSet", () => {
    test("Hat permission created with type", () => {
      let event = createHatSetEvent(0, BigInt.fromI32(1), true);
      handleHatSet(event);

      assert.entityCount("HybridVotingHatPermission", 1);

      let permissionId = event.address.toHexString() + "-1";
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "hatId",
        "1"
      );
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "allowed",
        "true"
      );
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "hatType",
        "0"
      );
    });

    test("Hat permission can be updated", () => {
      // Create permission
      let event1 = createHatSetEvent(0, BigInt.fromI32(1), true);
      handleHatSet(event1);

      // Update permission
      let event2 = createHatSetEvent(1, BigInt.fromI32(1), false);
      handleHatSet(event2);

      // Should still be only 1 entity
      assert.entityCount("HybridVotingHatPermission", 1);

      let permissionId = event1.address.toHexString() + "-1";
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "allowed",
        "false"
      );
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "hatType",
        "1"
      );
    });
  });

  describe("HatToggled", () => {
    test("Hat permission created without type", () => {
      let event = createHatToggledEvent(BigInt.fromI32(1), true);
      handleHatToggled(event);

      assert.entityCount("HybridVotingHatPermission", 1);

      let permissionId = event.address.toHexString() + "-1";
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "allowed",
        "true"
      );
    });

    test("Hat permission can be toggled", () => {
      let event1 = createHatToggledEvent(BigInt.fromI32(1), true);
      handleHatToggled(event1);

      let event2 = createHatToggledEvent(BigInt.fromI32(1), false);
      handleHatToggled(event2);

      assert.entityCount("HybridVotingHatPermission", 1);

      let permissionId = event1.address.toHexString() + "-1";
      assert.fieldEquals(
        "HybridVotingHatPermission",
        permissionId,
        "allowed",
        "false"
      );
    });
  });

  describe("TargetAllowed", () => {
    test("Target permission created", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let event = createTargetAllowedEvent(target, true);
      handleTargetAllowed(event);

      assert.entityCount("HybridVotingTargetPermission", 1);

      let permissionId =
        event.address.toHexString() +
        "-0x0000000000000000000000000000000000000001";
      assert.fieldEquals(
        "HybridVotingTargetPermission",
        permissionId,
        "allowed",
        "true"
      );
    });

    test("Target permission can be updated", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );

      let event1 = createTargetAllowedEvent(target, true);
      handleTargetAllowed(event1);

      let event2 = createTargetAllowedEvent(target, false);
      handleTargetAllowed(event2);

      assert.entityCount("HybridVotingTargetPermission", 1);

      let permissionId =
        event1.address.toHexString() +
        "-0x0000000000000000000000000000000000000001";
      assert.fieldEquals(
        "HybridVotingTargetPermission",
        permissionId,
        "allowed",
        "false"
      );
    });

    test("Multiple targets can be tracked", () => {
      let target1 = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let target2 = Address.fromString(
        "0x0000000000000000000000000000000000000002"
      );

      let event1 = createTargetAllowedEvent(target1, true);
      handleTargetAllowed(event1);

      let event2 = createTargetAllowedEvent(target2, true);
      handleTargetAllowed(event2);

      assert.entityCount("HybridVotingTargetPermission", 2);
    });
  });

  describe("Proposals", () => {
    test("NewProposal creates unrestricted proposal", () => {
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");
      let metadata = Bytes.fromHexString("0xabcd");
      let numOptions = 3;
      let endTs = 1700000000 as i64;
      let created = 1699900000 as i64;

      let event = createNewProposalEvent(
        proposalId,
        creator,
        metadata,
        numOptions,
        endTs,
        created,
        true
      );

      handleNewProposal(event);

      assert.entityCount("Proposal", 1);

      let proposalEntityId = event.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "proposalId", "1");
      assert.fieldEquals("Proposal", proposalEntityId, "creator", creator.toHexString());
      assert.fieldEquals("Proposal", proposalEntityId, "numOptions", "3");
      assert.fieldEquals("Proposal", proposalEntityId, "isHatRestricted", "false");
      assert.fieldEquals("Proposal", proposalEntityId, "hasExecutionBatches", "true");
      assert.fieldEquals("Proposal", proposalEntityId, "status", "Active");
      assert.fieldEquals("Proposal", proposalEntityId, "wasExecuted", "false");
    });

    test("NewHatProposal creates hat-restricted proposal", () => {
      let proposalId = BigInt.fromI32(2);
      let creator = Address.fromString("0x0000000000000000000000000000000000000002");
      let metadata = Bytes.fromHexString("0x1234");
      let numOptions = 2;
      let endTs = 1700000000 as i64;
      let created = 1699900000 as i64;
      let hatIds = [BigInt.fromI32(100), BigInt.fromI32(200)];

      let event = createNewHatProposalEvent(
        proposalId,
        creator,
        metadata,
        numOptions,
        endTs,
        created,
        hatIds,
        false
      );

      handleNewHatProposal(event);

      assert.entityCount("Proposal", 1);

      let proposalEntityId = event.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "isHatRestricted", "true");
      assert.fieldEquals("Proposal", proposalEntityId, "hasExecutionBatches", "false");
      assert.fieldEquals("Proposal", proposalEntityId, "numOptions", "2");
    });

    test("VoteCast records a vote on proposal", () => {
      // First create a proposal
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");
      let metadata = Bytes.fromHexString("0xabcd");

      let proposalEvent = createNewProposalEvent(
        proposalId,
        creator,
        metadata,
        3,
        1700000000 as i64,
        1699900000 as i64,
        true
      );
      handleNewProposal(proposalEvent);

      // Cast a vote
      let voter = Address.fromString("0x0000000000000000000000000000000000000003");
      let idxs = [0, 1];
      let weights = [60, 40];
      let classRawPowers = [BigInt.fromI32(1000), BigInt.fromI32(500)];
      let timestamp = 1699950000 as i64;

      let voteEvent = createVoteCastEvent(
        proposalId,
        voter,
        idxs,
        weights,
        classRawPowers,
        timestamp
      );

      handleVoteCast(voteEvent);

      assert.entityCount("Vote", 1);

      let voteId = voteEvent.address.toHexString() + "-" + proposalId.toString() + "-" + voter.toHexString();
      assert.fieldEquals("Vote", voteId, "voter", voter.toHexString());
    });

    test("Winner event updates proposal status to Ended", () => {
      // Create proposal
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");

      let proposalEvent = createNewProposalEvent(
        proposalId,
        creator,
        Bytes.fromHexString("0xabcd"),
        3,
        1700000000 as i64,
        1699900000 as i64,
        true
      );
      handleNewProposal(proposalEvent);

      // Announce winner
      let winningIdx = BigInt.fromI32(1);
      let winnerEvent = createWinnerEvent(
        proposalId,
        winningIdx,
        true,
        false,
        1700000100 as i64
      );

      handleWinner(winnerEvent);

      let proposalEntityId = winnerEvent.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "winningOption", "1");
      assert.fieldEquals("Proposal", proposalEntityId, "isValid", "true");
      assert.fieldEquals("Proposal", proposalEntityId, "status", "Ended");
      assert.fieldEquals("Proposal", proposalEntityId, "wasExecuted", "false");
    });

    test("Winner event with executed=true updates status to Executed", () => {
      // Create proposal
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");

      let proposalEvent = createNewProposalEvent(
        proposalId,
        creator,
        Bytes.fromHexString("0xabcd"),
        3,
        1700000000 as i64,
        1699900000 as i64,
        true
      );
      handleNewProposal(proposalEvent);

      // Announce winner with executed=true
      let winningIdx = BigInt.fromI32(2);
      let winnerEvent = createWinnerEvent(
        proposalId,
        winningIdx,
        true,
        true,
        1700000100 as i64
      );

      handleWinner(winnerEvent);

      let proposalEntityId = winnerEvent.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "status", "Executed");
      assert.fieldEquals("Proposal", proposalEntityId, "wasExecuted", "true");
    });

    test("ProposalExecuted marks proposal as executed", () => {
      // Create proposal
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");

      let proposalEvent = createNewProposalEvent(
        proposalId,
        creator,
        Bytes.fromHexString("0xabcd"),
        3,
        1700000000 as i64,
        1699900000 as i64,
        true
      );
      handleNewProposal(proposalEvent);

      // Execute proposal
      let winningIdx = BigInt.fromI32(0);
      let numCalls = BigInt.fromI32(5);
      let executeEvent = createProposalExecutedEvent(
        proposalId,
        winningIdx,
        numCalls
      );

      handleProposalExecuted(executeEvent);

      let proposalEntityId = executeEvent.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "wasExecuted", "true");
      assert.fieldEquals("Proposal", proposalEntityId, "status", "Executed");
      assert.fieldEquals("Proposal", proposalEntityId, "executedCallsCount", "5");
    });

    test("Full proposal lifecycle", () => {
      let proposalId = BigInt.fromI32(1);
      let creator = Address.fromString("0x0000000000000000000000000000000000000001");
      let voter1 = Address.fromString("0x0000000000000000000000000000000000000002");
      let voter2 = Address.fromString("0x0000000000000000000000000000000000000003");

      // 1. Create proposal
      let proposalEvent = createNewProposalEvent(
        proposalId,
        creator,
        Bytes.fromHexString("0xabcd"),
        3,
        1700000000 as i64,
        1699900000 as i64,
        true
      );
      handleNewProposal(proposalEvent);

      let proposalEntityId = proposalEvent.address.toHexString() + "-" + proposalId.toString();
      assert.fieldEquals("Proposal", proposalEntityId, "status", "Active");

      // 2. Cast votes
      let vote1 = createVoteCastEvent(
        proposalId,
        voter1,
        [0, 1],
        [70, 30],
        [BigInt.fromI32(1000)],
        1699950000 as i64
      );
      handleVoteCast(vote1);

      let vote2 = createVoteCastEvent(
        proposalId,
        voter2,
        [1],
        [100],
        [BigInt.fromI32(500)],
        1699960000 as i64
      );
      handleVoteCast(vote2);

      assert.entityCount("Vote", 2);

      // 3. Announce winner
      let winnerEvent = createWinnerEvent(
        proposalId,
        BigInt.fromI32(1),
        true,
        false,
        1700000100 as i64
      );
      handleWinner(winnerEvent);

      assert.fieldEquals("Proposal", proposalEntityId, "status", "Ended");
      assert.fieldEquals("Proposal", proposalEntityId, "winningOption", "1");

      // 4. Execute proposal
      let executeEvent = createProposalExecutedEvent(
        proposalId,
        BigInt.fromI32(1),
        BigInt.fromI32(3)
      );
      handleProposalExecuted(executeEvent);

      assert.fieldEquals("Proposal", proposalEntityId, "status", "Executed");
      assert.fieldEquals("Proposal", proposalEntityId, "wasExecuted", "true");
      assert.fieldEquals("Proposal", proposalEntityId, "executedCallsCount", "3");
    });
  });
});
