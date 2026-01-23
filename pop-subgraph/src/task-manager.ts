import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
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
 * Handles the ProjectCreated event from a TaskManager contract.
 * Creates a Project entity and links it to the TaskManager.
 * Uses composite ID (taskManager-projectId) to ensure cross-org isolation.
 */
export function handleProjectCreated(event: ProjectCreated): void {
  let projectEntityId = getProjectEntityId(event.address, event.params.id);
  let project = new Project(projectEntityId);

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

  project.save();
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

  task.save();
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
    // submissionHash is now bytes32 - store in metadataHash
    task.metadataHash = event.params.submissionHash;
    task.save();
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
    task.payout = event.params.payout;
    task.bountyToken = event.params.bountyToken;
    task.bountyPayout = event.params.bountyPayout;
    task.title = event.params.title.toString();
    task.metadataHash = event.params.metadataHash;
    task.updatedAt = event.block.timestamp;
    task.save();
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
 */
export function handleProjectManagerUpdated(event: ProjectManagerUpdated): void {
  let projectId = event.params.id;
  let managerAddress = event.params.manager;
  let isManager = event.params.isManager;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);
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
 */
export function handleProjectRolePermSet(event: ProjectRolePermSet): void {
  let projectId = event.params.id;
  let hatId = event.params.hatId;
  let mask = event.params.mask;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);
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
 */
export function handleBountyCapSet(event: BountyCapSet): void {
  let projectId = event.params.projectId;
  let token = event.params.token;

  // Use composite Project ID for cross-org isolation
  let projectEntityId = getProjectEntityId(event.address, projectId);
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
