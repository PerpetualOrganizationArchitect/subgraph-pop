import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  AccountCreated,
  GlobalConfigUpdated,
  PoaManagerUpdated,
  PausedStateChanged
} from "../generated/templates/PasskeyAccountFactory/PasskeyAccountFactory";

export function createAccountCreatedEvent(
  account: Address,
  credentialId: Bytes,
  owner: Address
): AccountCreated {
  let event = changetype<AccountCreated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  );
  event.parameters.push(
    new ethereum.EventParam("credentialId", ethereum.Value.fromFixedBytes(credentialId))
  );
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );

  return event;
}

export function createGlobalConfigUpdatedEvent(
  guardian: Address,
  recoveryDelay: BigInt,
  maxCredentials: i32
): GlobalConfigUpdated {
  let event = changetype<GlobalConfigUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("guardian", ethereum.Value.fromAddress(guardian))
  );
  event.parameters.push(
    new ethereum.EventParam("recoveryDelay", ethereum.Value.fromUnsignedBigInt(recoveryDelay))
  );
  event.parameters.push(
    new ethereum.EventParam("maxCredentials", ethereum.Value.fromI32(maxCredentials))
  );

  return event;
}

export function createPoaManagerUpdatedEvent(
  oldPoaManager: Address,
  newPoaManager: Address
): PoaManagerUpdated {
  let event = changetype<PoaManagerUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("oldPoaManager", ethereum.Value.fromAddress(oldPoaManager))
  );
  event.parameters.push(
    new ethereum.EventParam("newPoaManager", ethereum.Value.fromAddress(newPoaManager))
  );

  return event;
}

export function createPausedStateChangedEvent(paused: boolean): PausedStateChanged {
  let event = changetype<PausedStateChanged>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("paused", ethereum.Value.fromBoolean(paused))
  );

  return event;
}
