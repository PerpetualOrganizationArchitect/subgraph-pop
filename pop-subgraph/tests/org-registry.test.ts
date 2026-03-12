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
  handleOrgMetadataAdminHatSet,
  handleHatsTreeRegistered
} from "../src/org-registry";
import {
  createOrgRegisteredEvent,
  createMetaUpdatedEvent,
  createContractRegisteredEvent,
  createOrgMetadataAdminHatSetEvent,
  createHatsTreeRegisteredEvent
} from "./org-registry-utils";
import {
  OrgRegistryContract,
  Organization,
  RegisteredContract,
  OrgMetadata,
  NameReservation
} from "../generated/schema";

// Default mock event address from matchstick
const REGISTRY_ADDRESS = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a";

/**
 * Helper function to convert bytes32 sha256 digest to IPFS CIDv0.
 * Mirrors the logic in org-registry.ts for test assertions.
 */
function bytes32ToCid(hash: Bytes): string {
  let prefix = Bytes.fromHexString("0x1220");
  let multihash = new Bytes(34);
  for (let i = 0; i < 2; i++) {
    multihash[i] = prefix[i];
  }
  for (let i = 0; i < 32; i++) {
    multihash[i + 2] = hash[i];
  }
  return multihash.toBase58();
}

// Helper to create Organization entity (normally created by OrgDeployed)
function createMockOrganization(orgId: Bytes): void {
  let org = new Organization(orgId);
  org.isCanonicalName = true;
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
      // Verify metadata link is set to the CIDv0 format of the hash (to match OrgMetadata entity ID)
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        bytes32ToCid(metadataHash)
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

      // Verify metadata field is set to the CIDv0 format of the hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        bytes32ToCid(metadataHash)
      );
    });

    test("does NOT set metadata link for zero hash", () => {
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

      // Metadata field should NOT be set for zero hash (no IPFS data source created)
      assert.assertNull(
        Organization.load(orgId)!.metadata
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

      // Verify metadata link was updated to CIDv0 format of new hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        bytes32ToCid(newMetadataHash)
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

      // Verify initial metadata link is in CIDv0 format
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        bytes32ToCid(initialHash)
      );

      // Update to new metadata
      let newName = Bytes.fromUTF8("Updated Org");
      let newHash = Bytes.fromHexString("0xbbbb000000000000000000000000000000000000000000000000000000002222");
      let updateEvent = createMetaUpdatedEvent(orgId, newName, newHash);
      updateEvent.logIndex = BigInt.fromI32(2);
      handleMetaUpdated(updateEvent);

      // Verify metadata link was updated to CIDv0 format of new hash
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadata",
        bytes32ToCid(newHash)
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

  describe("handleOrgMetadataAdminHatSet", () => {
    test("sets metadataAdminHatId on Organization", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("Test Org");

      createMockOrganization(orgId);
      let regEvent = createOrgRegisteredEvent(orgId, executor, name);
      handleOrgRegistered(regEvent);

      let hatId = BigInt.fromI32(5001);
      let event = createOrgMetadataAdminHatSetEvent(orgId, hatId);
      handleOrgMetadataAdminHatSet(event);

      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "metadataAdminHatId",
        "5001"
      );
    });

    test("handles org not found gracefully", () => {
      let orgId = Bytes.fromHexString(
        "0x9999999999999999999999999999999999999999999999999999999999999999"
      );
      let hatId = BigInt.fromI32(5001);
      let event = createOrgMetadataAdminHatSetEvent(orgId, hatId);
      handleOrgMetadataAdminHatSet(event);

      // Should not throw - just a no-op
      assert.entityCount("Organization", 0);
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

  describe("Name Reservation", () => {
    test("first org registration gets canonical name", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("MyOrg");

      createMockOrganization(orgId);

      let event = createOrgRegisteredEvent(orgId, executor, name);
      handleOrgRegistered(event);

      // Verify Organization has canonical name
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "isCanonicalName",
        "true"
      );

      // Verify NameReservation was created with correct fields
      let reservationId = "org-myorg";
      assert.entityCount("NameReservation", 1);
      assert.fieldEquals(
        "NameReservation",
        reservationId,
        "name",
        "MyOrg"
      );
      assert.fieldEquals(
        "NameReservation",
        reservationId,
        "type",
        "orgname"
      );
      assert.fieldEquals(
        "NameReservation",
        reservationId,
        "active",
        "true"
      );
      assert.fieldEquals(
        "NameReservation",
        reservationId,
        "owner",
        orgId.toHexString()
      );
    });

    test("duplicate org name by different org is rejected", () => {
      let orgId1 = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let orgId2 = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("SharedName");

      createMockOrganization(orgId1);
      createMockOrganization(orgId2);

      // First org registers the name
      let event1 = createOrgRegisteredEvent(orgId1, executor, name);
      handleOrgRegistered(event1);

      // Second org tries to register the same name (later timestamp)
      let event2 = createOrgRegisteredEvent(orgId2, executor, name);
      event2.block.timestamp = event1.block.timestamp.plus(BigInt.fromI32(10));
      event2.logIndex = BigInt.fromI32(2);
      handleOrgRegistered(event2);

      // First org should keep canonical name
      assert.fieldEquals(
        "Organization",
        orgId1.toHexString(),
        "isCanonicalName",
        "true"
      );

      // Second org should NOT have canonical name
      assert.fieldEquals(
        "Organization",
        orgId2.toHexString(),
        "isCanonicalName",
        "false"
      );

      // Only one NameReservation should exist, owned by first org
      assert.entityCount("NameReservation", 1);
      assert.fieldEquals(
        "NameReservation",
        "org-sharedname",
        "owner",
        orgId1.toHexString()
      );
    });

    test("name release on MetaUpdated allows new registration", () => {
      let orgId1 = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let orgId2 = Bytes.fromHexString(
        "0x2222222222222222222222222222222222222222222222222222222222222222"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let originalName = Bytes.fromUTF8("OriginalName");

      createMockOrganization(orgId1);
      createMockOrganization(orgId2);

      // First org registers with "OriginalName"
      let regEvent = createOrgRegisteredEvent(orgId1, executor, originalName);
      handleOrgRegistered(regEvent);

      // Verify first org has canonical name
      assert.fieldEquals(
        "Organization",
        orgId1.toHexString(),
        "isCanonicalName",
        "true"
      );

      // First org changes name via MetaUpdated (releases "OriginalName")
      let newName = Bytes.fromUTF8("DifferentName");
      let updateEvent = createMetaUpdatedEvent(orgId1, newName);
      updateEvent.block.timestamp = regEvent.block.timestamp.plus(BigInt.fromI32(10));
      updateEvent.logIndex = BigInt.fromI32(2);
      handleMetaUpdated(updateEvent);

      // Old reservation should be inactive
      assert.fieldEquals(
        "NameReservation",
        "org-originalname",
        "active",
        "false"
      );

      // Second org registers with the now-released "OriginalName"
      let regEvent2 = createOrgRegisteredEvent(orgId2, executor, originalName);
      regEvent2.block.timestamp = regEvent.block.timestamp.plus(BigInt.fromI32(20));
      regEvent2.logIndex = BigInt.fromI32(3);
      handleOrgRegistered(regEvent2);

      // Second org should get canonical name for "OriginalName"
      assert.fieldEquals(
        "Organization",
        orgId2.toHexString(),
        "isCanonicalName",
        "true"
      );
    });

    test("same org re-registering keeps canonical status", () => {
      let orgId = Bytes.fromHexString(
        "0x1111111111111111111111111111111111111111111111111111111111111111"
      );
      let executor = Address.fromString("0x0000000000000000000000000000000000000001");
      let name = Bytes.fromUTF8("MyOrg");

      createMockOrganization(orgId);

      // First registration
      let event1 = createOrgRegisteredEvent(orgId, executor, name);
      handleOrgRegistered(event1);

      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "isCanonicalName",
        "true"
      );

      // Same org registers again (e.g., from another chain)
      // handleOrgRegistered loads existing org, so we need to simulate
      // the reservation check with the same orgId
      // Note: handleOrgRegistered will load the existing org and call tryReserveOrgName again
      let event2 = createOrgRegisteredEvent(orgId, executor, name);
      event2.block.timestamp = event1.block.timestamp.plus(BigInt.fromI32(10));
      event2.logIndex = BigInt.fromI32(2);
      handleOrgRegistered(event2);

      // Should still be canonical (same owner re-registering)
      assert.fieldEquals(
        "Organization",
        orgId.toHexString(),
        "isCanonicalName",
        "true"
      );

      // Reservation should still be active and owned by same org
      assert.fieldEquals(
        "NameReservation",
        "org-myorg",
        "active",
        "true"
      );
      assert.fieldEquals(
        "NameReservation",
        "org-myorg",
        "owner",
        orgId.toHexString()
      );
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

      // Verify final state
      assert.entityCount("OrgRegistryContract", 1);
      assert.entityCount("Organization", 1);
      assert.entityCount("RegisteredContract", 1);
      assert.entityCount("OrgMetaUpdate", 1);

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
    });
  });
});
