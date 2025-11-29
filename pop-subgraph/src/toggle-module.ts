import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  ToggleModuleInitialized as ToggleModuleInitializedEvent,
  HatToggled as HatToggledEvent,
  AdminTransferred as AdminTransferredEvent
} from "../generated/templates/ToggleModule/ToggleModule";
import {
  ToggleModuleContract,
  HatToggleEvent,
  ToggleAdminTransfer
} from "../generated/schema";

export function handleInitialized(event: InitializedEvent): void {
  // Initialization handled in org-deployer.ts
  // This event just confirms the contract is initialized
}

export function handleToggleModuleInitialized(event: ToggleModuleInitializedEvent): void {
  let contractAddress = event.address;

  // Update the ToggleModuleContract entity with the admin
  let toggleModule = ToggleModuleContract.load(contractAddress);
  if (toggleModule) {
    toggleModule.admin = event.params.admin;
    toggleModule.save();
  }
}

export function handleHatToggled(event: HatToggledEvent): void {
  let contractAddress = event.address;

  // Create hat toggle event record
  let toggleId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let toggle = new HatToggleEvent(toggleId);

  toggle.toggleModule = contractAddress;
  toggle.hatId = event.params.hatId;
  toggle.newStatus = event.params.newStatus;
  toggle.toggledAt = event.block.timestamp;
  toggle.toggledAtBlock = event.block.number;
  toggle.transactionHash = event.transaction.hash;

  toggle.save();
}

export function handleAdminTransferred(event: AdminTransferredEvent): void {
  let contractAddress = event.address;

  // Update the ToggleModuleContract entity
  let toggleModule = ToggleModuleContract.load(contractAddress);
  if (toggleModule) {
    toggleModule.admin = event.params.newAdmin;
    toggleModule.save();
  }

  // Create transfer record
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new ToggleAdminTransfer(transferId);

  transfer.toggleModule = contractAddress;
  transfer.oldAdmin = event.params.oldAdmin;
  transfer.newAdmin = event.params.newAdmin;
  transfer.transferredAt = event.block.timestamp;
  transfer.transferredAtBlock = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}
