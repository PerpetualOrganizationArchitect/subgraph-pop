import { Bytes, dataSource, json, BigInt, JSONValueKind } from "@graphprotocol/graph-ts";
import { OrgMetadata, OrgMetadataLink } from "../generated/schema";

/**
 * Handler for IPFS file data source that parses org metadata JSON.
 *
 * Expected JSON structure:
 * {
 *   description: "...",
 *   links: [{ name: "...", url: "..." }],
 *   template: "default"
 * }
 *
 * This handler is resilient to malformed data - if parsing fails or fields
 * are missing, the entity will be created with whatever data is available.
 * The subgraph will NOT brick if IPFS is slow or unavailable - the main
 * Organization entity from on-chain events will still be indexed.
 */
export function handleOrgMetadata(content: Bytes): void {
  // The dataSource.stringParam() contains the IPFS hash (CID)
  let ipfsHash = dataSource.stringParam();

  // Get the orgId from the context passed by the caller
  let context = dataSource.context();
  let orgId = context.getBytes("orgId");

  // Try to parse the JSON content
  let jsonResult = json.try_fromBytes(content);
  if (jsonResult.isError) {
    // JSON parsing failed - load or create entity with just the ID and org link
    let metadata = OrgMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new OrgMetadata(ipfsHash);
      metadata.organization = orgId;
      metadata.save();
    }
    return;
  }

  let jsonValue = jsonResult.value;
  if (!jsonValue.isNull() && jsonValue.kind == JSONValueKind.OBJECT) {
    let jsonObject = jsonValue.toObject();

    // Create or load the metadata entity
    let metadata = OrgMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new OrgMetadata(ipfsHash);
    }

    // Link to organization
    metadata.organization = orgId;

    // Parse description
    let descriptionValue = jsonObject.get("description");
    if (descriptionValue != null && !descriptionValue.isNull() && descriptionValue.kind == JSONValueKind.STRING) {
      metadata.description = descriptionValue.toString();
    }

    // Parse template
    let templateValue = jsonObject.get("template");
    if (templateValue != null && !templateValue.isNull() && templateValue.kind == JSONValueKind.STRING) {
      metadata.template = templateValue.toString();
    }

    // Set indexed timestamp (approximate - file data sources don't have block context)
    // We use 0 as a placeholder since file handlers don't have ethereum.Event context
    metadata.indexedAt = BigInt.fromI32(0);

    metadata.save();

    // Parse links array
    let linksValue = jsonObject.get("links");
    if (linksValue != null && !linksValue.isNull() && linksValue.kind == JSONValueKind.ARRAY) {
      let linksArray = linksValue.toArray();

      for (let i = 0; i < linksArray.length; i++) {
        let linkValue = linksArray[i];
        if (!linkValue.isNull() && linkValue.kind == JSONValueKind.OBJECT) {
          let linkObject = linkValue.toObject();

          let nameValue = linkObject.get("name");
          let urlValue = linkObject.get("url");

          // Only create link if both name and url are present
          if (
            nameValue != null && !nameValue.isNull() && nameValue.kind == JSONValueKind.STRING &&
            urlValue != null && !urlValue.isNull() && urlValue.kind == JSONValueKind.STRING
          ) {
            let linkId = ipfsHash + "-" + i.toString();
            let link = new OrgMetadataLink(linkId);
            link.metadata = ipfsHash;
            link.name = nameValue.toString();
            link.url = urlValue.toString();
            link.index = i;
            link.save();
          }
        }
      }
    }
  } else {
    // Not a JSON object - load or create entity with just the ID and org link
    let metadata = OrgMetadata.load(ipfsHash);
    if (metadata == null) {
      metadata = new OrgMetadata(ipfsHash);
      metadata.organization = orgId;
      metadata.save();
    }
  }
}
