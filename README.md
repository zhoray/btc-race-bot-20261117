# Verdant Reclaim

The Verdant Reclaim bars-replay trading bot runs a deterministic strategy on the first symbol from the hello message: it arms on a 1.50% drawdown below the trailing high (150 bps, integer bigint math), confirms entry on a 0.15% rebound above the armed low, exits on 1.20% take profit, 0.80% stop loss, or 300-bar time stop. It is deterministic and self-contained using only the Node standard library and the vendored make.fun bars shim.
