import { Address, BigInt, Bytes, DataSourceContext } from "@graphprotocol/graph-ts";
import { TaskMetadata as TaskMetadataTemplate, ProjectMetadata as ProjectMetadataTemplate } from "../generated/templates";
import {
  ProjectCreated,
  ProjectDeleted,
  ProjectCapUpdated,
  ProjectManagerUpdated,
  ProjectRolePermSet,
  BountyCapSet,
  TaskCreated,
  TaskAssigned,
  TaskClaimed,
  TaskSubmitted,
  TaskCompleted,
  TaskCancelled,
  TaskUpdated,
  TaskApplicationSubmitted,
  TaskApplicationApproved
} from "../generated/templates/TaskManager/TaskManager";
import {
  Project,
  Task,
  TaskApplication,
  TaskManager,
  ProjectManager,
  ProjectRolePermission,
  ProjectBountyCap,
  ProjectCapChange,
  BountyCapChange
} from "../generated/schema";
import { getUsernameForAddress, loadExistingUser } from "./utils";

/**
 * Helper function to create a composite Project ID.
 * This ensures Projects are unique per TaskManager, preventing cross-org data leakage.
 * Format: taskManagerAddress-projectId
 */
function getProjectEntityId(taskManagerAddress: Address, projectId: Bytes): string {
  return taskManagerAddress.toHexString() + "-" + projectId.toHexString();
}

/**
 * Convert bytes32 sha256 digest to IPFS CIDv0 string.
 * The contract stores only the 32-byte hash, we need to prepend
 * the multihash prefix (0x1220) and base58 encode.
 */
function bytes32ToCid(hash: Bytes): string {
  // Create the multihash by prepending 0x1220 header
  let prefix = Bytes.fromHexString("0x1220");

  // Concatenate prefix + hash (34 bytes total)
  let multihash = new Bytes(34);
  for (let i = 0; i < 2; i++) {
    multihash[i] = prefix[i];
  }
  for (let i = 0; i < 32; i++) {
    multihash[i + 2] = hash[i];
  }

  // Base58 encode to get CIDv0 (starts with "Qm")
  return multihash.toBase58();
}

/**
 * Helper function to create an IPFS file data source for task metadata.
 * Uses DataSourceContext to pass the taskId and metadataType to the handler
 * so it can link the metadata back to the task.
 */
function createTaskMetadataSource(metadataHash: Bytes, taskId: string, metadataType: string): void {
  // Skip if metadataHash is empty (all zeros)
  let zeroHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000");
  if (metadataHash.equals(zeroHash)) {
    return;
  }

  // Convert bytes32 sha256 digest to IPFS CIDv0 string
  let ipfsCid = bytes32ToCid(metadataHash);

  // Create context to pass taskId and type to the IPFS handler
  let context = new DataSourceContext();
  context.setString("taskId", taskId);
  context.setString("metadataType", metadataType);

  // Create the file data source with context
  TaskMetadataTemplate.createWithContext(ipfsCid, context);
}

/**
 * Helper function to create an IPFS file data source for project metadata.
 * Uses DataSourceContext to pass the projectId to the handler
 * so it can link the metadata back to the project.
 */
function createProjectMetadataSource(metadataHash: Bytes, projectId: string): void {
  // Skip if metadataHash is empty (all zeros)
  let zeroHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000");
  if (metadataHash.equals(zeroHash)) {
    return;
  }

  // Convert bytes32 sha256 digest to IPFS CIDv0 string
  let ipfsCid = bytes32ToCid(metadataHash);

  // Create context to pass projectId to the IPFS handler
  let context = new DataSourceContext();
  context.setString("projectId", projectId);

  // Create the file data source with context
  ProjectMetadataTemplate.createWithContext(ipfsCid, context);
}

/**
 * Handles the ProjectCreated event from a TaskManager contract.
 * Creates a Project entity and links it to the TaskManager.
 * Uses composite ID (taskManager-projectId) to ensure cross-org isolation.
 */
export function handleProjectCreated(event: ProjectCreated): void {
  let projectEntityId = getProjectEntityId(event.address, event.params.id);

  // Load existing project (may have been created as stub by ProjectManagerUpdated
  // if that event was processed first in the same transaction) or create new
  let project = Project.load(projectEntityId);
  if (project == null) {
    project = new Project(projectEntityId);
  }

  // Store raw project ID for reference
  project.projectId = event.params.id;
  // Link to TaskManager entity (event.address is the TaskManager contract address)
  project.taskManager = event.address;
  project.title = event.params.title.toString();
  project.metadataHash = event.params.metadataHash;
  project.cap = event.params.cap;
  project.createdAt = event.block.timestamp;
  project.createdAtBlock = event.block.number;
  project.deleted = false;

  // Set metadata link (CID) for the ProjectMetadata entity that will be created by IPFS handler
  let metadataCid = bytes32ToCid(event.params.metadataHash);
  project.metadata = metadataCid;

  project.save();

  // Create IPFS data source to fetch and index project metadata
  createProjectMetadataSource(event.params.metadataHash, projectEntityId);
}

export function handleProjectDeleted(event: ProjectDeleted): void {
  let projectEntityId = getProjectEntityId(event.address, event.params.id);
  let project = Project.load(projectEntityId);
  if (project) {
    project.deleted = true;
    project.deletedAt = event.block.timestamp;
    project.save();
  }
}

export function handleTaskCreated(event: TaskCreated): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = new Task(id);

  task.taskId = event.params.id;
  task.taskManager = event.address;
  // Use composite Project ID to ensure cross-org isolation
  task.project = getProjectEntityId(event.address, event.params.project);
  task.payout = event.params.payout;
  task.bountyToken = event.params.bountyToken;
  task.bountyPayout = event.params.bountyPayout;
  task.requiresApplication = event.params.requiresApplication;
  task.title = event.params.title.toString();
  task.metadataHash = event.params.metadataHash;
  task.status = "Open";
  task.createdAt = event.block.timestamp;
  task.createdAtBlock = event.block.number;

  // Set metadata link (CID) for the TaskMetadata entity that will be created by IPFS handler
  let metadataCid = bytes32ToCid(event.params.metadataHash);
  task.metadata = metadataCid;

  task.save();

  // Create IPFS data source to fetch and index task metadata
  createTaskMetadataSource(event.params.metadataHash, id, "task");
}

export function handleTaskAssigned(event: TaskAssigned): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    // Get organization from TaskManager
    let taskManager = TaskManager.load(event.address);
    if (taskManager) {
      let user = loadExistingUser(
        taskManager.organization,
        event.params.assignee,
        event.block.timestamp,
        event.block.number
      );
      if (user) {
        task.assigneeUser = user.id;
      }
    }

    task.assignee = event.params.assignee;
    task.assigneeUsername = getUsernameForAddress(event.params.assignee);
    task.status = "Assigned";
    task.assignedAt = event.block.timestamp;
    task.save();
  }
}

export function handleTaskClaimed(event: TaskClaimed): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    task.assignee = event.params.claimer;
    task.assigneeUsername = getUsernameForAddress(event.params.claimer);
    task.status = "Assigned";
    task.assignedAt = event.block.timestamp;
    task.save();
  }
}

export function handleTaskSubmitted(event: TaskSubmitted): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    task.status = "Submitted";
    task.submittedAt = event.block.timestamp;
    task.submissionHash = event.params.submissionHash;

    // Update metadata link to submission CID - the IPFS handler will create
    // a new TaskMetadata entity with submission content included
    let submissionCid = bytes32ToCid(event.params.submissionHash);
    task.metadata = submissionCid;

    task.save();

    // Create IPFS data source to fetch and parse submission metadata
    createTaskMetadataSource(event.params.submissionHash, id, "submission");
  }
}

export function handleTaskCompleted(event: TaskCompleted): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    // Get organization from TaskManager
    let taskManager = TaskManager.load(event.address);
    if (taskManager) {
      let user = loadExistingUser(
        taskManager.organization,
        event.params.completer,
        event.block.timestamp,
        event.block.number
      );
      if (user) {
        task.completerUser = user.id;

        // Increment totalTasksCompleted
        user.totalTasksCompleted = user.totalTasksCompleted.plus(BigInt.fromI32(1));
        user.save();
      }
    }

    // Set assignee to completer if not already set
    // This handles cases where task is completed without explicit assignment
    if (!task.assignee) {
      task.assignee = event.params.completer;
      task.assigneeUsername = getUsernameForAddress(event.params.completer);
    }
    task.completer = event.params.completer;
    task.completerUsername = getUsernameForAddress(event.params.completer);
    task.status = "Completed";
    task.completedAt = event.block.timestamp;
    task.save();
  }
}

export function handleTaskCancelled(event: TaskCancelled): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    // Get organization from TaskManager
    let taskManager = TaskManager.load(event.address);
    if (taskManager) {
      let user = loadExistingUser(
        taskManager.organization,
        event.params.canceller,
        event.block.timestamp,
        event.block.number
      );
      if (user) {
        task.cancellerUser = user.id;

        // Increment totalTasksCancelled
        user.totalTasksCancelled = user.totalTasksCancelled.plus(BigInt.fromI32(1));
        user.save();
      }
    }

    task.canceller = event.params.canceller;
    task.cancellerUsername = getUsernameForAddress(event.params.canceller);
    task.status = "Cancelled";
    task.cancelledAt = event.block.timestamp;
    task.save();
  }
}

export function handleTaskUpdated(event: TaskUpdated): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    // Check if metadata changed before updating
    let metadataChanged = !task.metadataHash.equals(event.params.metadataHash);

    task.payout = event.params.payout;
    task.bountyToken = event.params.bountyToken;
    task.bountyPayout = event.params.bountyPayout;
    task.title = event.params.title.toString();
    task.metadataHash = event.params.metadataHash;
    task.updatedAt = event.block.timestamp;

    // Update metadata link if changed
    if (metadataChanged) {
      let metadataCid = bytes32ToCid(event.params.metadataHash);
      task.metadata = metadataCid;
    }

    task.save();

    // Re-fetch metadata from IPFS if it changed
    if (metadataChanged) {
      createTaskMetadataSource(event.params.metadataHash, id, "task");
    }
  }
}

export function handleTaskApplicationSubmitted(event: TaskApplicationSubmitted): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let taskEntityId = taskManagerAddress + "-" + taskId;
  let applicantAddress = event.params.applicant.toHexString();
  let id = taskManagerAddress + "-" + taskId + "-" + applicantAddress;

  let application = new TaskApplication(id);

  application.task = taskEntityId;
  application.applicant = event.params.applicant;
  application.applicantUsername = getUsernameForAddress(event.params.applicant);

  // Link to User entity
  let taskManager = TaskManager.load(event.address);
  if (taskManager) {
    let user = loadExistingUser(
      taskManager.organization,
      event.params.applicant,
      event.block.timestamp,
      event.block.number
    );
    if (user) {
      application.applicantUser = user.id;
    }
  }

  application.applicationHash = event.params.applicationHash;
  application.approved = false;
  application.appliedAt = event.block.timestamp;
  application.appliedAtBlock = event.block.number;

  application.save();
}

export function handleTaskApplicationApproved(event: TaskApplicationApproved): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let applicantAddress = event.params.applicant.toHexString();
  let id = taskManagerAddress + "-" + taskId + "-" + applicantAddress;

  let application = TaskApplication.load(id);
  if (application) {
    // Link to User entity for approver
    let taskManager = TaskManager.load(event.address);
    if (taskManager) {
      let user = loadExistingUser(
        taskManager.organization,
        event.params.approver,
        event.block.timestamp,
        event.block.number
      );
      if (user) {
        application.approverUser = user.id;
      }
    }

    application.approved = true;
    application.approver = event.params.approver;
    application.approverUsername = getUsernameForAddress(event.params.approver);
    application.approvedAt = event.block.timestamp;
    application.save();
  }
}

/**
 * Handles the ProjectCapUpdated event from a TaskManager contract.
 * Updates the Project's participation token cap and creates a historical record.
 */
export function handleProjectCapUpdated(event: ProjectCapUpdated): void {
  let projectEntityId = getProjectEntityId(event.address, event.params.id);
  let project = Project.load(projectEntityId);
  if (project) {
    // Update current cap on project
    project.cap = event.params.newCap;
    project.save();

    // Create historical record
    let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
    let change = new ProjectCapChange(changeId);
    change.project = projectEntityId;
    change.oldCap = event.params.oldCap;
    change.newCap = event.params.newCap;
    change.changedAt = event.block.timestamp;
    change.changedAtBlock = event.block.number;
    change.transactionHash = event.transaction.hash;
    change.save();
  }
}

/**
 * Handles the ProjectManagerUpdated event from a TaskManager contract.
 * Creates or updates a ProjectManager entity to track manager assignments.
 *
 * Note: This event may be emitted BEFORE ProjectCreated in the same transaction
 * (due to event ordering). If the Project doesn't exist yet, we create a stub
 * that will be properly filled in when handleProjectCreated runs.
 */
export function handleProjectManagerUpdated(event: ProjectManagerUpdated): void {
  let projectId = event.params.id;
  let managerAddress = event.params.manager;
  let isManager = event.params.isManager;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);

  // Ensure Project exists (may not if ProjectManagerUpdated fires before ProjectCreated)
  let project = Project.load(projectEntityId);
  if (project == null) {
    // Create stub Project - will be properly filled in by handleProjectCreated
    project = new Project(projectEntityId);
    project.projectId = projectId;
    project.taskManager = event.address;
    project.title = ""; // Placeholder - will be set by ProjectCreated
    project.metadataHash = Bytes.empty(); // Placeholder
    project.cap = BigInt.fromI32(0); // Placeholder
    project.createdAt = event.block.timestamp;
    project.createdAtBlock = event.block.number;
    project.deleted = false;
    project.save();
  }

  let id = projectEntityId + "-" + managerAddress.toHexString();
  let manager = ProjectManager.load(id);

  if (manager == null) {
    manager = new ProjectManager(id);
    manager.project = projectEntityId;
    manager.manager = managerAddress;
    manager.addedAt = event.block.timestamp;
    manager.addedAtBlock = event.block.number;

    // Link to User entity if TaskManager has organization context
    let taskManager = TaskManager.load(event.address);
    if (taskManager) {
      let user = loadExistingUser(
        taskManager.organization,
        managerAddress,
        event.block.timestamp,
        event.block.number
      );
      if (user) {
        manager.managerUser = user.id;
      }
    }
  }

  manager.isActive = isManager;
  manager.lastUpdatedAt = event.block.timestamp;
  manager.transactionHash = event.transaction.hash;

  if (!isManager) {
    manager.removedAt = event.block.timestamp;
    manager.removedAtBlock = event.block.number;
  }

  manager.save();
}

/**
 * Handles the ProjectRolePermSet event from a TaskManager contract.
 * Creates or updates a ProjectRolePermission entity to track hat-based permissions.
 * Permission bitmask: CREATE=1, CLAIM=2, REVIEW=4, ASSIGN=8
 *
 * Note: This event may be emitted BEFORE ProjectCreated in the same transaction.
 */
export function handleProjectRolePermSet(event: ProjectRolePermSet): void {
  let projectId = event.params.id;
  let hatId = event.params.hatId;
  let mask = event.params.mask;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);

  // Ensure Project exists (may not if this event fires before ProjectCreated)
  let project = Project.load(projectEntityId);
  if (project == null) {
    project = new Project(projectEntityId);
    project.projectId = projectId;
    project.taskManager = event.address;
    project.title = "";
    project.metadataHash = Bytes.empty();
    project.cap = BigInt.fromI32(0);
    project.createdAt = event.block.timestamp;
    project.createdAtBlock = event.block.number;
    project.deleted = false;
    project.save();
  }

  let id = projectEntityId + "-" + hatId.toString();
  let perm = ProjectRolePermission.load(id);

  if (perm == null) {
    perm = new ProjectRolePermission(id);
    perm.project = projectEntityId;
    perm.hatId = hatId;
  }

  perm.mask = mask;
  // Decode permission bits: CREATE=1, CLAIM=2, REVIEW=4, ASSIGN=8
  perm.canCreate = (mask & 1) != 0;
  perm.canClaim = (mask & 2) != 0;
  perm.canReview = (mask & 4) != 0;
  perm.canAssign = (mask & 8) != 0;
  perm.setAt = event.block.timestamp;
  perm.setAtBlock = event.block.number;
  perm.transactionHash = event.transaction.hash;

  perm.save();
}

/**
 * Handles the BountyCapSet event from a TaskManager contract.
 * Creates or updates a ProjectBountyCap entity and creates a historical record.
 *
 * Note: This event may be emitted BEFORE ProjectCreated in the same transaction.
 */
export function handleBountyCapSet(event: BountyCapSet): void {
  let projectId = event.params.projectId;
  let token = event.params.token;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);

  // Ensure Project exists (may not if this event fires before ProjectCreated)
  let project = Project.load(projectEntityId);
  if (project == null) {
    project = new Project(projectEntityId);
    project.projectId = projectId;
    project.taskManager = event.address;
    project.title = "";
    project.metadataHash = Bytes.empty();
    project.cap = BigInt.fromI32(0);
    project.createdAt = event.block.timestamp;
    project.createdAtBlock = event.block.number;
    project.deleted = false;
    project.save();
  }

  let capId = projectEntityId + "-" + token.toHexString();
  let bountyCap = ProjectBountyCap.load(capId);

  if (bountyCap == null) {
    bountyCap = new ProjectBountyCap(capId);
    bountyCap.project = projectEntityId;
    bountyCap.token = token;
  }

  bountyCap.cap = event.params.newCap;
  bountyCap.setAt = event.block.timestamp;
  bountyCap.setAtBlock = event.block.number;
  bountyCap.transactionHash = event.transaction.hash;
  bountyCap.save();

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new BountyCapChange(changeId);
  change.bountyCap = capId;
  change.project = projectEntityId;
  change.token = token;
  change.oldCap = event.params.oldCap;
  change.newCap = event.params.newCap;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}
