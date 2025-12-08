import { Bytes, dataSource, json, BigInt, JSONValueKind, log } from "@graphprotocol/graph-ts";
import { HatMetadata, Hat } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses hat metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   name: "Role Name",
 *   description: "Role description..."
 * }
 *
 * This handler extracts both 'name' and 'description' from the IPFS JSON.
 * If 'name' is found and the Hat entity doesn't already have a name set
 * (from HatMetadataUpdated event), it will update the Hat.name field.
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

    // Parse name
    let nameValue = jsonObject.get("name");
    let parsedName: string | null = null;
    if (nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING) {
      let nameStr = nameValue.toString();
      if (nameStr.length > 0) {
        metadata.name = nameStr;
        parsedName = nameStr;
      }
    }

    // Parse description
    let descriptionValue = jsonObject.get("description");
    if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
      let descStr = descriptionValue.toString();
      if (descStr.length > 0) {
        metadata.description = descStr;
      }
    }

    // Set indexed timestamp (approximate - file data sources don't have block context)
    // We use 0 as a placeholder since file handlers don't have ethereum.Event context
    metadata.indexedAt = BigInt.fromI32(0);

    metadata.save();

    // If we parsed a name, also update the Hat entity if it doesn't have a name yet
    if (parsedName != null) {
      let hat = Hat.load(hatEntityId);
      if (hat != null && hat.name == null) {
        hat.name = parsedName;
        hat.save();
        log.info("Updated Hat.name from IPFS metadata for hat {}: {}", [hatEntityId, parsedName!]);
      }
    }
  } else {
    // Not a JSON object - create entity with just the ID and hat link
    let metadata = new HatMetadata(ipfsHash);
    metadata.hat = hatEntityId;
    metadata.save();
  }
}
