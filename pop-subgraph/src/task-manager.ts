import { Address, BigInt } from "@graphprotocol/graph-ts";
import {
  ProjectCreated,
  ProjectDeleted,
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
import { Project, Task, TaskApplication } from "../generated/schema";

/**
 * Handles the ProjectCreated event from a TaskManager contract.
 * Creates a Project entity and links it to the TaskManager.
 */
export function handleProjectCreated(event: ProjectCreated): void {
  let project = new Project(event.params.id);

  // Link to TaskManager entity (event.address is the TaskManager contract address)
  project.taskManager = event.address;
  project.metadata = event.params.metadata;
  project.cap = event.params.cap;
  project.createdAt = event.block.timestamp;
  project.createdAtBlock = event.block.number;
  project.deleted = false;

  project.save();
}

export function handleProjectDeleted(event: ProjectDeleted): void {
  let project = Project.load(event.params.id);
  if (project) {
    project.deleted = true;
    project.deletedAt = event.block.timestamp;
    project.deletedMetadata = event.params.metadata;
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
  task.project = event.params.project;
  task.payout = event.params.payout;
  task.bountyToken = event.params.bountyToken;
  task.bountyPayout = event.params.bountyPayout;
  task.requiresApplication = event.params.requiresApplication;
  task.metadata = event.params.metadata;
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
    task.assignee = event.params.assignee;
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
    task.metadata = event.params.metadata;
    task.save();
  }
}

export function handleTaskCompleted(event: TaskCompleted): void {
  let taskId = event.params.id.toString();
  let taskManagerAddress = event.address.toHexString();
  let id = taskManagerAddress + "-" + taskId;

  let task = Task.load(id);
  if (task) {
    // Set assignee to completer if not already set
    // This handles cases where task is completed without explicit assignment
    if (!task.assignee) {
      task.assignee = event.params.completer;
    }
    task.completer = event.params.completer;
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
    task.canceller = event.params.canceller;
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
    task.metadata = event.params.metadata;
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
    application.approved = true;
    application.approver = event.params.approver;
    application.approvedAt = event.block.timestamp;
    application.save();
  }
}
