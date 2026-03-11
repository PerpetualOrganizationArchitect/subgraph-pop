import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleCrossChainUpgradeDispatched,
  handleCrossChainAddTypeDispatched,
  handleCrossChainAdminCallDispatched,
  handleSatelliteRegistered,
  handleSatelliteRemoved,
  handleHubPauseSet
} from "../src/poa-manager-hub";
import {
  createCrossChainUpgradeDispatchedEvent,
  createCrossChainAddTypeDispatchedEvent,
  createCrossChainAdminCallDispatchedEvent,
  createSatelliteRegisteredEvent,
  createSatelliteRemovedEvent,
  createPauseSetEvent
} from "./poa-manager-hub-utils";

// Default mock event address used by matchstick
const HUB_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

describe("PoaManagerHub", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleCrossChainUpgradeDispatched", () => {
    test("creates CrossChainUpgradeDispatch entity with correct fields", () => {
      let typeId = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let newImpl = Address.fromString("0x0000000000000000000000000000000000000001");
      let version = "2.0.0";

      let event = createCrossChainUpgradeDispatchedEvent(typeId, newImpl, version);
      handleCrossChainUpgradeDispatched(event);

      assert.entityCount("CrossChainUpgradeDispatch", 1);
      assert.entityCount("PoaManagerHubContract", 1);
    });

    test("creates hub entity on first dispatch", () => {
      let typeId = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let newImpl = Address.fromString("0x0000000000000000000000000000000000000001");
      let version = "1.0.0";

      let event = createCrossChainUpgradeDispatchedEvent(typeId, newImpl, version);
      handleCrossChainUpgradeDispatched(event);

      assert.fieldEquals("PoaManagerHubContract", HUB_ADDRESS, "paused", "false");
    });

    test("stores typeId, newImplementation, and version correctly", () => {
      let typeId = Bytes.fromHexString("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      let newImpl = Address.fromString("0x0000000000000000000000000000000000000042");
      let version = "3.1.0";

      let event = createCrossChainUpgradeDispatchedEvent(typeId, newImpl, version);
      handleCrossChainUpgradeDispatched(event);

      // Entity ID is txHash.concatI32(logIndex)
      let txHash = event.transaction.hash;
      let entityId = txHash.concatI32(event.logIndex.toI32());

      assert.fieldEquals(
        "CrossChainUpgradeDispatch",
        entityId.toHexString(),
        "typeId",
        typeId.toHexString()
      );
      assert.fieldEquals(
        "CrossChainUpgradeDispatch",
        entityId.toHexString(),
        "newImplementation",
        "0x0000000000000000000000000000000000000042"
      );
      assert.fieldEquals(
        "CrossChainUpgradeDispatch",
        entityId.toHexString(),
        "version",
        "3.1.0"
      );
      assert.fieldEquals(
        "CrossChainUpgradeDispatch",
        entityId.toHexString(),
        "hub",
        HUB_ADDRESS
      );
    });

    test("creates multiple dispatch entities for different events", () => {
      let typeId = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let newImpl = Address.fromString("0x0000000000000000000000000000000000000001");

      let event1 = createCrossChainUpgradeDispatchedEvent(typeId, newImpl, "1.0.0");
      handleCrossChainUpgradeDispatched(event1);

      let event2 = createCrossChainUpgradeDispatchedEvent(typeId, newImpl, "2.0.0");
      event2.logIndex = BigInt.fromI32(2);
      handleCrossChainUpgradeDispatched(event2);

      assert.entityCount("CrossChainUpgradeDispatch", 2);
      assert.entityCount("PoaManagerHubContract", 1);
    });
  });

  describe("handleCrossChainAddTypeDispatched", () => {
    test("creates CrossChainAddTypeDispatch entity with correct fields", () => {
      let typeId = Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
      let typeName = "HybridVoting";
      let impl = Address.fromString("0x0000000000000000000000000000000000000005");

      let event = createCrossChainAddTypeDispatchedEvent(typeId, typeName, impl);
      handleCrossChainAddTypeDispatched(event);

      assert.entityCount("CrossChainAddTypeDispatch", 1);
      assert.entityCount("PoaManagerHubContract", 1);

      let txHash = event.transaction.hash;
      let entityId = txHash.concatI32(event.logIndex.toI32());

      assert.fieldEquals(
        "CrossChainAddTypeDispatch",
        entityId.toHexString(),
        "typeId",
        typeId.toHexString()
      );
      assert.fieldEquals(
        "CrossChainAddTypeDispatch",
        entityId.toHexString(),
        "typeName",
        "HybridVoting"
      );
      assert.fieldEquals(
        "CrossChainAddTypeDispatch",
        entityId.toHexString(),
        "implementation",
        "0x0000000000000000000000000000000000000005"
      );
      assert.fieldEquals(
        "CrossChainAddTypeDispatch",
        entityId.toHexString(),
        "hub",
        HUB_ADDRESS
      );
    });

    test("creates multiple add-type dispatch entities", () => {
      let typeId1 = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
      let typeId2 = Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
      let impl = Address.fromString("0x0000000000000000000000000000000000000005");

      let event1 = createCrossChainAddTypeDispatchedEvent(typeId1, "TypeA", impl);
      handleCrossChainAddTypeDispatched(event1);

      let event2 = createCrossChainAddTypeDispatchedEvent(typeId2, "TypeB", impl);
      event2.logIndex = BigInt.fromI32(2);
      handleCrossChainAddTypeDispatched(event2);

      assert.entityCount("CrossChainAddTypeDispatch", 2);
    });
  });

  describe("handleCrossChainAdminCallDispatched", () => {
    test("creates CrossChainAdminCallDispatch entity with correct fields", () => {
      let target = Address.fromString("0x0000000000000000000000000000000000000010");
      let data = Bytes.fromHexString("0xabcdef01");

      let event = createCrossChainAdminCallDispatchedEvent(target, data);
      handleCrossChainAdminCallDispatched(event);

      assert.entityCount("CrossChainAdminCallDispatch", 1);
      assert.entityCount("PoaManagerHubContract", 1);

      let txHash = event.transaction.hash;
      let entityId = txHash.concatI32(event.logIndex.toI32());

      assert.fieldEquals(
        "CrossChainAdminCallDispatch",
        entityId.toHexString(),
        "target",
        "0x0000000000000000000000000000000000000010"
      );
      assert.fieldEquals(
        "CrossChainAdminCallDispatch",
        entityId.toHexString(),
        "data",
        "0xabcdef01"
      );
      assert.fieldEquals(
        "CrossChainAdminCallDispatch",
        entityId.toHexString(),
        "hub",
        HUB_ADDRESS
      );
    });

    test("creates multiple admin call dispatch entities", () => {
      let target = Address.fromString("0x0000000000000000000000000000000000000010");
      let data = Bytes.fromHexString("0xabcdef01");

      let event1 = createCrossChainAdminCallDispatchedEvent(target, data);
      handleCrossChainAdminCallDispatched(event1);

      let event2 = createCrossChainAdminCallDispatchedEvent(target, data);
      event2.logIndex = BigInt.fromI32(2);
      handleCrossChainAdminCallDispatched(event2);

      assert.entityCount("CrossChainAdminCallDispatch", 2);
    });
  });

  describe("handleSatelliteRegistered", () => {
    test("creates SatelliteRegistration entity with correct fields", () => {
      let domain = BigInt.fromI32(1);
      let satellite = Address.fromString("0x0000000000000000000000000000000000000020");

      let event = createSatelliteRegisteredEvent(domain, satellite);
      handleSatelliteRegistered(event);

      let entityId = HUB_ADDRESS + "-" + domain.toString();

      assert.entityCount("SatelliteRegistration", 1);
      assert.entityCount("PoaManagerHubContract", 1);

      assert.fieldEquals("SatelliteRegistration", entityId, "domain", "1");
      assert.fieldEquals(
        "SatelliteRegistration",
        entityId,
        "satellite",
        "0x0000000000000000000000000000000000000020"
      );
      assert.fieldEquals("SatelliteRegistration", entityId, "active", "true");
      assert.fieldEquals("SatelliteRegistration", entityId, "hub", HUB_ADDRESS);
    });

    test("creates multiple registrations for different domains", () => {
      let satellite = Address.fromString("0x0000000000000000000000000000000000000020");

      let event1 = createSatelliteRegisteredEvent(BigInt.fromI32(1), satellite);
      handleSatelliteRegistered(event1);

      let event2 = createSatelliteRegisteredEvent(BigInt.fromI32(2), satellite);
      event2.logIndex = BigInt.fromI32(2);
      handleSatelliteRegistered(event2);

      assert.entityCount("SatelliteRegistration", 2);

      let entityId1 = HUB_ADDRESS + "-1";
      let entityId2 = HUB_ADDRESS + "-2";

      assert.fieldEquals("SatelliteRegistration", entityId1, "domain", "1");
      assert.fieldEquals("SatelliteRegistration", entityId2, "domain", "2");
    });

    test("stores transactionHash correctly", () => {
      let domain = BigInt.fromI32(42);
      let satellite = Address.fromString("0x0000000000000000000000000000000000000020");

      let event = createSatelliteRegisteredEvent(domain, satellite);
      handleSatelliteRegistered(event);

      let entityId = HUB_ADDRESS + "-42";
      assert.fieldEquals(
        "SatelliteRegistration",
        entityId,
        "transactionHash",
        event.transaction.hash.toHexString()
      );
    });
  });

  describe("handleSatelliteRemoved", () => {
    test("sets active to false and records removedAt on existing registration", () => {
      // First register a satellite
      let domain = BigInt.fromI32(1);
      let satellite = Address.fromString("0x0000000000000000000000000000000000000020");

      let registerEvent = createSatelliteRegisteredEvent(domain, satellite);
      handleSatelliteRegistered(registerEvent);

      let entityId = HUB_ADDRESS + "-" + domain.toString();
      assert.fieldEquals("SatelliteRegistration", entityId, "active", "true");

      // Then remove it
      let removeEvent = createSatelliteRemovedEvent(domain);
      removeEvent.block.timestamp = BigInt.fromI32(2000);
      handleSatelliteRemoved(removeEvent);

      assert.fieldEquals("SatelliteRegistration", entityId, "active", "false");
      assert.fieldEquals("SatelliteRegistration", entityId, "removedAt", "2000");
    });

    test("does nothing if satellite registration does not exist", () => {
      let domain = BigInt.fromI32(999);

      let event = createSatelliteRemovedEvent(domain);

      // Should not throw
      handleSatelliteRemoved(event);

      assert.entityCount("SatelliteRegistration", 0);
    });

    test("only deactivates the targeted domain registration", () => {
      let satellite = Address.fromString("0x0000000000000000000000000000000000000020");

      // Register two satellites
      let event1 = createSatelliteRegisteredEvent(BigInt.fromI32(1), satellite);
      handleSatelliteRegistered(event1);

      let event2 = createSatelliteRegisteredEvent(BigInt.fromI32(2), satellite);
      event2.logIndex = BigInt.fromI32(2);
      handleSatelliteRegistered(event2);

      // Remove only domain 1
      let removeEvent = createSatelliteRemovedEvent(BigInt.fromI32(1));
      removeEvent.block.timestamp = BigInt.fromI32(3000);
      handleSatelliteRemoved(removeEvent);

      let entityId1 = HUB_ADDRESS + "-1";
      let entityId2 = HUB_ADDRESS + "-2";

      assert.fieldEquals("SatelliteRegistration", entityId1, "active", "false");
      assert.fieldEquals("SatelliteRegistration", entityId2, "active", "true");
    });
  });

  describe("handleHubPauseSet", () => {
    test("sets hub paused to true", () => {
      let event = createPauseSetEvent(true);
      handleHubPauseSet(event);

      assert.entityCount("PoaManagerHubContract", 1);
      assert.fieldEquals("PoaManagerHubContract", HUB_ADDRESS, "paused", "true");
    });

    test("sets hub paused to false", () => {
      // First pause
      let pauseEvent = createPauseSetEvent(true);
      handleHubPauseSet(pauseEvent);

      // Then unpause
      let unpauseEvent = createPauseSetEvent(false);
      unpauseEvent.logIndex = BigInt.fromI32(2);
      handleHubPauseSet(unpauseEvent);

      assert.fieldEquals("PoaManagerHubContract", HUB_ADDRESS, "paused", "false");
    });

    test("creates hub entity if it does not exist", () => {
      let event = createPauseSetEvent(false);
      handleHubPauseSet(event);

      assert.entityCount("PoaManagerHubContract", 1);
      assert.fieldEquals("PoaManagerHubContract", HUB_ADDRESS, "paused", "false");
    });
  });
});
