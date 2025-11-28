import { newMockEvent } from "matchstick-as";
import { ethereum, Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { OrgDeployed } from "../generated/OrgDeployer/OrgDeployer";

export function createOrgDeployedEvent(
  orgId: Bytes,
  executor: Address,
  hybridVoting: Address,
  directDemocracyVoting: Address,
  quickJoin: Address,
  participationToken: Address,
  taskManager: Address,
  educationHub: Address,
  paymentManager: Address,
  eligibilityModule: Address,
  toggleModule: Address,
  topHatId: BigInt,
  roleHatIds: BigInt[]
): OrgDeployed {
  let orgDeployedEvent = changetype<OrgDeployed>(newMockEvent());

  orgDeployedEvent.parameters = new Array();

  orgDeployedEvent.parameters.push(
    new ethereum.EventParam("orgId", ethereum.Value.fromFixedBytes(orgId))
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam("executor", ethereum.Value.fromAddress(executor))
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "hybridVoting",
      ethereum.Value.fromAddress(hybridVoting)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "directDemocracyVoting",
      ethereum.Value.fromAddress(directDemocracyVoting)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam("quickJoin", ethereum.Value.fromAddress(quickJoin))
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "participationToken",
      ethereum.Value.fromAddress(participationToken)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "taskManager",
      ethereum.Value.fromAddress(taskManager)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "educationHub",
      ethereum.Value.fromAddress(educationHub)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "paymentManager",
      ethereum.Value.fromAddress(paymentManager)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "eligibilityModule",
      ethereum.Value.fromAddress(eligibilityModule)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "toggleModule",
      ethereum.Value.fromAddress(toggleModule)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "topHatId",
      ethereum.Value.fromUnsignedBigInt(topHatId)
    )
  );
  orgDeployedEvent.parameters.push(
    new ethereum.EventParam(
      "roleHatIds",
      ethereum.Value.fromUnsignedBigIntArray(roleHatIds)
    )
  );

  return orgDeployedEvent;
}
