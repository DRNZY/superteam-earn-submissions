# Superteam agentic engineering grant application

**Project Name:** KAIROS  
**Sub-title:** Autonomous Embedded Market Intelligence and e-Paper Desktop Terminal for Solana  
**Applicant:** drnzy (Builder, 14 years old)  
**Grant Program:** Superteam Agentic Engineering Grants  
**Requested Amount:** 200 USDG (Tranche 1: 100 USDG upfront | Tranche 2: 100 USDG upon shipping)  
**Repository:** https://github.com/drnzy/kairos-terminal (review access granted to abhwshek@gmail.com)  
**Deliverable File:** `/home/drnzy/Projects/superteam-earn-submissions/agentic-grant/application.md`  

## 1. Project overview and the problem

Monitoring Solana order flow usually requires keeping resource-heavy trading tabs open all day on glowing monitors. 

KAIROS is a physical desktop terminal built on a Raspberry Pi Zero 2 W with a 4.2-inch tri-color e-Paper display. A compiled Rust engine listens directly to Solana DEX order books and blockspace metrics, displaying real-time market microstructure without glowing backlights or browser overhead.

```
┌────────────────────────────────────────────────────────┐
│  KAIROS DESKTOP TERMINAL (4.2" E-PAPER 400x300 SPI)    │
├────────────────────────────────────────────────────────┤
│  SOL/USDC: $182.45        PHOENIX SPREAD: 1.8 bps      │
│  DEPTH SKEW: 0.84 [BID]   JITO TIP P95: 42,100 μL      │
├────────────────────────────────────────────────────────┤
│  METEORA DLMM ACTIVE BIN: 182.40 - 182.50              │
│  VOLATILITY REGIME: LOW   VAS RATIO: 1.42 (HEALTHY)    │
├────────────────────────────────────────────────────────┤
│  [●] STATUS: SYNCED (SLOT 298,142,019)  TICK: 120ms    │
│  EMERGENCY SWITCH: ARMED [GPIO 17]                     │
└────────────────────────────────────────────────────────┘
```

The device runs on a desk, consumes under 1.2 Watts of power, and refreshes over SPI every 5 seconds to provide calm, persistent situational awareness.

## 2. Technical architecture

KAIROS pairs embedded Linux hardware with Solana systems programming:

```
[ Solana RPC / Geyser WebSocket ] 
             │
             ▼
[ Embedded Rust Engine: kairos-core ] (Running on Raspberry Pi Zero 2 W)
    ├── Parser: Phoenix CLOB, Orca Whirlpools, Raydium CLMM
    ├── Microstructure Engine: Bid-Ask Depth Skew, Jito tip anomaly detection
    └── Framebuffer Pipeline: 1-bit monochrome + red accent rendering
             │
             ▼
[ SPI Hardware Bus: GPIO / bcm2835 ]
             │
             ▼
[ 4.2" Waveshare e-Paper Display ] + [ Tactile Hardware Confirmation Button ]
```

### Embedded Rust core (kairos-core)

The daemon runs on Raspberry Pi OS Lite, keeping memory usage under 24 megabytes and CPU utilization below 15%. It connects to Solana WebSocket endpoints (Helius or Triton) to stream account updates for Phoenix CLOB and Orca Whirlpools.

### Microstructure metrics

The local engine monitors three metrics:
- Bid-Ask Depth Skew (BADS), calculating the ratio of bid to ask liquidity within 1% of mid-market. A drop below 0.62 indicates pulling bids.
- Jito Tip P95, tracking priority fee spikes that indicate slot contention or pending liquidations.
- Volume-to-Adverse-Selection (VAS), comparing fee revenue to price shifts to flag toxic flow.

### Display pipeline and tactile control

The custom frame-buffer renderer formats price updates, depth bars, and status glyphs into native 400x300 bit arrays. Over the SPI bus, lookup-table partial refresh routines update the screen in 350ms without full-screen flicker.

A physical momentary switch wired to GPIO pin 17 allows confirming emergency orders (such as cancelling open limit orders or routing capital into stablecoins) without opening a computer.

## 3. Use of AI development tools

As a solo 14-year-old builder, I use Claude Code and Cursor to move fast on embedded programming:

- Generating byte-packing routines and SPI lookup tables for the e-Paper IL0398 controller.
- Writing Borsh deserializers for raw Phoenix and Orca WebSocket account buffers.
- Building synthetic test benches that replay historical slot logs into the Rust daemon to verify display updates before flashing hardware.

The $200 USDG grant covers one month of Pro AI development tooling, plus required hardware components and RPC credits.

## 4. Budget allocation and justification

The grant is allocated across development tooling and physical components:

| Item | Cost | Justification |
| :--- | :--- | :--- |
| **AI Development Tooling (1 Month)** | $50 USDG | High-tier reasoning models for embedded Rust debugging |
| **Raspberry Pi Zero 2 W Board** | $18 USDG | Quad-core ARM processor running Linux and the compiled Rust daemon |
| **Waveshare 4.2" e-Paper Module** | $32 USDG | 400x300 SPI display with partial refresh support |
| **Dedicated Solana RPC Dev Tier** | $30 USDG | Low-latency WebSocket account streaming for 60 days |
| **Enclosure Materials & Microswitches** | $35 USDG | Laser-cut acrylic, hardware standoffs, mechanical buttons |
| **Power Management & Test Harness** | $35 USDG | USB-C power metering, logic analyzer clips for SPI debugging |
| **Total** | **$200 USDG** | **Fully accounted project expenditure** |

## 5. Shipping milestones: three-week execution plan

I will ship the working hardware prototype within 21 days of receiving Tranche 1 funding:

### Week 1: Core systems and display driver (Days 1 to 7)
- Initialize the `kairos-core` open-source repository.
- Write the embedded Rust SPI driver for the Waveshare 4.2-inch e-Paper module.
- Implement partial refresh routines and test sub-400ms screen updates.
- Deliverable: Working display demo cycling through synthetic order-book snapshots.

### Week 2: Live Solana integration (Days 8 to 14)
- Connect the Rust daemon to Solana Geyser / WebSocket endpoints.
- Parse Phoenix SOL/USDC order book bids and asks in real time.
- Calculate Bid-Ask Depth Skew and Jito tip P95 directly on the device.
- Deliverable: Terminal updating live on a desk from mainnet Solana data.

### Week 3: Enclosure, hardware button, and release (Days 15 to 21)
- Assemble the desk enclosure with acrylic plates and brass standoffs.
- Wire GPIO pin 17 to the physical emergency toggle.
- Record a 2-minute video walkthrough showing the device running on a desk and reacting to live Solana block production.
- Deliverable: Public GitHub release with documentation, wiring diagrams, laser cut files, and Tranche 2 verification submission.

## 6. Design philosophy: restraint and focus

KAIROS applies Apple interface and industrial design principles to an embedded device:

- Ambient display: e-Paper uses room light instead of an active backlight, resting on a workspace like printed paper.
- Physical feedback: The momentary tactile microswitch gives mechanical resistance when pressed, avoiding touch-screen ambiguity.
- Information hierarchy: Typography uses weight to differentiate primary prices from secondary metrics, with fixed-width alignments for tick sizes and clear spatial grouping.
- Purpose: The device focuses on one task: reliable situational awareness.

## 7. About the builder

I am 14 years old and build open-source tools on Solana. I enjoy systems engineering, Rust, and physical hardware. Building software connected to physical devices makes technology tangible.

This grant will enable me to turn an idea into a physical, shippable product that demonstrates what young builders can create with modern AI tools on Solana.

## 8. Verification and reviewer access

- **GitHub Repository:** https://github.com/drnzy/kairos-terminal
- **Review Access Email:** abhwshek@gmail.com
- **Public Updates:** Build logs and photos will be shared on X via @drnzy and submitted to the Superteam Earn tranche review portal.
