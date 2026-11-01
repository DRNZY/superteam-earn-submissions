# Superteam Agentic Engineering Grant Application

**Project Name:** KAIROS  
**Sub-title:** Autonomous Embedded Market Intelligence and e-Paper Desktop Terminal for Solana  
**Applicant:** drnzy (Builder, 14 years old)  
**Grant Program:** Superteam Agentic Engineering Grants  
**Requested Amount:** 200 USDG (Tranche 1: 100 USDG upfront | Tranche 2: 100 USDG upon shipping)  
**Repository:** https://github.com/drnzy/kairos-terminal (review access granted to abhwshek@gmail.com)  
**Deliverable File:** `/home/drnzy/Projects/superteam-earn-submissions/agentic-grant/application.md`  

---

## 1. Project Overview and The Problem

Traders and protocol developers on Solana face continuous distraction from browser tabs, Telegram noise, and glowing monitors. While high-frequency order flow data exists on-chain, monitoring it requires keeping resource-heavy trading interfaces open all day.

KAIROS is a dedicated, physical desktop terminal running on a low-power Raspberry Pi Zero 2 W paired with a 4.2-inch tri-color e-Paper display. It runs a compiled, memory-efficient Rust engine that listens directly to Solana DEX order books and blockspace metrics. It displays real-time market microstructure without glowing screens, notification banners, or browser overhead.

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
└────────────────────────────────────────────────────────┘
```

The device sits on a physical desk, consuming less than 1.2 Watts of power. It updates its e-Paper buffer via partial refresh cycles every 5 seconds, providing calm, persistent market situational awareness.

---

## 2. Technical Architecture

KAIROS combines embedded hardware design with low-latency Solana systems programming:

```
[ Solana RPC / Geyser WebSocket ] 
             │
             ▼
[ Embedded Rust Engine: kairos-core ] (Running on Raspberry Pi Zero 2 W)
    ├── Parser: Phoenix CLOB, Orca Whirlpools, Raydium CLMM
    ├── Microstructure Engine: Bid-Ask Depth Skew, Jito tip anomaly detection
    └── Framebuffer Pipeline: 1-bit monochome + red accent rendering
             │
             ▼
[ SPI Hardware Bus: GPIO / bcm2835 ]
             │
             ▼
[ 4.2" Waveshare e-Paper Display ] + [ Tactile Hardware Confirmation Button ]
```

### 1. Embedded Rust Core (`kairos-core`)
- Built in Rust using `no_std`-compatible modules where possible, with the standard library enabled for Linux networking on Raspberry Pi OS Lite.
- Connects directly to Solana WebSocket endpoints (Helius / Triton) to stream account updates for Phoenix CLOB and Orca Whirlpool state accounts.
- Memory footprint stays under 24 megabytes of RAM, leaving the Pi Zero 2 W running at under 15% CPU utilization.

### 2. Heuristic Intelligence and Anomaly Engine
The local daemon evaluates three specific microstructure metrics:
- **Bid-Ask Depth Skew (BADS):** Calculates the ratio of bid liquidity to ask liquidity within 1% of mid-market price. A drop below 0.62 indicates imminent liquidity pulling by market makers.
- **Jito Bundle Tip P95:** Monitors trailing priority tips on recent blocks. Spikes above historical 95th percentile indicate MEV contention or pending liquidation bursts.
- **Volume-to-Adverse-Selection (VAS):** Evaluates fee revenue versus price movement to distinguish organic demand from toxic latency arbitrage.

### 3. Display Pipeline and Tactile Agency
- Custom frame-buffer renderer converts text, depth bars, and status glyphs into native 400x300 bit arrays.
- Employs lookup-table (LUT) partial refresh cycles over SPI. Partial refresh updates screen content in 350ms without full-screen blinking or flickering.
- Includes a physical momentary switch wired to GPIO pin 17. Pressing the physical button confirms pre-signed emergency rebalance transactions (e.g. routing funds into stablecoins via MultiHopper or cancelling open limit orders) without opening a computer.

---

## 3. How AI Coding Tools Will Be Used

As a 14-year-old solo builder, I use modern AI tools (Claude Code and Cursor Pro) as a pair programmer for tasks that would otherwise require a team:

1. **Embedded Linux Graphics Optimization:** Generating fast pixel-packing algorithms and SPI byte arrays for the e-Paper controller (IL0398 driver).
2. **Solana Account Deserialization:** Synthesizing Borsh and Anchor deserializers for raw account state emitted by Phoenix and Orca WebSocket streams.
3. **Firmware Testing and Hardware Emulation:** Writing synthetic test benches that feed historical Solana slot data into the Rust daemon to verify display rendering before flashing to physical hardware.

The $200 USDG grant covers the exact cost of a full month of Pro AI development tooling, plus required hardware components and RPC credits.

---

## 4. Budget Allocation and Milestone Plan

The grant will be deployed strictly across development infrastructure and physical build parts:

| Item | Cost | Justification |
| :--- | :--- | :--- |
| **AI Development Tooling (1 Month)** | $50 USDG | High-tier reasoning models for embedded Rust debugging |
| **Raspberry Pi Zero 2 W Board** | $18 USDG | Quad-core ARM processor capable of running Linux and Rust |
| **Waveshare 4.2" e-Paper Module** | $32 USDG | 400x300 SPI display with partial refresh capability |
| **Dedicated Solana RPC Dev Tier** | $30 USDG | Low-latency WebSocket account streaming for 60 days |
| **Enclosure Materials & Microswitches** | $35 USDG | Laser-cut acrylic, hardware standoffs, mechanical buttons |
| **Power Management & Test Harness** | $35 USDG | USB-C power metering, logic analyzer clips for SPI debugging |
| **Total** | **$200 USDG** | **Fully accounted project expenditure** |

---

## 5. Shipping Milestones (3-Week Execution Schedule)

I will ship the functional MVP within 21 days of receiving Tranche 1 funding:

### Week 1: Core Systems and Display Driver (Days 1 to 7)
- Initialize the `kairos-core` open-source repository.
- Write the embedded Rust SPI driver for the Waveshare 4.2-inch e-Paper module.
- Implement partial refresh routines and prove sub-400ms screen updates.
- Deliverable: Working screen hello-world demo cycling through synthetic order-book snapshots.

### Week 2: Live Solana Integration (Days 8 to 14)
- Wire the Rust daemon to Solana Geyser / WebSocket endpoints.
- Parse Phoenix SOL/USDC order book bids and asks in real time.
- Calculate Bid-Ask Depth Skew and Jito tip P95 calculations on the device.
- Deliverable: Terminal updating live on a desk directly from mainnet Solana data.

### Week 3: Enclosure, Hardware Button, and Public Release (Days 15 to 21)
- Assemble the desk enclosure with acrylic plates and brass standoffs.
- Wire GPIO pin 17 to the physical emergency rebalance toggle.
- Produce a crisp 2-minute video walkthrough showing the device running on a desk and reacting to live Solana block production.
- Deliverable: Public GitHub release with documentation, wiring diagrams, 3D/laser cut files, and Tranche 2 verification submission.

---

## 6. Design Philosophy: Restraint and Focus

KAIROS applies core industrial and interface design principles:

- **Calm Technology:** e-Paper uses ambient room light. It emits no photons into the room, eliminates eye strain, and blends into the workspace like printed paper.
- **Physical Feedback:** The tactile microswitch provides instant physical resistance when pressed, avoiding touch-screen ambiguity.
- **Information Hierarchy:** Bold weights identify primary price and depth status. Monospaced data tables align tick sizes cleanly. Labels are direct and specific, avoiding visual clutter.
- **Purpose and Agency:** The device does one job well. It provides reliable situational awareness and leaves the user in full control.

---

## 7. About the Builder

I am 14 years old and actively building open-source tools on Solana. I enjoy systems engineering, Rust, and physical hardware. Building software connected to real, tangible devices makes technology approachable and exciting. 

This grant will directly enable me to turn an idea into a physical, shippable product that demonstrates what young builders can create with modern AI tools on Solana.

---

## 8. Verification and Reviewer Access

- **GitHub Repository:** https://github.com/drnzy/kairos-terminal
- **Review Access Email:** abhwshek@gmail.com
- **Public Updates:** Build logs and photos will be shared on X via @drnzy and submitted to the Superteam Earn tranche review portal.
