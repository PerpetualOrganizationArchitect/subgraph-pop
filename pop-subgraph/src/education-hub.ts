import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  CreatorHatSet as CreatorHatSetEvent,
  ExecutorSet as ExecutorSetEvent,
  HatToggled as HatToggledEvent,
  HatsSet as HatsSetEvent,
  MemberHatSet as MemberHatSetEvent,
  ModuleCompleted as ModuleCompletedEvent,
  ModuleCreated as ModuleCreatedEvent,
  ModuleRemoved as ModuleRemovedEvent,
  ModuleUpdated as ModuleUpdatedEvent,
  Paused as PausedEvent,
  TokenSet as TokenSetEvent,
  Unpaused as UnpausedEvent
} from "../generated/templates/EducationHub/EducationHub";
import {
  EducationHubContract,
  EducationModule,
  ModuleCompletion,
  ModuleUpdate,
  HatPermission,
  EducationHubTokenChange,
  EducationHubHatsChange
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser, createExecutorChange, createPauseEvent, getOrCreateRole } from "./utils";

export function handleInitialized(event: InitializedEvent): void {
  // Initialization handled in org-deployer.ts
  // This event just confirms the contract is initialized
}

export function handleModuleCreated(event: ModuleCreatedEvent): void {
  let contractAddress = event.address;
  let moduleId = event.params.id;

  let moduleEntityId = contractAddress.toHexString() + "-" + moduleId.toString();
  let module = new EducationModule(moduleEntityId);

  module.educationHub = contractAddress;
  module.moduleId = moduleId;
  module.title = event.params.title.toString();
  module.contentHash = event.params.contentHash;
  module.payout = event.params.payout;
  module.status = "Active";
  module.createdAt = event.block.timestamp;
  module.createdAtBlock = event.block.number;

  module.save();

  // Update nextModuleId on contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    // nextModuleId is always moduleId + 1 after creation
    contract.nextModuleId = moduleId.plus(BigInt.fromI32(1));
    contract.save();
  }
}

export function handleModuleCompleted(event: ModuleCompletedEvent): void {
  let contractAddress = event.address;
  let moduleId = event.params.id;
  let learner = event.params.learner;

  // Create completion record
  let completionId = contractAddress.toHexString() + "-" + moduleId.toString() + "-" + learner.toHexString();
  let completion = new ModuleCompletion(completionId);

  completion.educationHub = contractAddress;
  completion.moduleId = moduleId;
  completion.learner = learner;
  completion.learnerUsername = getUsernameForAddress(learner);

  // Link to User entity and increment totalModulesCompleted
  let hubContract = EducationHubContract.load(contractAddress);
  if (hubContract) {
    let user = getOrCreateUser(
      hubContract.organization,
      learner,
      event.block.timestamp,
      event.block.number
    );
    if (user) {
      completion.learnerUser = user.id;
      user.totalModulesCompleted = user.totalModulesCompleted.plus(BigInt.fromI32(1));
      user.save();
    }
  }

  completion.completedAt = event.block.timestamp;
  completion.completedAtBlock = event.block.number;
  completion.transactionHash = event.transaction.hash;

  // Link to module entity
  let moduleEntityId = contractAddress.toHexString() + "-" + moduleId.toString();
  completion.module = moduleEntityId;

  completion.save();
}

export function handleModuleUpdated(event: ModuleUpdatedEvent): void {
  let contractAddress = event.address;
  let moduleId = event.params.id;

  // Update the module entity
  let moduleEntityId = contractAddress.toHexString() + "-" + moduleId.toString();
  let module = EducationModule.load(moduleEntityId);

  if (module) {
    module.title = event.params.title.toString();
    module.contentHash = event.params.contentHash;
    module.payout = event.params.payout;
    module.updatedAt = event.block.timestamp;
    module.updatedAtBlock = event.block.number;
    module.save();
  }

  // Create historical update record
  let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let update = new ModuleUpdate(updateId);

  update.module = moduleEntityId;
  update.moduleId = moduleId;
  update.title = event.params.title.toString();
  update.contentHash = event.params.contentHash;
  update.payout = event.params.payout;
  update.updatedAt = event.block.timestamp;
  update.updatedAtBlock = event.block.number;
  update.transactionHash = event.transaction.hash;

  update.save();
}

export function handleModuleRemoved(event: ModuleRemovedEvent): void {
  let contractAddress = event.address;
  let moduleId = event.params.id;

  let moduleEntityId = contractAddress.toHexString() + "-" + moduleId.toString();
  let module = EducationModule.load(moduleEntityId);

  if (module) {
    module.status = "Removed";
    module.removedAt = event.block.timestamp;
    module.removedAtBlock = event.block.number;
    module.save();
  }
}

export function handleCreatorHatSet(event: CreatorHatSetEvent): void {
  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Creator role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hatId.toString() +
    "-Creator";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "EducationHub";
    permission.organization = contract.organization;
    permission.hatId = event.params.hatId;
    permission.permissionRole = "Creator";
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hatId, event);
  permission.role = role.id;

  permission.allowed = event.params.enabled;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;
  permission.save();
}

export function handleMemberHatSet(event: MemberHatSetEvent): void {
  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Member role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hatId.toString() +
    "-Member";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "EducationHub";
    permission.organization = contract.organization;
    permission.hatId = event.params.hatId;
    permission.permissionRole = "Member";
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hatId, event);
  permission.role = role.id;

  permission.allowed = event.params.enabled;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;
  permission.save();
}

export function handleHatToggled(event: HatToggledEvent): void {
  // HatToggled event could apply to either creator or member hats
  // This is a generic toggle event - we'll track it but might not know the hat type
  // The specific setCreatorHatAllowed/setMemberHatAllowed events are more precise
  // For now, we'll handle this as a member hat since that's the completion permission

  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Create or update consolidated HatPermission entity with Member role
  let permissionId =
    event.address.toHexString() +
    "-" +
    event.params.hatId.toString() +
    "-Member";

  let permission = HatPermission.load(permissionId);
  if (!permission) {
    permission = new HatPermission(permissionId);
    permission.contractAddress = event.address;
    permission.contractType = "EducationHub";
    permission.organization = contract.organization;
    permission.hatId = event.params.hatId;
    permission.permissionRole = "Member";
  }

  // Link to Role entity
  let role = getOrCreateRole(contract.organization, event.params.hatId, event);
  permission.role = role.id;

  permission.allowed = event.params.allowed;
  permission.setAt = event.block.timestamp;
  permission.setAtBlock = event.block.number;
  permission.transactionHash = event.transaction.hash;
  permission.save();
}

export function handleExecutorSet(event: ExecutorSetEvent): void {
  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Update contract
  contract.executor = event.params.newExecutor;
  contract.save();

  // Create historical record using consolidated ExecutorChange entity
  createExecutorChange(
    event.address,
    "EducationHub",
    contract.organization,
    event.params.newExecutor,
    event
  );
}

export function handleTokenSet(event: TokenSetEvent): void {
  let contractAddress = event.address;

  // Update contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    contract.token = event.params.newToken;
    contract.save();
  }

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new EducationHubTokenChange(changeId);

  change.educationHub = contractAddress;
  change.newToken = event.params.newToken;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handleHatsSet(event: HatsSetEvent): void {
  let contractAddress = event.address;

  // Update contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    contract.hatsContract = event.params.newHats;
    contract.save();
  }

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new EducationHubHatsChange(changeId);

  change.educationHub = contractAddress;
  change.newHats = event.params.newHats;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}

export function handlePaused(event: PausedEvent): void {
  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Update contract
  contract.isPaused = true;
  contract.save();

  // Create pause event record using consolidated PauseEvent entity
  createPauseEvent(
    event.address,
    "EducationHub",
    contract.organization,
    true,
    event.params.account,
    event
  );
}

export function handleUnpaused(event: UnpausedEvent): void {
  let contract = EducationHubContract.load(event.address);
  if (!contract) {
    return;
  }

  // Update contract
  contract.isPaused = false;
  contract.save();

  // Create unpause event record using consolidated PauseEvent entity
  createPauseEvent(
    event.address,
    "EducationHub",
    contract.organization,
    false,
    event.params.account,
    event
  );
}
