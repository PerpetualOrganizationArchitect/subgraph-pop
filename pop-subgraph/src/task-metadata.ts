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

  // Parse submission text from JSON (present in both task creation and submission JSONs)
  let submissionText: string | null = null;
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    let text = submissionValue.toString();
    // Only consider it a valid submission if it's non-empty
    if (text.length > 0) {
      submissionText = text;
    }
  }

  // If this JSON has submission content, update the task's metadata entity
  // This handles BOTH:
  // 1. Submission IPFS (metadataType == "submission") - the primary case
  // 2. Task creation IPFS where submission is included - rare but handle it
  if (submissionText != null) {
    let task = Task.load(taskId);
    if (task && task.metadata) {
      // Load the task's canonical metadata entity (or create if doesn't exist yet)
      let metadata = TaskMetadata.load(task.metadata!);
      if (metadata == null) {
        metadata = new TaskMetadata(task.metadata!);
        metadata.task = taskId;
        metadata.indexedAt = BigInt.fromI32(0);
      }
      // Set submission text
      metadata.submission = submissionText;
      metadata.save();
    }
  }

  // For task creation metadata type, also create/update the full metadata entity
  if (metadataType != "submission") {
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
