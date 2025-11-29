# EligibilityModule Complete Coverage Plan

## Overview
This plan addresses Issue 5 to complete EligibilityModule coverage by adding missing event handlers, creating necessary entities, updating the ABI, and writing comprehensive tests.

---

## Current State Analysis

### Events Currently Handled (14 events)
| Event | Handler Status | Entity Created |
|-------|---------------|----------------|
| EligibilityModuleInitialized | ✅ Complete | Updates EligibilityModuleContract |
| HatCreatedWithEligibility | ✅ Complete | Creates Hat |
| WearerEligibilityUpdated | ✅ Complete | Creates/Updates WearerEligibility |
| BulkWearerEligibilityUpdated | ✅ Complete | Creates/Updates WearerEligibility (multiple) |
| DefaultEligibilityUpdated | ✅ Complete | Updates Hat |
| VouchConfigSet | ✅ Complete | Creates/Updates VouchConfig |
| Vouched | ✅ Complete | Creates Vouch |
| VouchRevoked | ✅ Complete | Updates Vouch |
| **HatClaimed** | ⚠️ STUB ONLY | **No entity - just logs** |
| UserJoinTimeSet | ✅ Complete | Creates/Updates UserJoinTime |
| EligibilityModuleAdminHatSet | ✅ Complete | Updates EligibilityModuleContract |
| SuperAdminTransferred | ✅ Complete | Updates EligibilityModuleContract |
| Paused | ✅ Complete | Updates EligibilityModuleContract |
| Unpaused | ✅ Complete | Updates EligibilityModuleContract |

### Missing Events (3 events from smart contract)
| Event | Description | Emitted When |
|-------|-------------|--------------|
| **VouchingRateLimitExceededEvent** | User exceeded daily vouch limit (3/day) | `vouchFor()` when daily limit reached |
| **NewUserVouchingRestrictedEvent** | New user restricted from vouching | `vouchFor()` when user too new |
| **HatAutoMinted** | Hat auto-minted after quorum reached | `vouchFor()` after quorum met |

---

## Implementation Steps

### Step 1: Update ABI
**File:** `pop-subgraph/abis/EligibilityModule.json`

The ABI already contains all events. Verify these event signatures match:
- `VouchingRateLimitExceededEvent(address indexed user)`
- `NewUserVouchingRestrictedEvent(address indexed user)`
- `HatAutoMinted(address indexed wearer, uint256 indexed hatId, uint32 vouchCount)`

### Step 2: Design New Entities

#### Entity: VouchingRestrictionEvent (immutable)
Tracks when users are restricted from vouching (rate limits or new user restrictions).

```graphql
type VouchingRestrictionEvent @entity(immutable: true) {
  id: Bytes! # txHash-logIndex
  eligibilityModule: EligibilityModuleContract!
  user: Bytes!
  userUser: User
  userUsername: String
  restrictionType: VouchingRestrictionType! # RateLimit or NewUser
  eventAt: BigInt!
  eventAtBlock: BigInt!
  transactionHash: Bytes!
}

enum VouchingRestrictionType {
  RateLimit
  NewUser
}
```

**Rationale:**
- Combined into single entity since both events represent similar concepts (vouching restrictions)
- Immutable since these are point-in-time events
- Links to User for easy querying of user's restriction history

#### Entity: HatAutoMintEvent (immutable)
Tracks when hats are automatically minted after vouching quorum is reached.

```graphql
type HatAutoMintEvent @entity(immutable: true) {
  id: Bytes! # txHash-logIndex
  eligibilityModule: EligibilityModuleContract!
  wearer: Bytes!
  wearerUser: User
  wearerUsername: String
  hatId: BigInt!
  hat: Hat
  vouchCount: Int!
  mintedAt: BigInt!
  mintedAtBlock: BigInt!
  transactionHash: Bytes!
}
```

**Rationale:**
- Separate from HatClaimed because auto-minting is a different flow
- Includes vouchCount to show what triggered the mint
- Links to Hat entity for full context

#### Entity: HatClaimEvent (immutable)
Tracks when users manually claim hats (via claimVouchedHat function).

```graphql
type HatClaimEvent @entity(immutable: true) {
  id: Bytes! # txHash-logIndex
  eligibilityModule: EligibilityModuleContract!
  wearer: Bytes!
  wearerUser: User
  wearerUsername: String
  hatId: BigInt!
  hat: Hat
  claimedAt: BigInt!
  claimedAtBlock: BigInt!
  transactionHash: Bytes!
}
```

**Rationale:**
- HatClaimed event exists but handler is stub - needs proper entity
- Distinct from auto-mint (manual claim vs automatic)

### Step 3: Update Schema

**File:** `pop-subgraph/schema.graphql`

1. Add the enum `VouchingRestrictionType`
2. Add entity `VouchingRestrictionEvent`
3. Add entity `HatAutoMintEvent`
4. Add entity `HatClaimEvent`
5. Update `EligibilityModuleContract` with derivedFrom fields:
   - `vouchingRestrictions: [VouchingRestrictionEvent!]! @derivedFrom(field: "eligibilityModule")`
   - `autoMints: [HatAutoMintEvent!]! @derivedFrom(field: "eligibilityModule")`
   - `hatClaims: [HatClaimEvent!]! @derivedFrom(field: "eligibilityModule")`
6. Update `User` entity with derivedFrom fields:
   - `vouchingRestrictions: [VouchingRestrictionEvent!]! @derivedFrom(field: "userUser")`
   - `hatAutoMints: [HatAutoMintEvent!]! @derivedFrom(field: "wearerUser")`
   - `hatClaims: [HatClaimEvent!]! @derivedFrom(field: "wearerUser")`

### Step 4: Update subgraph.yaml

**File:** `pop-subgraph/subgraph.yaml`

Add to EligibilityModule template eventHandlers:
```yaml
- event: VouchingRateLimitExceededEvent(indexed address)
  handler: handleVouchingRateLimitExceeded
- event: NewUserVouchingRestrictedEvent(indexed address)
  handler: handleNewUserVouchingRestricted
- event: HatAutoMinted(indexed address,indexed uint256,uint32)
  handler: handleHatAutoMinted
```

Add new entities to entities list:
- VouchingRestrictionEvent
- HatAutoMintEvent
- HatClaimEvent

### Step 5: Implement Handlers

**File:** `pop-subgraph/src/eligibility-module.ts`

#### 5.1 Add imports
```typescript
import {
  // ... existing imports
  VouchingRateLimitExceededEvent as VouchingRateLimitExceededEventEvent,
  NewUserVouchingRestrictedEvent as NewUserVouchingRestrictedEventEvent,
  HatAutoMinted as HatAutoMintedEvent
} from "../generated/templates/EligibilityModule/EligibilityModule";

import {
  // ... existing imports
  VouchingRestrictionEvent,
  HatAutoMintEvent,
  HatClaimEvent
} from "../generated/schema";
```

#### 5.2 Implement handleVouchingRateLimitExceeded
```typescript
export function handleVouchingRateLimitExceeded(
  event: VouchingRateLimitExceededEventEvent
): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let restriction = new VouchingRestrictionEvent(id);

  restriction.eligibilityModule = event.address;
  restriction.user = event.params.user;
  restriction.userUsername = getUsernameForAddress(event.params.user);
  restriction.restrictionType = "RateLimit";
  restriction.eventAt = event.block.timestamp;
  restriction.eventAtBlock = event.block.number;
  restriction.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(event.address);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.user,
      event.block.timestamp,
      event.block.number
    );
    restriction.userUser = user.id;
  }

  restriction.save();
}
```

#### 5.3 Implement handleNewUserVouchingRestricted
```typescript
export function handleNewUserVouchingRestricted(
  event: NewUserVouchingRestrictedEventEvent
): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let restriction = new VouchingRestrictionEvent(id);

  restriction.eligibilityModule = event.address;
  restriction.user = event.params.user;
  restriction.userUsername = getUsernameForAddress(event.params.user);
  restriction.restrictionType = "NewUser";
  restriction.eventAt = event.block.timestamp;
  restriction.eventAtBlock = event.block.number;
  restriction.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(event.address);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.user,
      event.block.timestamp,
      event.block.number
    );
    restriction.userUser = user.id;
  }

  restriction.save();
}
```

#### 5.4 Implement handleHatAutoMinted
```typescript
export function handleHatAutoMinted(event: HatAutoMintedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let autoMint = new HatAutoMintEvent(id);

  let contractAddress = event.address;
  let hatId = event.params.hatId;

  autoMint.eligibilityModule = contractAddress;
  autoMint.wearer = event.params.wearer;
  autoMint.wearerUsername = getUsernameForAddress(event.params.wearer);
  autoMint.hatId = hatId;
  autoMint.hat = contractAddress.toHexString() + "-" + hatId.toString();
  autoMint.vouchCount = i32(event.params.vouchCount.toI32());
  autoMint.mintedAt = event.block.timestamp;
  autoMint.mintedAtBlock = event.block.number;
  autoMint.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.wearer,
      event.block.timestamp,
      event.block.number
    );
    autoMint.wearerUser = user.id;
  }

  autoMint.save();
}
```

#### 5.5 Fix handleHatClaimed (replace stub)
```typescript
export function handleHatClaimed(event: HatClaimedEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let claim = new HatClaimEvent(id);

  let contractAddress = event.address;
  let hatId = event.params.hatId;

  claim.eligibilityModule = contractAddress;
  claim.wearer = event.params.wearer;
  claim.wearerUsername = getUsernameForAddress(event.params.wearer);
  claim.hatId = hatId;
  claim.hat = contractAddress.toHexString() + "-" + hatId.toString();
  claim.claimedAt = event.block.timestamp;
  claim.claimedAtBlock = event.block.number;
  claim.transactionHash = event.transaction.hash;

  // Link to User entity
  let eligibilityModule = EligibilityModuleContract.load(contractAddress);
  if (eligibilityModule) {
    let user = getOrCreateUser(
      eligibilityModule.organization,
      event.params.wearer,
      event.block.timestamp,
      event.block.number
    );
    claim.wearerUser = user.id;
  }

  claim.save();
}
```

### Step 6: Run Code Generation

```bash
cd pop-subgraph
npm run codegen
```

This will:
- Generate TypeScript types for new entities
- Generate event class imports
- Validate schema changes

### Step 7: Write Tests

**File:** `pop-subgraph/tests/eligibility-module.test.ts` (new file)

#### Test Structure:
```typescript
import { describe, test, beforeEach, afterEach, clearStore, assert } from "matchstick-as";

describe("EligibilityModule Handlers", () => {
  afterEach(() => {
    clearStore();
  });

  describe("handleVouchingRateLimitExceeded", () => {
    test("should create VouchingRestrictionEvent with RateLimit type", () => {
      // 1. Create mock EligibilityModuleContract entity
      // 2. Create mock event
      // 3. Call handler
      // 4. Assert entity created with correct values
    });

    test("should link to User entity when organization exists", () => {
      // ...
    });
  });

  describe("handleNewUserVouchingRestricted", () => {
    test("should create VouchingRestrictionEvent with NewUser type", () => {
      // ...
    });
  });

  describe("handleHatAutoMinted", () => {
    test("should create HatAutoMintEvent with correct vouch count", () => {
      // ...
    });

    test("should link to existing Hat entity", () => {
      // ...
    });
  });

  describe("handleHatClaimed", () => {
    test("should create HatClaimEvent entity", () => {
      // ...
    });

    test("should link to User entity when organization exists", () => {
      // ...
    });
  });

  // Existing handler tests to ensure no regressions
  describe("handleVouched", () => {
    test("should create Vouch entity correctly", () => {
      // ...
    });
  });

  describe("handleVouchRevoked", () => {
    test("should mark vouch as inactive", () => {
      // ...
    });
  });
});
```

**File:** `pop-subgraph/tests/eligibility-module-utils.ts` (new file)

Utility functions for creating mock events:
```typescript
export function createVouchingRateLimitExceededEvent(
  user: string,
  contractAddress: string
): VouchingRateLimitExceededEvent;

export function createNewUserVouchingRestrictedEvent(
  user: string,
  contractAddress: string
): NewUserVouchingRestrictedEvent;

export function createHatAutoMintedEvent(
  wearer: string,
  hatId: string,
  vouchCount: i32,
  contractAddress: string
): HatAutoMintedEvent;

export function createHatClaimedEvent(
  wearer: string,
  hatId: string,
  contractAddress: string
): HatClaimedEvent;

export function createMockEligibilityModuleContract(
  address: string,
  orgId: string
): void;
```

### Step 8: Build and Test

```bash
cd pop-subgraph

# Run codegen
npm run codegen

# Build the subgraph
npm run build

# Run tests
npm run test

# Run specific test file
npm run test -- eligibility-module.test.ts
```

### Step 9: Verify Against Smart Contract

Cross-reference with `EligibilityModule.sol` to ensure:
1. All 16 events are covered
2. Event signatures match exactly
3. Indexed parameters are handled correctly
4. Edge cases are considered (e.g., contract not found)

---

## Entity Design Rationale

### Why VouchingRestrictionEvent combines two events
- Both events represent similar concepts (user being restricted)
- Using an enum type (`RateLimit` vs `NewUser`) allows easy filtering
- Reduces schema complexity
- Common query pattern: "show all restrictions for a user"

### Why separate HatAutoMintEvent from HatClaimEvent
- Different trigger mechanisms (automatic vs manual)
- HatAutoMinted includes vouchCount which HatClaimed doesn't have
- Different semantic meaning for analytics

### Immutability choices
- All new event entities are immutable (point-in-time records)
- No updates needed after creation
- Better performance for Graph Protocol

---

## Testing Strategy

### Unit Tests (per handler)
1. Basic functionality - entity created with correct values
2. User linking - userUser field populated when org exists
3. Edge cases - missing prerequisite entities

### Integration Tests
1. Full vouching flow: Vouch → HatAutoMinted
2. Rate limit hit: Multiple vouches → VouchingRateLimitExceeded
3. Complete lifecycle tests

### Test Data Patterns
- Use consistent address patterns for easy debugging
- Include timestamp/block verification
- Test username resolution

---

## Checklist

- [ ] Update ABI (verify events present)
- [ ] Add enum `VouchingRestrictionType`
- [ ] Add entity `VouchingRestrictionEvent`
- [ ] Add entity `HatAutoMintEvent`
- [ ] Add entity `HatClaimEvent`
- [ ] Update `EligibilityModuleContract` with derived fields
- [ ] Update `User` entity with derived fields
- [ ] Update `subgraph.yaml` with new events
- [ ] Update `subgraph.yaml` entities list
- [ ] Implement `handleVouchingRateLimitExceeded`
- [ ] Implement `handleNewUserVouchingRestricted`
- [ ] Implement `handleHatAutoMinted`
- [ ] Fix `handleHatClaimed` (replace stub)
- [ ] Create `eligibility-module-utils.ts` test utilities
- [ ] Create `eligibility-module.test.ts` tests
- [ ] Run `npm run codegen`
- [ ] Run `npm run build`
- [ ] Run `npm run test`
- [ ] Verify all tests pass
