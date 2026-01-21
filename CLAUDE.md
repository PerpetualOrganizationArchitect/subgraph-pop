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
