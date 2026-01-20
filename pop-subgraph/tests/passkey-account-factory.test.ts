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
  handleGlobalConfigUpdated,
  handlePoaManagerUpdated,
  handlePausedStateChanged
} from "../src/passkey-account-factory";
import {
  createAccountCreatedEvent,
  createGlobalConfigUpdatedEvent,
  createPoaManagerUpdatedEvent,
  createPausedStateChangedEvent
} from "./passkey-account-factory-utils";
import {
  PasskeyAccountFactory,
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
  factory.poaManager = factoryAddress;
  factory.accountBeacon = null; // Optional - no event to track
  factory.poaGuardian = Address.zero();
  factory.recoveryDelay = BigInt.fromI32(604800);
  factory.maxCredentialsPerAccount = 10;
  factory.paused = false;
  factory.createdAt = BigInt.fromI32(1000);
  factory.blockNumber = BigInt.fromI32(100);
  factory.save();
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
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let event = createAccountCreatedEvent(accountAddress, credentialId, owner);
      handleAccountCreated(event);

      // Should not create account if factory doesn't exist
      assert.entityCount("PasskeyAccount", 0);
    });

    test("creates PasskeyAccount entity with correct fields", () => {
      let accountAddress = Address.fromString("0x0000000000000000000000000000000000000001");
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let event = createAccountCreatedEvent(accountAddress, credentialId, owner);
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
      assert.fieldEquals(
        "PasskeyAccount",
        "0x0000000000000000000000000000000000000001",
        "initialCredentialId",
        credentialId.toHexString()
      );
    });

    test("creates multiple PasskeyAccount entities for different addresses", () => {
      let credentialId = getTestCredentialId();
      let owner = Address.fromString("0x0000000000000000000000000000000000000002");

      let account1 = Address.fromString("0x0000000000000000000000000000000000000001");
      let event1 = createAccountCreatedEvent(account1, credentialId, owner);
      handleAccountCreated(event1);

      let account2 = Address.fromString("0x0000000000000000000000000000000000000003");
      let event2 = createAccountCreatedEvent(account2, credentialId, owner);
      handleAccountCreated(event2);

      assert.entityCount("PasskeyAccount", 2);
      assert.entityCount("PasskeyAccountFactory", 1);
    });
  });

  describe("handleGlobalConfigUpdated", () => {
    beforeEach(() => {
      setupFactory();
    });

    test("updates PasskeyAccountFactory global config fields", () => {
      let guardian = Address.fromString("0x0000000000000000000000000000000000000001");
      let recoveryDelay = BigInt.fromI32(172800); // 2 days
      let maxCredentials: i32 = 5;

      let event = createGlobalConfigUpdatedEvent(guardian, recoveryDelay, maxCredentials);
      handleGlobalConfigUpdated(event);

      assert.fieldEquals(
        "PasskeyAccountFactory",
        FACTORY_ADDRESS,
        "poaGuardian",
        "0x0000000000000000000000000000000000000001"
      );
      assert.fieldEquals(
        "PasskeyAccountFactory",
        FACTORY_ADDRESS,
        "recoveryDelay",
        "172800"
      );
      assert.fieldEquals(
        "PasskeyAccountFactory",
        FACTORY_ADDRESS,
        "maxCredentialsPerAccount",
        "5"
      );
    });

    test("does nothing if factory does not exist", () => {
      clearStore();

      let guardian = Address.fromString("0x0000000000000000000000000000000000000001");
      let recoveryDelay = BigInt.fromI32(172800);
      let maxCredentials: i32 = 5;

      let event = createGlobalConfigUpdatedEvent(guardian, recoveryDelay, maxCredentials);

      // Should not throw
      handleGlobalConfigUpdated(event);

      assert.entityCount("PasskeyAccountFactory", 0);
    });
  });

  describe("handlePoaManagerUpdated", () => {
    beforeEach(() => {
      setupFactory();
    });

    test("updates factory poaManager address", () => {
      let oldPoaManager = Address.fromString(FACTORY_ADDRESS);
      let newPoaManager = Address.fromString("0x0000000000000000000000000000000000000001");

      let event = createPoaManagerUpdatedEvent(oldPoaManager, newPoaManager);
      handlePoaManagerUpdated(event);

      assert.fieldEquals(
        "PasskeyAccountFactory",
        FACTORY_ADDRESS,
        "poaManager",
        "0x0000000000000000000000000000000000000001"
      );
    });

    test("does nothing if factory does not exist", () => {
      clearStore();

      let oldPoaManager = Address.fromString(FACTORY_ADDRESS);
      let newPoaManager = Address.fromString("0x0000000000000000000000000000000000000001");

      let event = createPoaManagerUpdatedEvent(oldPoaManager, newPoaManager);

      // Should not throw
      handlePoaManagerUpdated(event);

      assert.entityCount("PasskeyAccountFactory", 0);
    });
  });

  describe("handlePausedStateChanged", () => {
    beforeEach(() => {
      setupFactory();
    });

    test("sets factory paused to true", () => {
      let event = createPausedStateChangedEvent(true);
      handlePausedStateChanged(event);

      assert.fieldEquals("PasskeyAccountFactory", FACTORY_ADDRESS, "paused", "true");
    });

    test("sets factory paused to false", () => {
      // First pause
      let pauseEvent = createPausedStateChangedEvent(true);
      handlePausedStateChanged(pauseEvent);

      // Then unpause
      let unpauseEvent = createPausedStateChangedEvent(false);
      unpauseEvent.logIndex = BigInt.fromI32(2);
      handlePausedStateChanged(unpauseEvent);

      assert.fieldEquals("PasskeyAccountFactory", FACTORY_ADDRESS, "paused", "false");
    });

    test("does nothing if factory does not exist", () => {
      clearStore();

      let event = createPausedStateChangedEvent(true);

      // Should not throw
      handlePausedStateChanged(event);

      assert.entityCount("PasskeyAccountFactory", 0);
    });
  });
});
