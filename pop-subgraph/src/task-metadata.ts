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
 *   - Parses submission text from the IPFS JSON
 *   - Updates the EXISTING task.metadata entity with the submission field
 *   - This keeps all task data in one place (task.metadata)
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
    // JSON parsing failed
    if (metadataType == "task") {
      // For task creation, create a minimal metadata entity
      let metadata = new TaskMetadata(ipfsHash);
      metadata.task = taskId;
      metadata.save();

      let task = Task.load(taskId);
      if (task) {
        task.metadata = ipfsHash;
        task.save();
      }
    }
    // For submission with failed JSON parse, nothing we can do
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    // Not a JSON object
    if (metadataType == "task") {
      let metadata = new TaskMetadata(ipfsHash);
      metadata.task = taskId;
      metadata.save();

      let task = Task.load(taskId);
      if (task) {
        task.metadata = ipfsHash;
        task.save();
      }
    }
    return;
  }

  let jsonObject = jsonValue.toObject();

  if (metadataType == "submission") {
    // For submission: extract submission text and update the EXISTING task.metadata entity
    let task = Task.load(taskId);
    if (task && task.metadata) {
      // Load the existing metadata entity linked to this task
      let metadata = TaskMetadata.load(task.metadata!);
      if (metadata) {
        // Extract submission text from the IPFS JSON
        let submissionValue = jsonObject.get("submission");
        if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
          metadata.submission = submissionValue.toString();
          metadata.save();
        }
      }
    }
  } else {
    // For task creation: create TaskMetadata entity with all fields
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

    metadata.indexedAt = BigInt.fromI32(0);
    metadata.save();

    // Link task to metadata
    let task = Task.load(taskId);
    if (task) {
      task.metadata = ipfsHash;
      task.save();
    }
  }
}
