import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import { handlePasskeyFactoryUpdated } from "../src/universal-account-registry";
import { createPasskeyFactoryUpdatedEvent } from "./universal-account-registry-utils";
import { UniversalAccountRegistry } from "../generated/schema";

// Default mock event address from matchstick-as
let REGISTRY_ADDRESS = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a");
let OWNER = Address.fromString("0x0000000000000000000000000000000000000001");

function setupRegistryEntity(): void {
  let registry = new UniversalAccountRegistry(REGISTRY_ADDRESS);
  registry.owner = OWNER;
  registry.totalAccounts = BigInt.fromI32(0);
  registry.createdAt = BigInt.fromI32(1000);
  registry.createdAtBlock = BigInt.fromI32(100);
  registry.save();
}

describe("UniversalAccountRegistry", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handlePasskeyFactoryUpdated", () => {
    test("sets passkeyFactory on registry entity", () => {
      setupRegistryEntity();

      let factory = Address.fromString("0x0000000000000000000000000000000000000042");
      let event = createPasskeyFactoryUpdatedEvent(factory);
      handlePasskeyFactoryUpdated(event);

      let registry = UniversalAccountRegistry.load(REGISTRY_ADDRESS)!;
      assert.bytesEquals(registry.passkeyFactory!, factory);
    });

    test("handles registry not found gracefully", () => {
      let factory = Address.fromString("0x0000000000000000000000000000000000000042");
      let event = createPasskeyFactoryUpdatedEvent(factory);
      handlePasskeyFactoryUpdated(event);

      // Should not crash - no registry entity should exist
      assert.entityCount("UniversalAccountRegistry", 0);
    });
  });
});
