# EVRO DAO Management Plan — v1

**Prepared by:** RaidGuild BD  
**Date:** 2026-04-17  
**Status:** Draft v1  
**Governance contract:** `0xdd100e25ef57fb43fd17a14ae62b273e9cc0d890` (Moloch v3/Baal, Gnosis Chain)

---

## Executive Summary

EVRO is a EUR-pegged CDP stablecoin on Gnosis Chain, built as a fork of Liquity v2. RaidGuild manages the EVRO DAO and holds 30% of the RETVRN governance token, with GnosisDAO holding 15% and 55% held in the DAO treasury.

The immediate objective is to transition the EVRO Build Team into the **EVRO Management Team** — a permanent operating body responsible for the protocol's health, growth, and adoption. Securing €5M from Gnosis DAO as the protocol's initial liquidity pool is the first major milestone, projected to yield ~€124k/year for the EVRO DAO at current parameters.

This document defines the three pillars of DAO management:
1. **Yield** — balancing returns with protocol safety
2. **New Assets** — expanding collateral to grow TVL and revenue
3. **BD & Marketing** — driving demand for EVRO and building its DeFi surface area

---

## 1. DAO Structure & Governance

### 1.1 Entities

| Entity | Role | RETVRN % |
|---|---|---|
| RaidGuild DAO | Protocol manager, BD, operations | 30% |
| GnosisDAO | Primary LP, protocol sponsor | 15% |
| EVRO DAO Treasury | Protocol-owned reserves, future contributors | 55% |

### 1.2 Governance Mechanics

- **Platform:** Moloch v3 / Baal on Gnosis Chain (`0xdd100e25ef57fb43fd17a14ae62b273e9cc0d890`)
- **Voting token:** RETVRN
- **Proposal types:** Parameter changes, new collateral onboarding, treasury allocations, BD partnerships, team changes
- **Quorum:** TBD by DAO (recommend starting at 10% of circulating supply)
- **Voting period:** TBD (recommend 5 days standard, 2 days for urgent parameter changes)

### 1.3 EVRO Management Team (proposed)

A working group within RaidGuild responsible for day-to-day operations, reporting to the DAO monthly:

| Role | Responsibility |
|---|---|
| **Protocol Steward** | Parameter oversight, risk monitoring, governance coordination |
| **Treasury Steward** | Yield routing, DAO fee management, Safe operations |
| **BD Lead** | Partnerships, integrations, demand generation |
| **Technical Lead** | New asset onboarding, smart contract monitoring |

**Safe address (2/4 Gnosis Chain):** `0x3d0Ac27a6D40caA9Fcc49a00BfeF26705BF69C4C`

---

## 2. Pillar 1 — Yield Management

### 2.1 How Yield Works

EVRO generates yield through borrower interest. The protocol routes interest via a shared **InterestRouter** (`0x3e722ea23c1c7806c1221d796b8bec7a6bf21041`) across all 6 collateral branches:

- **75%** of borrower interest (`SP_YIELD_SPLIT`) → Stability Pool depositors
- **25%** → EVRO DAO (via InterestRouter → governance contract)

Borrowers set their own interest rates within protocol constraints:
- **Minimum:** 0.5% APR
- **Maximum:** 250% APR
- **Adjustment cooldown:** 7 days (borrowers can reprice weekly)

### 2.2 V5 Baseline: €5M Deployment

| Collateral | Allocation | Amount |
|---|---|---|
| sDAI | 35% | €1,750,000 |
| GNO | 20% | €1,000,000 |
| wstETH | 15% | €750,000 |
| wXDAI | 15% | €750,000 |
| wWBTC | 10% | €500,000 |
| osGNO | 5% | €250,000 |

**Liquidity layer allocation:**

| Pool | Allocation | Amount |
|---|---|---|
| Stability Pools | 40% | ~€2,000,000 |
| Anchor / CoW AMM | 35% | ~€1,750,000 |
| Bridge / Curve | 20% | ~€1,000,000 |
| Reserve | 5% | ~€250,000 |

**Projected yield at V5:**
- ~8.1% annualized gross
- ~€124k/year to EVRO DAO (25% of gross yield on €5M)
- ~€373k/year net to Gnosis LP (after DAO fee)

### 2.3 Yield Optimization Framework

The DAO's yield mandate is to **maximize sustainable returns** within defined risk bands.

**Risk tiers for collateral allocation:**

| Tier | Assets | Max allocation | Target SP depth |
|---|---|---|---|
| 1 — Low risk | sDAI, wXDAI | 60% combined | High (≥50% of collateral) |
| 2 — Medium risk | GNO, wstETH, osGNO | 35% combined | Medium (30–50%) |
| 3 — Tail risk | wWBTC, future RWAs | 15% combined | Conservative (20–30%) |

**Quarterly yield review process:**
1. Protocol Steward compiles branch-level yield data (interest earned vs. depositor share)
2. Compare realized APR against market alternatives (e.g., Aave, Spark, Yearn)
3. Propose rebalancing if any branch diverges >2% from target allocation
4. DAO vote required for any allocation shift >5% per branch

**Risks to monitor:**
- Stability Pool underfunding (key liquidation backstop — target >20% of branch TVL)
- Collateral price oracle failures (each branch has dedicated PriceFeed contracts)
- Borrower concentration risk (single large borrower dominating a branch's debt ceiling)
- Redemption pressure during EUR/USD spread events

---

## 3. Pillar 2 — New Asset Onboarding

### 3.1 Why It Matters

Each new collateral branch:
- Increases total borrowing capacity → more EVRO minted → more yield generated
- Diversifies risk across asset classes
- Expands the EVRO brand to new communities (e.g., adding LSTs brings LSD communities)
- Fixed debt ceilings per branch contain tail risk without protocol-wide exposure

### 3.2 Asset Categories to Pursue

**Near-term (0–6 months):**
- **Additional LSTs on Gnosis** — e.g., sGNO, future Gnosis validator tokens
- **EURe (Monerium EUR stablecoin)** — natural hedge collateral, strong Gnosis Pay alignment
- **USDC/USDT as sDAI-like collateral** — low-risk liquidity depth expansion

**Medium-term (6–18 months):**
- **ETH (bridged)** — largest DeFi collateral market; adds credibility
- **RWA tokens** — e.g., tokenized T-bills (Backed, Ondo), on-chain bonds; targets institutional LPs
- **Gnosis Pay-native assets** — as GnosisPay ecosystem matures, native card spending assets

**Framework for evaluation:**

Each candidate asset is assessed across five dimensions before a DAO proposal:

| Dimension | Questions |
|---|---|
| **Liquidity** | Is there deep on-chain liquidity on Gnosis Chain? Can the Stability Pool absorb a 30% price drop? |
| **Oracle** | Is there a reliable, manipulation-resistant price feed available? |
| **Correlation** | Does this asset diversify the collateral mix or increase systemic correlation? |
| **Community** | Does this asset bring new borrowers and LP demand to EVRO? |
| **Yield** | What interest rate is this collateral community willing to pay? |

**Onboarding process:**
1. **Signal proposal** — Temperature check in EVRO DAO forum (no on-chain vote)
2. **Technical assessment** — Technical Lead audits oracle, liquidity, and contract dependencies
3. **Risk report** — Protocol Steward publishes risk score and proposed debt ceiling
4. **DAO vote** — Formal on-chain proposal with deployment parameters
5. **Phased deployment** — Start at 25% of target debt ceiling; expand after 30-day observation period

---

## 4. Pillar 3 — BD & Marketing

### 4.1 Goal

Drive sustained demand for EVRO by creating useful, real-world applications for a euro-pegged stablecoin in DeFi and beyond. More EVRO utility = more borrowing demand = more yield.

### 4.2 Target Integration Categories

**DeFi Liquidity:**
- **Yearn Finance** — EVRO yield vault to auto-compound SP earnings; targets yield farmers
- **Curve / CoW AMM** — Deep EVRO/EURe or EVRO/USDC pools for peg stability and LP fees
- **Aave / SparkLend** — EVRO as a borrowable asset; opens leveraged strategies and institutional demand
- **Contango** — Fixed-rate EVRO borrowing product (referenced in post-launch roadmap)
- **Pendle** — Yield tokenization of EVRO Stability Pool positions

**Gnosis Pay / Real-World Spending:**
- **Gnosis Pay integration** — EVRO as a card-spendable EUR asset; ties DeFi yield to real-world EUR spending
- Native EUR stablecoin for Gnosis Pay merchants
- Target use case: earn yield on EVRO in Stability Pool, spend via Gnosis Pay card

**Institutional & Treasury:**
- **DAO treasuries** — Pitch European DAOs (Gnosis ecosystem, Lido, etc.) to hold EVRO as EUR reserve
- **RWA protocols** — Partner with Backed/Ondo to make EVRO a settlement layer for EUR RWAs
- **CEX listings** — Kraken, Coinbase (EUR-native markets) — longer-term once TVL > €20M

**Cross-chain:**
- **Bridging to Ethereum mainnet** — via existing Bridge/Curve pool (20% of LP allocation)
- **Base/Optimism** — as L2 EUR demand grows post-Gnosis Pay expansion

### 4.3 BD Prioritization Matrix

| Integration | Effort | Impact | Priority |
|---|---|---|---|
| Gnosis Pay | Low (same ecosystem) | High (real utility) | 🔴 Now |
| Yearn vault | Medium | High (TVL multiplier) | 🔴 Now |
| Curve/CoW AMM | Low (already seeded) | High (peg stability) | 🔴 Now |
| Aave/SparkLend | High (governance process) | Very high | 🟡 Q3 2026 |
| Contango | Medium | Medium | 🟡 Q3 2026 |
| DAO treasury outreach | Low | Medium | 🟡 Q3 2026 |
| CEX listings | Very high | High | 🟢 2027+ |

### 4.4 Marketing Pillars

1. **EUR DeFi narrative** — EVRO is the only EUR-native CDP on Gnosis Chain. Own the "EUR yield" story.
2. **Gnosis ecosystem alignment** — Co-market with GnosisDAO, Gnosis Pay, Safe. EVRO = the financial layer of Gnosis.
3. **RETVRN token utility** — Make governance valuable. Staking, fee sharing, exclusive integrations drive demand for RETVRN and increase DAO participation.
4. **Transparency reporting** — Monthly DAO reports on TVL, yield generated, DAO fee earned, new integrations. Build trust with institutional LPs.

---

## 5. Operations

### 5.1 Tooling

| Tool | Purpose |
|---|---|
| Moloch v3/Baal | On-chain governance and treasury |
| Safe (2/4) | Multi-sig for DAO fee management and operations |
| Dune Analytics | Protocol dashboards (TVL, yield, borrowers by branch) |
| Supabase (RaidGuild BD) | BD pipeline, raid events, partner tracking |
| Ditto | Contribution ledger for fair compensation at deal close |
| EVRO Telegram | Community and ecosystem coordination |

### 5.2 Monthly Operating Rhythm

| Cadence | Activity |
|---|---|
| Weekly | Protocol Steward checks SP depth, oracle health, collateral prices |
| Monthly | Yield report published; DAO fee routed to Safe |
| Quarterly | Collateral allocation review; BD pipeline review; RETVRN tokenomics check |
| Annually | Full risk assessment; roadmap refresh; contributor compensation review |

### 5.3 Revenue Flow

```
Borrowers pay interest
        ↓
InterestRouter (0x3e722ea23c1c7806c1221d796b8bec7a6bf21041)
        ↓
   75% → Stability Pool depositors (SP_YIELD_SPLIT)
   25% → EVRO DAO (governance contract)
        ↓
   DAO Safe (2/4 multisig)
        ↓
   RaidGuild DAO share (per RETVRN %)
```

---

## 6. Roadmap

### Phase 1 — Launch (Now → Q2 2026)
- [ ] Gnosis DAO approves V5 deployment (€5M)
- [ ] EVRO Management Team formally constituted
- [ ] Governance contract activated, first DAO proposals
- [ ] Gnosis Pay integration scoped and initiated
- [ ] Yield dashboard live (Dune)
- [ ] First monthly DAO report published

### Phase 2 — Growth (Q3–Q4 2026)
- [ ] Aave/SparkLend listing proposal submitted
- [ ] Yearn EVRO vault live
- [ ] First new collateral branch added (target: EURe or sGNO)
- [ ] veRETVRN design finalized
- [ ] Alpha Growth partnership (from V5 roadmap)
- [ ] EVRO TVL > €10M

### Phase 3 — Scale (2027)
- [ ] EVRO TVL > €25M
- [ ] 3+ collateral branches added since launch
- [ ] CEX listing process initiated
- [ ] EVRO on 2+ L2s via bridge
- [ ] EVRO DAO self-sustaining on protocol revenue (no external grants needed)

---

## Appendix: Contract Addresses (Gnosis Chain)

### Core

| Contract | Address |
|---|---|
| EVRO Token | `0xdaca5f19e7a33277dc7477067f200ea735dc6982` |
| Collateral Registry | `0x9ae5b0cf832391040af0873c97c4bb4b9a397680` |
| Governance (Moloch v3) | `0xdd100e25ef57fb43fd17a14ae62b273e9cc0d890` |
| Interest Router | `0x3e722ea23c1c7806c1221d796b8bec7a6bf21041` |
| DAO Safe (2/4) | `0x3d0Ac27a6D40caA9Fcc49a00BfeF26705BF69C4C` |

### Collateral Branches — Stability Pools

| Branch | Stability Pool |
|---|---|
| WXDAI | `0x26a47c21e26b315b8e536dca87ba918e49713b7e` |
| GNO | `0x9917aba496240fa29c10f1f6312eb83abb749b58` |
| sDAI | `0x2e687202b71eecf3dfaa846a2a96096efa5d6df2` |
| wWBTC | `0xe7f7e850e7b211d41e29a31a9e7938dfcd934539` |
| osGNO | `0x8bada3ae3dd00f6fc2b4a5705a612b5582316a83` |
| wstETH | `0xfe3155bc651424d10a044a32a05a0772c0351922` |

### Collateral Branches — Borrower Operations

| Branch | Borrower Operations |
|---|---|
| WXDAI | `0x612d2dcfb3dbc579b65a89380f1171347cc7d280` |
| GNO | `0xc87b8baad859196418e255bcbc7ed732c39e191f` |
| sDAI | `0x6e50fe6bfa4e69bf6dc32d3a95a63fc2fcb5ed01` |
| wWBTC | `0xfc9f712acc707bbe6124b21c1e0dc335f745a2b4` |
| osGNO | `0xb09050abd02e9d728fca57e836f821fa4830ce6a` |
| wstETH | `0x8228b4918380164dea7b2e3d0abde5ab6046fd24` |

---

*This document is a living plan. It will be updated as the EVRO Management Team takes shape, V5 deploys, and new opportunities emerge. Version history tracked via git.*
