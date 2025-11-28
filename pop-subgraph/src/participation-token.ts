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
import { ParticipationToken as ParticipationTokenBinding } from "../generated/templates/ParticipationToken/ParticipationToken";

export function handleInitialized(event: InitializedEvent): void {
  let contract = ParticipationTokenContract.load(event.address);
  if (contract == null) {
    log.warning("ParticipationTokenContract not found at address {}", [
      event.address.toHexString()
    ]);
    return;
  }

  // Bind to contract to read name, symbol, and other state
  let tokenContract = ParticipationTokenBinding.bind(event.address);

  let nameResult = tokenContract.try_name();
  if (!nameResult.reverted) {
    contract.name = nameResult.value;
  }

  let symbolResult = tokenContract.try_symbol();
  if (!symbolResult.reverted) {
    contract.symbol = symbolResult.value;
  }

  let executorResult = tokenContract.try_executor();
  if (!executorResult.reverted) {
    contract.executor = executorResult.value;
  }

  let hatsResult = tokenContract.try_hats();
  if (!hatsResult.reverted) {
    contract.hatsContract = hatsResult.value;
  }

  contract.save();
}

export function handleTransfer(event: TransferEvent): void {
  let contractAddress = event.address;

  // Update sender balance (if not zero address)
  if (event.params.from.toHexString() != "0x0000000000000000000000000000000000000000") {
    updateBalance(contractAddress, event.params.from, event.block.timestamp, event.block.number);
  }

  // Update receiver balance (if not zero address)
  if (event.params.to.toHexString() != "0x0000000000000000000000000000000000000000") {
    updateBalance(contractAddress, event.params.to, event.block.timestamp, event.block.number);
  }

  // Update total supply
  let contract = ParticipationTokenContract.load(contractAddress);
  if (contract != null) {
    let tokenContract = ParticipationTokenBinding.bind(contractAddress);
    let totalSupplyResult = tokenContract.try_totalSupply();
    if (!totalSupplyResult.reverted) {
      contract.totalSupply = totalSupplyResult.value;
      contract.save();
    }
  }
}

function updateBalance(contractAddress: Address, account: Address, timestamp: BigInt, blockNumber: BigInt): void {
  let balanceId = contractAddress.toHexString() + "-" + account.toHexString();
  let balance = TokenBalance.load(balanceId);

  if (balance == null) {
    balance = new TokenBalance(balanceId);
    balance.participationToken = contractAddress;
    balance.account = account;
    balance.balance = BigInt.fromI32(0);
  }

  // Fetch current balance from contract
  let tokenContract = ParticipationTokenBinding.bind(contractAddress);
  let balanceResult = tokenContract.try_balanceOf(account);
  if (!balanceResult.reverted) {
    balance.balance = balanceResult.value;
  }

  balance.updatedAt = timestamp;
  balance.updatedAtBlock = blockNumber;
  balance.save();
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
