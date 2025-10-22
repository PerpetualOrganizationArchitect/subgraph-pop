import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes } from "@graphprotocol/graph-ts";
import { handleOrgDeployed } from "../src/org-deployer";
import { createOrgDeployedEvent } from "./org-deployer-utils";

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

    let orgDeployedEvent = createOrgDeployedEvent(
      orgId,
      executor,
      hybridVoting,
      directDemocracyVoting,
      quickJoin,
      participationToken,
      taskManager,
      educationHub,
      paymentManager
    );

    handleOrgDeployed(orgDeployedEvent);

    // Verify Organization, TaskManager, and HybridVotingContract entities are created
    assert.entityCount("Organization", 1);
    assert.entityCount("TaskManager", 1);
    assert.entityCount("HybridVotingContract", 1);

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
  });
});
