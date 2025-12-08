import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts";
import {
  Transfer,
  Initialized,
  MemberHatSet,
  ApproverHatSet,
  Requested,
  RequestApproved,
  RequestCancelled,
  TaskManagerSet,
  EducationHubSet
} from "../generated/templates/ParticipationToken/ParticipationToken";

const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");

export function createTransferEvent(
  from: Address,
  to: Address,
  value: BigInt,
  contractAddress: Address
): Transfer {
  let event = changetype<Transfer>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  );
  event.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  );
  event.parameters.push(
    new ethereum.EventParam("value", ethereum.Value.fromUnsignedBigInt(value))
  );

  return event;
}

export function createMintEvent(
  to: Address,
  value: BigInt,
  contractAddress: Address
): Transfer {
  return createTransferEvent(ZERO_ADDRESS, to, value, contractAddress);
}

export function createBurnEvent(
  from: Address,
  value: BigInt,
  contractAddress: Address
): Transfer {
  return createTransferEvent(from, ZERO_ADDRESS, value, contractAddress);
}

export function createInitializedEvent(
  version: BigInt,
  contractAddress: Address
): Initialized {
  let event = changetype<Initialized>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("version", ethereum.Value.fromUnsignedBigInt(version))
  );

  return event;
}

export function createMemberHatSetEvent(
  hat: BigInt,
  allowed: boolean,
  contractAddress: Address
): MemberHatSet {
  let event = changetype<MemberHatSet>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hat", ethereum.Value.fromUnsignedBigInt(hat))
  );
  event.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  );

  return event;
}

export function createApproverHatSetEvent(
  hat: BigInt,
  allowed: boolean,
  contractAddress: Address
): ApproverHatSet {
  let event = changetype<ApproverHatSet>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("hat", ethereum.Value.fromUnsignedBigInt(hat))
  );
  event.parameters.push(
    new ethereum.EventParam("allowed", ethereum.Value.fromBoolean(allowed))
  );

  return event;
}

export function createRequestedEvent(
  id: BigInt,
  requester: Address,
  amount: BigInt,
  ipfsHash: string,
  contractAddress: Address
): Requested {
  let event = changetype<Requested>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("requester", ethereum.Value.fromAddress(requester))
  );
  event.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  );
  event.parameters.push(
    new ethereum.EventParam("ipfsHash", ethereum.Value.fromString(ipfsHash))
  );

  return event;
}

export function createRequestApprovedEvent(
  id: BigInt,
  approver: Address,
  contractAddress: Address
): RequestApproved {
  let event = changetype<RequestApproved>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );
  event.parameters.push(
    new ethereum.EventParam("approver", ethereum.Value.fromAddress(approver))
  );

  return event;
}

export function createRequestCancelledEvent(
  id: BigInt,
  contractAddress: Address
): RequestCancelled {
  let event = changetype<RequestCancelled>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("id", ethereum.Value.fromUnsignedBigInt(id))
  );

  return event;
}

export function createTaskManagerSetEvent(
  taskManager: Address,
  contractAddress: Address
): TaskManagerSet {
  let event = changetype<TaskManagerSet>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("taskManager", ethereum.Value.fromAddress(taskManager))
  );

  return event;
}

export function createEducationHubSetEvent(
  educationHub: Address,
  contractAddress: Address
): EducationHubSet {
  let event = changetype<EducationHubSet>(newMockEvent());

  event.address = contractAddress;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("educationHub", ethereum.Value.fromAddress(educationHub))
  );

  return event;
}
