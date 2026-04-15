import { Bytes, dataSource, json, BigInt, JSONValueKind, log } from "@graphprotocol/graph-ts";
import { ProposalMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses proposal metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   description: "Full proposal description text",
 *   optionNames: ["Option A", "Option B", "Option C"],
 *   createdAt: 1706812800000
 * }
 *
 * ProposalMetadata is immutable — the entity store only allows INSERT, not UPDATE.
 * This handler follows the single-path pattern: one existence check at the top,
 * one entity creation, one save. Multiple code paths with separate load/new/save
 * cycles cause INSERT conflicts when the same CID is triggered more than once
 * in the same block.
 */
export function handleProposalMetadata(content: Bytes): void {
  let ipfsCid = dataSource.stringParam();

  // Immutable — skip if already exists
  let existing = ProposalMetadata.load(ipfsCid);
  if (existing != null) {
    return;
  }

  let metadata = new ProposalMetadata(ipfsCid);
  metadata.description = "";
  metadata.optionNames = [];

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    log.warning("[ProposalMetadata] Failed to parse JSON for CID: {}", [ipfsCid]);
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (jsonValue.isNull() || jsonValue.kind != JSONValueKind.OBJECT) {
    metadata.save();
    return;
  }

  let jsonObject = jsonValue.toObject();

  // Parse description
  let descriptionValue = jsonObject.get("description");
  if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
    metadata.description = descriptionValue.toString();
  }

  // Parse optionNames array
  let optionNamesValue = jsonObject.get("optionNames");
  if (optionNamesValue != null && !optionNamesValue.isNull() && optionNamesValue.kind == JSONValueKind.ARRAY) {
    let namesArray = optionNamesValue.toArray();
    let names: string[] = [];
    for (let i = 0; i < namesArray.length; i++) {
      let nameValue = namesArray[i];
      if (!nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
        names.push(nameValue.toString());
      } else {
        names.push("");
      }
    }
    metadata.optionNames = names;
  }

  // Parse createdAt timestamp
  let createdAtValue = jsonObject.get("createdAt");
  if (createdAtValue != null && !createdAtValue.isNull() && createdAtValue.kind == JSONValueKind.NUMBER) {
    let raw = createdAtValue.toF64().toString();
    let dotIndex = raw.indexOf(".");
    if (dotIndex >= 0) {
      raw = raw.substring(0, dotIndex);
    }
    metadata.createdAt = BigInt.fromString(raw);
  }

  metadata.save();
}
