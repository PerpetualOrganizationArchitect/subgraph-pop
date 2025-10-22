import { Upgraded } from "../generated/Beacon/Beacon";
import { BeaconUpgrade } from "../generated/schema";

export function handleUpgraded(event: Upgraded): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let upgrade = new BeaconUpgrade(id);

  upgrade.implementation = event.params.implementation;
  upgrade.blockNumber = event.block.number;
  upgrade.blockTimestamp = event.block.timestamp;
  upgrade.transactionHash = event.transaction.hash;

  upgrade.save();
}
