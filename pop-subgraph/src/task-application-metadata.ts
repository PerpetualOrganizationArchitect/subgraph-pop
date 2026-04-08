import { Bytes, dataSource, json, BigInt, JSONValueKind, log } from "@graphprotocol/graph-ts";
import { TaskApplicationMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses task application metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   notes: "Why I want this task",
 *   experience: "Relevant experience description"
 * }
 */
export function handleTaskApplicationMetadata(content: Bytes): void {
  let ipfsCid = dataSource.stringParam();
  let context = dataSource.context();
  let timestamp = context.getBigInt("timestamp");

  // Immutable - skip if already exists
  let existing = TaskApplicationMetadata.load(ipfsCid);
  if (existing != null) {
    return;
  }

  let metadata = new TaskApplicationMetadata(ipfsCid);
  metadata.indexedAt = timestamp;

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    log.warning("[TaskApplicationMetadata] Failed to parse JSON for CID: {}", [ipfsCid]);
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse notes
  let notesValue = jsonObject.get("notes");
  if (notesValue != null && !notesValue.isNull() && notesValue.kind == JSONValueKind.STRING) {
    metadata.notes = notesValue.toString();
  }

  // Parse experience
  let experienceValue = jsonObject.get("experience");
  if (experienceValue != null && !experienceValue.isNull() && experienceValue.kind == JSONValueKind.STRING) {
    metadata.experience = experienceValue.toString();
  }

  metadata.save();
}
