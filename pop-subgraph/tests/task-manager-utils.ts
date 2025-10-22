import { newMockEvent } from "matchstick-as";
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  ProjectCreated,
  ProjectDeleted,
  TaskCreated,
  TaskAssigned,
  TaskCompleted
} from "../generated/templates/TaskManager/TaskManager";

export function createProjectCreatedEvent(
  id: Bytes,
  metadata: Bytes,
  cap: BigInt
): ProjectCreated {
  let event = changetype<ProjectCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromFixedBytes(id))
  );
  event.parameters.push(
    new ethereum.EventParam("metadata", ethereum.Value.fromBytes(metadata))
  );
  event.parameters.push(
    new ethereum.EventParam("cap", ethereum.Value.fromUnsignedBigInt(cap))
  );

  return event;
}

export function createTaskCreatedEvent(
  id: BigInt,
  project: Bytes,
  payout: BigInt,
  bountyToken: Address,
  bountyPayout: BigInt,
  requiresApplication: boolean,
  metadata: Bytes
): TaskCreated {
  let event = changetype<TaskCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("project", ethereum.Value.fromFixedBytes(project))
  );
  event.parameters.push(
    new ethereum.EventParam("payout", ethereum.Value.fromUnsignedBigInt(payout))
  );
  event.parameters.push(
    new ethereum.EventParam("bountyToken", ethereum.Value.fromAddress(bountyToken))
  );
  event.parameters.push(
    new ethereum.EventParam("bountyPayout", ethereum.Value.fromUnsignedBigInt(bountyPayout))
  );
  event.parameters.push(
    new ethereum.EventParam("requiresApplication", ethereum.Value.fromBoolean(requiresApplication))
  );
  event.parameters.push(
    new ethereum.EventParam("metadata", ethereum.Value.fromBytes(metadata))
  );

  return event;
}

export function createTaskAssignedEvent(
  id: BigInt,
  assignee: Address,
  assigner: Address
): TaskAssigned {
  let event = changetype<TaskAssigned>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("assignee", ethereum.Value.fromAddress(assignee))
  );
  event.parameters.push(
    new ethereum.EventParam("assigner", ethereum.Value.fromAddress(assigner))
  );

  return event;
}

export function createTaskCompletedEvent(
  id: BigInt,
  completer: Address
): TaskCompleted {
  let event = changetype<TaskCompleted>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("completer", ethereum.Value.fromAddress(completer))
  );

  return event;
}
