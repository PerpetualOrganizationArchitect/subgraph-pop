import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Creates a TaskMetadata entity with parsed fields from the IPFS JSON content.
 * The Task entity link is pre-set by the event handler (handleTaskCreated),
 * so this handler only needs to populate the metadata fields.
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsHash = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");

  // Load or create the TaskMetadata entity using the IPFS hash as ID
  let metadata = TaskMetadata.load(ipfsHash);
  if (metadata == null) {
    metadata = new TaskMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.indexedAt = BigInt.fromI32(0);
  }

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
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

  metadata.save();
}
