import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  beforeEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleAccountCreated,
  handleOrgRegistered,
  handleOrgConfigUpdated,
  handleFactoryExecutorUpdated
} from "../src/passkey-account-factory";
import {
  createAccountCreatedEvent,
  createOrgRegisteredEvent,
  createOrgConfigUpdatedEvent,
  createFactoryExecutorUpdatedEvent
} from "./passkey-account-factory-utils";
import {
  PasskeyAccountFactory,
  PasskeyOrgConfig,
  PasskeyAccount
} from "../generated/schema";

// Default mock event address used by matchstick
const FACTORY_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

/**
 * Helper function to create a PasskeyAccountFactory entity for tests that need it.
 */
function setupFactory(): void {
  let factoryAddress = Address.fromString(FACTORY_ADDRESS);
  let factory = new PasskeyAccountFactory(factoryAddress);
  factory.executor = factoryAddress;
  factory.accountBeacon = factoryAddress;
  factory.createdAt = BigInt.fromI32(1000);
  factory.blockNumber = BigInt.fromI32(100);
  factory.save();
}

/**
 * Helper to create a test org ID
 */
function getTestOrgId(): Bytes {
  return Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
}

/**
 * Helper to create a test credential ID
 */
function getTestCredentialId(): Bytes {
  return Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
}

describe("PasskeyAccountFactory", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleAccountCreated", () => {
    beforeEach(() => {
      // Factory must exist from InfrastructureDeployed before accounts can be created
      setupFactory();
    });

    test("skips account creation if factory does not exist", () => {
      clearStore(); // Remove the factory created in beforeEach

      let accountAddress = Address.fromString("0x0000000000000000000000000000000000000001");
      let orgId = getTestOrgId();
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let event = createAccountCreatedEvent(accountAddress, orgId, credentialId, owner);
      handleAccountCreated(event);

      // Should not create account if factory doesn't exist
      assert.entityCount("PasskeyAccount", 0);
    });

    test("creates PasskeyAccount entity with correct fields", () => {
      let accountAddress = Address.fromString("0x0000000000000000000000000000000000000001");
      let orgId = getTestOrgId();
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let event = createAccountCreatedEvent(accountAddress, orgId, credentialId, owner);
      handleAccountCreated(event);

      assert.entityCount("PasskeyAccount", 1);
      assert.fieldEquals(
        "PasskeyAccount",
        "0x0000000000000000000000000000000000000001",
        "factory",
        FACTORY_ADDRESS
      );
      assert.fieldEquals(
        "PasskeyAccount",
        "0x0000000000000000000000000000000000000001",
        "owner",
        "0x0000000000000000000000000000000000000002"
      );
      assert.fieldEquals(
        "PasskeyAccount",
        "0x0000000000000000000000000000000000000001",
        "guardian",
        Address.zero().toHexString()
      );
    });

    test("creates multiple PasskeyAccount entities for different addresses", () => {
      let orgId = getTestOrgId();
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let account1 = Address.fromString("0x0000000000000000000000000000000000000001");
      let event1 = createAccountCreatedEvent(account1, orgId, credentialId, owner);
      handleAccountCreated(event1);

      let account2 = Address.fromString("0x0000000000000000000000000000000000000003");
      let event2 = createAccountCreatedEvent(account2, orgId, credentialId, owner);
      handleAccountCreated(event2);

      assert.entityCount("PasskeyAccount", 2);
      assert.entityCount("PasskeyAccountFactory", 1);
    });
  });

  describe("handleOrgRegistered", () => {
    test("creates PasskeyOrgConfig entity with correct fields", () => {
      let orgId = getTestOrgId();
      let maxCredentials: i32 = 5;
      let guardian = Address.fromString("0x0000000000000000000000000000000000000001");
      let recoveryDelay = BigInt.fromI32(86400); // 1 day

      let event = createOrgRegisteredEvent(orgId, maxCredentials, guardian, recoveryDelay);
      handleOrgRegistered(event);

      let orgIdHex = orgId.toHexString();
      assert.entityCount("PasskeyOrgConfig", 1);
      assert.fieldEquals("PasskeyOrgConfig", orgIdHex, "maxCredentialsPerAccount", "5");
      assert.fieldEquals("PasskeyOrgConfig", orgIdHex, "enabled", "true");
      assert.fieldEquals(
        "PasskeyOrgConfig",
        orgIdHex,
        "defaultGuardian",
        "0x0000000000000000000000000000000000000001"
      );
      assert.fieldEquals("PasskeyOrgConfig", orgIdHex, "recoveryDelay", "86400");
    });

    test("creates multiple PasskeyOrgConfig entities for different orgs", () => {
      let guardian = Address.fromString("0x0000000000000000000000000000000000000001");
      let recoveryDelay = BigInt.fromI32(86400);

      let orgId1 = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let event1 = createOrgRegisteredEvent(orgId1, 5, guardian, recoveryDelay);
      handleOrgRegistered(event1);

      let orgId2 = Bytes.fromHexString("0x3333333333333333333333333333333333333333333333333333333333333333");
      let event2 = createOrgRegisteredEvent(orgId2, 10, guardian, recoveryDelay);
      handleOrgRegistered(event2);

      assert.entityCount("PasskeyOrgConfig", 2);
    });
  });

  describe("handleOrgConfigUpdated", () => {
    test("updates PasskeyOrgConfig updatedAt timestamp", () => {
      // First register the org
      let orgId = getTestOrgId();
      let guardian = Address.fromString("0x0000000000000000000000000000000000000001");
      let recoveryDelay = BigInt.fromI32(86400);

      let registerEvent = createOrgRegisteredEvent(orgId, 5, guardian, recoveryDelay);
      handleOrgRegistered(registerEvent);

      // Then update it
      let updateEvent = createOrgConfigUpdatedEvent(orgId);
      updateEvent.block.timestamp = BigInt.fromI32(2000);
      handleOrgConfigUpdated(updateEvent);

      let orgIdHex = orgId.toHexString();
      assert.fieldEquals("PasskeyOrgConfig", orgIdHex, "updatedAt", "2000");
    });

    test("does nothing if org config does not exist", () => {
      let orgId = getTestOrgId();
      let event = createOrgConfigUpdatedEvent(orgId);

      // Should not throw
      handleOrgConfigUpdated(event);

      assert.entityCount("PasskeyOrgConfig", 0);
    });
  });

  describe("handleFactoryExecutorUpdated", () => {
    beforeEach(() => {
      setupFactory();
    });

    test("updates factory executor address", () => {
      let oldExecutor = Address.fromString(FACTORY_ADDRESS);
      let newExecutor = Address.fromString("0x0000000000000000000000000000000000000001");

      let event = createFactoryExecutorUpdatedEvent(oldExecutor, newExecutor);
      handleFactoryExecutorUpdated(event);

      assert.fieldEquals(
        "PasskeyAccountFactory",
        FACTORY_ADDRESS,
        "executor",
        "0x0000000000000000000000000000000000000001"
      );
    });

    test("does nothing if factory does not exist", () => {
      clearStore(); // Remove the factory created in beforeEach

      let oldExecutor = Address.fromString(FACTORY_ADDRESS);
      let newExecutor = Address.fromString("0x0000000000000000000000000000000000000001");

      let event = createFactoryExecutorUpdatedEvent(oldExecutor, newExecutor);

      // Should not throw
      handleFactoryExecutorUpdated(event);

      assert.entityCount("PasskeyAccountFactory", 0);
    });
  });
});
