import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { handleOrgDeployed } from "../src/org-deployer";
import { createOrgDeployedEvent } from "./org-deployer-utils";

// Tests for OrgDeployer event handlers
describe("OrgDeployer", () => {
  afterEach(() => {
    clearStore();
  });

  test("Organization created and stored with all component addresses", () => {
    let orgId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let executor = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let hybridVoting = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let directDemocracyVoting = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );
    let quickJoin = Address.fromString(
      "0x0000000000000000000000000000000000000004"
    );
    let participationToken = Address.fromString(
      "0x0000000000000000000000000000000000000005"
    );
    let taskManager = Address.fromString(
      "0x0000000000000000000000000000000000000006"
    );
    let educationHub = Address.fromString(
      "0x0000000000000000000000000000000000000007"
    );
    let paymentManager = Address.fromString(
      "0x0000000000000000000000000000000000000008"
    );
    let eligibilityModule = Address.fromString(
      "0x0000000000000000000000000000000000000009"
    );
    let toggleModule = Address.fromString(
      "0x000000000000000000000000000000000000000a"
    );
    let topHatId = BigInt.fromI32(1000);
    let roleHatIds = [BigInt.fromI32(1001), BigInt.fromI32(1002), BigInt.fromI32(1003)];

    let orgDeployedEvent = createOrgDeployedEvent(
      orgId,
      executor,
      hybridVoting,
      directDemocracyVoting,
      quickJoin,
      participationToken,
      taskManager,
      educationHub,
      paymentManager,
      eligibilityModule,
      toggleModule,
      topHatId,
      roleHatIds
    );

    handleOrgDeployed(orgDeployedEvent);

    // Verify Organization, TaskManager, HybridVotingContract, DirectDemocracyVotingContract, EligibilityModuleContract, ParticipationTokenContract, QuickJoinContract, EducationHubContract, and PaymentManagerContract entities are created
    assert.entityCount("Organization", 1);
    assert.entityCount("TaskManager", 1);
    assert.entityCount("HybridVotingContract", 1);
    assert.entityCount("DirectDemocracyVotingContract", 1);
    assert.entityCount("EligibilityModuleContract", 1);
    assert.entityCount("ParticipationTokenContract", 1);
    assert.entityCount("QuickJoinContract", 1);
    assert.entityCount("EducationHubContract", 1);
    assert.entityCount("PaymentManagerContract", 1);

    // Verify Organization fields
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "executor",
      "0x0000000000000000000000000000000000000001"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "hybridVoting",
      "0x0000000000000000000000000000000000000002"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "directDemocracyVoting",
      "0x0000000000000000000000000000000000000003"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "quickJoin",
      "0x0000000000000000000000000000000000000004"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "participationToken",
      "0x0000000000000000000000000000000000000005"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "educationHub",
      "0x0000000000000000000000000000000000000007"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "paymentManager",
      "0x0000000000000000000000000000000000000008"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "eligibilityModule",
      "0x0000000000000000000000000000000000000009"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "toggleModule",
      "0x000000000000000000000000000000000000000a"
    );
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "topHatId",
      "1000"
    );

    // Verify Organization.taskManager links to TaskManager entity
    assert.fieldEquals(
      "Organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "taskManager",
      "0x0000000000000000000000000000000000000006"
    );

    // Verify TaskManager entity and its relationship back to Organization
    assert.fieldEquals(
      "TaskManager",
      "0x0000000000000000000000000000000000000006",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );

    // Verify HybridVotingContract entity and its relationship back to Organization
    assert.fieldEquals(
      "HybridVotingContract",
      "0x0000000000000000000000000000000000000002",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );

    // Verify DirectDemocracyVotingContract entity and its relationship back to Organization
    assert.fieldEquals(
      "DirectDemocracyVotingContract",
      "0x0000000000000000000000000000000000000003",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );

    // Verify EligibilityModuleContract entity and its relationship back to Organization
    assert.fieldEquals(
      "EligibilityModuleContract",
      "0x0000000000000000000000000000000000000009",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "EligibilityModuleContract",
      "0x0000000000000000000000000000000000000009",
      "isPaused",
      "false"
    );

    // Verify ParticipationTokenContract entity and its relationship back to Organization
    assert.fieldEquals(
      "ParticipationTokenContract",
      "0x0000000000000000000000000000000000000005",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "ParticipationTokenContract",
      "0x0000000000000000000000000000000000000005",
      "totalSupply",
      "0"
    );

    // Verify QuickJoinContract entity and its relationship back to Organization
    assert.fieldEquals(
      "QuickJoinContract",
      "0x0000000000000000000000000000000000000004",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "QuickJoinContract",
      "0x0000000000000000000000000000000000000004",
      "executor",
      "0x0000000000000000000000000000000000000000"
    );

    // Verify EducationHubContract entity and its relationship back to Organization
    assert.fieldEquals(
      "EducationHubContract",
      "0x0000000000000000000000000000000000000007",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "EducationHubContract",
      "0x0000000000000000000000000000000000000007",
      "isPaused",
      "false"
    );
    assert.fieldEquals(
      "EducationHubContract",
      "0x0000000000000000000000000000000000000007",
      "nextModuleId",
      "0"
    );

    // Verify PaymentManagerContract entity and its relationship back to Organization
    assert.fieldEquals(
      "PaymentManagerContract",
      "0x0000000000000000000000000000000000000008",
      "organization",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "PaymentManagerContract",
      "0x0000000000000000000000000000000000000008",
      "distributionCounter",
      "0"
    );
  });
});
