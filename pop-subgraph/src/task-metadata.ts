import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * This handler processes BOTH task creation metadata AND submission metadata.
 * The JSON structure is the same for both, but submission will have a non-empty
 * "submission" field.
 *
 * Key insight: We ALWAYS update/create the metadata entity pointed to by task.metadata,
 * regardless of which IPFS source triggered this handler. This ensures submission
 * data ends up in the right place.
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsHash = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");

  // Load the task to get the canonical metadata CID
  let task = Task.load(taskId);
  if (!task) {
    return;
  }

  // The canonical metadata CID is set by handleTaskCreated
  let canonicalMetadataCid = task.metadata;
  if (!canonicalMetadataCid) {
    return;
  }

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Load or create the canonical metadata entity
  let metadata = TaskMetadata.load(canonicalMetadataCid!);
  if (metadata == null) {
    metadata = new TaskMetadata(canonicalMetadataCid!);
    metadata.task = taskId;
  }

  // Parse submission text - if present, this is submission metadata
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    let text = submissionValue.toString();
    if (text.length > 0) {
      metadata.submission = text;
    }
  }

  // Parse other fields - these come from task creation metadata
  // Only update if the field isn't already set (to preserve data from other IPFS source)
  let nameValue = jsonObject.get("name");
  if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
    if (!metadata.name) {
      metadata.name = nameValue.toString();
    }
  }

  let descriptionValue = jsonObject.get("description");
  if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
    // Description might be empty string in submission JSON, so check task creation
    let desc = descriptionValue.toString();
    if (desc.length > 0 || !metadata.description) {
      metadata.description = desc;
    }
  }

  let locationValue = jsonObject.get("location");
  if (locationValue != null && !locationValue.isNull() && locationValue.kind == JSONValueKind.STRING) {
    if (!metadata.location) {
      metadata.location = locationValue.toString();
    }
  }

  let difficultyValue = jsonObject.get("difficulty");
  if (difficultyValue != null && !difficultyValue.isNull() && difficultyValue.kind == JSONValueKind.STRING) {
    if (!metadata.difficulty) {
      metadata.difficulty = difficultyValue.toString();
    }
  }

  let estHoursValue = jsonObject.get("estHours");
  if (estHoursValue != null && !estHoursValue.isNull() && estHoursValue.kind == JSONValueKind.NUMBER) {
    if (!metadata.estimatedHours) {
      metadata.estimatedHours = i32(Math.round(estHoursValue.toF64()));
    }
  }

  metadata.indexedAt = BigInt.fromI32(0);
  metadata.save();
}
