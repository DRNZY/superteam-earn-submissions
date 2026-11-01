# MultiHopper Router

MultiHopper Router is a non-custodial Solana transaction routing engine. It routes SOL and SPL token transfers across disposable intermediate hops with configurable timing jitter, reducing direct wallet-to-wallet graph linkage without pooling or commingling user funds.

The project integrates TRM Labs screening hooks at the routing layer and automates the 0.50% fee split between the integrator (0.25% builder revenue share) and the MultiHopper competition pool (0.25%).

## System Architecture

```
[ Sender Wallet ]
       │
       │ (Gross Amount = Principal + 0.50% Total Fee)
       ├─────────────────────────┬─────────────────────────┐
       ▼                         ▼                         ▼
 [ Ephemeral Hop 1 ]    [ Builder Treasury ]    [ MultiHopper Pool ]
 (Principal + Tx Gas)     (0.25% RevShare)        (0.25% Protocol)
       │
       │ (Configurable timing jitter: 150ms - 600ms)
       ▼
 [ Ephemeral Hop 2 ]
       │
       │ (Sequential forward)
       ▼
[ Destination Wallet ]
```

### Core Components

1. **Routing Engine (`src/router.ts`)**
   Generates single-use ephemeral keypairs for each intermediate hop. The engine prepares sequential Solana `SystemProgram.transfer` transactions, buffers rent-exemption lamports so accounts remain active during transit, and forwards the full net principal to the recipient.

2. **TRM Labs Compliance (`src/compliance.ts`)**
   Screens source and destination public keys against OFAC sanctions lists, known exploit drains, and illicit clusters prior to transaction signing. Any flagged address halts the route immediately.

3. **Fee and Volume Accounting (`src/fee.ts`)**
   Implements exact basis-point integer math (50 bps total fee; 25 bps integrator yield; 25 bps protocol share). Conserves lamports without rounding drift and tracks volume towards the $100,000 Superteam Earn qualification threshold.

4. **Multi-Send Unbundler (`src/router.ts`)**
   Splits batch payroll or contributor payouts across distinct intermediate hops, decoupling recipient clustering on public block explorers.

## Installation

Requirements: Node.js 20 or higher.

```bash
git clone <repo-url>
cd multihopper-router
npm install
npm run build
```

## Running Tests

The test suite covers fee conservation, TRM screening rules, rent exemption boundaries, ephemeral key generation, and simulated multi-hop execution.

```bash
npm test
```

Expected output:
```
✔ accurately calculates 0.50% total fee with 0.25% builder / 0.25% protocol splits
✔ rejects non-positive gross amounts
✔ derives volume from builder fee correctly according to MultiHopper formula
✔ approves clean Solana public keys
✔ blocks known sanctioned addresses and returns risk flags
✔ dynamically registers custom blacklisted addresses
✔ plans a standard 2-hop route with unique ephemeral keys
✔ rejects transfers below minimum safe routing threshold for rent exemption
✔ fails route planning if destination is on the TRM sanction list
✔ clamps hop count within safe range [1, 5]
✔ constructs well-formed Solana transactions for each hop
✔ simulates end-to-end execution and updates volume tracker
✔ marks qualification true when volume surpasses $100,000 threshold
✔ creates an unbundled multi-send plan with accurate gross and fee tallies
✔ builds transactions and executes multi-send simulation with distinct ephemeral hops
✔ verifies exact sequential forward amount conservation across 3 hops
✔ plans and builds transactions at exact boundary threshold across 5 hops
✔ applies custom builder and protocol treasury overrides
```

## CLI Usage

### 1. Plan a Multi-Hop Transfer

Inspect fee splits, intermediate addresses, and compliance status before broadcasting:

```bash
node dist/cli.js plan \
  --source 7vBCEUNdZD9WoNmpR6Hp6sLiETgsbq4Gc3eBc5Tjv76d \
  --destination q3xodrtcvjH8NfPLMAQbRWqUXW9iH9qd8VxbhqWMiHb \
  --amount 5.0 \
  --hops 3
```

### 2. Run an End-to-End Simulation

Execute full signature generation, balance checks, and sequential hop routing in dry-run mode:

```bash
node dist/cli.js simulate \
  --source 7vBCEUNdZD9WoNmpR6Hp6sLiETgsbq4Gc3eBc5Tjv76d \
  --destination q3xodrtcvjH8NfPLMAQbRWqUXW9iH9qd8VxbhqWMiHb \
  --amount 10.0 \
  --hops 2
```

### 3. Plan and Simulate an Unbundled Multi-Send

Distribute funds across multiple recipients through independent ephemeral paths:

```bash
node dist/cli.js multisend \
  --source 7vBCEUNdZD9WoNmpR6Hp6sLiETgsbq4Gc3eBc5Tjv76d \
  --recipients q3xodrtcvjH8NfPLMAQbRWqUXW9iH9qd8VxbhqWMiHb:2.5 7vBCEUNdZD9WoNmpR6Hp6sLiETgsbq4Gc3eBc5Tjv76d:3.0 \
  --hops 2 \
  --execute
```

### 4. Screen an Address for Compliance

Run a standalone check against the TRM Labs screening engine:

```bash
node dist/cli.js compliance --address OFACBlocklistSimulatedWalletAddress11111111
```

### 5. Check Volume and Revenue Metrics

Display cumulative routed volume, builder yield, and bounty qualification status:

```bash
node dist/cli.js volume --price 180
```

## Economic Model and Volume Generation

MultiHopper matches builder revenue directly to protocol routing volume:

| Metric | Value | Details |
| :--- | :--- | :--- |
| Total Customer Fee | 0.50% (50 bps) | Assessed on full-rate transfers |
| Builder Revenue Share | 0.25% (25 bps) | Paid directly to builder treasury on each transfer |
| Builder Rate per $1M | $2,500 USDC | Earned automatically from routed volume |
| Protocol Share | 0.25% (25 bps) | Funds the Superteam Earn prize pool |
| Bounty Entry Threshold | $100,000 volume | Minimum verified production volume required to qualify |

### How This Tool Drives On-Chain Volume

1. **Treasury Operations and OTC Settlement:** Teams moving funds between operational wallets or executing private settlements use the router to avoid telegraphing wallet balances to market scrapers.
2. **Launch Payout Unbundling:** Project teams distributing tokens to advisors, seed contributors, or winners use `planMultiSend` to prevent third parties from clustering community addresses into single graph entities.
3. **Automated Bots and Yield Rebalancing:** Trading algorithms and autonomous agents route periodic profit distributions through MultiHopper to detach strategy execution from cold storage reserves.

## Security Considerations

- **Non-Custodial Design:** Intermediate accounts are generated per transfer and funded with the exact transfer balance plus transaction gas. No pooled vaults or shared liquidity contracts hold user funds.
- **Rent Exemption Enforcement:** The router enforces a minimum amount per hop so ephemeral accounts never get wiped by Solana runtime garbage collection before forwarding funds.
- **Regulatory Compliance:** Built-in TRM Labs screening prevents routing to or from sanctioned entities, meeting international compliance standards.
