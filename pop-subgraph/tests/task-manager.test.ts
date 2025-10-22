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
import { Organization, TaskManager } from "../generated/schema";

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
  organization.hybridVoting = Address.fromString("0x0000000000000000000000000000000000000002");
  organization.directDemocracyVoting = Address.fromString("0x0000000000000000000000000000000000000003");
  organization.quickJoin = Address.fromString("0x0000000000000000000000000000000000000004");
  organization.participationToken = Address.fromString("0x0000000000000000000000000000000000000005");
  organization.educationHub = Address.fromString("0x0000000000000000000000000000000000000007");
  organization.paymentManager = Address.fromString("0x0000000000000000000000000000000000000008");
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

  // Set the relationship
  organization.taskManager = taskManagerAddress;

  // Save entities
  taskManager.save();
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
