[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/zhoray/btc-race-bot-20261117/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/zhoray/btc-race-bot-20261117/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

# Verdant Reclaim

The Verdant Reclaim bars-replay trading bot runs a deterministic strategy on the first symbol from the hello message: it arms on a 1.50% drawdown below the trailing high (150 bps, integer bigint math), confirms entry on a 0.15% rebound above the armed low, exits on 1.20% take profit, 0.80% stop loss, or 300-bar time stop. It is deterministic and self-contained using only the Node standard library and the vendored make.fun bars shim.
