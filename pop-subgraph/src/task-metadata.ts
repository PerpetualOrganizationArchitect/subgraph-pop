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
 *   - If submission was already processed, merges it into this entity
 *
 * For task submission (metadataType == "submission"):
 *   - If task.metadata exists: updates it with submission text
 *   - If task.metadata doesn't exist yet (race condition): creates the metadata
 *     entity and links it, storing only submission for now
 *
 * This handler is resilient to:
 *   - Malformed JSON data
 *   - Race conditions between task creation and submission IPFS indexing
 *   - IPFS unavailability for one but not the other
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
    // For submission: extract submission text
    let submissionText: string | null = null;
    let submissionValue = jsonObject.get("submission");
    if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
      submissionText = submissionValue.toString();
    }

    if (submissionText == null) {
      // No submission text found in JSON, nothing to do
      return;
    }

    let task = Task.load(taskId);
    if (task) {
      if (task.metadata) {
        // Task has metadata link set - try to load and update the entity
        let metadata = TaskMetadata.load(task.metadata!);
        if (metadata) {
          // Entity exists - update it with submission
          metadata.submission = submissionText;
          metadata.save();
        } else {
          // Entity doesn't exist yet (task creation IPFS hasn't run)
          // Create the entity now with the task's metadata CID as ID
          let newMetadata = new TaskMetadata(task.metadata!);
          newMetadata.task = taskId;
          newMetadata.submission = submissionText;

          // Parse other fields from submission JSON as fallback
          let nameValue = jsonObject.get("name");
          if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
            newMetadata.name = nameValue.toString();
          }
          let descValue = jsonObject.get("description");
          if (descValue != null && !descValue.isNull() && descValue.kind == JSONValueKind.STRING) {
            newMetadata.description = descValue.toString();
          }
          let diffValue = jsonObject.get("difficulty");
          if (diffValue != null && !diffValue.isNull() && diffValue.kind == JSONValueKind.STRING) {
            newMetadata.difficulty = diffValue.toString();
          }
          let estHoursValue = jsonObject.get("estHours");
          if (estHoursValue != null && !estHoursValue.isNull() && estHoursValue.kind == JSONValueKind.NUMBER) {
            newMetadata.estimatedHours = i32(Math.round(estHoursValue.toF64()));
          }

          newMetadata.indexedAt = BigInt.fromI32(0);
          newMetadata.save();
        }
      } else {
        // Race condition: submission processed before task creation metadata
        // Create a new TaskMetadata entity using the submission IPFS hash as ID
        // When task creation metadata arrives, it will be a separate entity
        // but we link this one to the task so submission is not lost
        let metadata = new TaskMetadata(ipfsHash);
        metadata.task = taskId;
        metadata.submission = submissionText;

        // Also parse other fields from submission JSON in case they're useful
        let nameValue = jsonObject.get("name");
        if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
          metadata.name = nameValue.toString();
        }
        let descValue = jsonObject.get("description");
        if (descValue != null && !descValue.isNull() && descValue.kind == JSONValueKind.STRING) {
          metadata.description = descValue.toString();
        }
        let diffValue = jsonObject.get("difficulty");
        if (diffValue != null && !diffValue.isNull() && diffValue.kind == JSONValueKind.STRING) {
          metadata.difficulty = diffValue.toString();
        }
        let estHoursValue = jsonObject.get("estHours");
        if (estHoursValue != null && !estHoursValue.isNull() && estHoursValue.kind == JSONValueKind.NUMBER) {
          metadata.estimatedHours = i32(Math.round(estHoursValue.toF64()));
        }

        metadata.indexedAt = BigInt.fromI32(0);
        metadata.save();

        // Link task to this metadata entity
        task.metadata = ipfsHash;
        task.save();
      }
    }
  } else {
    // For task creation: create TaskMetadata entity with all fields
    let task = Task.load(taskId);

    // Check if submission already created a metadata entity (race condition)
    let existingMetadata: TaskMetadata | null = null;
    if (task && task.metadata) {
      existingMetadata = TaskMetadata.load(task.metadata!);
    }

    let metadata = TaskMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new TaskMetadata(ipfsHash);
    }

    metadata.task = taskId;

    // Parse all fields from task creation JSON
    let nameValue = jsonObject.get("name");
    if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
      metadata.name = nameValue.toString();
    }

    let descriptionValue = jsonObject.get("description");
    if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
      metadata.description = descriptionValue.toString();
    }

    let locationValue = jsonObject.get("location");
    if (locationValue != null && !locationValue.isNull() && locationValue.kind == JSONValueKind.STRING) {
      metadata.location = locationValue.toString();
    }

    let difficultyValue = jsonObject.get("difficulty");
    if (difficultyValue != null && !difficultyValue.isNull() && difficultyValue.kind == JSONValueKind.STRING) {
      metadata.difficulty = difficultyValue.toString();
    }

    let estHoursValue = jsonObject.get("estHours");
    if (estHoursValue != null && !estHoursValue.isNull()) {
      if (estHoursValue.kind == JSONValueKind.NUMBER) {
        metadata.estimatedHours = i32(Math.round(estHoursValue.toF64()));
      }
    }

    // If submission was already processed (race condition), preserve it
    if (existingMetadata && existingMetadata.submission) {
      metadata.submission = existingMetadata.submission;
    }

    metadata.indexedAt = BigInt.fromI32(0);
    metadata.save();

    // Link task to this metadata entity (the canonical one from task creation)
    if (task) {
      task.metadata = ipfsHash;
      task.save();
    }
  }
}
