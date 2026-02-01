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
 * This handler creates/populates the ProposalMetadata entity. The link from
 * Proposal/DDVProposal to ProposalMetadata is pre-set in the event handlers
 * (handleNewProposal, handleNewHatProposal) following the task-manager and
 * org-registry pattern.
 *
 * This handler is resilient to malformed data - if parsing fails or fields
 * are missing, the entity will be created with whatever data is available.
 * The subgraph will NOT brick if IPFS is slow or unavailable - the main
 * Proposal entity from on-chain events will still be indexed.
 */
export function handleProposalMetadata(content: Bytes): void {
  // The dataSource.stringParam() contains the IPFS hash (CID)
  let ipfsCid = dataSource.stringParam();

  // Get context passed by the caller (for logging purposes)
  let context = dataSource.context();
  let proposalEntityId = context.getString("proposalEntityId");
  let proposalType = context.getString("proposalType"); // "hybrid" or "ddv"

  log.info("[ProposalMetadata] Processing CID: {} for proposal: {} (type: {})", [
    ipfsCid,
    proposalEntityId,
    proposalType
  ]);

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    log.warning("[ProposalMetadata] Failed to parse JSON for CID: {}", [ipfsCid]);
    // Create entity with defaults so the relationship still works
    let metadata = new ProposalMetadata(ipfsCid);
    metadata.description = "";
    metadata.optionNames = [];
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (!jsonValue.isNull() && jsonValue.kind == JSONValueKind.OBJECT) {
    let jsonObject = jsonValue.toObject();

    // Create the metadata entity
    let metadata = new ProposalMetadata(ipfsCid);

    // Parse description
    let descriptionValue = jsonObject.get("description");
    if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
      metadata.description = descriptionValue.toString();
    } else {
      metadata.description = "";
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
          // Push empty string for non-string values to maintain index alignment
          names.push("");
        }
      }
      metadata.optionNames = names;
    } else {
      metadata.optionNames = [];
    }

    // Parse createdAt timestamp
    let createdAtValue = jsonObject.get("createdAt");
    if (createdAtValue != null && !createdAtValue.isNull() && createdAtValue.kind == JSONValueKind.NUMBER) {
      // createdAt is in milliseconds, convert to BigInt
      metadata.createdAt = BigInt.fromString(createdAtValue.toBigInt().toString());
    }

    metadata.save();
    log.info("[ProposalMetadata] Saved metadata with {} option names for CID: {}", [
      metadata.optionNames.length.toString(),
      ipfsCid
    ]);
  } else {
    // Not a JSON object - create entity with defaults
    log.warning("[ProposalMetadata] Content is not a JSON object for CID: {}", [ipfsCid]);
    let metadata = new ProposalMetadata(ipfsCid);
    metadata.description = "";
    metadata.optionNames = [];
    metadata.save();
  }
}
