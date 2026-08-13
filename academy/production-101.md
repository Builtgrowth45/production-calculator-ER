# ⚙️ Production 101 — How the Economy Works

*The chain is always the same: **MINE raw → REFINE intermediates → MANUFACTURE final items.** Every plan in the calculator is just this chain, costed out.*

## The three stages

1. **Mine** — raw ores/materials dug at one of the 13 mine sites (see [Mining](mining.md)).
2. **Refine** — turn raws into usable intermediates. This is where most of the *interesting* cost lives.
3. **Manufacture** — combine intermediates into the final item (armor, guns, ammo, drugs…).

## The refinement table (what becomes what)

| Intermediate | Recipe |
|---|---|
| aluminum | bauxite ×2 |
| chemicals | Chemical Substances ×1 |
| rubber | caoutchouc ×2 + Chemical Substances ×1 |
| glass | silicon ×3 + Chemical Substances ×1 + aluminum ×1 |
| carbon fiber | carbon ×2 |
| titanium alloy | titanium ×2 + aluminum ×1 + chrome ×1 |
| titanium syntactic foam | titanium alloy ×2 |
| textiles | *alternative paths* — default: chemicals ×3 + organic material ×2 + water ×1 |

**Key insight:** refinement paths are switchable in the calculator. Textiles, for example, can be built from different input mixes — the calculator lets you pick the cheapest path given what you already own. Always check the "REFINEMENT PATHS" bar before buying materials.

## Batch math (the part that saves you money)

Every recipe makes **more than one unit per batch**. Example — Aramid Basic Helmet:

- 1 batch of 3 helmets needs: titanium syntactic foam ×5 + textiles ×2 + rubber ×2
- Need just 1 helmet? You still run 1 batch → **3 made, +2 surplus**
- Surplus stacks in your inventory and carries into the *next* plan (the plan tray shares the stock ledger across items)

**Rule of thumb:** never buy materials for exactly what you need — buy for the batch, bank the surplus. The calculator shows this as `1 batch+2 surplus` and rolls surplus forward automatically.

## What you actually pay (the cost stack)

Using the Berlin example for 1 Aramid Basic Helmet (8,477 UC total):

| Component | UC | Share |
|---|---|---|
| **Fees** (refine + manufacture at the hub) | 5,643 | 66.6% |
| **Materials** (raw + transport) | 2,834 | 33.4% |
| **Slot upkeep** (energy ⚡ / cooling ❄) | +343 | 4.2% |
| **Session drift** (market movement) | −62 | −0.8% |
| **Total** | **8,477** | 103.4% |

- **Fees dominate.** Two-thirds of what you spend is processing fees at the production hub. That's why *where* you produce matters more than what you mine.
- **Colony tax**: producing at a taxed colony adds a % (editable in the Colonies tab and stored locally).
- **Faction-owned colonies** can return a portion of spend to the relevant faction economy; configure the applicable faction profile in the calculator.

## Production slots

- Production happens in **slots** at the destination colony — each slot has an **energy** and **cooling** budget (e.g. Berlin: ⚡5 energy, ❄0 cooling).
- The slot setup constrains what you can run; a heavy plan may exceed a colony's slot capacity — the calculator surfaces this as "slot upkeep".
- **Mining slots** are separate and only exist at the 13 mine sites. Berlin has no mine site — dig elsewhere, produce in Berlin.

## Using the calculator like a pro

1. **Search** the item → set **quantity** → pick **PRODUCE AT** hub.
2. Check the **REFINEMENT PATHS** bar and switch any path you own materials for.
3. **CALCULATE** → review OBTAIN (which mine site, how many units, per-unit UC) → **APPLY PLAN → INVENTORY**.
4. Copy the **shopping list** (`📋 COPY SHOPPING LIST`) for the run, or share the plan link with a guildmate who can cover part of it.
5. `Ctrl+Z` undoes an applied plan. `/` jumps to search. The last 8 plans are one click away in **RECENT**.

*Costs verified against the live calculator, 2026-08-06 (1× Aramid Basic Helmet @ Berlin).*
