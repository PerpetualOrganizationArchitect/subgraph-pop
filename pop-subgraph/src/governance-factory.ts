import { ModuleDeployed } from "../generated/GovernanceFactory/GovernanceFactory";
import { GovernanceModule } from "../generated/schema";

export function handleModuleDeployed(event: ModuleDeployed): void {
  let module = new GovernanceModule(event.params.proxy);

  module.orgId = event.params.orgId;
  module.typeId = event.params.typeId;
  module.proxy = event.params.proxy;
  module.beacon = event.params.beacon;
  module.autoUpgrade = event.params.autoUpgrade;
  module.owner = event.params.owner;
  module.blockNumber = event.block.number;
  module.blockTimestamp = event.block.timestamp;
  module.transactionHash = event.transaction.hash;

  module.save();
}
