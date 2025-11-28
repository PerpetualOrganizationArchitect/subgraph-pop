import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  DistributionCreated as DistributionCreatedEvent,
  DistributionClaimed as DistributionClaimedEvent,
  DistributionFinalized as DistributionFinalizedEvent,
  PaymentReceived as PaymentReceivedEvent,
  OptOutToggled as OptOutToggledEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RevenueShareTokenSet as RevenueShareTokenSetEvent
} from "../generated/templates/PaymentManager/PaymentManager";
import {
  PaymentManagerContract,
  Distribution,
  Claim,
  Payment,
  OptOutToggle,
  OwnershipTransfer,
  RevenueShareTokenChange
} from "../generated/schema";
import { getUsernameForAddress, getOrCreateUser } from "./utils";

export function handleInitialized(event: InitializedEvent): void {
  // Initialization handled in org-deployer.ts
  // This event just confirms the contract is initialized
}

export function handleDistributionCreated(event: DistributionCreatedEvent): void {
  let contractAddress = event.address;
  let distributionId = event.params.distributionId;

  // Create Distribution entity
  let distributionEntityId = contractAddress.toHexString() + "-" + distributionId.toString();
  let distribution = new Distribution(distributionEntityId);

  distribution.paymentManager = contractAddress;
  distribution.distributionId = distributionId;
  distribution.payoutToken = event.params.token;
  distribution.totalAmount = event.params.amount;
  distribution.checkpointBlock = event.params.checkpointBlock;
  distribution.merkleRoot = event.params.merkleRoot;
  distribution.totalClaimed = BigInt.fromI32(0);
  distribution.status = "Active";
  distribution.createdAt = event.block.timestamp;
  distribution.createdAtBlock = event.block.number;

  distribution.save();

  // Update distributionCounter on contract
  let contract = PaymentManagerContract.load(contractAddress);
  if (contract) {
    // distributionCounter is always distributionId + 1 after creation
    contract.distributionCounter = distributionId.plus(BigInt.fromI32(1));
    contract.save();
  }
}

export function handleDistributionClaimed(event: DistributionClaimedEvent): void {
  let contractAddress = event.address;
  let distributionId = event.params.distributionId;
  let claimer = event.params.claimer;
  let amount = event.params.amount;

  // Update Distribution entity
  let distributionEntityId = contractAddress.toHexString() + "-" + distributionId.toString();
  let distribution = Distribution.load(distributionEntityId);

  if (distribution) {
    distribution.totalClaimed = distribution.totalClaimed.plus(amount);
    distribution.save();
  }

  // Create Claim entity
  let claimId = contractAddress.toHexString() + "-" + distributionId.toString() + "-" + claimer.toHexString() + "-" + event.transaction.hash.toHexString();
  let claim = new Claim(claimId);

  claim.paymentManager = contractAddress;
  claim.distributionId = distributionId;
  claim.claimer = claimer;
  claim.claimerUsername = getUsernameForAddress(claimer);

  // Link to User entity and increment totalClaimsAmount
  let managerContract = PaymentManagerContract.load(contractAddress);
  if (managerContract) {
    let user = getOrCreateUser(
      managerContract.organization,
      claimer,
      event.block.timestamp,
      event.block.number
    );
    claim.claimerUser = user.id;
    user.totalClaimsAmount = user.totalClaimsAmount.plus(amount);
    user.save();
  }

  claim.amount = amount;
  claim.claimedAt = event.block.timestamp;
  claim.claimedAtBlock = event.block.number;
  claim.transactionHash = event.transaction.hash;

  // Link to distribution entity
  claim.distribution = distributionEntityId;

  claim.save();
}

export function handleDistributionFinalized(event: DistributionFinalizedEvent): void {
  let contractAddress = event.address;
  let distributionId = event.params.distributionId;

  let distributionEntityId = contractAddress.toHexString() + "-" + distributionId.toString();
  let distribution = Distribution.load(distributionEntityId);

  if (distribution) {
    distribution.status = "Finalized";
    distribution.finalizedAt = event.block.timestamp;
    distribution.finalizedAtBlock = event.block.number;
    distribution.unclaimedAmount = event.params.unclaimedAmount;
    distribution.save();
  }
}

export function handlePaymentReceived(event: PaymentReceivedEvent): void {
  let contractAddress = event.address;

  // Create Payment entity
  let paymentId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let payment = new Payment(paymentId);

  payment.paymentManager = contractAddress;
  payment.payer = event.params.payer;
  payment.payerUsername = getUsernameForAddress(event.params.payer);

  // Link to User entity and increment totalPaymentsAmount
  let managerContract = PaymentManagerContract.load(contractAddress);
  if (managerContract) {
    let user = getOrCreateUser(
      managerContract.organization,
      event.params.payer,
      event.block.timestamp,
      event.block.number
    );
    payment.payerUser = user.id;
    user.totalPaymentsAmount = user.totalPaymentsAmount.plus(event.params.amount);
    user.save();
  }

  payment.amount = event.params.amount;
  payment.token = event.params.token;
  payment.receivedAt = event.block.timestamp;
  payment.receivedAtBlock = event.block.number;
  payment.transactionHash = event.transaction.hash;

  payment.save();
}

export function handleOptOutToggled(event: OptOutToggledEvent): void {
  let contractAddress = event.address;

  // Create OptOutToggle entity
  let toggleId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let toggle = new OptOutToggle(toggleId);

  toggle.paymentManager = contractAddress;
  toggle.user = event.params.user;
  toggle.optedOut = event.params.optedOut;
  toggle.toggledAt = event.block.timestamp;
  toggle.toggledAtBlock = event.block.number;
  toggle.transactionHash = event.transaction.hash;

  toggle.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  let contractAddress = event.address;

  // Update contract owner
  let contract = PaymentManagerContract.load(contractAddress);
  if (contract) {
    contract.owner = event.params.newOwner;
    contract.save();
  }

  // Create OwnershipTransfer entity
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new OwnershipTransfer(transferId);

  transfer.paymentManager = contractAddress;
  transfer.previousOwner = event.params.previousOwner;
  transfer.newOwner = event.params.newOwner;
  transfer.transferredAt = event.block.timestamp;
  transfer.transferredAtBlock = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}

export function handleRevenueShareTokenSet(event: RevenueShareTokenSetEvent): void {
  let contractAddress = event.address;

  // Update contract revenueShareToken
  let contract = PaymentManagerContract.load(contractAddress);
  if (contract) {
    contract.revenueShareToken = event.params.token;
    contract.save();
  }

  // Create RevenueShareTokenChange entity
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new RevenueShareTokenChange(changeId);

  change.paymentManager = contractAddress;
  change.newToken = event.params.token;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;

  change.save();
}
