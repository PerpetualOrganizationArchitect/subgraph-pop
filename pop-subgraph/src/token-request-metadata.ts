import { Bytes, dataSource, json, BigInt, JSONValueKind, log } from "@graphprotocol/graph-ts";
import { TokenRequestMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses token request metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   reason: "Justification for the token request",
 *   submittedAt: 1706812800  // unix timestamp
 * }
 */
export function handleTokenRequestMetadata(content: Bytes): void {
  let ipfsCid = dataSource.stringParam();
  let context = dataSource.context();
  let timestamp = context.getBigInt("timestamp");

  // Immutable - skip if already exists
  let existing = TokenRequestMetadata.load(ipfsCid);
  if (existing != null) {
    return;
  }

  let metadata = new TokenRequestMetadata(ipfsCid);
  metadata.indexedAt = timestamp;

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    log.warning("[TokenRequestMetadata] Failed to parse JSON for CID: {}", [ipfsCid]);
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse reason
  let reasonValue = jsonObject.get("reason");
  if (reasonValue != null && !reasonValue.isNull() && reasonValue.kind == JSONValueKind.STRING) {
    metadata.reason = reasonValue.toString();
  }

  // Parse submittedAt
  let submittedAtValue = jsonObject.get("submittedAt");
  if (submittedAtValue != null && !submittedAtValue.isNull() && submittedAtValue.kind == JSONValueKind.NUMBER) {
    metadata.submittedAt = BigInt.fromString(submittedAtValue.toBigInt().toString());
  }

  metadata.save();
}
