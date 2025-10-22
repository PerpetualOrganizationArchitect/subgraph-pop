import { newMockEvent } from "matchstick-as";
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { ModuleDeployed } from "../generated/GovernanceFactory/GovernanceFactory";

export function createModuleDeployedEvent(
  orgId: Bytes,
  typeId: Bytes,
  proxy: Address,
  beacon: Address,
  autoUpgrade: boolean,
  owner: Address
): ModuleDeployed {
  let moduleDeployedEvent = changetype<ModuleDeployed>(newMockEvent());

  moduleDeployedEvent.parameters = new Array();

  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("typeId", ethereum.Value.fromFixedBytes(typeId))
  );
  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("proxy", ethereum.Value.fromAddress(proxy))
  );
  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("beacon", ethereum.Value.fromAddress(beacon))
  );
  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("autoUpgrade", ethereum.Value.fromBoolean(autoUpgrade))
  );
  moduleDeployedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );

  return moduleDeployedEvent;
}
