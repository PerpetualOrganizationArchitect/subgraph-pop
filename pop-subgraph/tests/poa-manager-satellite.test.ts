import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleUpgradeReceived,
  handleContractTypeReceived,
  handleAdminCallReceived,
  handleSatellitePauseSet
} from "../src/poa-manager-satellite";
import {
  createUpgradeReceivedEvent,
  createContractTypeReceivedEvent,
  createAdminCallReceivedEvent,
  createSatellitePauseSetEvent
} from "./poa-manager-satellite-utils";

// Default mock event address used by matchstick-as
const DEFAULT_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

describe("PoaManagerSatellite", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleUpgradeReceived", () => {
    test("creates PoaManagerSatelliteContract entity", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let version = "v2";
      let origin = BigInt.fromI32(1);

      let event = createUpgradeReceivedEvent(typeId, newImpl, version, origin);
      handleUpgradeReceived(event);

      assert.entityCount("PoaManagerSatelliteContract", 1);
      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "false"
      );
    });

    test("creates CrossChainUpgradeReceived entity with correct fields", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let version = "v2";
      let origin = BigInt.fromI32(6648936);

      let event = createUpgradeReceivedEvent(typeId, newImpl, version, origin);
      handleUpgradeReceived(event);

      assert.entityCount("CrossChainUpgradeReceived", 1);
    });

    test("links upgrade to satellite entity", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let version = "v2";
      let origin = BigInt.fromI32(1);

      let event = createUpgradeReceivedEvent(typeId, newImpl, version, origin);
      handleUpgradeReceived(event);

      // The entity ID is txHash.concatI32(logIndex)
      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "satellite",
        DEFAULT_ADDRESS
      );
    });

    test("stores originDomain from origin parameter", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let version = "v2";
      let origin = BigInt.fromI32(6648936);

      let event = createUpgradeReceivedEvent(typeId, newImpl, version, origin);
      handleUpgradeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "originDomain",
        "6648936"
      );
    });

    test("stores typeId, newImplementation, and version", () => {
      let typeId = Bytes.fromHexString(
        "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000002"
      );
      let version = "v3";
      let origin = BigInt.fromI32(1);

      let event = createUpgradeReceivedEvent(typeId, newImpl, version, origin);
      handleUpgradeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "typeId",
        typeId.toHexString()
      );
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "newImplementation",
        newImpl.toHexString()
      );
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "version",
        "v3"
      );
    });

    test("multiple upgrades create multiple entities", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );

      let event1 = createUpgradeReceivedEvent(
        typeId,
        newImpl,
        "v2",
        BigInt.fromI32(1)
      );
      handleUpgradeReceived(event1);

      let newImpl2 = Address.fromString(
        "0x0000000000000000000000000000000000000002"
      );
      let event2 = createUpgradeReceivedEvent(
        typeId,
        newImpl2,
        "v3",
        BigInt.fromI32(1)
      );
      event2.logIndex = BigInt.fromI32(2);
      handleUpgradeReceived(event2);

      assert.entityCount("CrossChainUpgradeReceived", 2);
      assert.entityCount("PoaManagerSatelliteContract", 1);
    });

    test("stores transactionHash", () => {
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );

      let event = createUpgradeReceivedEvent(
        typeId,
        newImpl,
        "v1",
        BigInt.fromI32(1)
      );
      handleUpgradeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainUpgradeReceived",
        id.toHexString(),
        "transactionHash",
        event.transaction.hash.toHexString()
      );
    });
  });

  describe("handleContractTypeReceived", () => {
    test("creates CrossChainContractTypeReceived entity", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let typeName = "TaskManager";
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000003"
      );
      let origin = BigInt.fromI32(1);

      let event = createContractTypeReceivedEvent(
        typeId,
        typeName,
        impl,
        origin
      );
      handleContractTypeReceived(event);

      assert.entityCount("CrossChainContractTypeReceived", 1);
    });

    test("stores typeName and implementation", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let typeName = "HybridVoting";
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000005"
      );
      let origin = BigInt.fromI32(42);

      let event = createContractTypeReceivedEvent(
        typeId,
        typeName,
        impl,
        origin
      );
      handleContractTypeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "typeName",
        "HybridVoting"
      );
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "implementation",
        impl.toHexString()
      );
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "typeId",
        typeId.toHexString()
      );
    });

    test("links to satellite entity", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000003"
      );

      let event = createContractTypeReceivedEvent(
        typeId,
        "Executor",
        impl,
        BigInt.fromI32(1)
      );
      handleContractTypeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "satellite",
        DEFAULT_ADDRESS
      );
    });

    test("stores originDomain", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000003"
      );

      let event = createContractTypeReceivedEvent(
        typeId,
        "Executor",
        impl,
        BigInt.fromI32(10)
      );
      handleContractTypeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "originDomain",
        "10"
      );
    });

    test("creates satellite on first event", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000003"
      );

      let event = createContractTypeReceivedEvent(
        typeId,
        "Executor",
        impl,
        BigInt.fromI32(1)
      );
      handleContractTypeReceived(event);

      assert.entityCount("PoaManagerSatelliteContract", 1);
      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "false"
      );
    });

    test("stores transactionHash", () => {
      let typeId = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000003"
      );

      let event = createContractTypeReceivedEvent(
        typeId,
        "Executor",
        impl,
        BigInt.fromI32(1)
      );
      handleContractTypeReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainContractTypeReceived",
        id.toHexString(),
        "transactionHash",
        event.transaction.hash.toHexString()
      );
    });
  });

  describe("handleAdminCallReceived", () => {
    test("creates CrossChainAdminCallReceived entity", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xabcdef01");
      let origin = BigInt.fromI32(1);

      let event = createAdminCallReceivedEvent(target, data, origin);
      handleAdminCallReceived(event);

      assert.entityCount("CrossChainAdminCallReceived", 1);
    });

    test("stores target and data", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xdeadbeef");
      let origin = BigInt.fromI32(1);

      let event = createAdminCallReceivedEvent(target, data, origin);
      handleAdminCallReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainAdminCallReceived",
        id.toHexString(),
        "target",
        target.toHexString()
      );
      assert.fieldEquals(
        "CrossChainAdminCallReceived",
        id.toHexString(),
        "data",
        data.toHexString()
      );
    });

    test("stores originDomain", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xabcdef01");
      let origin = BigInt.fromI32(999);

      let event = createAdminCallReceivedEvent(target, data, origin);
      handleAdminCallReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainAdminCallReceived",
        id.toHexString(),
        "originDomain",
        "999"
      );
    });

    test("links to satellite entity", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xabcdef01");

      let event = createAdminCallReceivedEvent(
        target,
        data,
        BigInt.fromI32(1)
      );
      handleAdminCallReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainAdminCallReceived",
        id.toHexString(),
        "satellite",
        DEFAULT_ADDRESS
      );
    });

    test("creates satellite on first event", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xabcdef01");

      let event = createAdminCallReceivedEvent(
        target,
        data,
        BigInt.fromI32(1)
      );
      handleAdminCallReceived(event);

      assert.entityCount("PoaManagerSatelliteContract", 1);
    });

    test("stores transactionHash", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xabcdef01");

      let event = createAdminCallReceivedEvent(
        target,
        data,
        BigInt.fromI32(1)
      );
      handleAdminCallReceived(event);

      let id = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.fieldEquals(
        "CrossChainAdminCallReceived",
        id.toHexString(),
        "transactionHash",
        event.transaction.hash.toHexString()
      );
    });

    test("multiple admin calls create multiple entities", () => {
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data1 = Bytes.fromHexString("0xabcdef01");
      let data2 = Bytes.fromHexString("0x12345678");

      let event1 = createAdminCallReceivedEvent(
        target,
        data1,
        BigInt.fromI32(1)
      );
      handleAdminCallReceived(event1);

      let event2 = createAdminCallReceivedEvent(
        target,
        data2,
        BigInt.fromI32(1)
      );
      event2.logIndex = BigInt.fromI32(2);
      handleAdminCallReceived(event2);

      assert.entityCount("CrossChainAdminCallReceived", 2);
      assert.entityCount("PoaManagerSatelliteContract", 1);
    });
  });

  describe("handleSatellitePauseSet", () => {
    test("sets paused to true on satellite entity", () => {
      let event = createSatellitePauseSetEvent(true);
      handleSatellitePauseSet(event);

      assert.entityCount("PoaManagerSatelliteContract", 1);
      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "true"
      );
    });

    test("sets paused to false on satellite entity", () => {
      // First pause
      let pauseEvent = createSatellitePauseSetEvent(true);
      handleSatellitePauseSet(pauseEvent);

      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "true"
      );

      // Then unpause
      let unpauseEvent = createSatellitePauseSetEvent(false);
      handleSatellitePauseSet(unpauseEvent);

      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "false"
      );
    });

    test("creates satellite if it doesn't exist", () => {
      let event = createSatellitePauseSetEvent(false);
      handleSatellitePauseSet(event);

      assert.entityCount("PoaManagerSatelliteContract", 1);
      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "false"
      );
    });
  });

  describe("Integration tests", () => {
    test("full lifecycle: receive types, upgrades, admin calls, then pause", () => {
      // Receive a contract type
      let typeId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let impl = Address.fromString(
        "0x0000000000000000000000000000000000000001"
      );
      let typeEvent = createContractTypeReceivedEvent(
        typeId,
        "TaskManager",
        impl,
        BigInt.fromI32(1)
      );
      handleContractTypeReceived(typeEvent);

      // Receive an upgrade
      let newImpl = Address.fromString(
        "0x0000000000000000000000000000000000000002"
      );
      let upgradeEvent = createUpgradeReceivedEvent(
        typeId,
        newImpl,
        "v2",
        BigInt.fromI32(1)
      );
      upgradeEvent.logIndex = BigInt.fromI32(2);
      handleUpgradeReceived(upgradeEvent);

      // Receive an admin call
      let target = Address.fromString(
        "0x0000000000000000000000000000000000000010"
      );
      let data = Bytes.fromHexString("0xdeadbeef");
      let adminEvent = createAdminCallReceivedEvent(
        target,
        data,
        BigInt.fromI32(1)
      );
      adminEvent.logIndex = BigInt.fromI32(3);
      handleAdminCallReceived(adminEvent);

      // Pause the satellite
      let pauseEvent = createSatellitePauseSetEvent(true);
      handleSatellitePauseSet(pauseEvent);

      // Verify final state
      assert.entityCount("PoaManagerSatelliteContract", 1);
      assert.entityCount("CrossChainContractTypeReceived", 1);
      assert.entityCount("CrossChainUpgradeReceived", 1);
      assert.entityCount("CrossChainAdminCallReceived", 1);

      assert.fieldEquals(
        "PoaManagerSatelliteContract",
        DEFAULT_ADDRESS,
        "paused",
        "true"
      );
    });
  });
});
