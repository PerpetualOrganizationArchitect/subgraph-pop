import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleHatMetadataUpdated,
  handleHatCreatedWithEligibility
} from "../src/eligibility-module";
import {
  createHatMetadataUpdatedEvent,
  createHatCreatedWithEligibilityEvent
} from "./eligibility-module-utils";
import {
  Organization,
  ExecutorContract,
  ToggleModuleContract,
  HybridVotingContract,
  DirectDemocracyVotingContract,
  EligibilityModuleContract,
  ParticipationTokenContract,
  QuickJoinContract,
  EducationHubContract,
  PaymentManagerContract,
  TaskManager,
  Hat
} from "../generated/schema";

/**
 * Helper function to create necessary entities for eligibility module tests.
 * Creates an Organization and EligibilityModuleContract entity.
 */
function setupEligibilityModuleEntities(): void {
  // Create Organization entity
  let orgId = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
  );
  let organization = new Organization(orgId);
  organization.topHatId = BigInt.fromI32(1000);
  organization.roleHatIds = [BigInt.fromI32(1001), BigInt.fromI32(1002)];
  organization.deployedAt = BigInt.fromI32(1000);
  organization.deployedAtBlock = BigInt.fromI32(100);
  organization.transactionHash = Bytes.fromHexString("0xabcd");

  // Create EligibilityModuleContract entity with the default mock event address
  let eligibilityModuleAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a");
  let eligibilityModule = new EligibilityModuleContract(eligibilityModuleAddress);
  eligibilityModule.organization = orgId;
  eligibilityModule.superAdmin = Address.zero();
  eligibilityModule.hatsContract = Address.zero();
  eligibilityModule.toggleModule = Address.zero();
  eligibilityModule.isPaused = false;
  eligibilityModule.createdAt = BigInt.fromI32(1000);
  eligibilityModule.createdAtBlock = BigInt.fromI32(100);

  // Create ToggleModuleContract entity
  let toggleModuleAddress = Address.fromString("0x0000000000000000000000000000000000000010");
  let toggleModule = new ToggleModuleContract(toggleModuleAddress);
  toggleModule.organization = orgId;
  toggleModule.admin = Address.zero();
  toggleModule.createdAt = BigInt.fromI32(1000);
  toggleModule.createdAtBlock = BigInt.fromI32(100);

  // Create ExecutorContract entity
  let executorAddress = Address.fromString("0x0000000000000000000000000000000000000001");
  let executor = new ExecutorContract(executorAddress);
  executor.organization = orgId;
  executor.owner = Address.zero();
  executor.allowedCaller = null;
  executor.hatsContract = Address.zero();
  executor.isPaused = false;
  executor.createdAt = BigInt.fromI32(1000);
  executor.createdAtBlock = BigInt.fromI32(100);

  // Create TaskManager entity
  let taskManagerAddress = Address.fromString("0x0000000000000000000000000000000000000006");
  let taskManager = new TaskManager(taskManagerAddress);
  taskManager.organization = orgId;
  taskManager.creatorHatIds = [BigInt.fromI32(1002)];
  taskManager.createdAt = BigInt.fromI32(1000);
  taskManager.createdAtBlock = BigInt.fromI32(100);
  taskManager.transactionHash = Bytes.fromHexString("0xabcd");

  // Create HybridVotingContract entity
  let hybridVotingAddress = Address.fromString("0x0000000000000000000000000000000000000002");
  let hybridVoting = new HybridVotingContract(hybridVotingAddress);
  hybridVoting.organization = orgId;
  hybridVoting.executor = Address.zero();
  hybridVoting.quorum = 0;
  hybridVoting.hats = Address.zero();
  hybridVoting.classVersion = BigInt.fromI32(0);
  hybridVoting.createdAt = BigInt.fromI32(1000);
  hybridVoting.createdAtBlock = BigInt.fromI32(100);

  // Create DirectDemocracyVotingContract entity
  let ddvAddress = Address.fromString("0x0000000000000000000000000000000000000003");
  let ddv = new DirectDemocracyVotingContract(ddvAddress);
  ddv.organization = orgId;
  ddv.executor = Address.zero();
  ddv.quorumPercentage = 0;
  ddv.hats = Address.zero();
  ddv.createdAt = BigInt.fromI32(1000);
  ddv.createdAtBlock = BigInt.fromI32(100);

  // Create ParticipationTokenContract entity
  let participationTokenAddress = Address.fromString("0x0000000000000000000000000000000000000005");
  let participationToken = new ParticipationTokenContract(participationTokenAddress);
  participationToken.organization = orgId;
  participationToken.name = "Test Token";
  participationToken.symbol = "TEST";
  participationToken.totalSupply = BigInt.fromI32(0);
  participationToken.executor = Address.zero();
  participationToken.hatsContract = Address.zero();
  participationToken.createdAt = BigInt.fromI32(1000);
  participationToken.createdAtBlock = BigInt.fromI32(100);

  // Create QuickJoinContract entity
  let quickJoinAddress = Address.fromString("0x0000000000000000000000000000000000000004");
  let quickJoin = new QuickJoinContract(quickJoinAddress);
  quickJoin.organization = orgId;
  quickJoin.executor = Address.zero();
  quickJoin.hatsContract = Address.zero();
  quickJoin.accountRegistry = Address.zero();
  quickJoin.masterDeployAddress = Address.zero();
  quickJoin.createdAt = BigInt.fromI32(1000);
  quickJoin.createdAtBlock = BigInt.fromI32(100);

  // Create EducationHubContract entity
  let educationHubAddress = Address.fromString("0x0000000000000000000000000000000000000007");
  let educationHub = new EducationHubContract(educationHubAddress);
  educationHub.organization = orgId;
  educationHub.token = Address.zero();
  educationHub.hatsContract = Address.zero();
  educationHub.executor = Address.zero();
  educationHub.isPaused = false;
  educationHub.nextModuleId = BigInt.fromI32(0);
  educationHub.createdAt = BigInt.fromI32(1000);
  educationHub.createdAtBlock = BigInt.fromI32(100);

  // Create PaymentManagerContract entity
  let paymentManagerAddress = Address.fromString("0x0000000000000000000000000000000000000008");
  let paymentManager = new PaymentManagerContract(paymentManagerAddress);
  paymentManager.organization = orgId;
  paymentManager.owner = Address.zero();
  paymentManager.revenueShareToken = Address.zero();
  paymentManager.distributionCounter = BigInt.fromI32(0);
  paymentManager.createdAt = BigInt.fromI32(1000);
  paymentManager.createdAtBlock = BigInt.fromI32(100);

  // Set the relationships
  organization.executorContract = executorAddress;
  organization.toggleModuleContract = toggleModuleAddress;
  organization.taskManager = taskManagerAddress;
  organization.hybridVoting = hybridVotingAddress;
  organization.directDemocracyVoting = ddvAddress;
  organization.eligibilityModule = eligibilityModuleAddress;
  organization.participationToken = participationTokenAddress;
  organization.quickJoin = quickJoinAddress;
  organization.educationHub = educationHubAddress;
  organization.paymentManager = paymentManagerAddress;

  // Save entities
  eligibilityModule.save();
  toggleModule.save();
  executor.save();
  taskManager.save();
  hybridVoting.save();
  ddv.save();
  participationToken.save();
  quickJoin.save();
  educationHub.save();
  paymentManager.save();
  organization.save();
}

/**
 * Creates a Hat entity for testing metadata updates.
 */
function createHatEntity(hatId: BigInt): void {
  let eligibilityModuleAddress = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a");
  let hatEntityId = eligibilityModuleAddress.toHexString() + "-" + hatId.toString();

  let hat = new Hat(hatEntityId);
  hat.hatId = hatId;
  hat.parentHatId = BigInt.fromI32(1000);
  hat.level = 1;
  hat.eligibilityModule = eligibilityModuleAddress;
  hat.creator = Address.zero();
  hat.defaultEligible = true;
  hat.defaultStanding = true;
  hat.mintedCount = BigInt.fromI32(0);
  hat.createdAt = BigInt.fromI32(1000);
  hat.createdAtBlock = BigInt.fromI32(100);
  hat.transactionHash = Bytes.fromHexString("0xabcd");
  hat.save();
}

describe("EligibilityModule - HatMetadataUpdated", () => {
  afterEach(() => {
    clearStore();
  });

  test("HatMetadataUpdated updates Hat entity with metadata", () => {
    setupEligibilityModuleEntities();

    let hatId = BigInt.fromI32(1001);
    createHatEntity(hatId);

    let name = "ADMIN";
    let metadataCID = Bytes.fromHexString("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

    let event = createHatMetadataUpdatedEvent(hatId, name, metadataCID);
    handleHatMetadataUpdated(event);

    let hatEntityId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1001";
    assert.fieldEquals("Hat", hatEntityId, "name", "ADMIN");
    assert.fieldEquals("Hat", hatEntityId, "metadataCID", metadataCID.toHexString());
  });

  test("HatMetadataUpdated creates event history entity", () => {
    setupEligibilityModuleEntities();

    let hatId = BigInt.fromI32(1001);
    createHatEntity(hatId);

    let event = createHatMetadataUpdatedEvent(
      hatId,
      "MEMBER",
      Bytes.fromHexString("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
    );
    handleHatMetadataUpdated(event);

    assert.entityCount("HatMetadataUpdateEvent", 1);
  });

  test("Multiple HatMetadataUpdated events create separate history entities", () => {
    setupEligibilityModuleEntities();

    let hatId = BigInt.fromI32(1001);
    createHatEntity(hatId);

    // First update
    let event1 = createHatMetadataUpdatedEvent(
      hatId,
      "ADMIN",
      Bytes.fromHexString("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    );
    handleHatMetadataUpdated(event1);

    // Second update with different log index
    let event2 = createHatMetadataUpdatedEvent(
      hatId,
      "SUPER_ADMIN",
      Bytes.fromHexString("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890")
    );
    event2.logIndex = BigInt.fromI32(2);
    handleHatMetadataUpdated(event2);

    assert.entityCount("HatMetadataUpdateEvent", 2);

    // Verify hat has latest metadata
    let hatEntityId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1001";
    assert.fieldEquals("Hat", hatEntityId, "name", "SUPER_ADMIN");
  });

  test("HatMetadataUpdated for non-existent hat does not create event", () => {
    setupEligibilityModuleEntities();

    // Don't create the hat entity - it shouldn't exist
    let hatId = BigInt.fromI32(9999);
    let event = createHatMetadataUpdatedEvent(
      hatId,
      "GHOST",
      Bytes.fromHexString("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")
    );
    handleHatMetadataUpdated(event);

    // Should not create event entity since hat doesn't exist
    assert.entityCount("HatMetadataUpdateEvent", 0);
  });
});
