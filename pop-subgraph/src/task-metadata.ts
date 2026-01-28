import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Both task creation and submission use the same JSON structure:
 * {
 *   "name": "Task name",
 *   "description": "Task description",
 *   "location": "Open|In Progress|In Review|Completed",
 *   "difficulty": "easy|medium|hard",
 *   "estHours": 8,
 *   "submission": "User's submission text"  // Only populated for submissions
 * }
 *
 * For task creation (metadataType == "task"):
 *   - Creates TaskMetadata entity with all fields
 *   - Links task.metadata to this entity
 *
 * For task submission (metadataType == "submission"):
 *   - Creates TaskMetadata entity with all fields (including submission text)
 *   - Links task.submissionMetadata to this entity
 *
 * This handler is resilient to malformed data - if parsing fails,
 * entities are created with whatever data is available.
 */
export function handleTaskMetadata(content: Bytes): void {
  let ipfsHash = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");
  let metadataType = context.getString("metadataType"); // "task" or "submission"

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // JSON parsing failed - create minimal metadata entity
    let metadata = new TaskMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.save();
    updateTaskMetadataLink(taskId, ipfsHash, metadataType);
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    // Not a JSON object - create minimal metadata entity
    let metadata = new TaskMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.save();
    updateTaskMetadataLink(taskId, ipfsHash, metadataType);
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Create TaskMetadata entity (same for both task creation and submission)
  let metadata = TaskMetadata.load(ipfsHash);
  if (metadata == null) {
    metadata = new TaskMetadata(ipfsHash);
  }

  metadata.task = taskId;

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

  // Parse estHours (can be decimal like 0.5)
  let estHoursValue = jsonObject.get("estHours");
  if (estHoursValue != null && !estHoursValue.isNull()) {
    if (estHoursValue.kind == JSONValueKind.NUMBER) {
      let floatValue = estHoursValue.toF64();
      metadata.estimatedHours = i32(Math.round(floatValue));
    }
  }

  // Parse submission text (will be empty/null for task creation, populated for submission)
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    metadata.submission = submissionValue.toString();
  }

  metadata.indexedAt = BigInt.fromI32(0);
  metadata.save();

  // Link to task based on metadata type
  updateTaskMetadataLink(taskId, ipfsHash, metadataType);
}

/**
 * Links the TaskMetadata entity to the Task entity.
 * For task creation: task.metadata = ipfsHash
 * For submission: task.submissionMetadata = ipfsHash
 */
function updateTaskMetadataLink(taskId: string, ipfsHash: string, metadataType: string): void {
  let task = Task.load(taskId);
  if (task) {
    if (metadataType == "submission") {
      task.submissionMetadata = ipfsHash;
    } else {
      task.metadata = ipfsHash;
    }
    task.save();
  }
}
