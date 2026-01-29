import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { SubmissionMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses submission metadata JSON.
 *
 * Creates a SubmissionMetadata entity with the raw submission text.
 * The Task entity link is pre-set by the event handler (handleTaskSubmitted),
 * so this handler only needs to populate the submission field.
 */
export function handleSubmissionMetadata(content: Bytes): void {
  let ipfsHash = dataSource.stringParam();
  let context = dataSource.context();
  let taskId = context.getString("taskId");

  // Load or create the SubmissionMetadata entity using the IPFS hash as ID
  let metadata = SubmissionMetadata.load(ipfsHash);
  if (metadata == null) {
    metadata = new SubmissionMetadata(ipfsHash);
    metadata.task = taskId;
    metadata.indexedAt = BigInt.fromI32(0);
  }

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
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

  metadata.save();
}
