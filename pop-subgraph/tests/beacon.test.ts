import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address } from "@graphprotocol/graph-ts";
import { handleUpgraded } from "../src/beacon";
import { createUpgradedEvent } from "./beacon-utils";

describe("Beacon", () => {
  afterEach(() => {
    clearStore();
  });

  test("BeaconUpgrade created and stored", () => {
    let implementation = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );

    let upgradedEvent = createUpgradedEvent(implementation);
    handleUpgraded(upgradedEvent);

    assert.entityCount("BeaconUpgrade", 1);
  });
});
