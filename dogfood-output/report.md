# Big Mick's Adversarial UX Review of the Empire Rising Production Calculator

**Run:** 2026-08-17T19:45:58Z
**Target:** http://192.168.1.124:4173/#calc
**Target type:** LAN-served production preview, not a development source view
**Persona:** **"Big Mick" McAllister**, 58, paper-notebook player, WhatsApp-level technology comfort, hates jargon and tiny controls. His one job is to plan a production run that mines/refines at DeMorgan's Castle and manufactures at Paris without losing track of cargo.

## Test scope

- First-run onboarding and profile creation
- Search and manual selection of `Pythica Durable Battle Shoulder Pads`
- Quantity, production-colony, and refinement-colony setup
- DMC-to-Paris itinerary comprehension
- Colony movement grouping and refinement cards
- Invalid quantity recovery (`0`)
- Browser console checks after navigation and significant interactions

## Console status

No JavaScript errors were reported by `browser_console` during navigation, player creation, sample-plan loading, item search, item selection, calculation, or invalid-quantity testing.

## Big Mick's review

### Overall

**Maybe, with conditions.** The calculator clearly knows the game and eventually gives me the route I need. But it makes me do too much translating: first I have to understand why it wants a player and faction, then I have to work out whether Paris or DMC is the actual destination, and when I type something wrong it leaves an old answer on screen as if nothing happened.

### The good (grudging admission)

- It works without an account, password, or online login.
- Searching the catalog is better than scrolling through hundreds of items.
- The DMC-to-Paris plan is materially useful: it groups colony work, shows one cargo movement step per colony, and keeps the full refinement cards in the DMC visit.
- The Pythica plan makes the important routes visible, including refined titanium syntactic foam and textiles moving onward to Paris.
- The refinement cards show batch quantities and progress controls instead of making me do all the arithmetic on paper.

### The bad (legitimate UX issues)

- "Plan your first production run" says to choose an item and quantity, but the first screen asks for a player name and faction before showing the calculator. I do not know why I am creating a player or whether faction choice will lock recipes.
- Entering quantity `0` and pressing Calculate gives no validation message. The previous valid `1 × Pythica Durable Battle Shoulder Pads` plan remains visible, so I could mistake an old answer for the answer to my new request.
- The result says "This plan produces 1." without naming the item or saying whether that means one item, one batch, or one production run.
- "6 production steps" does not obviously match the three instructions below it (obtain, refine, manufacture). I cannot tell what is included in that count.
- The top summary repeats the item, quantity, Paris, and DMC information that appears again in Plan at a glance.
- The headline relationship between Paris and DMC is not literal enough. I need to see "Refine these items at DMC, then move them to Paris for manufacture," not infer it from arrows and repeated colony names.
- The important explanations and disclosure controls are small and muted. The numbers are visible, but the meaning of "estimated investment," "UC/unit," owner return, and material units is hidden behind collapsed areas or lower on the page.

### The ugly (showstoppers)

- **Stale results after invalid input:** If I make a mistake, the app does not tell me. It leaves a valid-looking old plan on screen. That is the one thing that could make me transport the wrong materials or manufacture the wrong quantity.

### Specific complaints

1. **First-run onboarding:** "You say choose what I want to make, then ask me for a faction before I can even see the calculator. Tell me plainly that the name is just a local profile and faction only changes economics."
2. **Quantity validation:** "I typed zero and hit Calculate. The old answer is still sitting there. Is this thing calculating or not?"
3. **Result summary:** "It says the plan produces 1. One what? One shoulder pad? One batch? If I have to guess, I'm back to the notebook."
4. **Colony routing:** "Paris and DMC are both on the page, but I want one blunt sentence telling me where I refine, what I move, and where I finish."
5. **Terminology:** "UC/unit and material units are numbers for somebody who already knows the system. Give me the plain-English version next to the number."

**Verdict:** "The calculator has the right answer in it, but it makes me decode too much—and when I make a bad entry it shows me yesterday's answer instead of telling me I messed up."

## Pragmatism filter

| Finding | Class | Why |
|---|---|---|
| Invalid quantity leaves the prior valid plan visible with no error | **RED — real UX bug** | Any busy user can enter an invalid quantity; stale output is objectively misleading and can cause an incorrect production run. |
| First-run copy promises item selection but begins with profile/faction setup | **RED — real UX bug** | A competent first-time user will question the sequence and the consequences of faction selection. |
| DMC/Paris relationship is not stated as a plain-language route | **YELLOW — valid, lower priority** | The itinerary contains the data, but the user must interpret it. It is especially costly for multi-colony plans. |
| "This plan produces 1." is incomplete | **RED — real UX bug** | The output sentence is objectively incomplete and does not identify the unit. |
| "6 production steps" versus three high-level next actions | **YELLOW — valid, lower priority** | The metric may be internally correct, but its definition is unclear. |
| Repeated item/destination summary | **YELLOW — valid, lower priority** | It adds scan noise but does not prevent task completion. |
| Small muted disclosures and hidden economic definitions | **YELLOW — accessibility/readability issue** | Important interpretation is harder to find; not a showstopper for every user. |
| Wanting a paper-style printed checklist | **WHITE — persona noise** | The app already provides a local checklist and copy-shopping-list action; paper preference alone is not a defect. |
| A clearer route timeline with explicit "refine here / move / manufacture there" | **GREEN — feature opportunity** | A small presentation improvement would make the existing dependency-aware plan much easier to follow. |

## Candidate tickets (not created)

No external tickets were created during this audit. The request was to run the UX test and report findings; these are the actionable candidates if you want them turned into issues:

1. **[ux-review] Block stale production results when quantity is invalid**
   - Quote: "I typed zero and hit Calculate. The old answer is still sitting there."
   - Fix: validate quantity before calculation, show an inline error, and clear or mark the previous result as stale instead of leaving it presented as current.

2. **[ux-review] Make first-run onboarding explain profile and faction setup**
   - Quote: "Tell me plainly that the name is just a local profile and faction only changes economics."
   - Fix: revise the first-run copy and primary action so the user understands the local-only profile and non-locking faction choice before continuing.

3. **[ux-review] Replace incomplete production summary wording**
   - Quote: "One what? One shoulder pad? One batch?"
   - Fix: render a complete sentence such as `This plan produces 1 Pythica Durable Battle Shoulder Pad.` and define whether batch counts are separate.

4. **[ux-review] Add an explicit refine-to-manufacture route sentence**
   - Quote: "Tell me where I refine, what I move, and where I finish."
   - Fix: add a concise route line such as `Refine at DeMorgan's Castle → move intermediates → manufacture at Paris.`

## Evidence

- First-run screen and onboarding mismatch: `MEDIA:/home/hermes/.hermes/browser_screenshots/browser_screenshot_9655f843.png`
- DMC-to-Paris result and summary/readability issues: `MEDIA:/home/hermes/.hermes/browser_screenshots/browser_screenshot_bd2d8d01.png`
- Invalid quantity `0` leaves the old valid plan visible: `MEDIA:/home/hermes/.hermes/browser_screenshots/browser_screenshot_64523ce2.png`
- Earlier DMC-to-Paris Emergency Medikit view: `MEDIA:/home/hermes/.hermes/browser_screenshots/browser_screenshot_702eed1d.png`
