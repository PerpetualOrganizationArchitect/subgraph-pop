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
  handleTaskCompleted,
  handleProjectCapUpdated,
  handleProjectManagerUpdated,
  handleProjectRolePermSet,
  handleBountyCapSet
} from "../src/task-manager";
import {
  createProjectCreatedEvent,
  createTaskCreatedEvent,
  createTaskAssignedEvent,
  createTaskCompletedEvent,
  createProjectCapUpdatedEvent,
  createProjectManagerUpdatedEvent,
  createProjectRolePermSetEvent,
  createBountyCapSetEvent
} from "./task-manager-utils";
import { Organization, TaskManager, HybridVotingContract, DirectDemocracyVotingContract, EligibilityModuleContract, ParticipationTokenContract, QuickJoinContract, EducationHubContract, PaymentManagerContract, ExecutorContract, ToggleModuleContract } from "../generated/schema";

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
  organization.topHatId = BigInt.fromI32(1000);
  organization.roleHatIds = [BigInt.fromI32(1001), BigInt.fromI32(1002)];
  organization.deployedAt = BigInt.fromI32(1000);
  organization.deployedAtBlock = BigInt.fromI32(100);
  organization.transactionHash = Bytes.fromHexString("0xabcd");

  // Create ExecutorContract entity
  let executorAddress = Address.fromString("0x0000000000000000000000000000000000000001");
  let executor = new ExecutorContract(executorAddress);
  executor.organization = orgId;
  executor.owner = Address.zero();
  executor.allowedCaller = null;
  executor.hatsContract = Address.zero();
  executor.isPaused = false;
  executor.createdAt = BigInt.fromI32(1000);
  executor.createdAtBlock = BigInt.fromI32(100);

  // Create ToggleModuleContract entity
  let toggleModuleAddress = Address.fromString("0x000000000000000000000000000000000000000a");
  let toggleModule = new ToggleModuleContract(toggleModuleAddress);
  toggleModule.organization = orgId;
  toggleModule.admin = Address.zero();
  toggleModule.createdAt = BigInt.fromI32(1000);
  toggleModule.createdAtBlock = BigInt.fromI32(100);

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
  organization.executorContract = executorAddress;
  organization.toggleModuleContract = toggleModuleAddress;
  organization.taskManager = taskManagerAddress;
  organization.hybridVoting = hybridVotingAddress;
  organization.directDemocracyVoting = ddvAddress;
  organization.eligibilityModule = eligibilityModuleAddress;
  organization.participationToken = participationTokenAddress;
  organization.quickJoin = quickJoinAddress;
  organization.educationHub = educationHubAddress;
  organization.paymentManager = paymentManagerAddress;

  // Save entities
  executor.save();
  toggleModule.save();
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
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);

    let event = createProjectCreatedEvent(projectId, title, metadataHash, cap);
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
    let projectTitle = Bytes.fromHexString("0xabcd");
    let projectMetadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectTitle, projectMetadataHash, cap);
    handleProjectCreated(projectEvent);

    // Now create a task
    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let title = Bytes.fromHexString("0x1234");

    let event = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      true,
      title
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
    let projectTitle = Bytes.fromHexString("0xabcd");
    let projectMetadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectTitle, projectMetadataHash, cap);
    handleProjectCreated(projectEvent);

    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let title = Bytes.fromHexString("0x1234");

    let createEvent = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      false,
      title
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
    let projectTitle = Bytes.fromHexString("0xabcd");
    let projectMetadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, projectTitle, projectMetadataHash, cap);
    handleProjectCreated(projectEvent);

    let taskId = BigInt.fromI32(1);
    let payout = BigInt.fromI32(100);
    let bountyToken = Address.fromString("0x0000000000000000000000000000000000000001");
    let bountyPayout = BigInt.fromI32(50);
    let title = Bytes.fromHexString("0x1234");

    let createEvent = createTaskCreatedEvent(
      taskId,
      projectId,
      payout,
      bountyToken,
      bountyPayout,
      false,
      title
    );
    handleTaskCreated(createEvent);

    // Complete the task
    let completer = Address.fromString("0x0000000000000000000000000000000000000002");
    let completeEvent = createTaskCompletedEvent(taskId, completer);
    handleTaskCompleted(completeEvent);

    let expectedId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1";
    assert.fieldEquals("Task", expectedId, "status", "Completed");
  });

  // ========================================
  // ProjectCapUpdated Tests
  // ========================================

  test("ProjectCapUpdated updates project cap and creates history", () => {
    setupTaskManagerEntities();

    // Create a project first
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let initialCap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, initialCap);
    handleProjectCreated(projectEvent);

    // Update the cap
    let oldCap = BigInt.fromI32(1000);
    let newCap = BigInt.fromI32(2000);
    let capUpdateEvent = createProjectCapUpdatedEvent(projectId, oldCap, newCap);
    handleProjectCapUpdated(capUpdateEvent);

    // Verify project cap was updated
    assert.fieldEquals(
      "Project",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      "cap",
      "2000"
    );

    // Verify history record was created
    assert.entityCount("ProjectCapChange", 1);
  });

  test("ProjectCapUpdated on non-existent project does not create history", () => {
    setupTaskManagerEntities();

    // Try to update cap on non-existent project
    let projectId = Bytes.fromHexString(
      "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
    );
    let oldCap = BigInt.fromI32(1000);
    let newCap = BigInt.fromI32(2000);
    let capUpdateEvent = createProjectCapUpdatedEvent(projectId, oldCap, newCap);
    handleProjectCapUpdated(capUpdateEvent);

    // No history should be created
    assert.entityCount("ProjectCapChange", 0);
  });

  // ========================================
  // ProjectManagerUpdated Tests
  // ========================================

  test("ProjectManagerUpdated adds a new manager", () => {
    setupTaskManagerEntities();

    // Create a project first
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Add a manager
    let managerAddress = Address.fromString("0x0000000000000000000000000000000000000099");
    let addManagerEvent = createProjectManagerUpdatedEvent(projectId, managerAddress, true);
    handleProjectManagerUpdated(addManagerEvent);

    // Verify manager entity was created
    assert.entityCount("ProjectManager", 1);
    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000099";
    assert.fieldEquals("ProjectManager", expectedId, "isActive", "true");
    assert.fieldEquals(
      "ProjectManager",
      expectedId,
      "manager",
      "0x0000000000000000000000000000000000000099"
    );
  });

  test("ProjectManagerUpdated removes a manager", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Add a manager
    let managerAddress = Address.fromString("0x0000000000000000000000000000000000000099");
    let addManagerEvent = createProjectManagerUpdatedEvent(projectId, managerAddress, true);
    handleProjectManagerUpdated(addManagerEvent);

    // Remove the manager
    let removeManagerEvent = createProjectManagerUpdatedEvent(projectId, managerAddress, false);
    handleProjectManagerUpdated(removeManagerEvent);

    // Verify manager is now inactive
    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000099";
    assert.fieldEquals("ProjectManager", expectedId, "isActive", "false");
  });

  // ========================================
  // ProjectRolePermSet Tests
  // ========================================

  test("ProjectRolePermSet creates permission with full permissions (mask=15)", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Set permissions with mask=15 (all permissions)
    let hatId = BigInt.fromI32(1001);
    let mask: i32 = 15; // 0b1111 = all permissions
    let permEvent = createProjectRolePermSetEvent(projectId, hatId, mask);
    handleProjectRolePermSet(permEvent);

    // Verify permission entity
    assert.entityCount("ProjectRolePermission", 1);
    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-1001";
    assert.fieldEquals("ProjectRolePermission", expectedId, "mask", "15");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canCreate", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canClaim", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canReview", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canAssign", "true");
  });

  test("ProjectRolePermSet creates permission with no permissions (mask=0)", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Set permissions with mask=0 (no permissions)
    let hatId = BigInt.fromI32(1002);
    let mask: i32 = 0;
    let permEvent = createProjectRolePermSetEvent(projectId, hatId, mask);
    handleProjectRolePermSet(permEvent);

    // Verify all permissions are false
    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-1002";
    assert.fieldEquals("ProjectRolePermission", expectedId, "mask", "0");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canCreate", "false");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canClaim", "false");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canReview", "false");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canAssign", "false");
  });

  test("ProjectRolePermSet decodes individual permission bits correctly", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Set permissions with mask=5 (canCreate=true, canReview=true)
    // 5 = 0b0101 = CREATE(1) + REVIEW(4)
    let hatId = BigInt.fromI32(1003);
    let mask: i32 = 5;
    let permEvent = createProjectRolePermSetEvent(projectId, hatId, mask);
    handleProjectRolePermSet(permEvent);

    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-1003";
    assert.fieldEquals("ProjectRolePermission", expectedId, "mask", "5");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canCreate", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canClaim", "false");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canReview", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canAssign", "false");
  });

  test("ProjectRolePermSet updates existing permission", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    let hatId = BigInt.fromI32(1004);

    // First set mask=1 (only create)
    let permEvent1 = createProjectRolePermSetEvent(projectId, hatId, 1);
    handleProjectRolePermSet(permEvent1);

    // Then update to mask=15 (all permissions)
    let permEvent2 = createProjectRolePermSetEvent(projectId, hatId, 15);
    handleProjectRolePermSet(permEvent2);

    // Should still have only 1 entity, but with updated values
    assert.entityCount("ProjectRolePermission", 1);
    let expectedId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-1004";
    assert.fieldEquals("ProjectRolePermission", expectedId, "mask", "15");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canCreate", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canClaim", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canReview", "true");
    assert.fieldEquals("ProjectRolePermission", expectedId, "canAssign", "true");
  });

  // ========================================
  // BountyCapSet Tests
  // ========================================

  test("BountyCapSet creates bounty cap and history", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Set bounty cap
    let token = Address.fromString("0x0000000000000000000000000000000000000088");
    let oldCap = BigInt.fromI32(0);
    let newCap = BigInt.fromI32(5000);
    let bountyCapEvent = createBountyCapSetEvent(projectId, token, oldCap, newCap);
    handleBountyCapSet(bountyCapEvent);

    // Verify ProjectBountyCap entity
    assert.entityCount("ProjectBountyCap", 1);
    let expectedCapId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000088";
    assert.fieldEquals("ProjectBountyCap", expectedCapId, "cap", "5000");
    assert.fieldEquals(
      "ProjectBountyCap",
      expectedCapId,
      "token",
      "0x0000000000000000000000000000000000000088"
    );

    // Verify BountyCapChange history
    assert.entityCount("BountyCapChange", 1);
  });

  test("BountyCapSet creates separate entities for different tokens", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    // Set bounty cap for token 1
    let token1 = Address.fromString("0x0000000000000000000000000000000000000088");
    let bountyCapEvent1 = createBountyCapSetEvent(
      projectId,
      token1,
      BigInt.fromI32(0),
      BigInt.fromI32(5000)
    );
    handleBountyCapSet(bountyCapEvent1);

    // Set bounty cap for token 2
    let token2 = Address.fromString("0x0000000000000000000000000000000000000099");
    let bountyCapEvent2 = createBountyCapSetEvent(
      projectId,
      token2,
      BigInt.fromI32(0),
      BigInt.fromI32(10000)
    );
    handleBountyCapSet(bountyCapEvent2);

    // Should have 2 ProjectBountyCap entities
    assert.entityCount("ProjectBountyCap", 2);

    // Verify each cap
    let expectedCapId1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000088";
    let expectedCapId2 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000099";
    assert.fieldEquals("ProjectBountyCap", expectedCapId1, "cap", "5000");
    assert.fieldEquals("ProjectBountyCap", expectedCapId2, "cap", "10000");
  });

  test("BountyCapSet updates existing cap and creates new history", () => {
    setupTaskManagerEntities();

    // Create a project
    let projectId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let title = Bytes.fromHexString("0xabcd");
    let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");
    let cap = BigInt.fromI32(1000);
    let projectEvent = createProjectCreatedEvent(projectId, title, metadataHash, cap);
    handleProjectCreated(projectEvent);

    let token = Address.fromString("0x0000000000000000000000000000000000000088");

    // Initial cap
    let bountyCapEvent1 = createBountyCapSetEvent(
      projectId,
      token,
      BigInt.fromI32(0),
      BigInt.fromI32(5000)
    );
    handleBountyCapSet(bountyCapEvent1);

    // Update cap - use different transaction hash to create separate history record
    let bountyCapEvent2 = createBountyCapSetEvent(
      projectId,
      token,
      BigInt.fromI32(5000),
      BigInt.fromI32(7500)
    );
    // Set different transaction hash for second event to ensure unique history ID
    bountyCapEvent2.transaction.hash = Bytes.fromHexString("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
    handleBountyCapSet(bountyCapEvent2);

    // Should still have 1 ProjectBountyCap entity with updated value
    assert.entityCount("ProjectBountyCap", 1);
    let expectedCapId = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-0x0000000000000000000000000000000000000088";
    assert.fieldEquals("ProjectBountyCap", expectedCapId, "cap", "7500");

    // Should have 2 history records (different tx hashes)
    assert.entityCount("BountyCapChange", 2);
  });
});
