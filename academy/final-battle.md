# ⚔️ Final Battle 101 — How Colony Takeovers Worked in Classic FoM

*Plain-English guide to the legacy Face of Mankind world-takeover ("Final Battle") system — the one Empire Rising is rebuilding. Sources: the original Patch 1.5.9.0 dev post (Oblivious, 15 May 2012), the FoM patch-note archive (1.5.6.4 → 1.6.0.8), the ER Summer Q&A 2026, and the ER team's patch-note compilation thread. Written 2026-08-10.*

---

## The 10-second version

A faction wants a colony. They:

1. **Pay to declare** an occupation goal on it (like filing a formal claim).
2. **Hack the colony's stuff** (energy nodes, power plants, colony control) to build up **Military Activity** — a war meter.
3. At 50% / 75% / 100% on that meter, a **timed battle** starts. Three battles total. Each one is a capture-the-object fight.
4. Win all three → **the colony is yours.** Lose any battle → **you lose half your progress** and start over.

Meanwhile, **Economic Activity** (mining, producing, trading on the world) quietly decides how the colony's **money (royalties)** gets split. War and economy are two sides of the same coin.

---

## Stage 1 — Declaring war (the occupation goal)

**Who:** Faction leadership (R7 or whoever your faction settings allow).

**Cost:**
- **100,000 UC** base, **+ 25,000 UC** for every takeover goal placed on that world in the last 48 hours.
- Deleting a goal later costs a fee equal to your current Military Activity % of 100,000 UC (at 80% MA → 80k UC). Abandoning a war you're winning is expensive.

**Rules:**
- You can't claim a world your faction **already owns**.
- **No duplicates** — one goal per faction per world.
- **12 hours** between placing goals on the same world (later raised to an 18h gap between takeovers).
- While a goal is live, you **can't transfer/sell the colony**.

**What happens next:** your faction instantly starts at **25% Military Activity** (25% = 28,800 points). The war meter starts ticking.

---

## Stage 2 — Building Military Activity (the hack war)

Every colony has **three kinds of battle objects**:

- **Energy Nodes** (several)
- **Power Plants** (a couple)
- **Colony Control** (one — the big prize)

Every minute, every object you *don't* own quietly drains your war meter. **Hacking** an object flips it to *feed* your meter. One hack lasts **30 minutes**, then you can re-hack instantly.

| Object | Meter loss/min (unhacked) | Meter gain/min (hacked) |
|---|---|---|
| Energy Nodes | −13.2 | **+40** |
| Power Plants | −33.2 | **+100** |
| Colony Control | −66.6 | **+200** |

**Population matters too.** The meter ticks faster or slower depending on how many attackers vs defenders are on the world:

| Situation | Gain | Loss |
|---|---|---|
| You're massively outnumbered (3x fewer) | 1.0x | **1.5x** |
| You're outnumbered (2x fewer) | 1.0x | **1.25x** |
| Even fight | 1.0x | 1.0x |
| You outnumber 2x | **1.25x** | 1.0x |
| You outnumber 3x | **1.5x** | 1.0x |

**In plain terms:** don't start a hack war with a dead server behind you — you'll bleed meter 50% faster while gaining nothing extra.

**LED & FDC (the cops) play by special rules:** they start at half the normal meter, their meters count as **one combined** defense bloc, and they don't need a goal to build meter. They're the home-team defenders.

---

## Stage 3 — The three battles (the actual Final Battles)

Cross a threshold → a **battle** triggers. Each battle is: **hold the objects longer than the enemy for a set window.** The points race decides the winner — a 99% lead can flip to a loss in minutes if your grip slips.

**The big catch:** lose a battle and **you lose 50% of your current war meter.** That's the entire gamble of the system.

| Battle | Trigger | Fight over | Win reward | Lose penalty | Length |
|---|---|---|---|---|---|
| **1** | 50% meter | Energy Nodes | **All turrets on the world turn off** | Meter halved AND **your goal is destroyed** — pay 250,000 UC to re-file | 60 min |
| **2** | 75% meter | Power Plants | **All barriers on the world turn off** | Meter drops to 25% — rebuild and redo Battle 1 | 45 min |
| **3** | 100% meter | Colony Control | **Colony ownership transfers to you instantly** (meter wipes) | Meter drops to 50% — Battle 1 immediately restarts | 30 min |

**Small mercy — the 10% tolerance:** win a battle at 50% and your meter can dip a bit without re-fighting it. Only if it swings 10% past the threshold does the battle repeat. Fall too far and the reward gets **revoked** (turrets back on, barriers back up, money back to the old owner).

**After you win a battle, the objects change hands for real:**
- Win Battle 1 → those energy nodes now *pay you* +40/min instead of draining you (until defenders hack them back).
- If two attackers are both in the fight, the objects go "unowned" — everyone bleeds on them, and whoever hacks one first makes it pay *them*.

**No cops in the arena:** murder cards and penalty points are **suspended during battles** — everyone fights free.

---

## The money game — Economic Activity & royalties

This is the part most people never noticed. **War doesn't just win the colony; economy runs the colony.**

- **50% of world royalties always go to the current owner.**
- The other **50% is split by Economic Activity** (mining, producing, trading done on the world).
- The owner's 50% is cut into **three chunks of ~16.6%** — and **each battle phase you win moves one chunk from the owner to the attacker(s).**

Example: one attacker at 55% meter → attacker gets 16.6%, owner drops to 33.2%. Two attackers at 55% each → 8.3% apiece, owner 33.2%.

**So even if the defense holds the colony, the attackers have been siphoning its income the whole war.** That's why factions with good economies are dangerous even when they lose fights.

**The Siphon goal (GoM & BoS only):** a *peaceful* version of the takeover — no battles, meter caps low, but you still grab a slice of the colony's income and unlock perks:
- GoM: 50% → all world taxes set to Ally; 75% → Dominion Sales Tax halved
- BoS: 50% → illegal items transferable off-world; 75% → penalty points disabled on the world

**Mercenaries for hire:** R7s can post a **World Takeover Contract** — hire a mercenary department to fight for you, paid from faction funds when the goal resolves (win or lose).

---

## Other costs that shaped wars

- **Ally fee:** each faction you're allied with costs you **15% of your last day's income** — that's the price of a mutual-defense pact.
- **Allies fight at half strength:** an allied faction's members count as half a member and their hacks give half value (but count fully during battles).
- **Outside battle phases**, hacked objects stay hacked for **40 minutes**.

---

## Timeline & sourcing notes

- This is the **1.5.9.0 system (May 2012)** — the final, fully-documented form of classic FoM's takeover, and exactly what the ER team says they're restoring to the 1.5.9.9 core ("3 stages: Eco/Mil Activity → Attack → Defend").
- The **pre-2012 original** worked on the same skeleton (hours of hacking + combat building toward a big final battle) but with fewer documented numbers.
- **FotD (2013) threw this system away** for EVE-style territory capture — so "legacy FoM, before FotD" is the correct frame for this guide.
- Battle lengths were later trimmed (1.5.9.2): 45 / 30 / 20 min instead of the 60 / 45 / 30 shown above.

---

## What it means for Empire Rising (and CMG)

- ER confirmed Military & Economic activity are **not in the game yet** — the Final Battle reimplementation is the dev team's current focus, expected **months away** (possibly after Christmas 2026), with a **dev-server test event** first.
- The current 9-node hack system (1 powernode + 2 powerplants + 6 hackable nodes; hold 6+ for 2h; 48h cooldown) is **explicitly temporary** until the real system lands.
- The next wipe is tied to the Final Battle patch.

**CMG takeaways to plan around:**
1. **Wars are expensive** — goals, fees, ally costs. Faction treasury is war readiness.
2. **Pop numbers win hack wars** — bring bodies, or don't start.
3. **Three battles, three chances to lose everything** — defense only has to win one battle to gut your campaign.
4. **Economy is the quiet weapon** — even a losing war can drain the enemy colony's income. Economic Activity is coming back with this patch; miners and producers will matter in wars again.
5. **Battles are scheduled, not instant** — the timers mean attackers can't ninja-flip a colony in 5 minutes like today's node system. Expect prep windows, not zergs at 4am.
