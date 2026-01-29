import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Each IPFS hash creates its own TaskMetadata entity. The handler uses the
 * metadataType context ("task" or "submission") to link the entity to the
 * correct field on the Task:
 * - "task" -> task.metadata (description, difficulty, etc.)
 * - "submission" -> task.submissionMetadata (submission text)
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsHash = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");
  let metadataType = context.getString("metadataType");

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
    // Even if JSON parsing fails, save the entity and link to task
    metadata.save();
    linkMetadataToTask(taskId, ipfsHash, metadataType);
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
    linkMetadataToTask(taskId, ipfsHash, metadataType);
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse submission text
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    let text = submissionValue.toString();
    if (text.length > 0) {
      metadata.submission = text;
    }
  }

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
  linkMetadataToTask(taskId, ipfsHash, metadataType);
}

/**
 * Links the TaskMetadata entity to the Task based on metadata type.
 * - "task" links to task.metadata
 * - "submission" links to task.submissionMetadata
 */
function linkMetadataToTask(taskId: string, ipfsHash: string, metadataType: string): void {
  let task = Task.load(taskId);
  if (task) {
    if (metadataType == "submission") {
      task.submissionMetadata = ipfsHash;
    } else {
      // Default to task metadata for "task" type or any other value
      task.metadata = ipfsHash;
    }
    task.save();
  }
}
