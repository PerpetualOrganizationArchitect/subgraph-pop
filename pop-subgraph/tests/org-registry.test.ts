import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleOrgRegistered,
  handleMetaUpdated,
  handleContractRegistered,
  handleAutoUpgradeSet,
  handleHatsTreeRegistered
} from "../src/org-registry";
import {
  createOrgRegisteredEvent,
  createMetaUpdatedEvent,
  createContractRegisteredEvent,
  createAutoUpgradeSetEvent,
  createHatsTreeRegisteredEvent
} from "./org-registry-utils";
import {
  OrgRegistryContract,
  RegisteredOrg,
  RegisteredContract
} from "../generated/schema";

// Default mock event address from matchstick
const REGISTRY_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

describe("OrgRegistry", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleOrgRegistered", () => {
    test("creates OrgRegistryContract singleton and RegisteredOrg entity", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let event = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(event);

      // Verify OrgRegistryContract was created
      assert.entityCount("OrgRegistryContract", 1);
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalOrgs",
        "1"
      );
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalContracts",
        "0"
      );

      // Verify RegisteredOrg was created
      assert.entityCount("RegisteredOrg", 1);
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "executor",
        "0x0000000000000000000000000000000000000001"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "metaData",
        "0xabcd"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "contractCount",
        "0"
      );
    });

    test("updates executor when called again for same org", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor1 = Address.fromString("0x0000000000000000000000000000000000000001");
      let executor2 = Address.fromString("0x0000000000000000000000000000000000000002");
      let metaData = Bytes.fromHexString("0xabcd");

      // First registration
      let event1 = createOrgRegisteredEvent(orgId, executor1, metaData);
      handleOrgRegistered(event1);

      // Second registration (executor update)
      let event2 = createOrgRegisteredEvent(orgId, executor2, Bytes.empty());
      event2.logIndex = BigInt.fromI32(2);
      handleOrgRegistered(event2);

      // Should still be 1 org
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalOrgs",
        "1"
      );

      // Executor should be updated
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "executor",
        "0x0000000000000000000000000000000000000002"
      );
    });

    test("registers multiple orgs correctly", () => {
      let orgId1 = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let orgId2 = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let event1 = createOrgRegisteredEvent(orgId1, executor, metaData);
      handleOrgRegistered(event1);

      let event2 = createOrgRegisteredEvent(orgId2, executor, metaData);
      event2.logIndex = BigInt.fromI32(2);
      handleOrgRegistered(event2);

      assert.entityCount("RegisteredOrg", 2);
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalOrgs",
        "2"
      );
    });
  });

  describe("handleMetaUpdated", () => {
    test("updates org metadata and creates history record", () => {
      // First register an org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      // Update metadata
      let newMetaData = Bytes.fromHexString("0xef01");
      let updateEvent = createMetaUpdatedEvent(orgId, newMetaData);
      updateEvent.logIndex = BigInt.fromI32(2);
      handleMetaUpdated(updateEvent);

      // Verify org metadata was updated
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "metaData",
        "0xef01"
      );

      // Verify history record was created
      assert.entityCount("OrgMetaUpdate", 1);
    });

    test("creates history record even if org not found", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newMetaData = Bytes.fromHexString("0xef01");

      let event = createMetaUpdatedEvent(orgId, newMetaData);
      handleMetaUpdated(event);

      // History record should still be created
      assert.entityCount("OrgMetaUpdate", 1);
    });
  });

  describe("handleContractRegistered", () => {
    test("creates RegisteredContract and updates counters", () => {
      // First register an org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      // Register a contract
      let contractId = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
      );
      let typeId = Bytes.fromHexString(
        "0x4444444444444444444444444444444444444444444444444444444444444444"
      );
      let proxy = Address.fromString("0x0000000000000000000000000000000000000002");
      let beacon = Address.fromString("0x0000000000000000000000000000000000000003");
      let owner = Address.fromString("0x0000000000000000000000000000000000000004");

      let contractEvent = createContractRegisteredEvent(
        contractId,
        orgId,
        typeId,
        proxy,
        beacon,
        true,
        owner
      );
      contractEvent.logIndex = BigInt.fromI32(2);
      handleContractRegistered(contractEvent);

      // Verify RegisteredContract was created
      assert.entityCount("RegisteredContract", 1);
      assert.fieldEquals(
        "RegisteredContract",
        contractId.toHexString(),
        "proxy",
        "0x0000000000000000000000000000000000000002"
      );
      assert.fieldEquals(
        "RegisteredContract",
        contractId.toHexString(),
        "autoUpgrade",
        "true"
      );

      // Verify registry counter was updated
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalContracts",
        "1"
      );

      // Verify org contract count was updated
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "contractCount",
        "1"
      );
    });

    test("registers multiple contracts for same org", () => {
      // First register an org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      // Register first contract
      let contractId1 = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
      );
      let typeId1 = Bytes.fromHexString(
        "0x4444444444444444444444444444444444444444444444444444444444444444"
      );
      let proxy = Address.fromString("0x0000000000000000000000000000000000000002");
      let beacon = Address.fromString("0x0000000000000000000000000000000000000003");
      let owner = Address.fromString("0x0000000000000000000000000000000000000004");

      let contractEvent1 = createContractRegisteredEvent(
        contractId1,
        orgId,
        typeId1,
        proxy,
        beacon,
        true,
        owner
      );
      contractEvent1.logIndex = BigInt.fromI32(2);
      handleContractRegistered(contractEvent1);

      // Register second contract
      let contractId2 = Bytes.fromHexString(
        "0x5555555555555555555555555555555555555555555555555555555555555555"
      );
      let typeId2 = Bytes.fromHexString(
        "0x6666666666666666666666666666666666666666666666666666666666666666"
      );

      let contractEvent2 = createContractRegisteredEvent(
        contractId2,
        orgId,
        typeId2,
        proxy,
        beacon,
        false,
        owner
      );
      contractEvent2.logIndex = BigInt.fromI32(3);
      handleContractRegistered(contractEvent2);

      // Verify both contracts created
      assert.entityCount("RegisteredContract", 2);
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalContracts",
        "2"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "contractCount",
        "2"
      );
    });
  });

  describe("handleAutoUpgradeSet", () => {
    test("updates contract autoUpgrade status and creates history", () => {
      // First register an org and contract
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      let contractId = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
      );
      let typeId = Bytes.fromHexString(
        "0x4444444444444444444444444444444444444444444444444444444444444444"
      );
      let proxy = Address.fromString("0x0000000000000000000000000000000000000002");
      let beacon = Address.fromString("0x0000000000000000000000000000000000000003");
      let owner = Address.fromString("0x0000000000000000000000000000000000000004");

      let contractEvent = createContractRegisteredEvent(
        contractId,
        orgId,
        typeId,
        proxy,
        beacon,
        true, // initially true
        owner
      );
      contractEvent.logIndex = BigInt.fromI32(2);
      handleContractRegistered(contractEvent);

      // Now disable auto-upgrade
      let autoUpgradeEvent = createAutoUpgradeSetEvent(contractId, false);
      autoUpgradeEvent.logIndex = BigInt.fromI32(3);
      handleAutoUpgradeSet(autoUpgradeEvent);

      // Verify contract was updated
      assert.fieldEquals(
        "RegisteredContract",
        contractId.toHexString(),
        "autoUpgrade",
        "false"
      );

      // Verify history record was created
      assert.entityCount("AutoUpgradeChange", 1);
    });

    test("creates history record even if contract not found", () => {
      let contractId = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
      );

      let event = createAutoUpgradeSetEvent(contractId, true);
      handleAutoUpgradeSet(event);

      // History record should still be created
      assert.entityCount("AutoUpgradeChange", 1);
    });
  });

  describe("handleHatsTreeRegistered", () => {
    test("updates org with topHatId and roleHatIds", () => {
      // First register an org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      // Register hats tree
      let topHatId = BigInt.fromI32(1000);
      let roleHatIds: BigInt[] = [
        BigInt.fromI32(1001),
        BigInt.fromI32(1002),
        BigInt.fromI32(1003)
      ];

      let hatsEvent = createHatsTreeRegisteredEvent(orgId, topHatId, roleHatIds);
      hatsEvent.logIndex = BigInt.fromI32(2);
      handleHatsTreeRegistered(hatsEvent);

      // Verify org was updated with hat IDs
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "topHatId",
        "1000"
      );
    });

    test("handles org not found gracefully", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let topHatId = BigInt.fromI32(1000);
      let roleHatIds: BigInt[] = [BigInt.fromI32(1001)];

      // Should not throw, just do nothing
      let event = createHatsTreeRegisteredEvent(orgId, topHatId, roleHatIds);
      handleHatsTreeRegistered(event);

      // No entities should be created
      assert.entityCount("RegisteredOrg", 0);
    });
  });

  describe("Integration tests", () => {
    test("full lifecycle: register org, add contracts, update settings", () => {
      // 1. Register org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let metaData = Bytes.fromHexString("0xabcd");

      let regEvent = createOrgRegisteredEvent(orgId, executor, metaData);
      handleOrgRegistered(regEvent);

      // 2. Register hats tree
      let topHatId = BigInt.fromI32(1000);
      let roleHatIds: BigInt[] = [BigInt.fromI32(1001), BigInt.fromI32(1002)];

      let hatsEvent = createHatsTreeRegisteredEvent(orgId, topHatId, roleHatIds);
      hatsEvent.logIndex = BigInt.fromI32(2);
      handleHatsTreeRegistered(hatsEvent);

      // 3. Register a contract
      let contractId = Bytes.fromHexString(
        "0x3333333333333333333333333333333333333333333333333333333333333333"
      );
      let typeId = Bytes.fromHexString(
        "0x4444444444444444444444444444444444444444444444444444444444444444"
      );
      let proxy = Address.fromString("0x0000000000000000000000000000000000000002");
      let beacon = Address.fromString("0x0000000000000000000000000000000000000003");
      let owner = Address.fromString("0x0000000000000000000000000000000000000004");

      let contractEvent = createContractRegisteredEvent(
        contractId,
        orgId,
        typeId,
        proxy,
        beacon,
        true,
        owner
      );
      contractEvent.logIndex = BigInt.fromI32(3);
      handleContractRegistered(contractEvent);

      // 4. Update metadata
      let newMetaData = Bytes.fromHexString("0xef01");
      let metaEvent = createMetaUpdatedEvent(orgId, newMetaData);
      metaEvent.logIndex = BigInt.fromI32(4);
      handleMetaUpdated(metaEvent);

      // 5. Toggle auto-upgrade
      let autoUpgradeEvent = createAutoUpgradeSetEvent(contractId, false);
      autoUpgradeEvent.logIndex = BigInt.fromI32(5);
      handleAutoUpgradeSet(autoUpgradeEvent);

      // Verify final state
      assert.entityCount("OrgRegistryContract", 1);
      assert.entityCount("RegisteredOrg", 1);
      assert.entityCount("RegisteredContract", 1);
      assert.entityCount("OrgMetaUpdate", 1);
      assert.entityCount("AutoUpgradeChange", 1);

      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalOrgs",
        "1"
      );
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalContracts",
        "1"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "metaData",
        "0xef01"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "topHatId",
        "1000"
      );
      assert.fieldEquals(
        "RegisteredOrg",
        orgId.toHexString(),
        "contractCount",
        "1"
      );
      assert.fieldEquals(
        "RegisteredContract",
        contractId.toHexString(),
        "autoUpgrade",
        "false"
      );
    });
  });
});
