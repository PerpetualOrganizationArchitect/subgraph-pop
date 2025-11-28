import { BigInt, Bytes, log, Address } from "@graphprotocol/graph-ts";
import {
  Initialized as InitializedEvent,
  Transfer as TransferEvent,
  MemberHatSet as MemberHatSetEvent,
  ApproverHatSet as ApproverHatSetEvent,
  Requested as RequestedEvent,
  RequestApproved as RequestApprovedEvent,
  RequestCancelled as RequestCancelledEvent,
  TaskManagerSet as TaskManagerSetEvent,
  EducationHubSet as EducationHubSetEvent
} from "../generated/templates/ParticipationToken/ParticipationToken";
import {
  ParticipationTokenContract,
  ParticipationTokenMemberHat,
  ParticipationTokenApproverHat,
  TokenRequest,
  TokenBalance
} from "../generated/schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function handleInitialized(event: InitializedEvent): void {
  // Initialization is handled by OrgDeployer when the contract is created.
  // Initial values for name, symbol, executor, hats will be populated there.
  // We avoid contract calls here to support non-archive RPC nodes.
  let contract = ParticipationTokenContract.load(event.address);
  if (contract == null) {
    log.warning("ParticipationTokenContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }
  // Just save to mark initialization
  contract.save();
}

export function handleTransfer(event: TransferEvent): void {
  let contractAddress = event.address;
  let amount = event.params.value;
  let fromAddress = event.params.from;
  let toAddress = event.params.to;

  // Load contract to update total supply
  let contract = ParticipationTokenContract.load(contractAddress);

  // Update sender balance (if not zero address - zero address means mint)
  if (fromAddress.toHexString() != ZERO_ADDRESS) {
    let fromBalanceId = contractAddress.toHexString() + "-" + fromAddress.toHexString();
    let fromBalance = TokenBalance.load(fromBalanceId);

    if (fromBalance == null) {
      fromBalance = new TokenBalance(fromBalanceId);
      fromBalance.participationToken = contractAddress;
      fromBalance.account = fromAddress;
      fromBalance.balance = BigInt.fromI32(0);
    }

    // Decrease sender balance
    fromBalance.balance = fromBalance.balance.minus(amount);
    fromBalance.updatedAt = event.block.timestamp;
    fromBalance.updatedAtBlock = event.block.number;
    fromBalance.save();
  } else {
    // This is a mint - increase total supply
    if (contract != null) {
      contract.totalSupply = contract.totalSupply.plus(amount);
    }
  }

  // Update receiver balance (if not zero address - zero address means burn)
  if (toAddress.toHexString() != ZERO_ADDRESS) {
    let toBalanceId = contractAddress.toHexString() + "-" + toAddress.toHexString();
    let toBalance = TokenBalance.load(toBalanceId);

    if (toBalance == null) {
      toBalance = new TokenBalance(toBalanceId);
      toBalance.participationToken = contractAddress;
      toBalance.account = toAddress;
      toBalance.balance = BigInt.fromI32(0);
    }

    // Increase receiver balance
    toBalance.balance = toBalance.balance.plus(amount);
    toBalance.updatedAt = event.block.timestamp;
    toBalance.updatedAtBlock = event.block.number;
    toBalance.save();
  } else {
    // This is a burn - decrease total supply
    if (contract != null) {
      contract.totalSupply = contract.totalSupply.minus(amount);
    }
  }

  // Save contract if it exists
  if (contract != null) {
    contract.save();
  }
}

export function handleMemberHatSet(event: MemberHatSetEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hat;

  let memberHatId = contractAddress.toHexString() + "-" + hatId.toString();
  let memberHat = ParticipationTokenMemberHat.load(memberHatId);

  if (memberHat == null) {
    memberHat = new ParticipationTokenMemberHat(memberHatId);
    memberHat.participationToken = contractAddress;
    memberHat.hatId = hatId;
  }

  memberHat.allowed = event.params.allowed;
  memberHat.setAt = event.block.timestamp;
  memberHat.setAtBlock = event.block.number;
  memberHat.transactionHash = event.transaction.hash;

  memberHat.save();
}

export function handleApproverHatSet(event: ApproverHatSetEvent): void {
  let contractAddress = event.address;
  let hatId = event.params.hat;

  let approverHatId = contractAddress.toHexString() + "-" + hatId.toString();
  let approverHat = ParticipationTokenApproverHat.load(approverHatId);

  if (approverHat == null) {
    approverHat = new ParticipationTokenApproverHat(approverHatId);
    approverHat.participationToken = contractAddress;
    approverHat.hatId = hatId;
  }

  approverHat.allowed = event.params.allowed;
  approverHat.setAt = event.block.timestamp;
  approverHat.setAtBlock = event.block.number;
  approverHat.transactionHash = event.transaction.hash;

  approverHat.save();
}

export function handleRequested(event: RequestedEvent): void {
  let contractAddress = event.address;
  let requestId = event.params.id;

  let tokenRequestId = contractAddress.toHexString() + "-" + requestId.toString();
  let tokenRequest = new TokenRequest(tokenRequestId);

  tokenRequest.requestId = requestId;
  tokenRequest.participationToken = contractAddress;
  tokenRequest.requester = event.params.requester;
  tokenRequest.amount = event.params.amount;
  tokenRequest.ipfsHash = event.params.ipfsHash;
  tokenRequest.status = "Pending";
  tokenRequest.createdAt = event.block.timestamp;
  tokenRequest.createdAtBlock = event.block.number;
  tokenRequest.transactionHash = event.transaction.hash;

  tokenRequest.save();
}

export function handleRequestApproved(event: RequestApprovedEvent): void {
  let contractAddress = event.address;
  let requestId = event.params.id;

  let tokenRequestId = contractAddress.toHexString() + "-" + requestId.toString();
  let tokenRequest = TokenRequest.load(tokenRequestId);

  if (tokenRequest == null) {
    log.warning("TokenRequest not found for id {}", [tokenRequestId]);
    return;
  }

  tokenRequest.status = "Approved";
  tokenRequest.approver = event.params.approver;
  tokenRequest.approvedAt = event.block.timestamp;
  tokenRequest.approvedAtBlock = event.block.number;

  tokenRequest.save();
}

export function handleRequestCancelled(event: RequestCancelledEvent): void {
  let contractAddress = event.address;
  let requestId = event.params.id;

  let tokenRequestId = contractAddress.toHexString() + "-" + requestId.toString();
  let tokenRequest = TokenRequest.load(tokenRequestId);

  if (tokenRequest == null) {
    log.warning("TokenRequest not found for id {}", [tokenRequestId]);
    return;
  }

  tokenRequest.status = "Cancelled";
  tokenRequest.cancelledAt = event.block.timestamp;
  tokenRequest.cancelledAtBlock = event.block.number;

  tokenRequest.save();
}

export function handleTaskManagerSet(event: TaskManagerSetEvent): void {
  let contract = ParticipationTokenContract.load(event.address);
  if (contract == null) {
    log.warning("ParticipationTokenContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.taskManagerAddress = event.params.taskManager;
  contract.save();
}

export function handleEducationHubSet(event: EducationHubSetEvent): void {
  let contract = ParticipationTokenContract.load(event.address);
  if (contract == null) {
    log.warning("ParticipationTokenContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  contract.educationHubAddress = event.params.educationHub;
  contract.save();
}
