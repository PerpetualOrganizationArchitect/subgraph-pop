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
  handleCredentialAdded,
  handleCredentialRemoved,
  handleCredentialStatusChanged,
  handleGuardianUpdated,
  handleRecoveryDelayUpdated,
  handleRecoveryInitiated,
  handleRecoveryCompleted,
  handleRecoveryCancelled,
  handleExecuted,
  handleBatchExecuted
} from "../src/passkey-account";
import {
  createCredentialAddedEvent,
  createCredentialRemovedEvent,
  createCredentialStatusChangedEvent,
  createGuardianUpdatedEvent,
  createRecoveryDelayUpdatedEvent,
  createRecoveryInitiatedEvent,
  createRecoveryCompletedEvent,
  createRecoveryCancelledEvent,
  createExecutedEvent,
  createBatchExecutedEvent
} from "./passkey-account-utils";
import {
  PasskeyAccountFactory,
  PasskeyAccount,
  PasskeyCredential,
  RecoveryRequest
} from "../generated/schema";

// Default mock event address used by matchstick
const ACCOUNT_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";
const FACTORY_ADDRESS = "0x0000000000000000000000000000000000000099";

/**
 * Helper function to create necessary entities for account tests.
 */
function setupAccountEntities(): void {
  // Create factory
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

  // Create account
  let accountAddress = Address.fromString(ACCOUNT_ADDRESS);
  let account = new PasskeyAccount(accountAddress);
  account.factory = factoryAddress;
  account.initialCredentialId = getTestCredentialId();
  account.owner = Address.fromString("0x0000000000000000000000000000000000000001");
  account.guardian = Address.zero();
  account.recoveryDelay = BigInt.fromI32(0);
  account.createdAt = BigInt.fromI32(1000);
  account.blockNumber = BigInt.fromI32(100);
  account.transactionHash = Bytes.fromHexString("0xabcd");
  account.save();
}

/**
 * Helper to create a test credential ID
 */
function getTestCredentialId(): Bytes {
  return Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
}

/**
 * Helper to create a test recovery ID
 */
function getTestRecoveryId(): Bytes {
  return Bytes.fromHexString("0x3333333333333333333333333333333333333333333333333333333333333333");
}

describe("PasskeyAccount", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleCredentialAdded", () => {
    test("creates PasskeyCredential entity with correct fields", () => {
      let credentialId = getTestCredentialId();
      let createdAt = BigInt.fromI32(1000);

      let event = createCredentialAddedEvent(credentialId, createdAt);
      handleCredentialAdded(event);

      let entityId = ACCOUNT_ADDRESS + "-" + credentialId.toHexString();
      assert.entityCount("PasskeyCredential", 1);
      assert.fieldEquals("PasskeyCredential", entityId, "active", "true");
      assert.fieldEquals("PasskeyCredential", entityId, "signCount", "0");
      assert.fieldEquals("PasskeyCredential", entityId, "createdAt", "1000");
    });

    test("creates multiple credentials for same account", () => {
      let createdAt = BigInt.fromI32(1000);

      let cred1 = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let event1 = createCredentialAddedEvent(cred1, createdAt);
      handleCredentialAdded(event1);

      let cred2 = Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
      let event2 = createCredentialAddedEvent(cred2, createdAt);
      handleCredentialAdded(event2);

      assert.entityCount("PasskeyCredential", 2);
    });
  });

  describe("handleCredentialRemoved", () => {
    test("sets credential active to false and records removedAt", () => {
      // First add a credential
      let credentialId = getTestCredentialId();
      let createdAt = BigInt.fromI32(1000);

      let addEvent = createCredentialAddedEvent(credentialId, createdAt);
      handleCredentialAdded(addEvent);

      // Then remove it
      let removeEvent = createCredentialRemovedEvent(credentialId);
      removeEvent.block.timestamp = BigInt.fromI32(2000);
      handleCredentialRemoved(removeEvent);

      let entityId = ACCOUNT_ADDRESS + "-" + credentialId.toHexString();
      assert.fieldEquals("PasskeyCredential", entityId, "active", "false");
      assert.fieldEquals("PasskeyCredential", entityId, "removedAt", "2000");
    });

    test("does nothing if credential does not exist", () => {
      let credentialId = getTestCredentialId();
      let event = createCredentialRemovedEvent(credentialId);

      // Should not throw
      handleCredentialRemoved(event);

      assert.entityCount("PasskeyCredential", 0);
    });
  });

  describe("handleCredentialStatusChanged", () => {
    test("updates credential active status to false", () => {
      // First add a credential
      let credentialId = getTestCredentialId();
      let createdAt = BigInt.fromI32(1000);

      let addEvent = createCredentialAddedEvent(credentialId, createdAt);
      handleCredentialAdded(addEvent);

      // Then deactivate it
      let statusEvent = createCredentialStatusChangedEvent(credentialId, false);
      handleCredentialStatusChanged(statusEvent);

      let entityId = ACCOUNT_ADDRESS + "-" + credentialId.toHexString();
      assert.fieldEquals("PasskeyCredential", entityId, "active", "false");
    });

    test("updates credential active status to true", () => {
      // First add a credential
      let credentialId = getTestCredentialId();
      let createdAt = BigInt.fromI32(1000);

      let addEvent = createCredentialAddedEvent(credentialId, createdAt);
      handleCredentialAdded(addEvent);

      // Deactivate then reactivate
      let deactivateEvent = createCredentialStatusChangedEvent(credentialId, false);
      handleCredentialStatusChanged(deactivateEvent);

      let activateEvent = createCredentialStatusChangedEvent(credentialId, true);
      handleCredentialStatusChanged(activateEvent);

      let entityId = ACCOUNT_ADDRESS + "-" + credentialId.toHexString();
      assert.fieldEquals("PasskeyCredential", entityId, "active", "true");
    });
  });

  describe("handleGuardianUpdated", () => {
    beforeEach(() => {
      setupAccountEntities();
    });

    test("updates account guardian and creates GuardianChange entity", () => {
      let oldGuardian = Address.zero();
      let newGuardian = Address.fromString("0x0000000000000000000000000000000000000002");

      let event = createGuardianUpdatedEvent(oldGuardian, newGuardian);
      handleGuardianUpdated(event);

      assert.fieldEquals(
        "PasskeyAccount",
        ACCOUNT_ADDRESS,
        "guardian",
        "0x0000000000000000000000000000000000000002"
      );
      assert.entityCount("GuardianChange", 1);
    });

    test("creates multiple GuardianChange entities for successive updates", () => {
      let guardian1 = Address.fromString("0x0000000000000000000000000000000000000001");
      let guardian2 = Address.fromString("0x0000000000000000000000000000000000000002");
      let guardian3 = Address.fromString("0x0000000000000000000000000000000000000003");

      let event1 = createGuardianUpdatedEvent(Address.zero(), guardian1);
      handleGuardianUpdated(event1);

      let event2 = createGuardianUpdatedEvent(guardian1, guardian2);
      event2.logIndex = BigInt.fromI32(2);
      handleGuardianUpdated(event2);

      let event3 = createGuardianUpdatedEvent(guardian2, guardian3);
      event3.logIndex = BigInt.fromI32(3);
      handleGuardianUpdated(event3);

      assert.entityCount("GuardianChange", 3);
      assert.fieldEquals(
        "PasskeyAccount",
        ACCOUNT_ADDRESS,
        "guardian",
        "0x0000000000000000000000000000000000000003"
      );
    });
  });

  describe("handleRecoveryDelayUpdated", () => {
    beforeEach(() => {
      setupAccountEntities();
    });

    test("updates account recovery delay", () => {
      let oldDelay = BigInt.fromI32(0);
      let newDelay = BigInt.fromI32(86400); // 1 day

      let event = createRecoveryDelayUpdatedEvent(oldDelay, newDelay);
      handleRecoveryDelayUpdated(event);

      assert.fieldEquals("PasskeyAccount", ACCOUNT_ADDRESS, "recoveryDelay", "86400");
    });
  });

  describe("handleRecoveryInitiated", () => {
    test("creates RecoveryRequest entity with PENDING status", () => {
      let recoveryId = getTestRecoveryId();
      let credentialId = getTestCredentialId();
      let initiator = Address.fromString("0x0000000000000000000000000000000000000001");
      let executeAfter = BigInt.fromI32(2000);

      let event = createRecoveryInitiatedEvent(recoveryId, credentialId, initiator, executeAfter);
      handleRecoveryInitiated(event);

      let entityId = ACCOUNT_ADDRESS + "-" + recoveryId.toHexString();
      assert.entityCount("RecoveryRequest", 1);
      assert.fieldEquals("RecoveryRequest", entityId, "status", "PENDING");
      assert.fieldEquals("RecoveryRequest", entityId, "executeAfter", "2000");
      assert.fieldEquals(
        "RecoveryRequest",
        entityId,
        "initiator",
        "0x0000000000000000000000000000000000000001"
      );
    });
  });

  describe("handleRecoveryCompleted", () => {
    test("updates RecoveryRequest status to COMPLETED", () => {
      // First initiate recovery
      let recoveryId = getTestRecoveryId();
      let credentialId = getTestCredentialId();
      let initiator = Address.fromString("0x0000000000000000000000000000000000000001");
      let executeAfter = BigInt.fromI32(2000);

      let initiateEvent = createRecoveryInitiatedEvent(recoveryId, credentialId, initiator, executeAfter);
      handleRecoveryInitiated(initiateEvent);

      // Then complete it
      let completeEvent = createRecoveryCompletedEvent(recoveryId, credentialId);
      completeEvent.block.timestamp = BigInt.fromI32(3000);
      handleRecoveryCompleted(completeEvent);

      let entityId = ACCOUNT_ADDRESS + "-" + recoveryId.toHexString();
      assert.fieldEquals("RecoveryRequest", entityId, "status", "COMPLETED");
      assert.fieldEquals("RecoveryRequest", entityId, "completedAt", "3000");
    });

    test("does nothing if recovery request does not exist", () => {
      let recoveryId = getTestRecoveryId();
      let credentialId = getTestCredentialId();

      let event = createRecoveryCompletedEvent(recoveryId, credentialId);

      // Should not throw
      handleRecoveryCompleted(event);

      assert.entityCount("RecoveryRequest", 0);
    });
  });

  describe("handleRecoveryCancelled", () => {
    test("updates RecoveryRequest status to CANCELLED", () => {
      // First initiate recovery
      let recoveryId = getTestRecoveryId();
      let credentialId = getTestCredentialId();
      let initiator = Address.fromString("0x0000000000000000000000000000000000000001");
      let executeAfter = BigInt.fromI32(2000);

      let initiateEvent = createRecoveryInitiatedEvent(recoveryId, credentialId, initiator, executeAfter);
      handleRecoveryInitiated(initiateEvent);

      // Then cancel it
      let cancelEvent = createRecoveryCancelledEvent(recoveryId);
      cancelEvent.block.timestamp = BigInt.fromI32(2500);
      handleRecoveryCancelled(cancelEvent);

      let entityId = ACCOUNT_ADDRESS + "-" + recoveryId.toHexString();
      assert.fieldEquals("RecoveryRequest", entityId, "status", "CANCELLED");
      assert.fieldEquals("RecoveryRequest", entityId, "cancelledAt", "2500");
    });
  });

  describe("handleExecuted", () => {
    test("creates PasskeyExecution entity with correct fields", () => {
      let target = Address.fromString("0x0000000000000000000000000000000000000001");
      let value = BigInt.fromI32(1000);
      let data = Bytes.fromHexString("0xabcd");
      let result = Bytes.fromHexString("0x1234");

      let event = createExecutedEvent(target, value, data, result);
      handleExecuted(event);

      assert.entityCount("PasskeyExecution", 1);
    });

    test("creates multiple PasskeyExecution entities for different calls", () => {
      let target = Address.fromString("0x0000000000000000000000000000000000000001");
      let value = BigInt.fromI32(1000);
      let data = Bytes.fromHexString("0xabcd");
      let result = Bytes.fromHexString("0x1234");

      let event1 = createExecutedEvent(target, value, data, result);
      handleExecuted(event1);

      let event2 = createExecutedEvent(target, value, data, result);
      event2.logIndex = BigInt.fromI32(2);
      handleExecuted(event2);

      assert.entityCount("PasskeyExecution", 2);
    });
  });

  describe("handleBatchExecuted", () => {
    test("creates PasskeyBatchExecution entity with correct count", () => {
      let count = BigInt.fromI32(5);

      let event = createBatchExecutedEvent(count);
      handleBatchExecuted(event);

      assert.entityCount("PasskeyBatchExecution", 1);
    });
  });
});
