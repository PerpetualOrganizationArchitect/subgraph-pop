import { newMockEvent } from "matchstick-as";
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  OrgRegistered,
  MetaUpdated,
  ContractRegistered,
  AutoUpgradeSet,
  HatsTreeRegistered
} from "../generated/templates/OrgRegistry/OrgRegistry";

export function createOrgRegisteredEvent(
  orgId: Bytes,
  executor: Address,
  name: Bytes,
  metadataHash: Bytes = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000")
): OrgRegistered {
  let event = changetype<OrgRegistered>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("executor", ethereum.Value.fromAddress(executor))
  );
  event.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromBytes(name))
  );
  event.parameters.push(
    new ethereum.EventParam("metadataHash", ethereum.Value.fromFixedBytes(metadataHash))
  );

  return event;
}

export function createMetaUpdatedEvent(
  orgId: Bytes,
  name: Bytes,
  metadataHash: Bytes = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000")
): MetaUpdated {
  let event = changetype<MetaUpdated>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("name", ethereum.Value.fromBytes(name))
  );
  event.parameters.push(
    new ethereum.EventParam("metadataHash", ethereum.Value.fromFixedBytes(metadataHash))
  );

  return event;
}

export function createContractRegisteredEvent(
  contractId: Bytes,
  orgId: Bytes,
  typeId: Bytes,
  proxy: Address,
  beacon: Address,
  autoUpgrade: boolean,
  owner: Address
): ContractRegistered {
  let event = changetype<ContractRegistered>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("contractId", ethereum.Value.fromFixedBytes(contractId))
  );
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  event.parameters.push(
    new ethereum.EventParam("proxy", ethereum.Value.fromAddress(proxy))
  );
  event.parameters.push(
    new ethereum.EventParam("beacon", ethereum.Value.fromAddress(beacon))
  );
  event.parameters.push(
    new ethereum.EventParam("autoUpgrade", ethereum.Value.fromBoolean(autoUpgrade))
  );
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );

  return event;
}

export function createAutoUpgradeSetEvent(
  contractId: Bytes,
  enabled: boolean
): AutoUpgradeSet {
  let event = changetype<AutoUpgradeSet>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("contractId", ethereum.Value.fromFixedBytes(contractId))
  );
  event.parameters.push(
    new ethereum.EventParam("enabled", ethereum.Value.fromBoolean(enabled))
  );

  return event;
}

export function createHatsTreeRegisteredEvent(
  orgId: Bytes,
  topHatId: BigInt,
  roleHatIds: BigInt[]
): HatsTreeRegistered {
  let event = changetype<HatsTreeRegistered>(newMockEvent());

  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  event.parameters.push(
    new ethereum.EventParam("topHatId", ethereum.Value.fromUnsignedBigInt(topHatId))
  );
  event.parameters.push(
    new ethereum.EventParam("roleHatIds", ethereum.Value.fromUnsignedBigIntArray(roleHatIds))
  );

  return event;
}
