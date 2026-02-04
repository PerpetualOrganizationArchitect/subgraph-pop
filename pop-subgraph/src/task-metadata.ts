import { Bytes, dataSource, json, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Creates an immutable TaskMetadata entity keyed by IPFS CID.
 * Multiple tasks can share the same metadata entity if they have the same content hash.
 * This prevents duplicate key constraint violations when multiple events reference
 * the same IPFS CID in the same block.
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsCid = dataSource.stringParam();

  // TaskMetadata is immutable - skip if already exists
  // This is critical for preventing "duplicate key value violates unique constraint" errors
  let existingMetadata = TaskMetadata.load(ipfsCid);
  if (existingMetadata != null) {
    return;
  }

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // Create minimal entity even on parse error so the link resolves
    let metadata = new TaskMetadata(ipfsCid);
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    // Create minimal entity for non-object JSON
    let metadata = new TaskMetadata(ipfsCid);
    metadata.save();
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Create new metadata entity
  let metadata = new TaskMetadata(ipfsCid);

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
