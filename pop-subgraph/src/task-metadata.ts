import { BigInt, Bytes, dataSource, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Creates a mutable TaskMetadata entity keyed by txHash-CID for uniqueness.
 * Uses "load or create" pattern which is safe for mutable entities and
 * handles retries gracefully without triggering duplicate key constraint violations.
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsCid = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");
  let timestamp = context.getBigInt("timestamp");
  let txHash = context.getBytes("txHash");

  // Entity ID includes tx hash for uniqueness
  let entityId = txHash.toHexString() + "-" + ipfsCid;

  // Load or create metadata entity (mutable entity - safe to update)
  let metadata = TaskMetadata.load(entityId);
  if (metadata == null) {
    metadata = new TaskMetadata(entityId);
    metadata.task = taskId;
    metadata.indexedAt = timestamp;
  }

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // Save minimal entity even on parse error so the link resolves
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    // Save minimal entity for non-object JSON
    metadata.save();
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse name
  let nameValue = jsonObject.get("name");
  if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
    metadata.name = nameValue.toString();
  }

  // Parse description
  let descriptionValue = jsonObject.get("description");
  if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
    metadata.description = descriptionValue.toString();
  }

  // Parse location
  let locationValue = jsonObject.get("location");
  if (locationValue != null && !locationValue.isNull() && locationValue.kind == JSONValueKind.STRING) {
    metadata.location = locationValue.toString();
  }

  // Parse difficulty
  let difficultyValue = jsonObject.get("difficulty");
  if (difficultyValue != null && !difficultyValue.isNull() && difficultyValue.kind == JSONValueKind.STRING) {
    metadata.difficulty = difficultyValue.toString();
  }

  // Parse estHours
  let estHoursValue = jsonObject.get("estHours");
  if (estHoursValue != null && !estHoursValue.isNull() && estHoursValue.kind == JSONValueKind.NUMBER) {
    metadata.estimatedHours = i32(Math.round(estHoursValue.toF64()));
  }

  // Parse submission content (for submission metadata entities)
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    metadata.submission = submissionValue.toString();
  }

  metadata.save();
}
