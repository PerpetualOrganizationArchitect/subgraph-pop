import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  beforeEach,
  dataSourceMock
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
  Organization,
  RegisteredContract,
  OrgMetadata
} from "../generated/schema";

// Default mock event address from matchstick
const REGISTRY_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

// Helper to create Organization entity (normally created by OrgDeployed)
function createMockOrganization(orgId: Bytes): void {
  let org = new Organization(orgId);
  // Required fields - mock addresses
  org.executorContract = Bytes.fromHexString("0x0000000000000000000000000000000000000001");
  org.hybridVoting = Bytes.fromHexString("0x0000000000000000000000000000000000000002");
  org.directDemocracyVoting = Bytes.fromHexString("0x0000000000000000000000000000000000000003");
  org.quickJoin = Bytes.fromHexString("0x0000000000000000000000000000000000000004");
  org.participationToken = Bytes.fromHexString("0x0000000000000000000000000000000000000005");
  org.taskManager = Bytes.fromHexString("0x0000000000000000000000000000000000000006");
  org.educationHub = Bytes.fromHexString("0x0000000000000000000000000000000000000007");
  org.paymentManager = Bytes.fromHexString("0x0000000000000000000000000000000000000008");
  org.eligibilityModule = Bytes.fromHexString("0x0000000000000000000000000000000000000009");
  org.toggleModuleContract = Bytes.fromHexString("0x000000000000000000000000000000000000000a");
  org.topHatId = BigInt.fromI32(0);
  org.roleHatIds = [];
  org.deployedAt = BigInt.fromI32(1000);
  org.deployedAtBlock = BigInt.fromI32(100);
  org.transactionHash = Bytes.fromHexString("0x1234");
  org.save();
}

describe("OrgRegistry", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleOrgRegistered", () => {
    test("creates OrgRegistryContract singleton and updates Organization with name/metadata", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");
      let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000001234");

      // Create Organization first (normally done by OrgDeployed)
      createMockOrganization(orgId);

      let event = createOrgRegisteredEvent(orgId, executor, name, metadataHash);
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

      // Verify Organization was updated with name and metadata
      assert.entityCount("Organization", 1);
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "name",
        "Test Org"
      );
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadataHash",
        "0x0000000000000000000000000000000000000000000000000000000000001234"
      );
      // Verify metadata link is set to the hex string of the hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        metadataHash.toHexString()
      );
    });

    test("sets metadata link for non-zero hash", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");
      let metadataHash = Bytes.fromHexString("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");

      createMockOrganization(orgId);

      let event = createOrgRegisteredEvent(orgId, executor, name, metadataHash);
      handleOrgRegistered(event);

      // Verify metadata field is set to the hex string of the hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
      );
    });

    test("sets metadata link even for zero hash", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");
      // Use zero hash (empty metadata)
      let metadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000000000");

      createMockOrganization(orgId);

      let event = createOrgRegisteredEvent(orgId, executor, name, metadataHash);
      handleOrgRegistered(event);

      // Metadata field should still be set (IPFS data source won't be created for zero hash)
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        "0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    test("increments totalOrgs when Organization doesn't exist yet", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      // Don't create Organization - simulating OrgRegistered arriving before OrgDeployed
      let event = createOrgRegisteredEvent(orgId, executor, name);
      handleOrgRegistered(event);

      // Should still increment total orgs
      assert.fieldEquals(
        "OrgRegistryContract",
        REGISTRY_ADDRESS,
        "totalOrgs",
        "1"
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
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId1);
      createMockOrganization(orgId2);

      let event1 = createOrgRegisteredEvent(orgId1, executor, name);
      handleOrgRegistered(event1);

      let event2 = createOrgRegisteredEvent(orgId2, executor, name);
      event2.logIndex = BigInt.fromI32(2);
      handleOrgRegistered(event2);

      assert.entityCount("Organization", 2);
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
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      // Create Organization and register it
      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
      handleOrgRegistered(regEvent);

      // Update metadata
      let newName = Bytes.fromUTF8("Updated Org");
      let newMetadataHash = Bytes.fromHexString("0x0000000000000000000000000000000000000000000000000000000000005678");
      let updateEvent = createMetaUpdatedEvent(orgId, newName, newMetadataHash);
      updateEvent.logIndex = BigInt.fromI32(2);
      handleMetaUpdated(updateEvent);

      // Verify org name was updated
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "name",
        "Updated Org"
      );

      // Verify metadataHash was updated
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadataHash",
        "0x0000000000000000000000000000000000000000000000000000000000005678"
      );

      // Verify metadata link was updated to new hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        "0x0000000000000000000000000000000000000000000000000000000000005678"
      );

      // Verify history record was created
      assert.entityCount("OrgMetaUpdate", 1);
    });

    test("updates metadata link when metadata changes", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");
      let initialHash = Bytes.fromHexString("0xaaaa000000000000000000000000000000000000000000000000000000001111");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name, initialHash);
      handleOrgRegistered(regEvent);

      // Verify initial metadata link
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        "0xaaaa000000000000000000000000000000000000000000000000000000001111"
      );

      // Update to new metadata
      let newName = Bytes.fromUTF8("Updated Org");
      let newHash = Bytes.fromHexString("0xbbbb000000000000000000000000000000000000000000000000000000002222");
      let updateEvent = createMetaUpdatedEvent(orgId, newName, newHash);
      updateEvent.logIndex = BigInt.fromI32(2);
      handleMetaUpdated(updateEvent);

      // Verify metadata link was updated
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        "0xbbbb000000000000000000000000000000000000000000000000000000002222"
      );
    });

    test("does not create history record if org not found", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let newName = Bytes.fromUTF8("Updated Org");

      // Don't create Organization
      let event = createMetaUpdatedEvent(orgId, newName);
      handleMetaUpdated(event);

      // History record should NOT be created since org doesn't exist
      assert.entityCount("OrgMetaUpdate", 0);
    });
  });

  describe("handleContractRegistered", () => {
    test("creates RegisteredContract and updates counters", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      // Create Organization
      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
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
    });

    test("registers multiple contracts for same org", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
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
    });
  });

  describe("handleAutoUpgradeSet", () => {
    test("updates contract autoUpgrade status and creates history", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
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
    test("updates Organization with topHatId and roleHatIds", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
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
        "Organization",
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

      // Don't create Organization - should not throw
      let event = createHatsTreeRegisteredEvent(orgId, topHatId, roleHatIds);
      handleHatsTreeRegistered(event);

      // No entities should be created
      assert.entityCount("Organization", 0);
    });
  });

  describe("Integration tests", () => {
    test("full lifecycle: register org, add contracts, update settings", () => {
      // 1. Create and register org
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
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
      let newName = Bytes.fromUTF8("Updated Org");
      let metaEvent = createMetaUpdatedEvent(orgId, newName);
      metaEvent.logIndex = BigInt.fromI32(4);
      handleMetaUpdated(metaEvent);

      // 5. Toggle auto-upgrade
      let autoUpgradeEvent = createAutoUpgradeSetEvent(contractId, false);
      autoUpgradeEvent.logIndex = BigInt.fromI32(5);
      handleAutoUpgradeSet(autoUpgradeEvent);

      // Verify final state
      assert.entityCount("OrgRegistryContract", 1);
      assert.entityCount("Organization", 1);
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
        "Organization",
        orgId.toHexString(),
        "name",
        "Updated Org"
      );
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "topHatId",
        "1000"
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
