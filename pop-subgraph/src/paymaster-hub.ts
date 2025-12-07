import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  PaymasterInitialized as PaymasterInitializedEvent,
  OrgRegistered as OrgRegisteredEvent,
  RuleSet as RuleSetEvent,
  BudgetSet as BudgetSetEvent,
  FeeCapsSet as FeeCapsSetEvent,
  PauseSet as PauseSetEvent,
  OperatorHatSet as OperatorHatSetEvent,
  DepositIncrease as DepositIncreaseEvent,
  DepositWithdraw as DepositWithdrawEvent,
  OrgDepositReceived as OrgDepositReceivedEvent,
  BountyConfig as BountyConfigEvent,
  BountyFunded as BountyFundedEvent,
  BountySweep as BountySweepEvent,
  BountyPaid as BountyPaidEvent,
  BountyPayFailed as BountyPayFailedEvent,
  UsageIncreased as UsageIncreasedEvent,
  UserOpPosted as UserOpPostedEvent,
  SolidarityFeeCollected as SolidarityFeeCollectedEvent,
  SolidarityDonationReceived as SolidarityDonationReceivedEvent,
  OrgBannedFromSolidarity as OrgBannedFromSolidarityEvent,
  EmergencyWithdraw as EmergencyWithdrawEvent,
  GracePeriodConfigUpdated as GracePeriodConfigUpdatedEvent
} from "../generated/templates/PaymasterHub/PaymasterHub";
import {
  PaymasterHubContract,
  PaymasterOrgConfig,
  PaymasterRule,
  PaymasterBudget,
  PaymasterFeeCaps,
  PaymasterBountyConfig,
  PaymasterOrgStats,
  PaymasterDepositEvent,
  BountyEvent,
  UsageEvent,
  UserOpEvent,
  SolidarityEvent,
  PaymasterConfigChange,
  GracePeriodChange,
  PauseToggle,
  OrgBanRecord,
  Organization
} from "../generated/schema";

// Helper to get or create PaymasterHubContract singleton
function getOrCreateHub(contractAddress: Bytes): PaymasterHubContract {
  let hub = PaymasterHubContract.load(contractAddress);
  if (!hub) {
    hub = new PaymasterHubContract(contractAddress);
    hub.entryPoint = Address.zero();
    hub.hats = Address.zero();
    hub.poaManager = Address.zero();
    hub.totalDeposit = BigInt.fromI32(0);
    hub.bountyPoolBalance = BigInt.fromI32(0);
    hub.solidarityBalance = BigInt.fromI32(0);
    hub.gracePeriodDays = 90;
    hub.maxSpendDuringGrace = BigInt.fromString("10000000000000000"); // 0.01 ETH
    hub.minDepositRequired = BigInt.fromString("3000000000000000"); // 0.003 ETH
    hub.createdAt = BigInt.fromI32(0);
    hub.createdAtBlock = BigInt.fromI32(0);
    hub.transactionHash = Bytes.empty();
  }
  return hub;
}

// Helper to get org config ID
function getOrgConfigId(hubAddress: Bytes, orgId: Bytes): string {
  return hubAddress.toHexString() + "-" + orgId.toHexString();
}

// Helper to get or create PaymasterOrgStats
function getOrCreateOrgStats(orgConfigId: string): PaymasterOrgStats {
  let stats = PaymasterOrgStats.load(orgConfigId);
  if (!stats) {
    stats = new PaymasterOrgStats(orgConfigId);
    stats.orgConfig = orgConfigId;
    stats.totalUserOps = BigInt.fromI32(0);
    stats.totalSuccessfulBounties = BigInt.fromI32(0);
    stats.totalFailedBounties = BigInt.fromI32(0);
    stats.totalGasSponsored = BigInt.fromI32(0);
    stats.totalDeposited = BigInt.fromI32(0);
    stats.totalWithdrawn = BigInt.fromI32(0);
    stats.totalBountyPaid = BigInt.fromI32(0);
    stats.totalSolidarityFeesCollected = BigInt.fromI32(0);
    stats.lastOperationAt = BigInt.fromI32(0);
    stats.lastOperationAtBlock = BigInt.fromI32(0);
  }
  return stats;
}

// 1. PaymasterInitialized - Create singleton
export function handlePaymasterInitialized(event: PaymasterInitializedEvent): void {
  let contractAddress = event.address;

  let hub = getOrCreateHub(contractAddress);
  hub.entryPoint = event.params.entryPoint;
  hub.hats = event.params.hats;
  hub.poaManager = event.params.poaManager;
  hub.createdAt = event.block.timestamp;
  hub.createdAtBlock = event.block.number;
  hub.transactionHash = event.transaction.hash;
  hub.save();
}

// 2. OrgRegistered - Create org config
export function handleOrgRegistered(event: OrgRegisteredEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Ensure hub exists
  let hub = getOrCreateHub(contractAddress);
  hub.save();

  // Create org config
  let orgConfig = new PaymasterOrgConfig(orgConfigId);
  orgConfig.paymasterHub = contractAddress;
  orgConfig.orgId = orgId;
  orgConfig.adminHatId = event.params.adminHatId;
  orgConfig.operatorHatId = event.params.operatorHatId;
  orgConfig.isPaused = false;
  orgConfig.isBannedFromSolidarity = false;
  orgConfig.depositBalance = BigInt.fromI32(0);
  orgConfig.totalDeposited = BigInt.fromI32(0);
  orgConfig.totalSpent = BigInt.fromI32(0);
  orgConfig.registeredAt = event.block.timestamp;
  orgConfig.registeredAtBlock = event.block.number;
  orgConfig.transactionHash = event.transaction.hash;

  // Link to Organization if exists
  let org = Organization.load(orgId);
  if (org) {
    orgConfig.organization = org.id;
  }

  orgConfig.save();

  // Create stats entity
  let stats = getOrCreateOrgStats(orgConfigId);
  stats.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "OrgRegistered";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 3. RuleSet - Upsert rule
export function handleRuleSet(event: RuleSetEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let target = event.params.target;
  let selector = event.params.selector;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Rule ID: paymasterHub-orgId-target-selector
  let ruleId = orgConfigId + "-" + target.toHexString() + "-" + selector.toHexString();

  let rule = PaymasterRule.load(ruleId);
  if (!rule) {
    rule = new PaymasterRule(ruleId);
    rule.orgConfig = orgConfigId;
    rule.target = target;
    rule.selector = selector;
  }

  rule.allowed = event.params.allowed;
  rule.maxCallGasHint = event.params.maxCallGasHint.toI32();
  rule.setAt = event.block.timestamp;
  rule.setAtBlock = event.block.number;
  rule.transactionHash = event.transaction.hash;
  rule.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "RuleSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 4. BudgetSet - Upsert budget
export function handleBudgetSet(event: BudgetSetEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let subjectKey = event.params.subjectKey;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Budget ID: paymasterHub-orgId-subjectKey
  let budgetId = orgConfigId + "-" + subjectKey.toHexString();

  let budget = PaymasterBudget.load(budgetId);
  if (!budget) {
    budget = new PaymasterBudget(budgetId);
    budget.orgConfig = orgConfigId;
    budget.subjectKey = subjectKey;
    budget.usedInEpoch = BigInt.fromI32(0);
    budget.totalUsed = BigInt.fromI32(0);
  }

  budget.capPerEpoch = event.params.capPerEpoch;
  budget.epochLen = event.params.epochLen.toI32();
  budget.epochStart = event.params.epochStart.toI32();
  budget.setAt = event.block.timestamp;
  budget.setAtBlock = event.block.number;
  budget.transactionHash = event.transaction.hash;
  budget.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "BudgetSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 5. FeeCapsSet - Upsert fee caps
export function handleFeeCapsSet(event: FeeCapsSetEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  let feeCaps = PaymasterFeeCaps.load(orgConfigId);
  if (!feeCaps) {
    feeCaps = new PaymasterFeeCaps(orgConfigId);
    feeCaps.orgConfig = orgConfigId;
  }

  feeCaps.maxFeePerGas = event.params.maxFeePerGas;
  feeCaps.maxPriorityFeePerGas = event.params.maxPriorityFeePerGas;
  feeCaps.maxCallGas = event.params.maxCallGas.toI32();
  feeCaps.maxVerificationGas = event.params.maxVerificationGas.toI32();
  feeCaps.maxPreVerificationGas = event.params.maxPreVerificationGas.toI32();
  feeCaps.setAt = event.block.timestamp;
  feeCaps.setAtBlock = event.block.number;
  feeCaps.transactionHash = event.transaction.hash;
  feeCaps.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "FeeCapsSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 6. PauseSet - Update org config + create pause toggle
export function handlePauseSet(event: PauseSetEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Update org config
  let orgConfig = PaymasterOrgConfig.load(orgConfigId);
  if (orgConfig) {
    orgConfig.isPaused = event.params.paused;
    orgConfig.save();
  }

  // Create pause toggle record
  let toggleId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let toggle = new PauseToggle(toggleId);
  toggle.orgConfig = orgConfigId;
  toggle.paused = event.params.paused;
  toggle.toggledAt = event.block.timestamp;
  toggle.toggledAtBlock = event.block.number;
  toggle.transactionHash = event.transaction.hash;
  toggle.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "PauseSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 7. OperatorHatSet - Update org config
export function handleOperatorHatSet(event: OperatorHatSetEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Update org config
  let orgConfig = PaymasterOrgConfig.load(orgConfigId);
  if (orgConfig) {
    orgConfig.operatorHatId = event.params.operatorHatId;
    orgConfig.save();
  }

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "OperatorHatSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 8. DepositIncrease - Update hub + create deposit event
export function handleDepositIncrease(event: DepositIncreaseEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.totalDeposit = event.params.newDeposit;
  hub.save();

  // Create deposit event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let depositEvent = new PaymasterDepositEvent(eventId);
  depositEvent.paymasterHub = contractAddress;
  depositEvent.eventType = "HubDeposit";
  depositEvent.amount = event.params.amount;
  depositEvent.newBalance = event.params.newDeposit;
  depositEvent.eventAt = event.block.timestamp;
  depositEvent.eventAtBlock = event.block.number;
  depositEvent.transactionHash = event.transaction.hash;
  depositEvent.save();
}

// 9. DepositWithdraw - Update hub + create deposit event
export function handleDepositWithdraw(event: DepositWithdrawEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.totalDeposit = hub.totalDeposit.minus(event.params.amount);
  hub.save();

  // Create deposit event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let depositEvent = new PaymasterDepositEvent(eventId);
  depositEvent.paymasterHub = contractAddress;
  depositEvent.eventType = "HubWithdraw";
  depositEvent.to = event.params.to;
  depositEvent.amount = event.params.amount;
  depositEvent.newBalance = hub.totalDeposit;
  depositEvent.eventAt = event.block.timestamp;
  depositEvent.eventAtBlock = event.block.number;
  depositEvent.transactionHash = event.transaction.hash;
  depositEvent.save();
}

// 10. OrgDepositReceived - Update org config + create deposit event
export function handleOrgDepositReceived(event: OrgDepositReceivedEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Update org config
  let orgConfig = PaymasterOrgConfig.load(orgConfigId);
  if (orgConfig) {
    orgConfig.depositBalance = orgConfig.depositBalance.plus(event.params.amount);
    orgConfig.totalDeposited = orgConfig.totalDeposited.plus(event.params.amount);
    orgConfig.save();
  }

  // Update stats
  let stats = getOrCreateOrgStats(orgConfigId);
  stats.totalDeposited = stats.totalDeposited.plus(event.params.amount);
  stats.lastOperationAt = event.block.timestamp;
  stats.lastOperationAtBlock = event.block.number;
  stats.save();

  // Create deposit event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let depositEvent = new PaymasterDepositEvent(eventId);
  depositEvent.paymasterHub = contractAddress;
  depositEvent.orgConfig = orgConfigId;
  depositEvent.eventType = "OrgDeposit";
  depositEvent.from = event.params.from;
  depositEvent.amount = event.params.amount;
  if (orgConfig) {
    depositEvent.newBalance = orgConfig.depositBalance;
  }
  depositEvent.eventAt = event.block.timestamp;
  depositEvent.eventAtBlock = event.block.number;
  depositEvent.transactionHash = event.transaction.hash;
  depositEvent.save();
}

// 11. BountyConfig - Upsert bounty config
export function handleBountyConfig(event: BountyConfigEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  let bountyConfig = PaymasterBountyConfig.load(orgConfigId);
  if (!bountyConfig) {
    bountyConfig = new PaymasterBountyConfig(orgConfigId);
    bountyConfig.orgConfig = orgConfigId;
    bountyConfig.totalPaid = BigInt.fromI32(0);
  }

  bountyConfig.enabled = event.params.enabled;
  bountyConfig.maxBountyPerOp = event.params.maxPerOp;
  bountyConfig.pctBpCap = event.params.pctBpCap;
  bountyConfig.setAt = event.block.timestamp;
  bountyConfig.setAtBlock = event.block.number;
  bountyConfig.transactionHash = event.transaction.hash;
  bountyConfig.save();

  // Create config change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new PaymasterConfigChange(changeId);
  change.paymasterHub = contractAddress;
  change.orgConfig = orgConfigId;
  change.changeType = "BountyConfigSet";
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}

// 12. BountyFunded - Update hub + create bounty event
export function handleBountyFunded(event: BountyFundedEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.bountyPoolBalance = event.params.newBalance;
  hub.save();

  // Create bounty event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let bountyEvent = new BountyEvent(eventId);
  bountyEvent.paymasterHub = contractAddress;
  bountyEvent.eventType = "Funded";
  bountyEvent.amount = event.params.amount;
  bountyEvent.newBalance = event.params.newBalance;
  bountyEvent.eventAt = event.block.timestamp;
  bountyEvent.eventAtBlock = event.block.number;
  bountyEvent.transactionHash = event.transaction.hash;
  bountyEvent.save();
}

// 13. BountySweep - Update hub + create bounty event
export function handleBountySweep(event: BountySweepEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.bountyPoolBalance = hub.bountyPoolBalance.minus(event.params.amount);
  hub.save();

  // Create bounty event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let bountyEvent = new BountyEvent(eventId);
  bountyEvent.paymasterHub = contractAddress;
  bountyEvent.eventType = "Swept";
  bountyEvent.recipient = event.params.to;
  bountyEvent.amount = event.params.amount;
  bountyEvent.newBalance = hub.bountyPoolBalance;
  bountyEvent.eventAt = event.block.timestamp;
  bountyEvent.eventAtBlock = event.block.number;
  bountyEvent.transactionHash = event.transaction.hash;
  bountyEvent.save();
}

// 14. BountyPaid - Create bounty event + update hub
export function handleBountyPaid(event: BountyPaidEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.bountyPoolBalance = hub.bountyPoolBalance.minus(event.params.amount);
  hub.save();

  // Create bounty event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let bountyEvent = new BountyEvent(eventId);
  bountyEvent.paymasterHub = contractAddress;
  bountyEvent.eventType = "Paid";
  bountyEvent.userOpHash = event.params.userOpHash;
  bountyEvent.recipient = event.params.to;
  bountyEvent.amount = event.params.amount;
  bountyEvent.newBalance = hub.bountyPoolBalance;
  bountyEvent.eventAt = event.block.timestamp;
  bountyEvent.eventAtBlock = event.block.number;
  bountyEvent.transactionHash = event.transaction.hash;
  bountyEvent.save();
}

// 15. BountyPayFailed - Create bounty event (no balance change)
export function handleBountyPayFailed(event: BountyPayFailedEvent): void {
  let contractAddress = event.address;

  // Create bounty event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let bountyEvent = new BountyEvent(eventId);
  bountyEvent.paymasterHub = contractAddress;
  bountyEvent.eventType = "PayFailed";
  bountyEvent.userOpHash = event.params.userOpHash;
  bountyEvent.recipient = event.params.to;
  bountyEvent.amount = event.params.amount;
  bountyEvent.eventAt = event.block.timestamp;
  bountyEvent.eventAtBlock = event.block.number;
  bountyEvent.transactionHash = event.transaction.hash;
  bountyEvent.save();
}

// 16. UsageIncreased - Create usage event + update budget
export function handleUsageIncreased(event: UsageIncreasedEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let subjectKey = event.params.subjectKey;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);
  let budgetId = orgConfigId + "-" + subjectKey.toHexString();

  // Update budget if exists
  let budget = PaymasterBudget.load(budgetId);
  if (budget) {
    budget.usedInEpoch = event.params.usedInEpoch;
    budget.epochStart = event.params.epochStart.toI32();
    budget.totalUsed = budget.totalUsed.plus(event.params.delta);
    budget.save();
  }

  // Update org config total spent
  let orgConfig = PaymasterOrgConfig.load(orgConfigId);
  if (orgConfig) {
    orgConfig.totalSpent = orgConfig.totalSpent.plus(event.params.delta);
    orgConfig.depositBalance = orgConfig.depositBalance.minus(event.params.delta);
    orgConfig.save();
  }

  // Update stats
  let stats = getOrCreateOrgStats(orgConfigId);
  stats.totalGasSponsored = stats.totalGasSponsored.plus(event.params.delta);
  stats.totalUserOps = stats.totalUserOps.plus(BigInt.fromI32(1));
  stats.lastOperationAt = event.block.timestamp;
  stats.lastOperationAtBlock = event.block.number;
  stats.save();

  // Create usage event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let usageEvent = new UsageEvent(eventId);
  usageEvent.orgConfig = orgConfigId;
  if (budget) {
    usageEvent.budget = budgetId;
  }
  usageEvent.subjectKey = subjectKey;
  usageEvent.delta = event.params.delta;
  usageEvent.usedInEpoch = event.params.usedInEpoch;
  usageEvent.epochStart = event.params.epochStart.toI32();
  usageEvent.eventAt = event.block.timestamp;
  usageEvent.eventAtBlock = event.block.number;
  usageEvent.transactionHash = event.transaction.hash;
  usageEvent.save();
}

// 17. UserOpPosted - Create user op event
export function handleUserOpPosted(event: UserOpPostedEvent): void {
  let contractAddress = event.address;

  // Create user op event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let userOpEvent = new UserOpEvent(eventId);
  userOpEvent.paymasterHub = contractAddress;
  userOpEvent.opHash = event.params.opHash;
  userOpEvent.postedBy = event.params.postedBy;
  userOpEvent.eventAt = event.block.timestamp;
  userOpEvent.eventAtBlock = event.block.number;
  userOpEvent.transactionHash = event.transaction.hash;
  userOpEvent.save();
}

// 18. SolidarityFeeCollected - Update hub + create solidarity event
export function handleSolidarityFeeCollected(event: SolidarityFeeCollectedEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.solidarityBalance = hub.solidarityBalance.plus(event.params.amount);
  hub.save();

  // Update stats
  let stats = getOrCreateOrgStats(orgConfigId);
  stats.totalSolidarityFeesCollected = stats.totalSolidarityFeesCollected.plus(event.params.amount);
  stats.lastOperationAt = event.block.timestamp;
  stats.lastOperationAtBlock = event.block.number;
  stats.save();

  // Create solidarity event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let solidarityEvent = new SolidarityEvent(eventId);
  solidarityEvent.paymasterHub = contractAddress;
  solidarityEvent.orgConfig = orgConfigId;
  solidarityEvent.eventType = "FeeCollected";
  solidarityEvent.amount = event.params.amount;
  solidarityEvent.eventAt = event.block.timestamp;
  solidarityEvent.eventAtBlock = event.block.number;
  solidarityEvent.transactionHash = event.transaction.hash;
  solidarityEvent.save();
}

// 19. SolidarityDonationReceived - Update hub + create solidarity event
export function handleSolidarityDonationReceived(event: SolidarityDonationReceivedEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.solidarityBalance = hub.solidarityBalance.plus(event.params.amount);
  hub.save();

  // Create solidarity event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let solidarityEvent = new SolidarityEvent(eventId);
  solidarityEvent.paymasterHub = contractAddress;
  solidarityEvent.eventType = "DonationReceived";
  solidarityEvent.from = event.params.from;
  solidarityEvent.amount = event.params.amount;
  solidarityEvent.eventAt = event.block.timestamp;
  solidarityEvent.eventAtBlock = event.block.number;
  solidarityEvent.transactionHash = event.transaction.hash;
  solidarityEvent.save();
}

// 20. OrgBannedFromSolidarity - Update org config + create solidarity event + ban record
export function handleOrgBannedFromSolidarity(event: OrgBannedFromSolidarityEvent): void {
  let contractAddress = event.address;
  let orgId = event.params.orgId;
  let orgConfigId = getOrgConfigId(contractAddress, orgId);

  // Update org config
  let orgConfig = PaymasterOrgConfig.load(orgConfigId);
  if (orgConfig) {
    orgConfig.isBannedFromSolidarity = event.params.banned;
    orgConfig.save();
  }

  // Create solidarity event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let solidarityEvent = new SolidarityEvent(eventId);
  solidarityEvent.paymasterHub = contractAddress;
  solidarityEvent.orgConfig = orgConfigId;
  solidarityEvent.eventType = event.params.banned ? "OrgBanned" : "OrgUnbanned";
  solidarityEvent.eventAt = event.block.timestamp;
  solidarityEvent.eventAtBlock = event.block.number;
  solidarityEvent.transactionHash = event.transaction.hash;
  solidarityEvent.save();

  // Create ban record
  let banId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let banRecord = new OrgBanRecord(banId);
  banRecord.orgConfig = orgConfigId;
  banRecord.banned = event.params.banned;
  banRecord.bannedAt = event.block.timestamp;
  banRecord.bannedAtBlock = event.block.number;
  banRecord.transactionHash = event.transaction.hash;
  banRecord.save();
}

// 21. EmergencyWithdraw - Update hub + create deposit event
export function handleEmergencyWithdraw(event: EmergencyWithdrawEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.totalDeposit = hub.totalDeposit.minus(event.params.amount);
  hub.save();

  // Create deposit event record
  let eventId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let depositEvent = new PaymasterDepositEvent(eventId);
  depositEvent.paymasterHub = contractAddress;
  depositEvent.eventType = "EmergencyWithdraw";
  depositEvent.to = event.params.to;
  depositEvent.amount = event.params.amount;
  depositEvent.newBalance = hub.totalDeposit;
  depositEvent.eventAt = event.block.timestamp;
  depositEvent.eventAtBlock = event.block.number;
  depositEvent.transactionHash = event.transaction.hash;
  depositEvent.save();
}

// 22. GracePeriodConfigUpdated - Update hub + create grace period change
export function handleGracePeriodConfigUpdated(event: GracePeriodConfigUpdatedEvent): void {
  let contractAddress = event.address;

  // Update hub
  let hub = getOrCreateHub(contractAddress);
  hub.gracePeriodDays = event.params.initialGraceDays.toI32();
  hub.maxSpendDuringGrace = event.params.maxSpendDuringGrace;
  hub.minDepositRequired = event.params.minDepositRequired;
  hub.save();

  // Create grace period change record
  let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let change = new GracePeriodChange(changeId);
  change.paymasterHub = contractAddress;
  change.initialGraceDays = event.params.initialGraceDays.toI32();
  change.maxSpendDuringGrace = event.params.maxSpendDuringGrace;
  change.minDepositRequired = event.params.minDepositRequired;
  change.changedAt = event.block.timestamp;
  change.changedAtBlock = event.block.number;
  change.transactionHash = event.transaction.hash;
  change.save();
}
