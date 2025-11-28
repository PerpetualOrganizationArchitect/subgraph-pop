import {
  assert,
  describe,
  test,
  clearStore,
  beforeEach,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleProjectCreated,
  handleTaskCreated,
  handleTaskAssigned,
  handleTaskCompleted
} from "../src/task-manager";
import {
  createProjectCreatedEvent,
  createTaskCreatedEvent,
  createTaskAssignedEvent,
  createTaskCompletedEvent
} from "./task-manager-utils";
import { Organization, TaskManager, HybridVotingContract, DirectDemocracyVotingContract, EligibilityModuleContract, ParticipationTokenContract, QuickJoinContract, EducationHubContract, PaymentManagerContract } from "../generated/schema";

/**
 * Helper function to create necessary entities for task manager tests.
 * Creates an Organization and TaskManager entity since Projects require
 * a TaskManager entity to exist.
 */
function setupTaskManagerEntities(): void {
  // Create Organization entity
  let orgId = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
  );
  let organization = new Organization(orgId);
  organization.orgId = orgId;
  organization.executor = Address.fromString("0x0000000000000000000000000000000000000001");
  organization.quickJoin = Address.fromString("0x0000000000000000000000000000000000000004");
  organization.participationToken = Address.fromString("0x0000000000000000000000000000000000000005");
  organization.educationHub = Address.fromString("0x0000000000000000000000000000000000000007");
  organization.paymentManager = Address.fromString("0x0000000000000000000000000000000000000008");
  organization.toggleModule = Address.fromString("0x000000000000000000000000000000000000000a");
  organization.topHatId = BigInt.fromI32(1000);
  organization.roleHatIds = [BigInt.fromI32(1001), BigInt.fromI32(1002)];
  organization.deployedAt = BigInt.fromI32(1000);
  organization.deployedAtBlock = BigInt.fromI32(100);
  organization.transactionHash = Bytes.fromHexString("0xabcd");

  // Create TaskManager entity with the default mock event address
  let taskManagerAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a");
  let taskManager = new TaskManager(taskManagerAddress);
  taskManager.organization = orgId;
  taskManager.createdAt = BigInt.fromI32(1000);
  taskManager.createdAtBlock = BigInt.fromI32(100);
  taskManager.transactionHash = Bytes.fromHexString("0xabcd");

  // Create HybridVotingContract entity (required by Organization schema)
  let hybridVotingAddress = Address.fromString("0x0000000000000000000000000000000000000002");
  let hybridVoting = new HybridVotingContract(hybridVotingAddress);
  hybridVoting.organization = orgId;
  hybridVoting.executor = Address.zero();
  hybridVoting.quorum = 0;
  hybridVoting.hats = Address.zero();
  hybridVoting.createdAt = BigInt.fromI32(1000);
  hybridVoting.createdAtBlock = BigInt.fromI32(100);

  // Create DirectDemocracyVotingContract entity (required by Organization schema)
  let ddvAddress = Address.fromString("0x0000000000000000000000000000000000000003");
  let ddv = new DirectDemocracyVotingContract(ddvAddress);
  ddv.organization = orgId;
  ddv.executor = Address.zero();
  ddv.quorumPercentage = 0;
  ddv.hats = Address.zero();
  ddv.createdAt = BigInt.fromI32(1000);
  ddv.createdAtBlock = BigInt.fromI32(100);

  // Create EligibilityModuleContract entity (required by Organization schema)
  let eligibilityModuleAddress = Address.fromString("0x0000000000000000000000000000000000000009");
  let eligibilityModule = new EligibilityModuleContract(eligibilityModuleAddress);
  eligibilityModule.organization = orgId;
  eligibilityModule.superAdmin = Address.zero();
  eligibilityModule.hatsContract = Address.zero();
  eligibilityModule.toggleModule = Address.fromString("0x000000000000000000000000000000000000000a");
  eligibilityModule.isPaused = false;
  eligibilityModule.createdAt = BigInt.fromI32(1000);
  eligibilityModule.createdAtBlock = BigInt.fromI32(100);

  // Create ParticipationTokenContract entity (required by Organization schema)
  let participationTokenAddress = Address.fromString("0x0000000000000000000000000000000000000005");
  let participationToken = new ParticipationTokenContract(participationTokenAddress);
  participationToken.organization = orgId;
  participationToken.name = "Test Token";
  participationToken.symbol = "TEST";
  participationToken.totalSupply = BigInt.fromI32(0);
  participationToken.executor = Address.zero();
  participationToken.hatsContract = Address.zero();
  participationToken.createdAt = BigInt.fromI32(1000);
  participationToken.createdAtBlock = BigInt.fromI32(100);

  // Create QuickJoinContract entity (required by Organization schema)
  let quickJoinAddress = Address.fromString("0x0000000000000000000000000000000000000004");
  let quickJoin = new QuickJoinContract(quickJoinAddress);
  quickJoin.organization = orgId;
  quickJoin.executor = Address.zero();
  quickJoin.hatsContract = Address.zero();
  quickJoin.accountRegistry = Address.zero();
  quickJoin.masterDeployAddress = Address.zero();
  quickJoin.createdAt = BigInt.fromI32(1000);
  quickJoin.createdAtBlock = BigInt.fromI32(100);

  // Create EducationHubContract entity (required by Organization schema)
  let educationHubAddress = Address.fromString("0x0000000000000000000000000000000000000007");
  let educationHub = new EducationHubContract(educationHubAddress);
  educationHub.organization = orgId;
  educationHub.token = Address.zero();
  educationHub.hatsContract = Address.zero();
  educationHub.executor = Address.zero();
  educationHub.isPaused = false;
  educationHub.nextModuleId = BigInt.fromI32(0);
  educationHub.createdAt = BigInt.fromI32(1000);
  educationHub.createdAtBlock = BigInt.fromI32(100);

  // Create PaymentManagerContract entity (required by Organization schema)
  let paymentManagerAddress = Address.fromString("0x0000000000000000000000000000000000000008");
  let paymentManager = new PaymentManagerContract(paymentManagerAddress);
  paymentManager.organization = orgId;
  paymentManager.owner = Address.zero();
  paymentManager.revenueShareToken = Address.zero();
  paymentManager.distributionCounter = BigInt.fromI32(0);
  paymentManager.createdAt = BigInt.fromI32(1000);
  paymentManager.createdAtBlock = BigInt.fromI32(100);

  // Set the relationships
  organization.taskManager = taskManagerAddress;
  organization.hybridVoting = hybridVotingAddress;
  organization.directDemocracyVoting = ddvAddress;
  organization.eligibilityModule = eligibilityModuleAddress;
  organization.participationToken = participationTokenAddress;
  organization.quickJoin = quickJoinAddress;
  organization.educationHub = educationHubAddress;
  organization.paymentManager = paymentManagerAddress;

  // Save entities
  taskManager.save();
  hybridVoting.save();
  ddv.save();
  eligibilityModule.save();
  participationToken.save();
  quickJoin.save();
  educationHub.save();
  paymentManager.save();
  organization.save();
}

describe("TaskManager", () => {
  afterEach(() => {
    clearStore();
  });

  test("Project created and stored", () => {
    // Setup Organization and TaskManager entities first
    setupTaskManagerEntities();

    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let metadata = Bytes.fromHexString("0xabcd");
    let cap = BigInt.fromI32(1000);

    let event = createProjectCreatedEvent(projectId, metadata, cap);
    handleProjectCreated(event);

    assert.entityCount("Project", 1);
    assert.fieldEquals(
      "Project",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "cap",
      "1000"
    );
    assert.fieldEquals(
      "Project",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "deleted",
      "false"
    );
    // Verify Project links to TaskManager entity
    assert.fieldEquals(
      "Project",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "taskManager",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a"
    );
  });

  test("Task created and stored", () => {
    // Setup Organization and TaskManager entities first
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let projectMetadata = Bytes.fromHexString("0xabcd");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectMetadata, cap);
    handleProjectCreated(projectEvent);

    // Now create a task
    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let metadata = Bytes.fromHexString("0x1234");

    let event = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      true,
      metadata
    );
    handleTaskCreated(event);

    assert.entityCount("Task", 1);
    // Task ID is formatted as taskManager-taskId
    let expectedId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1";
    assert.fieldEquals("Task", expectedId, "taskId", "1");
    assert.fieldEquals("Task", expectedId, "payout", "100");
    assert.fieldEquals("Task", expectedId, "status", "Open");
    assert.fieldEquals("Task", expectedId, "requiresApplication", "true");
  });

  test("Task assigned updates status", () => {
    // Setup Organization and TaskManager entities first
    setupTaskManagerEntities();

    // Create project and task
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let projectMetadata = Bytes.fromHexString("0xabcd");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectMetadata, cap);
    handleProjectCreated(projectEvent);

    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let metadata = Bytes.fromHexString("0x1234");

    let createEvent = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      false,
      metadata
    );
    handleTaskCreated(createEvent);

    // Assign the task
    let assignee = Address.fromString("0x0000000000000000000000000000000000000002");
    let assigner = Address.fromString("0x0000000000000000000000000000000000000003");
    let assignEvent = createTaskAssignedEvent(taskId, assignee, assigner);
    handleTaskAssigned(assignEvent);

    let expectedId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1";
    assert.fieldEquals("Task", expectedId, "status", "Assigned");
    assert.fieldEquals(
      "Task",
      expectedId,
      "assignee",
      "0x0000000000000000000000000000000000000002"
    );
  });

  test("Task completed updates status", () => {
    // Setup Organization and TaskManager entities first
    setupTaskManagerEntities();

    // Create project and task
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let projectMetadata = Bytes.fromHexString("0xabcd");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectMetadata, cap);
    handleProjectCreated(projectEvent);

    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let metadata = Bytes.fromHexString("0x1234");

    let createEvent = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      false,
      metadata
    );
    handleTaskCreated(createEvent);

    // Complete the task
    let completer = Address.fromString("0x0000000000000000000000000000000000000002");
    let completeEvent = createTaskCompletedEvent(taskId, completer);
    handleTaskCompleted(completeEvent);

    let expectedId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1";
    assert.fieldEquals("Task", expectedId, "status", "Completed");
  });
});
