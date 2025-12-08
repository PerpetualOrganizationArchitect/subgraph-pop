import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AccountCreated,
  OrgRegistered,
  OrgConfigUpdated,
  ExecutorUpdated
} from "../generated/templates/PasskeyAccountFactory/PasskeyAccountFactory";

export function createAccountCreatedEvent(
  account: Address,
  orgId: Bytes,
  credentialId: Bytes,
  owner: Address
): AccountCreated {
  let event = changetype<AccountCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  );
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );

  return event;
}

export function createOrgRegisteredEvent(
  orgId: Bytes,
  maxCredentials: i32,
  guardian: Address,
  recoveryDelay: BigInt
): OrgRegistered {
  let event = changetype<OrgRegistered>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("maxCredentials", ethereum.Value.fromI32(maxCredentials))
  );
  event.parameters.push(
    new ethereum.EventParam("guardian", ethereum.Value.fromAddress(guardian))
  );
  event.parameters.push(
    new ethereum.EventParam("recoveryDelay", ethereum.Value.fromUnsignedBigInt(recoveryDelay))
  );

  return event;
}

export function createOrgConfigUpdatedEvent(orgId: Bytes): OrgConfigUpdated {
  let event = changetype<OrgConfigUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );

  return event;
}

export function createFactoryExecutorUpdatedEvent(
  oldExecutor: Address,
  newExecutor: Address
): ExecutorUpdated {
  let event = changetype<ExecutorUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldExecutor", ethereum.Value.fromAddress(oldExecutor))
  );
  event.parameters.push(
    new ethereum.EventParam("newExecutor", ethereum.Value.fromAddress(newExecutor))
  );

  return event;
}
