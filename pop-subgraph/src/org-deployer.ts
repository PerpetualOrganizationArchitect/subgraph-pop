import { BeaconUpgraded as BeaconUpgradedEvent } from "../generated/OrgDeployer/OrgDeployer"
import { BeaconUpgraded } from "../generated/schema"

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let entity = new BeaconUpgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.beacon = event.params.beacon

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
