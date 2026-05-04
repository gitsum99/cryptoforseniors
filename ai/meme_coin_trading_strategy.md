# Meme Coin Trading System (Small-Capital, High-Volatility, Controlled Risk)

## Risk Acknowledgment (No Guarantees)
- This model is speculative and can result in partial or total loss of capital.
- Execution quality may differ from model assumptions due to latency, slippage, and adversarial behavior.
- Rules below are designed to constrain risk, not eliminate it.

## Logic Tree

### 0) Universe Filter (Market Selection)
- **0.1 New Launch Discovery**
  - Source pools created in last `N` minutes (default `N = 180`) from Solana DEX feeds.
  - Keep only tokens with at least one verified pool route and continuous quote availability.
- **0.2 Liquidity Minimum Threshold**
  - Require initial pool liquidity >= `30 SOL` (hard floor).
  - Prefer liquidity band `50-300 SOL`; reject if liquidity collapses > `25%` in 10 minutes.
- **0.3 Volume Spike Detection**
  - Compute rolling volume ratio with a history-safe baseline:
    - If age since pool creation >= 30 minutes: `V_5m / median(V_5m over prior 30m)`.
    - If age is 8-30 minutes: `V_5m / median(all completed 5m buckets since minute 0, minimum 2 buckets)` and skip candidate until minimum buckets exist.
    - Apply denominator floor `max(baseline, 1 SOL)` to avoid divide-by-near-zero artifacts for tiny/new pools.
  - Require ratio >= `2.5` and absolute `V_5m >= 10 SOL`.
- **0.4 Dev Wallet Behavior Tracking**
  - Identify deployer + linked wallets by first-hop transfers.
  - Reject if deployer-linked wallets cumulative sells exceed `5%` of supply **up to decision time** (no future-window lookahead).
  - Additional delayed integrity rule: at minute 60, mark token ineligible for any re-entry if cumulative sells over first 60 minutes exceed `5%`.
  - Reject if > `3` linked wallets receive large allocations (> `1%` each) before public trading.
- **0.5 Holder Distribution Analysis**
  - Top-10 holders excluding LP + burn <= `35%` of supply.
  - Single non-LP wallet <= `8%`.
  - Holder count growth positive over 15-minute windows; reject stagnant concentration.

### 1) Entry Conditions
- **1.1 Timing Relative to Launch**
  - Entry window: between minute `8` and `45` after pool creation.
  - Avoid first 8 minutes to reduce immediate launch instability and bot spikes.
- **1.2 Liquidity Depth Check**
  - Simulate quote for planned size and for `2x` size.
  - Require price impact <= `2.0%` at planned size and <= `4.0%` at `2x`.
- **1.3 Slippage Modeling**
  - Estimated total slippage budget:
    - `model_slippage = pool_impact + volatility_buffer + latency_buffer`
    - volatility buffer = recent 1-minute realized volatility percentile (75th).
    - latency buffer based on recent API->execution delay.
  - Do not enter if expected all-in slippage > `3.5%`.
- **1.4 Position Sizing**
  - Risk per trade = `1.0%` of current capital (starting from 0.1 SOL).
  - Position notional capped by both risk model and depth constraints.
  - Maximum concurrent positions: `2`.

### 2) Exit Strategy
- **2.1 Tiered Take-Profit**
  - TP1: +`20%` (exit 35% of size)
  - TP2: +`45%` (exit 35% of size)
  - TP3: trail remainder 30% with dynamic stop.
- **2.2 Stop-Loss Logic**
  - Initial stop: `-12%` from entry or technical invalidation (whichever tighter).
  - After TP1, move stop to breakeven minus fees.
- **2.3 Time-Based Exit**
  - If no TP1 within 25 minutes and volume ratio falls below `1.2`, exit full position.
  - Hard max holding time: `90` minutes.
- **2.4 Liquidity Rug Detection Triggers**
  - Immediate full exit if pool liquidity drops > `30%` in 3 minutes.
  - Immediate full exit if swap failures spike and quote depth vanishes.

### 3) Capital Scaling Model
- **3.1 Risk Per Trade**
  - Base risk `r = 1.0%` of equity.
  - Reduce to `0.5%` after 3 consecutive losses.
- **3.2 Compounding Logic**
  - Recompute risk using end-of-trade equity.
  - Increase notional only through percentage-based sizing; never fixed-size escalation.
- **3.3 Max Daily Exposure**
  - Total at-risk capital per day <= `6%` of equity.
  - Stop trading for day after realized loss reaches `-4%`.
- **3.4 Drawdown Tolerance**
  - If peak-to-trough drawdown >= `12%`, switch to simulation-only mode for 7 days.

### 4) Risk Controls
- **4.1 Rug Pull Detection**
  - Monitor LP token movements, sudden liquidity withdrawals, and authority changes.
  - Block new entries on any high-risk contract-event flag.
- **4.2 Honeypot Detection**
  - Pre-trade micro buy/sell simulation using small amount.
  - Reject token if sell route fails or effective tax exceeds configured limit (e.g., 12%).
- **4.3 Dev Wallet Selling Triggers**
  - Exit if deployer-linked net selling exceeds threshold post-entry (e.g., > `2%` supply in 10 min).
- **4.4 Whale Concentration Monitoring**
  - Exit/avoid when a top wallet increases concentration aggressively (e.g., +`3%` supply quickly).
- **4.5 Gas Fee Impact**
  - Skip trades if expected fees exceed `15%` of expected TP1 gross PnL.

### 5) Automation Feasibility
- **5.1 Required APIs / Data Sources**
  - Dexscreener (new pairs, liquidity, volume).
  - Jupiter quote/route API (depth, expected out, routing viability).
  - RPC + token account indexing (holder concentration, wallet tracking, LP changes).
- **5.2 Monitoring Frequency**
  - Discovery loop every 10-15 seconds.
  - Risk-state checks every 5 seconds for open positions.
- **5.3 Alert Thresholds**
  - Alert on liquidity drop >20%/3min, slippage estimate breach, dev-wallet sell events, or route failure.
- **5.4 Execution Latency Risks**
  - Model stale quote risk with max acceptable quote age (e.g., <= 2 seconds).
  - Cancel if latency exceeds threshold or if expected slippage regime changes before send.

### 6) Failure Scenarios and Defensive Response
- **6.1 Low Liquidity Trap**
  - Symptom: unable to exit near quoted price.
  - Response: smaller size cap and stricter depth threshold.
- **6.2 Slippage Exceeding Expectation**
  - Symptom: repeated poor fills vs estimate.
  - Response: increase slippage buffer or suspend strategy during volatility regime shift.
- **6.3 MEV Sandwich Attacks**
  - Symptom: entry spikes then immediate adverse move.
  - Response: private relays where possible, tighter max slippage, smaller orders.
- **6.4 Fake Volume Inflation**
  - Symptom: high volume with low unique wallet participation.
  - Response: require unique buyer growth and trade-size dispersion checks.
- **6.5 Insider Liquidity Drain**
  - Symptom: coordinated LP removal + insider selling.
  - Response: immediate exit and token blacklist cooldown.

### 7) Senior-Safe Adaptation Layer
- **7.1 Simulation-First**
  - Mandatory paper-trading period (e.g., 100 simulated trades) before live capital.
- **7.2 Max Capital Cap**
  - Hard cap of deployable funds (example: <= 5% of total savings).
- **7.3 No Leverage**
  - Spot-only trading; no borrowing, no perpetuals.
- **7.4 Mandatory Cooldown**
  - After 2 consecutive losses: 12-hour cooldown.
  - After daily loss limit hit: stop until next trading day.

## Implementation Notes
- Treat every threshold as tunable; validate with out-of-sample forward testing.
- Keep a full trade journal: signal state, quote state, execution metrics, and post-trade attribution.
