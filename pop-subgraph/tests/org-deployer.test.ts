import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { BeaconUpgraded } from "../generated/schema"
import { BeaconUpgraded as BeaconUpgradedEvent } from "../generated/OrgDeployer/OrgDeployer"
import { handleBeaconUpgraded } from "../src/org-deployer"
import { createBeaconUpgradedEvent } from "./org-deployer-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let beacon = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newBeaconUpgradedEvent = createBeaconUpgradedEvent(beacon)
    handleBeaconUpgraded(newBeaconUpgradedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("BeaconUpgraded created and stored", () => {
    assert.entityCount("BeaconUpgraded", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "BeaconUpgraded",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "beacon",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
