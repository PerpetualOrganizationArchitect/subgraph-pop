import { Bytes, dataSource, json, BigInt, JSONValueKind, log } from "@graphprotocol/graph-ts";
import { TaskMetadata, Task } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task metadata JSON.
 *
 * Each IPFS hash creates its own TaskMetadata entity. The handler determines
 * whether this is task creation metadata or submission metadata by:
 * 1. First checking the metadataType context (if reliably set)
 * 2. Falling back to content detection: if JSON has non-empty "submission" field
 *    AND location is "In Review", it's submission metadata
 *
 * Links the entity to the correct field on the Task:
 * - Task creation -> task.metadata
 * - Submission -> task.submissionMetadata
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
    linkMetadataToTask(taskId, ipfsHash, metadataType, false);
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
    linkMetadataToTask(taskId, ipfsHash, metadataType, false);
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse submission text and track if it has content
  let hasSubmissionContent = false;
  let submissionValue = jsonObject.get("submission");
  if (submissionValue != null && !submissionValue.isNull() && submissionValue.kind == JSONValueKind.STRING) {
    let text = submissionValue.toString();
    if (text.length > 0) {
      metadata.submission = text;
      hasSubmissionContent = true;
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
  linkMetadataToTask(taskId, ipfsHash, metadataType, hasSubmissionContent);
}

/**
 * Links the TaskMetadata entity to the Task based on metadata type.
 *
 * Uses dual detection strategy:
 * 1. If metadataType context is "submission", use that
 * 2. Otherwise, if JSON content has non-empty submission text, treat as submission
 * 3. Default to task metadata
 *
 * This handles cases where context may not be preserved across indexer restarts.
 */
function linkMetadataToTask(
  taskId: string,
  ipfsHash: string,
  metadataType: string,
  hasSubmissionContent: boolean
): void {
  let task = Task.load(taskId);
  if (task) {
    // Determine if this is submission metadata using dual detection:
    // 1. Context says "submission", OR
    // 2. JSON content has actual submission text (content-based detection)
    let isSubmission = metadataType == "submission" || hasSubmissionContent;

    if (isSubmission) {
      task.submissionMetadata = ipfsHash;
      log.info("Linked submission metadata {} to task {}", [ipfsHash, taskId]);
    } else {
      task.metadata = ipfsHash;
      log.info("Linked task metadata {} to task {}", [ipfsHash, taskId]);
    }
    task.save();
  }
}
