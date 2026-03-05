# POP Subgraph

The Graph Protocol subgraph for the Perpetual Organization Protocol (POP) on the hoodi network. POP enables fully worker and community owned DAOs—a step toward fairer, more democratic economic systems where the people who create value also control it.

## Commands

All commands run from `pop-subgraph/` directory:

```bash
npm run codegen    # Generate types from schema.graphql
npm run build      # Build WebAssembly mappings
npm run test       # Run Matchstick tests
subgraph-lint      # Lint the subgraph
```

## Before Creating a PR

Run these commands in order and ensure they all pass:

```bash
cd pop-subgraph
npm run codegen
npm run build
npm run test
subgraph-lint
```

## Structure

- `schema.graphql` - GraphQL entity definitions
- `subgraph.yaml` - Data sources, templates, and event handlers
- `src/` - Event handler implementations (AssemblyScript)
- `abis/` - Contract ABIs
- `tests/` - Matchstick unit tests

## Key Patterns

- **Data sources**: PoaManager and GovernanceFactory are hardcoded; other contracts use dynamic templates
- **Entity IDs**: Use format `contractAddress-entitySpecificId` for uniqueness
- **IPFS metadata**: OrgMetadata and HatMetadata templates handle off-chain data
- **Tests**: Each handler has a corresponding `*-utils.ts` file for test fixtures

## Updating the Subgraph for a New Deployment

When the user says "update the subgraph" and provides new contract addresses, follow this procedure:

### Step 1: Find the deployment startBlock

Use a binary search against the Hoodi RPC to find the block where the PoaManager contract was deployed. Use `https://hoodi.drpc.org` — this is the only Hoodi RPC that supports historical state queries (publicnode and ethpandaops do not).

Binary search script (use the PoaManager address from the new deployment):

```bash
CONTRACT="<PoaManager address>"
RPC="https://hoodi.drpc.org"
LOW=0
HIGH=$(curl -s -X POST "$RPC" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' | python3 -c "import sys,json; print(int(json.load(sys.stdin)['result'], 16))")

while [ $LOW -lt $HIGH ]; do
  MID=$(( (LOW + HIGH) / 2 ))
  HEX=$(printf "0x%x" $MID)
  CODE=$(curl -s -X POST "$RPC" -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$CONTRACT\",\"$HEX\"],\"id\":1}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('result','0x'))")
  if [ "$CODE" = "0x" ]; then
    LOW=$((MID + 1))
  else
    HIGH=$MID
  fi
done
echo "Deployment block: $LOW"
```

If you already know an approximate range (e.g., recent blocks), set LOW to a recent value to speed up the search.

Also find the GovernanceFactory startBlock using the same binary search with the GovernanceFactory address — it may differ by a few blocks from PoaManager.

### Step 2: Update `pop-subgraph/subgraph.yaml`

Make these changes:

1. **Comment block at top (lines ~7-35)**: Replace ALL contract addresses in the comment block with the new addresses. Update the deployment block number in the header line (`# Contract Addresses - Hoodi deployment block XXXXXX:`).

2. **GovernanceFactory dataSource (~line 64)**: Update `address` and `startBlock` with the new GovernanceFactory address and its deployment block.

3. **PoaManager dataSource (~line 84)**: Update `address` and `startBlock` with the new PoaManager address and its deployment block.

These are the ONLY two hardcoded dataSources. All other contracts (OrgDeployer, OrgRegistry, PaymasterHub, UniversalAccountRegistry, etc.) are discovered dynamically via the `InfrastructureDeployed` event from PoaManager and do NOT need hardcoded entries.

### Step 3: Update `pop-subgraph/networks.json`

Update the OrgDeployer address and startBlock:

```json
{
  "hoodi": {
    "OrgDeployer": {
      "address": "<new OrgDeployer address>",
      "startBlock": <PoaManager deployment block>
    }
  }
}
```

### Step 4: Verify the build

```bash
cd pop-subgraph
npm run codegen
npm run build
npm run test
subgraph-lint
```

### Expected contract list from the user

The user will provide addresses in roughly this format (order may vary):

- HybridVoting, DirectDemocracyVoting, Executor, QuickJoin, ParticipationToken
- TaskManager, EducationHub, PaymentManager, UniversalAccountRegistry
- EligibilityModule, ToggleModule, PasskeyAccount, PasskeyAccountFactory
- ImplementationRegistry, OrgRegistry, OrgDeployer, PoaManager
- BeaconProxy (multiple), GovernanceFactory, AccessFactory, ModulesFactory
- HatsTreeSetup, PaymasterHub

The critical ones that go into the config are: **PoaManager**, **GovernanceFactory**, and **OrgDeployer**. The rest only go in the comment block.
