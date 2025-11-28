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
  EducationHubCreatorHat,
  EducationHubMemberHat,
  EducationHubExecutorChange,
  EducationHubTokenChange,
  EducationHubHatsChange,
  EducationHubPauseEvent
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser } from "./utils";

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
  module.payout = event.params.payout;
  module.metadata = event.params.metadata;
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
    completion.learnerUser = user.id;
    user.totalModulesCompleted = user.totalModulesCompleted.plus(BigInt.fromI32(1));
    user.save();
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
    module.payout = event.params.payout;
    module.metadata = event.params.metadata;
    module.updatedAt = event.block.timestamp;
    module.updatedAtBlock = event.block.number;
    module.save();
  }

  // Create historical update record
  let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let update = new ModuleUpdate(updateId);

  update.module = moduleEntityId;
  update.moduleId = moduleId;
  update.payout = event.params.payout;
  update.metadata = event.params.metadata;
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
  let contractAddress = event.address;
  let hatId = event.params.hatId;

  let hatEntityId = contractAddress.toHexString() + "-" + hatId.toString();
  let hat = EducationHubCreatorHat.load(hatEntityId);

  if (!hat) {
    hat = new EducationHubCreatorHat(hatEntityId);
    hat.educationHub = contractAddress;
    hat.hatId = hatId;
  }

  hat.enabled = event.params.enabled;
  hat.setAt = event.block.timestamp;
  hat.setAtBlock = event.block.number;
  hat.transactionHash = event.transaction.hash;

  hat.save();
}

export function handleMemberHatSet(event: MemberHatSetEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hatId;

  let hatEntityId = contractAddress.toHexString() + "-" + hatId.toString();
  let hat = EducationHubMemberHat.load(hatEntityId);

  if (!hat) {
    hat = new EducationHubMemberHat(hatEntityId);
    hat.educationHub = contractAddress;
    hat.hatId = hatId;
  }

  hat.enabled = event.params.enabled;
  hat.setAt = event.block.timestamp;
  hat.setAtBlock = event.block.number;
  hat.transactionHash = event.transaction.hash;

  hat.save();
}

export function handleHatToggled(event: HatToggledEvent): void {
  // HatToggled event could apply to either creator or member hats
  // This is a generic toggle event - we'll track it but might not know the hat type
  // The specific setCreatorHatAllowed/setMemberHatAllowed events are more precise

  // For now, we'll handle this as a member hat since that's the completion permission
  let contractAddress = event.address;
  let hatId = event.params.hatId;

  let hatEntityId = contractAddress.toHexString() + "-" + hatId.toString();
  let hat = EducationHubMemberHat.load(hatEntityId);

  if (!hat) {
    hat = new EducationHubMemberHat(hatEntityId);
    hat.educationHub = contractAddress;
    hat.hatId = hatId;
  }

  hat.enabled = event.params.allowed;
  hat.setAt = event.block.timestamp;
  hat.setAtBlock = event.block.number;
  hat.transactionHash = event.transaction.hash;

  hat.save();
}

export function handleExecutorSet(event: ExecutorSetEvent): void {
  let contractAddress = event.address;

  // Update contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    contract.executor = event.params.newExecutor;
    contract.save();
  }

  // Create historical record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new EducationHubExecutorChange(changeId);

  change.educationHub = contractAddress;
  change.newExecutor = event.params.newExecutor;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
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
  let contractAddress = event.address;

  // Update contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    contract.isPaused = true;
    contract.save();
  }

  // Create pause event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let pauseEvent = new EducationHubPauseEvent(eventId);

  pauseEvent.educationHub = contractAddress;
  pauseEvent.isPaused = true;
  pauseEvent.account = event.params.account;
  pauseEvent.eventAt = event.block.timestamp;
  pauseEvent.eventAtBlock = event.block.number;
  pauseEvent.transactionHash = event.transaction.hash;

  pauseEvent.save();
}

export function handleUnpaused(event: UnpausedEvent): void {
  let contractAddress = event.address;

  // Update contract
  let contract = EducationHubContract.load(contractAddress);
  if (contract) {
    contract.isPaused = false;
    contract.save();
  }

  // Create unpause event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let pauseEvent = new EducationHubPauseEvent(eventId);

  pauseEvent.educationHub = contractAddress;
  pauseEvent.isPaused = false;
  pauseEvent.account = event.params.account;
  pauseEvent.eventAt = event.block.timestamp;
  pauseEvent.eventAtBlock = event.block.number;
  pauseEvent.transactionHash = event.transaction.hash;

  pauseEvent.save();
}
