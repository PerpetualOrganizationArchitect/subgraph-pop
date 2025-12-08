import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { HatMetadata } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses hat metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   description: "..."
 * }
 *
 * Note: The 'name' field is already emitted in the HatMetadataUpdated event,
 * so we only fetch 'description' from IPFS.
 *
 * This handler is resilient to malformed data - if parsing fails or fields
 * are missing, the entity will be created with whatever data is available.
 * The subgraph will NOT brick if IPFS is slow or unavailable - the main
 * Hat entity from on-chain events will still be indexed.
 */
export function handleHatMetadata(content: Bytes): void {
  // The dataSource.stringParam() contains the IPFS hash (CID)
  let ipfsHash = dataSource.stringParam();

  // Get the hatEntityId from the context passed by the caller
  let context = dataSource.context();
  let hatEntityId = context.getString("hatEntityId");

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // JSON parsing failed - create entity with just the ID and hat link
    let metadata = new HatMetadata(ipfsHash);
    metadata.hat = hatEntityId;
    metadata.save();
    return;
  }

  let jsonValue = jsonResult.value;
  if (!jsonValue.isNull() && jsonValue.kind == JSONValueKind.OBJECT) {
    let jsonObject = jsonValue.toObject();

    // Create or load the metadata entity
    let metadata = HatMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new HatMetadata(ipfsHash);
    }

    // Link to hat
    metadata.hat = hatEntityId;

    // Parse description
    let descriptionValue = jsonObject.get("description");
    if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
      metadata.description = descriptionValue.toString();
    }

    // Set indexed timestamp (approximate - file data sources don't have block context)
    // We use 0 as a placeholder since file handlers don't have ethereum.Event context
    metadata.indexedAt = BigInt.fromI32(0);

    metadata.save();
  } else {
    // Not a JSON object - create entity with just the ID and hat link
    let metadata = new HatMetadata(ipfsHash);
    metadata.hat = hatEntityId;
    metadata.save();
  }
}
