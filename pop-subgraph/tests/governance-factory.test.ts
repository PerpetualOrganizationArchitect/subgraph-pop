import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index";
import { Address, Bytes } from "@graphprotocol/graph-ts";
import { handleModuleDeployed } from "../src/governance-factory";
import { createModuleDeployedEvent } from "./governance-factory-utils";

describe("GovernanceFactory", () => {
  afterEach(() => {
    clearStore();
  });

  test("GovernanceModule created and stored with all fields", () => {
    let orgId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let typeId = Bytes.fromHexString(
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    let proxy = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let beacon = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let autoUpgrade = true;
    let owner = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );

    let moduleDeployedEvent = createModuleDeployedEvent(
      orgId,
      typeId,
      proxy,
      beacon,
      autoUpgrade,
      owner
    );

    handleModuleDeployed(moduleDeployedEvent);

    assert.entityCount("GovernanceModule", 1);

    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "orgId",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "typeId",
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "proxy",
      "0x0000000000000000000000000000000000000001"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "beacon",
      "0x0000000000000000000000000000000000000002"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "autoUpgrade",
      "true"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "owner",
      "0x0000000000000000000000000000000000000003"
    );
  });

  test("Multiple modules can be deployed for different orgs", () => {
    let orgId1 = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let orgId2 = Bytes.fromHexString(
      "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
    );
    let typeId = Bytes.fromHexString(
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    let proxy1 = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let proxy2 = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let beacon = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );
    let owner = Address.fromString(
      "0x0000000000000000000000000000000000000004"
    );

    let event1 = createModuleDeployedEvent(
      orgId1,
      typeId,
      proxy1,
      beacon,
      true,
      owner
    );
    let event2 = createModuleDeployedEvent(
      orgId2,
      typeId,
      proxy2,
      beacon,
      false,
      owner
    );

    handleModuleDeployed(event1);
    handleModuleDeployed(event2);

    assert.entityCount("GovernanceModule", 2);

    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "orgId",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000002",
      "orgId",
      "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321"
    );
  });

  test("Multiple modules can be deployed for same org with different typeIds", () => {
    let orgId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let typeId1 = Bytes.fromHexString(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    let typeId2 = Bytes.fromHexString(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
    let proxy1 = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let proxy2 = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let beacon = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );
    let owner = Address.fromString(
      "0x0000000000000000000000000000000000000004"
    );

    let event1 = createModuleDeployedEvent(
      orgId,
      typeId1,
      proxy1,
      beacon,
      true,
      owner
    );
    let event2 = createModuleDeployedEvent(
      orgId,
      typeId2,
      proxy2,
      beacon,
      true,
      owner
    );

    handleModuleDeployed(event1);
    handleModuleDeployed(event2);

    assert.entityCount("GovernanceModule", 2);

    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "typeId",
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000002",
      "typeId",
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
  });

  test("AutoUpgrade flag is correctly stored", () => {
    let orgId = Bytes.fromHexString(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    let typeId = Bytes.fromHexString(
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    );
    let proxy1 = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    );
    let proxy2 = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    );
    let beacon = Address.fromString(
      "0x0000000000000000000000000000000000000003"
    );
    let owner = Address.fromString(
      "0x0000000000000000000000000000000000000004"
    );

    let event1 = createModuleDeployedEvent(
      orgId,
      typeId,
      proxy1,
      beacon,
      true,
      owner
    );
    let event2 = createModuleDeployedEvent(
      orgId,
      typeId,
      proxy2,
      beacon,
      false,
      owner
    );

    handleModuleDeployed(event1);
    handleModuleDeployed(event2);

    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000001",
      "autoUpgrade",
      "true"
    );
    assert.fieldEquals(
      "GovernanceModule",
      "0x0000000000000000000000000000000000000002",
      "autoUpgrade",
      "false"
    );
  });
});
