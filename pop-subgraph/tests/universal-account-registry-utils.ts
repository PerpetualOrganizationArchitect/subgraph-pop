import { newMockEvent } from "matchstick-as";
import { ethereum, Address } from "@graphprotocol/graph-ts";
import {
  PasskeyFactoryUpdated
} from "../generated/templates/UniversalAccountRegistry/UniversalAccountRegistry";

export function createPasskeyFactoryUpdatedEvent(factory: Address): PasskeyFactoryUpdated {
  let event = changetype<PasskeyFactoryUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("factory", ethereum.Value.fromAddress(factory))
  );

  return event;
}
