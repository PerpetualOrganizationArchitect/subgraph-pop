import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 * Processes both task creation and submission metadata, storing all data
 * in a single TaskMetadata entity linked to the task.
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
    // Even if JSON parsing fails, save the entity so it exists
    metadata.save();

    // Link task to this metadata
    let task = Task.load(taskId);
    if (task) {
      task.metadata = ipfsHash;
      task.save();
    }
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();

    let task = Task.load(taskId);
    if (task) {
      task.metadata = ipfsHash;
      task.save();
    }
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

  // Link task to this metadata entity
  let task = Task.load(taskId);
  if (task) {
    // For task creation IPFS, set task.metadata to this entity
    // For submission IPFS, we also need to update the task's metadata entity with submission
    if (!task.metadata || task.metadata == ipfsHash) {
      // This is task creation IPFS or updating existing
      task.metadata = ipfsHash;
      task.save();
    } else {
      // This is submission IPFS - need to update the TASK's metadata entity
      // task.metadata points to task creation CID, we need to copy submission there
      let taskMetadata = TaskMetadata.load(task.metadata!);
      if (taskMetadata) {
        if (metadata.submission) {
          taskMetadata.submission = metadata.submission;
          taskMetadata.save();
        }
      }
    }
  }
}
