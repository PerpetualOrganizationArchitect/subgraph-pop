import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Expected JSON structure for task creation:
 * {
 *   name: "Task name",
 *   description: "Task description",
 *   location: "Open",
 *   difficulty: "medium",
 *   estHours: 8,
 *   submission: ""
 * }
 *
 * Expected JSON structure for task submission:
 * {
 *   name: "Task name",
 *   description: "Task description",
 *   location: "In Review",
 *   difficulty: "medium",
 *   estHours: 8,
 *   submission: "Submission text from worker..."
 * }
 *
 * This handler is resilient to malformed data - if parsing fails or fields
 * are missing, the entity will be created with whatever data is available.
 * The subgraph will NOT brick if IPFS is slow or unavailable - the main
 * Task entity from on-chain events will still be indexed.
 */
export function handleTaskMetadata(content: Bytes): void {
  // The dataSource.stringParam() contains the IPFS hash (CID)
  let ipfsHash = dataSource.stringParam();

  // Get context passed by the caller
  let context = dataSource.context();
  let taskId = context.getString("taskId");
  let metadataType = context.getString("metadataType"); // "task" or "submission"

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // JSON parsing failed - create entity with just the ID and task link
    let metadata = new TaskMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (!jsonValue.isNull() && jsonValue.kind == JSONValueKind.OBJECT) {
    let jsonObject = jsonValue.toObject();

    // Create or load the metadata entity
    let metadata = TaskMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new TaskMetadata(ipfsHash);
    }

    // Link to task
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

    // Parse estHours (estimated hours)
    let estHoursValue = jsonObject.get("estHours");
    if (estHoursValue != null && !estHoursValue.isNull()) {
      if (estHoursValue.kind == JSONValueKind.NUMBER) {
        metadata.estimatedHours = estHoursValue.toI64() as i32;
      }
    }

    // Parse submission
    let submissionValue = jsonObject.get("submission");
    if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
      metadata.submission = submissionValue.toString();
    }

    // Set indexed timestamp (file data sources don't have block context)
    metadata.indexedAt = BigInt.fromI32(0);

    metadata.save();

    // Update parent task with metadata link
    let task = Task.load(taskId);
    if (task) {
      if (metadataType == "submission") {
        task.submissionMetadata = ipfsHash;
      } else {
        task.metadata = ipfsHash;
      }
      task.save();
    }
  } else {
    // Not a JSON object - create entity with just the ID and task link
    let metadata = new TaskMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.save();
  }
}
