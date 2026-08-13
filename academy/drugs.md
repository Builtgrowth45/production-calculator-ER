# 💊 Combat Drugs — Full Reference

*All 20 drugs from `game_data.json`. Cost = total UC (processing + chemsub). Stats from Combat Balance 1.7.*

## Quick table

| Drug | Tier | Cost (UC) | Positive | Negative |
|---|---|---|---|---|
| **Amyl Nitrate** | Low | 91.75 | Health Regen +1.5% | Stamina Drain −2% |
| **Anabolica** | Medium | 103 | Defense +2% & Block +2% | — |
| **Benzedrine** | Low | 91.75 | Agility +4% | Weapon Recoil −2% |
| **Biphetamin** | High | 114.25 | Stamina Regen +7% | Health Regen −3% |
| **Butyl Nitrate** | Medium | 103 | Bio Regen +3% | Stamina Drain −2% |
| **Cocaboline** | High | 114.25 | Shielding +20 | Defense −2% |
| **Desoxyn** | Low | 91.75 | Armor +70 | Block −5% |
| **Dexedrine** | High | 114.25 | Aura Regen +2% | Agility −4% |
| **MDMA** | Low | 91.75 | Shielding +70 | Defense −5% |
| **Methedrine** | High | 114.25 | Agility +7% | Weapon Recoil −5% |
| **Neoamphetamine** | Medium | 103 | Defense +7% | Block −5% |
| **Neurotonin** | Low | 91.75 | Resistance +20 | Reflection −20 |
| **Opiatech** | Low | 91.75 | Block +7% | Defense −5% |
| **Oxazoline** | Low | 91.75 | Resistance +70 | Reflection −50 |
| **Phencyclidine** | Medium | **62.5** | Crit Offense +7% | Weapon Recoil −5% |
| **Polydichloric Euthemal** | Medium | 103 | Endurance +70 | Resistance −50 |
| **Polycodeine** | Medium | 103 | Weapon Recoil −7% | Crit Offense −5% |
| **Ritalin** | Medium | 103 | Health Regen +0.5% | Stamina Drain −1% |
| **Tetrahydrocannabinol** | Low | 91.75 | Endurance +20 | Resistance −20 |
| **X-Dopamine** | High | 114.25 | Armor +70 | Block −5% |

## Reading the tiers

- **Low** — baseline 91.75 UC, modest buffs with real downsides.
- **Medium** — 103 UC, stronger buffs. **Phencyclidine is the value king at 62.5 UC** — cheapest drug in the game, biggest crit buff.
- **High** — 114.25 UC, the heavy hitters: +7% Agility (Methedrine), +7% Stamina Regen (Biphetamin), +70 Armor (X-Dopamine), +20 Shielding (Cocaboline).

## Build recommendations

- **Tank / frontline:** X-Dopamine (+70 Armor) or Desoxyn (+70 Armor, cheaper) → pair with MDMA (+70 Shielding).
- **Resistance wall:** Oxazoline (+70 Resistance) — biggest flat resistance in the game.
- **DPS / crit:** Phencyclidine (+7% Crit Offense) — best UC-per-stat in the game.
- **Mobility:** Methedrine (+7% Agility) — outmaneuver; watch the recoil penalty.
- **Sustain:** Biphetamin (+7% Stamina Regen) for long engagements; Butyl Nitrate (+3% Bio Regen) for recovery windows.
- **Aura support:** Dexedrine (+2% Aura Regen) — niche, but real if you run aura builds.

## Rules of thumb

1. **Never stack two drugs with the same downside.** Recoil penalties stack; Agility drains stack. One mobility drug + one tank drug is the standard pattern.
2. **Drugs are cheap** (62–114 UC) compared to armor (thousands). Stock them like ammo — 5–10 of your build drug per battle node run.
3. **Negative stats matter more than they look.** −5% Block on an armor build is usually fine; −5% Crit Offense on a crit build (Polycodeine) is self-sabotage.
4. Costs are per-unit at baseline processing — the live calculator's Drugs tab shows current prices with your session state.

*Source: `game_data.json` drugs (20). Stats from Combat Balance Update 1.7.*
