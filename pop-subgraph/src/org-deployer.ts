import { Address } from "@graphprotocol/graph-ts";
import { OrgDeployed } from "../generated/OrgDeployer/OrgDeployer";
import {
  Organization,
  TaskManager as TaskManagerEntity,
  HybridVotingContract
} from "../generated/schema";
import { TaskManager as TaskManagerTemplate, HybridVoting as HybridVotingTemplate } from "../generated/templates";

/**
 * Handles the OrgDeployed event from the OrgDeployer contract.
 * Creates an Organization entity, a TaskManager entity, a HybridVotingContract entity,
 * and instantiates data source templates for dynamic contract tracking.
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

  // Create Organization entity
  let organization = new Organization(event.params.orgId);
  organization.orgId = event.params.orgId;
  organization.executor = event.params.executor;
  organization.hybridVoting = hybridVoting.id; // Link to HybridVotingContract entity
  organization.directDemocracyVoting = event.params.directDemocracyVoting;
  organization.quickJoin = event.params.quickJoin;
  organization.participationToken = event.params.participationToken;
  organization.taskManager = taskManager.id; // Link to TaskManager entity
  organization.educationHub = event.params.educationHub;
  organization.paymentManager = event.params.paymentManager;
  organization.deployedAt = event.block.timestamp;
  organization.deployedAtBlock = event.block.number;
  organization.transactionHash = event.transaction.hash;

  // Set the reverse relationships
  taskManager.organization = organization.id;
  hybridVoting.organization = organization.id;

  // Save entities
  taskManager.save();
  hybridVoting.save();
  organization.save();

  // Instantiate data source templates for this organization
  TaskManagerTemplate.create(event.params.taskManager);
  HybridVotingTemplate.create(event.params.hybridVoting);
}
