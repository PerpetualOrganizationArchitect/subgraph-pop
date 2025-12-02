import { Address, BigInt } from "@graphprotocol/graph-ts";
import { OrgDeployed } from "../generated/OrgDeployer/OrgDeployer";
import {
  Organization,
  TaskManager as TaskManagerEntity,
  HybridVotingContract,
  DirectDemocracyVotingContract,
  EligibilityModuleContract,
  ParticipationTokenContract,
  QuickJoinContract,
  EducationHubContract,
  PaymentManagerContract,
  ExecutorContract,
  ToggleModuleContract
} from "../generated/schema";
import { getOrCreateRole } from "./utils";
import {
  TaskManager as TaskManagerTemplate,
  HybridVoting as HybridVotingTemplate,
  DirectDemocracyVoting as DirectDemocracyVotingTemplate,
  EligibilityModule as EligibilityModuleTemplate,
  ParticipationToken as ParticipationTokenTemplate,
  QuickJoin as QuickJoinTemplate,
  EducationHub as EducationHubTemplate,
  PaymentManager as PaymentManagerTemplate,
  Executor as ExecutorTemplate,
  ToggleModule as ToggleModuleTemplate
} from "../generated/templates";

/**
 * Handles the OrgDeployed event from the OrgDeployer contract.
 * Creates an Organization entity, a TaskManager entity, a HybridVotingContract entity,
 * a DirectDemocracyVotingContract entity, an EligibilityModuleContract entity,
 * a ParticipationTokenContract entity, a QuickJoinContract entity, an EducationHubContract entity,
 * a PaymentManagerContract entity, and instantiates data source templates for dynamic contract tracking.
 */
export function handleOrgDeployed(event: OrgDeployed): void {
  // Create TaskManager entity first so we can reference it
  let taskManager = new TaskManagerEntity(event.params.taskManager);
  taskManager.createdAt = event.block.timestamp;
  taskManager.createdAtBlock = event.block.number;
  taskManager.transactionHash = event.transaction.hash;

  // Create HybridVotingContract entity
  let hybridVoting = new HybridVotingContract(event.params.hybridVoting);
  hybridVoting.executor = Address.zero(); // Will be set by Initialized event
  hybridVoting.quorum = 0; // Will be set by QuorumSet event
  hybridVoting.hats = Address.zero(); // Will be set by Initialized event
  hybridVoting.createdAt = event.block.timestamp;
  hybridVoting.createdAtBlock = event.block.number;

  // Create DirectDemocracyVotingContract entity
  let directDemocracyVoting = new DirectDemocracyVotingContract(event.params.directDemocracyVoting);
  directDemocracyVoting.executor = Address.zero(); // Will be set by ExecutorUpdated event
  directDemocracyVoting.quorumPercentage = 0; // Will be set by QuorumPercentageSet event
  directDemocracyVoting.hats = Address.zero(); // Will be set by Initialized event
  directDemocracyVoting.createdAt = event.block.timestamp;
  directDemocracyVoting.createdAtBlock = event.block.number;

  // Create EligibilityModuleContract entity
  let eligibilityModule = new EligibilityModuleContract(event.params.eligibilityModule);
  eligibilityModule.superAdmin = Address.zero(); // Will be set by EligibilityModuleInitialized event
  eligibilityModule.hatsContract = Address.zero(); // Will be set by EligibilityModuleInitialized event
  eligibilityModule.toggleModule = event.params.toggleModule;
  eligibilityModule.isPaused = false;
  eligibilityModule.createdAt = event.block.timestamp;
  eligibilityModule.createdAtBlock = event.block.number;

  // Create ParticipationTokenContract entity
  let participationToken = new ParticipationTokenContract(event.params.participationToken);
  participationToken.name = ""; // Will be set by Initialized event
  participationToken.symbol = ""; // Will be set by Initialized event
  participationToken.totalSupply = BigInt.fromI32(0);
  participationToken.executor = Address.zero(); // Will be set by Initialized event
  participationToken.hatsContract = Address.zero(); // Will be set by Initialized event
  participationToken.createdAt = event.block.timestamp;
  participationToken.createdAtBlock = event.block.number;

  // Create QuickJoinContract entity
  let quickJoin = new QuickJoinContract(event.params.quickJoin);
  quickJoin.executor = Address.zero(); // Will be set by Initialized event
  quickJoin.hatsContract = Address.zero(); // Will be set by Initialized event
  quickJoin.accountRegistry = Address.zero(); // Will be set by Initialized event
  quickJoin.masterDeployAddress = Address.zero(); // Will be set by Initialized event
  quickJoin.createdAt = event.block.timestamp;
  quickJoin.createdAtBlock = event.block.number;

  // Create EducationHubContract entity
  let educationHub = new EducationHubContract(event.params.educationHub);
  educationHub.token = Address.zero(); // Will be set by Initialized event
  educationHub.hatsContract = Address.zero(); // Will be set by Initialized event
  educationHub.executor = Address.zero(); // Will be set by Initialized event
  educationHub.isPaused = false;
  educationHub.nextModuleId = BigInt.fromI32(0); // Will be incremented as modules are created
  educationHub.createdAt = event.block.timestamp;
  educationHub.createdAtBlock = event.block.number;

  // Create PaymentManagerContract entity
  let paymentManager = new PaymentManagerContract(event.params.paymentManager);
  paymentManager.owner = Address.zero(); // Will be set by Initialized event
  paymentManager.revenueShareToken = Address.zero(); // Will be set by Initialized event
  paymentManager.distributionCounter = BigInt.fromI32(0); // Will be incremented as distributions are created
  paymentManager.createdAt = event.block.timestamp;
  paymentManager.createdAtBlock = event.block.number;

  // Create ExecutorContract entity
  let executor = new ExecutorContract(event.params.executor);
  executor.owner = Address.zero(); // Will be set by OwnershipTransferred event
  executor.allowedCaller = null; // Will be set by CallerSet event
  executor.hatsContract = Address.zero(); // Will be set by HatsSet event
  executor.isPaused = false;
  executor.createdAt = event.block.timestamp;
  executor.createdAtBlock = event.block.number;

  // Create ToggleModuleContract entity
  let toggleModule = new ToggleModuleContract(event.params.toggleModule);
  toggleModule.admin = Address.zero(); // Will be set by ToggleModuleInitialized event
  toggleModule.eligibilityModule = null; // Will be set when eligibility module calls setEligibilityModule
  toggleModule.createdAt = event.block.timestamp;
  toggleModule.createdAtBlock = event.block.number;

  // Load existing Organization (created by OrgRegistered) or create new one
  let organization = Organization.load(event.params.orgId);
  if (!organization) {
    organization = new Organization(event.params.orgId);
  }
  organization.executorContract = executor.id; // Link to ExecutorContract entity
  organization.hybridVoting = hybridVoting.id; // Link to HybridVotingContract entity
  organization.directDemocracyVoting = directDemocracyVoting.id; // Link to DirectDemocracyVotingContract entity
  organization.quickJoin = quickJoin.id; // Link to QuickJoinContract entity
  organization.participationToken = participationToken.id; // Link to ParticipationTokenContract entity
  organization.taskManager = taskManager.id; // Link to TaskManager entity
  organization.educationHub = educationHub.id; // Link to EducationHubContract entity
  organization.paymentManager = paymentManager.id; // Link to PaymentManagerContract entity
  organization.eligibilityModule = eligibilityModule.id; // Link to EligibilityModuleContract entity
  organization.toggleModuleContract = toggleModule.id; // Link to ToggleModuleContract entity
  organization.topHatId = event.params.topHatId;
  organization.roleHatIds = event.params.roleHatIds;
  organization.deployedAt = event.block.timestamp;
  organization.deployedAtBlock = event.block.number;
  organization.transactionHash = event.transaction.hash;

  // Set the reverse relationships
  taskManager.organization = organization.id;
  hybridVoting.organization = organization.id;
  directDemocracyVoting.organization = organization.id;
  eligibilityModule.organization = organization.id;
  participationToken.organization = organization.id;
  quickJoin.organization = organization.id;
  educationHub.organization = organization.id;
  paymentManager.organization = organization.id;
  executor.organization = organization.id;
  toggleModule.organization = organization.id;

  // Save entities
  taskManager.save();
  hybridVoting.save();
  directDemocracyVoting.save();
  eligibilityModule.save();
  participationToken.save();
  quickJoin.save();
  educationHub.save();
  paymentManager.save();
  executor.save();
  toggleModule.save();
  organization.save();

  // Create Role entities for topHatId and all roleHatIds
  // This allows querying roles before Hat entities are created by EligibilityModule
  getOrCreateRole(event.params.orgId, event.params.topHatId, event);

  let roleHatIds = event.params.roleHatIds;
  for (let i = 0; i < roleHatIds.length; i++) {
    getOrCreateRole(event.params.orgId, roleHatIds[i], event);
  }

  // Instantiate data source templates for this organization
  TaskManagerTemplate.create(event.params.taskManager);
  HybridVotingTemplate.create(event.params.hybridVoting);
  DirectDemocracyVotingTemplate.create(event.params.directDemocracyVoting);
  EligibilityModuleTemplate.create(event.params.eligibilityModule);
  ParticipationTokenTemplate.create(event.params.participationToken);
  QuickJoinTemplate.create(event.params.quickJoin);
  EducationHubTemplate.create(event.params.educationHub);
  PaymentManagerTemplate.create(event.params.paymentManager);
  ExecutorTemplate.create(event.params.executor);
  ToggleModuleTemplate.create(event.params.toggleModule);
}
