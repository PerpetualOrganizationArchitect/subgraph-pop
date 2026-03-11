import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  handleMirrorSet,
  handlePinned,
  handleModeChanged,
  handleOwnershipTransferred,
  handleOwnershipTransferStarted
} from "../src/switchable-beacon";
import {
  createMirrorSetEvent,
  createPinnedEvent,
  createModeChangedEvent,
  createOwnershipTransferredEvent,
  createOwnershipTransferStartedEvent
} from "./switchable-beacon-utils";
import {
  SwitchableBeaconContract,
  BeaconModeChange,
  BeaconOwnershipChange
} from "../generated/schema";

// Default mock event address from matchstick-as
let BEACON_ADDRESS = Address.fromString("0xa16081f360e3847006db660bae1c6d1b2e17ec2a");
let ORG_ID = Bytes.fromHexString("0x1111111111111111111111111111111111111111111111111111111111111111");
let TYPE_ID = Bytes.fromHexString("0x2222222222222222222222222222222222222222222222222222222222222222");
let OWNER = Address.fromString("0x0000000000000000000000000000000000000001");
let REGISTERED_CONTRACT_ID = Bytes.fromHexString("0x3333333333333333333333333333333333333333333333333333333333333333");

function setupBeaconEntity(): void {
  let beacon = new SwitchableBeaconContract(BEACON_ADDRESS);
  beacon.registeredContract = REGISTERED_CONTRACT_ID;
  beacon.organization = ORG_ID;
  beacon.typeId = TYPE_ID;
  beacon.owner = OWNER;
  beacon.mode = "Mirror";
  beacon.createdAt = BigInt.fromI32(1000);
  beacon.createdAtBlock = BigInt.fromI32(100);
  beacon.save();
}

describe("SwitchableBeacon", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleMirrorSet", () => {
    test("sets mode to Mirror and creates BeaconModeChange record", () => {
      setupBeaconEntity();

      // Start in Static mode to verify transition
      let beacon = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      beacon.mode = "Static";
      beacon.pinnedImplementation = Address.fromString("0x0000000000000000000000000000000000000099");
      beacon.save();

      let mirrorBeacon = Address.fromString("0x0000000000000000000000000000000000000042");
      let event = createMirrorSetEvent(mirrorBeacon);
      handleMirrorSet(event);

      // Verify beacon entity updated
      let updated = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      assert.stringEquals(updated.mode, "Mirror");
      assert.bytesEquals(updated.mirrorBeacon!, mirrorBeacon);
      assert.assertTrue(updated.pinnedImplementation === null);

      // Verify BeaconModeChange record created
      let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.entityCount("BeaconModeChange", 1);
      assert.fieldEquals("BeaconModeChange", changeId.toHexString(), "newMode", "Mirror");
      assert.fieldEquals("BeaconModeChange", changeId.toHexString(), "mirrorBeacon", mirrorBeacon.toHexString());
    });

    test("handles beacon not found gracefully", () => {
      let event = createMirrorSetEvent(Address.fromString("0x0000000000000000000000000000000000000042"));
      handleMirrorSet(event);
      assert.entityCount("BeaconModeChange", 0);
    });
  });

  describe("handlePinned", () => {
    test("sets mode to Static and creates BeaconModeChange record", () => {
      setupBeaconEntity();

      let implementation = Address.fromString("0x0000000000000000000000000000000000000055");
      let mirrorAddr = Address.fromString("0x0000000000000000000000000000000000000042");

      // Set mirrorBeacon to verify it gets cleared
      let beacon = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      beacon.mirrorBeacon = mirrorAddr;
      beacon.save();

      let event = createPinnedEvent(implementation);
      handlePinned(event);

      let updated = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      assert.stringEquals(updated.mode, "Static");
      assert.bytesEquals(updated.pinnedImplementation!, implementation);
      assert.assertTrue(updated.mirrorBeacon === null);

      let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.entityCount("BeaconModeChange", 1);
      assert.fieldEquals("BeaconModeChange", changeId.toHexString(), "newMode", "Static");
      assert.fieldEquals("BeaconModeChange", changeId.toHexString(), "pinnedImplementation", implementation.toHexString());
    });
  });

  describe("handleModeChanged", () => {
    test("is a no-op (state handled by MirrorSet/Pinned)", () => {
      setupBeaconEntity();

      let event = createModeChangedEvent(0);
      handleModeChanged(event);

      // Beacon should be unchanged
      let beacon = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      assert.stringEquals(beacon.mode, "Mirror");
      assert.entityCount("BeaconModeChange", 0);
    });
  });

  describe("handleOwnershipTransferred", () => {
    test("updates owner, clears pendingOwner, and creates ownership change record", () => {
      setupBeaconEntity();

      // Set pending owner first
      let beacon = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      let newOwner = Address.fromString("0x0000000000000000000000000000000000000077");
      beacon.pendingOwner = newOwner;
      beacon.save();

      let event = createOwnershipTransferredEvent(OWNER, newOwner);
      handleOwnershipTransferred(event);

      let updated = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      assert.bytesEquals(updated.owner, newOwner);
      assert.assertTrue(updated.pendingOwner === null);

      let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.entityCount("BeaconOwnershipChange", 1);
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "changeType", "Completed");
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "previousOwner", OWNER.toHexString());
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "newOwner", newOwner.toHexString());
    });
  });

  describe("handleOwnershipTransferStarted", () => {
    test("sets pendingOwner and creates ownership change record", () => {
      setupBeaconEntity();

      let pendingOwner = Address.fromString("0x0000000000000000000000000000000000000088");
      let event = createOwnershipTransferStartedEvent(OWNER, pendingOwner);
      handleOwnershipTransferStarted(event);

      let beacon = SwitchableBeaconContract.load(BEACON_ADDRESS)!;
      assert.bytesEquals(beacon.pendingOwner!, pendingOwner);

      let changeId = event.transaction.hash.concatI32(event.logIndex.toI32());
      assert.entityCount("BeaconOwnershipChange", 1);
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "changeType", "Started");
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "previousOwner", OWNER.toHexString());
      assert.fieldEquals("BeaconOwnershipChange", changeId.toHexString(), "newOwner", pendingOwner.toHexString());
    });
  });
});
