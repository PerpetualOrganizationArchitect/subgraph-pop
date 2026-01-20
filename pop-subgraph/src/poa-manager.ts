import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  BeaconCreated as BeaconCreatedEvent,
  BeaconUpgraded as BeaconUpgradedEvent,
  RegistryUpdated as RegistryUpdatedEvent,
  InfrastructureDeployed as InfrastructureDeployedEvent
} from "../generated/PoaManager/PoaManager";
import {
  PoaManagerContract,
  Beacon,
  BeaconUpgradeEvent,
  RegistryUpdate,
  PasskeyAccountFactory
} from "../generated/schema";
import { OrgDeployer as OrgDeployerTemplate } from "../generated/templates";
import { OrgRegistry as OrgRegistryTemplate } from "../generated/templates";
import { PaymasterHub as PaymasterHubTemplate } from "../generated/templates";
import { UniversalAccountRegistry as UniversalAccountRegistryTemplate } from "../generated/templates";
import { PasskeyAccountFactory as PasskeyAccountFactoryTemplate } from "../generated/templates";

function getOrCreatePoaManager(
  address: Bytes,
  timestamp: BigInt,
  blockNumber: BigInt
): PoaManagerContract {
  let poaManager = PoaManagerContract.load(address);
  if (!poaManager) {
    poaManager = new PoaManagerContract(address);
    poaManager.registry = Bytes.empty();
    poaManager.beaconCount = BigInt.fromI32(0);
    poaManager.createdAt = timestamp;
    poaManager.createdAtBlock = blockNumber;
    poaManager.save();
  }
  return poaManager;
}

export function handleBeaconCreated(event: BeaconCreatedEvent): void {
  let contractAddress = event.address;

  // Get or create PoaManagerContract
  let poaManager = getOrCreatePoaManager(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );
  poaManager.beaconCount = poaManager.beaconCount.plus(BigInt.fromI32(1));
  poaManager.save();

  // Create Beacon entity using typeId hex string as ID
  let typeIdHex = event.params.typeId.toHexString();
  let beacon = new Beacon(typeIdHex);
  beacon.poaManager = contractAddress;
  beacon.typeId = event.params.typeId;
  beacon.typeName = event.params.typeName;
  beacon.beaconAddress = event.params.beacon;
  beacon.currentImplementation = event.params.implementation;
  beacon.version = "v1";
  beacon.createdAt = event.block.timestamp;
  beacon.createdAtBlock = event.block.number;
  beacon.updatedAt = event.block.timestamp;
  beacon.updatedAtBlock = event.block.number;
  beacon.transactionHash = event.transaction.hash;
  beacon.save();
}

export function handleBeaconUpgraded(event: BeaconUpgradedEvent): void {
  let contractAddress = event.address;
  let typeIdHex = event.params.typeId.toHexString();

  // Update Beacon entity
  let beacon = Beacon.load(typeIdHex);
  if (beacon) {
    beacon.currentImplementation = event.params.newImplementation;
    beacon.version = event.params.version;
    beacon.updatedAt = event.block.timestamp;
    beacon.updatedAtBlock = event.block.number;
    beacon.save();
  }

  // Create upgrade history record
  let upgradeId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let upgrade = new BeaconUpgradeEvent(upgradeId);
  upgrade.poaManager = contractAddress;
  upgrade.beacon = typeIdHex;
  upgrade.typeId = event.params.typeId;
  upgrade.newImplementation = event.params.newImplementation;
  upgrade.version = event.params.version;
  upgrade.upgradedAt = event.block.timestamp;
  upgrade.upgradedAtBlock = event.block.number;
  upgrade.transactionHash = event.transaction.hash;
  upgrade.save();
}

export function handleRegistryUpdated(event: RegistryUpdatedEvent): void {
  let contractAddress = event.address;

  // Update PoaManagerContract
  let poaManager = getOrCreatePoaManager(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );
  poaManager.registry = event.params.newRegistry;
  poaManager.save();

  // Create registry update record
  let updateId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let update = new RegistryUpdate(updateId);
  update.poaManager = contractAddress;
  update.oldRegistry = event.params.oldRegistry;
  update.newRegistry = event.params.newRegistry;
  update.updatedAt = event.block.timestamp;
  update.updatedAtBlock = event.block.number;
  update.transactionHash = event.transaction.hash;
  update.save();
}

export function handleInfrastructureDeployed(event: InfrastructureDeployedEvent): void {
  let contractAddress = event.address;

  // Get or create PoaManagerContract and store infrastructure proxy addresses
  let poaManager = getOrCreatePoaManager(
    contractAddress,
    event.block.timestamp,
    event.block.number
  );
  poaManager.orgDeployerProxy = event.params.orgDeployer;
  poaManager.orgRegistryProxy = event.params.orgRegistry;
  poaManager.paymasterHubProxy = event.params.paymasterHub;
  poaManager.globalAccountRegistryProxy = event.params.globalAccountRegistry;
  poaManager.passkeyAccountFactoryProxy = event.params.passkeyAccountFactoryBeacon;
  poaManager.save();

  // Create data source templates for infrastructure contracts
  // This enables dynamic discovery of infrastructure proxy addresses
  OrgDeployerTemplate.create(event.params.orgDeployer);
  OrgRegistryTemplate.create(event.params.orgRegistry);
  PaymasterHubTemplate.create(event.params.paymasterHub);
  UniversalAccountRegistryTemplate.create(event.params.globalAccountRegistry);

  // Create PasskeyAccountFactory entity and data source template
  let passkeyFactoryAddress = event.params.passkeyAccountFactoryBeacon;
  let factory = new PasskeyAccountFactory(passkeyFactoryAddress);
  factory.poaManager = event.address; // The PoaManager that deployed it
  factory.accountBeacon = null; // No event to track this - set at deployment
  factory.poaGuardian = Address.zero(); // Will be set via GlobalConfigUpdated event
  factory.recoveryDelay = BigInt.fromI32(604800); // 7 days default
  factory.maxCredentialsPerAccount = 10; // default
  factory.paused = false;
  factory.createdAt = event.block.timestamp;
  factory.blockNumber = event.block.number;
  factory.save();

  PasskeyAccountFactoryTemplate.create(passkeyFactoryAddress);
}
