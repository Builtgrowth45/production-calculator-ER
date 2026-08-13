# 📊 Attributes 101 — What Every Stat Actually Does

*Every stat in the character sheet, decoded from the game's official help text. If a number looks weird, this is where you find out why. Baselines verified 2026-08-08 (zero-gear screenshots).*

## The four panels

Your character sheet splits into four panels. Each one answers a different question:

| Panel | Question it answers |
|---|---|
| **MAIN STATS** | Who am I, and am I in debt to the universe? |
| **DAMAGES** | What is my gear *costing* me? |
| **REGENERATION** | How fast do my pools come back? |
| **PROTECTION** | What happens when someone shoots me? |

---

## 1. MAIN STATS

| Stat | Meaning |
|---|---|
| **Universal Credits** | Your main wallet. Everything (fees, market, manufacturing) runs on UC. |
| **Faction Credits** | Faction currency — shows **red at 0**, so red here just means "no faction coin." |
| **Coins** | Secondary currency — same deal, red at 0. |
| **Available Clones** | Your **lives**. Permadeath is live: die and you burn one. Low-clone mail fires at ≤10 — treat 20+ as "safe," anything below as "stop taking risks." |
| **Agility** | How fast your character **runs**. Caps at 100%. |
| **Addiction** | Built by consuming **addictive (illegal) substances**. Climb this and your booster durations shrink. |

**Read:** green = good state (clones healthy, agility capped, addiction clean), red = zero currency or a stat that's zero.

---

## 2. DAMAGES

Every row here is a **cost** — the price of the gear/boosters you're running. With nothing equipped, **all six are 0.0%**. If you see non-zero numbers, your equipment or boosters are draining you.

| Stat | What it drains |
|---|---|
| **Health Drain** | Health reduction from equipment/booster effects |
| **Stamina Drain** | Stamina reduction from equipment/booster effects |
| **Bio Energy Drain** | Bio energy reduction from equipment/booster effects |
| **Aura Loss** | Aura reduction from equipment/booster effects |
| **Critical Offense Rating** | ⬆ **chance to land a critical attack** (a hit with increased damage). This is a *damage stat*, not a cost — it lives here but it's your friend. |
| **Weapon Recoil** | Changes ease of aiming **while moving**. 0% = perfectly steady; green 0.0% in the baseline shot is the "nothing to worry about" color. |

**Read:** the four drains are your gear's upkeep. Big damage numbers usually come with drains — that's the trade-off baked into the item.

---

## 3. REGENERATION

The base values (nothing equipped) are your **innate floors** — every character has these before gear:

| Stat | Base | Sources (official help text) |
|---|---|---|
| **Health Regeneration** | **2.0%** | medkits, injectors, illegal substances… or even death (clone respawn is the last-resort heal) |
| **Stamina Regeneration** | **2.0%** | medkits, injectors, illegal substances, certain equipment — **and resting** (standing still, sitting, lying down) |
| **Bio Regeneration** | **0.0%** | bio cells, injectors, illegal substances |
| **Aura Regeneration** | **2.5%** | foods, illegal substances (the only stat where **food** is a source) |
| **Addiction Treatment** | **0.0%** | Speeds up the **natural** decay of addiction. Base 0 = without sources, addiction only clears at the slow baseline rate. |
| **Medkit Cooldown** | **0.0s** | How long you must wait **between healing items** — a global gate on *all* healing, not per-item (per-item use cooldowns like 0.5s/0.1s are separate, listed on the items themselves). Patch notes cap it at 10s with a slow decay back to 0. |

**Read:** health/stamina/aura regen are free floors; **bio starts at zero** and must be fed. Notice the pattern — *every* regen source list includes illegal substances. The drug economy isn't a side activity; it's a pillar of how fast anyone recovers.

---

## 4. PROTECTION — the damage-type system

This panel is where the game's combat math lives. ER has **five damage channels**, and each has its own flat protection stat:

| Damage channel | Countered by | Faction that maxes it |
|---|---|---|
| **Ballistic** (bullets) | **Armor** | FDC (heavy: 102) |
| **Energy** (plasma/lasers) | **Shielding** | VI (heavy: 102) |
| **Stamina** | **Endurance** | CMG (heavy: 150!) |
| **Bio** | **Resistance** | EC (heavy: 150) |
| **Aura** | **Reflection** | BoS |

With nothing equipped, all five flat stats are **0** (red) — they are 100% armor-derived.

On top of the typed walls sit two **mitigation chances** (both % rows, both 0.0% bare):

- **Defense Rating** — chance to **reduce** an attack of *any* type (partial mitigation)
- **Block Rating** — chance to **block** an attack *entirely* (full negation)

And the debuff stat:

- **Protection Reduction** — a percentage reduction of **all** protection statistics at once (global debuff; the sheet updates immediately, so you'll see it live)

> ⚠️ **Balance 1.0 note:** Block/Defense (and Crit/Addiction as *armor* stats) were **removed from armor** since Combat Balance 1.0. The rows persist in the UI, but armor no longer grants them — anything that does grant them is rare and valuable.

---

## Strategy notes

- **Your faction armor is a typed wall, not a universal one.** CMG's 150 Endurance means CMG armor is *the* answer to stamina damage — but it does nothing special against ballistic. Know which channel the enemy's weapon hits, and you know which faction's salvage to wear.
- **MotB's "Bio + Stamina damage on hit" is a bypass play.** It doesn't touch Armor/Shielding at all — it drains the two regen pools directly, hitting exactly what most players ignore.
- **The drug tax is real.** Every illegal-substance source on every regen list feeds Addiction; without Addiction Treatment (BoS's specialty), the cure is slow. BoS = "clean living," everyone else = paying the tax. If you run a booster-heavy build, budget for the addiction side.
- **Medkit cooldown is a hidden build cost.** A build that stacks it is trading sustained healing for whatever it bought — fine for burst fights, painful in prolonged ones.
- **Red isn't always bad.** In the baseline shots, red = zero (currency, bio regen, protection stats). It's the "nothing here" color, not necessarily an alarm.

*Source: official in-game attribute help text (IN STATS glossary popup) + zero-gear character sheet screenshots, verified 2026-08-08.*
