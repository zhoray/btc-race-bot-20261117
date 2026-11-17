/**
 * Verdant Reclaim deterministic bars-replay strategy.
 * - Arm on 1.50% drawdown (150 bps) below trailing high.
 * - Confirm/Entry on 0.15% rebound (15 bps) above armed low; buy full notional if >=1M quote units; only while scoredBars <= 1150.
 * - Exit on 1.20% TP, 0.80% SL, or 300-bar time stop from first entry; then finish.
 * - The 0.15% confirm threshold is deliberately small because a full round trip costs about 26 bps, so the rebound must be confirmed early while the take profit stays well above cost. * All using bigint math; no FP; max_slippage_bps 250.
 */
import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch, BuyInput, SellInput } from './vendor/makefun-bars.ts';

const ENTRY_CUTOFF = 1150;
const ARM_BPS = 150n;
const CONFIRM_BPS = 15n;
const TP_BPS = 120n;
const SL_BPS = 80n;
const TIME_STOP = 300;
const MAX_SLIP_BPS = 250;
const MIN_NOTIONAL = 1_000_000n;
const QUOTE_SCALE_FACTOR = 10_000_000n;
const BPS = 10_000n;

// Module-level state
let anchorHigh: bigint | null = null;
let armLow: bigint | null = null;
let armed = false;
let entrySent = false;
let basis: bigint | null = null;
let positionFirstSeenBar: number | null = null;
let positionWasSeen = false;
let finished = false;
let scoredBars = 0;

// Two bigint helpers
function atOrBelowDrawdown(price: bigint, reference: bigint, bps: bigint): boolean {
  return price * BPS <= reference * (BPS - bps);
}
function atOrAboveGain(price: bigint, reference: bigint, bps: bigint): boolean {
  return price * BPS >= reference * (BPS + bps);
}

// One exit helper
function shouldExit(close: bigint, basis: bigint, elapsedBars: number): boolean {
  return atOrAboveGain(close, basis, TP_BPS) || atOrBelowDrawdown(close, basis, SL_BPS) || elapsedBars >= TIME_STOP;
}

// positionOrders(state, close)
function positionOrders(state: BarsState, close: bigint): (BuyInput | SellInput)[] | null {
  const SYMBOL = state.hello.symbols[0].symbol;
  const position = state.positions.get(SYMBOL);
  if (!position) {
    if (positionWasSeen) {
      finished = true;
      return null;
    }
    return null;
  }
  positionWasSeen = true;
  if (basis === null) {
    basis = (position.cost * 10_000_000n) / position.qty;
    positionFirstSeenBar = scoredBars;
  }
  if (shouldExit(close, basis, scoredBars - positionFirstSeenBar!)) {
    return [{ side: 'sell', symbol: SYMBOL, qty: position.qty, max_slippage_bps: MAX_SLIP_BPS }];
  }
  return null;
}

runBars({
  onHello(state: BarsState) {
    anchorHigh = null;
    armLow = null;
    armed = false;
    entrySent = false;
    basis = null;
    positionFirstSeenBar = null;
    positionWasSeen = false;
    finished = false;
    scoredBars = 0;
  },
  onBatch(state: BarsState, batch: Batch) {
    // Reset entrySent on rejected buy
    const fills = batch.fills || [];
    const symFills = fills.filter((f: any) => f.symbol === state.hello.symbols[0].symbol);
    const rejected = symFills.some((f: any) => f.status === 'rejected' && !f.client_id?.startsWith('_'));
    if (rejected && !state.positions.has(state.hello.symbols[0].symbol) && !entrySent) {
      entrySent = false;
    }
    if (state.warmingUp) return;
    scoredBars++;
    const SYMBOL = state.hello.symbols[0].symbol;
    const close = state.close(SYMBOL);
    if (close === null) return;
    // POSITION/EXIT
    const position = state.positions.get(SYMBOL);
    if (position || positionWasSeen) {
      const orders = positionOrders(state, close);
      if (orders !== null) return orders;
      return;
    }
    // FINISHED
    if (finished || entrySent) return;
    // Update anchorHigh
    if (!anchorHigh) {
      anchorHigh = close;
    } else if (close > anchorHigh) {
      anchorHigh = close;
    }
    // ARMING block: waits for a capitulation below the trailing high
    if (!armed) {
      if (atOrBelowDrawdown(close, anchorHigh!, ARM_BPS)) {
        armed = true;
        armLow = close;
      }
    } else {
      if (close < armLow!) armLow = close;
    }
    // ENTRY block: waits for the first rebound off the armed low
    if (!armed || armLow === null || !atOrAboveGain(close, armLow, CONFIRM_BPS)) return;
    if (scoredBars > ENTRY_CUTOFF) return;
    const notional = state.weightRoom(SYMBOL);
    if (notional < MIN_NOTIONAL) return;
    entrySent = true;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIP_BPS }];
  }
});
