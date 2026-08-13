# Factions and economics

The public calculator separates three concepts that are easy to conflate:

1. **Player spend** — what the selected recipe, materials, destination, tax, and transport require the player to acquire or pay.
2. **Faction return** — a configured return policy for an explicitly selected faction and explicitly owned colony.
3. **Net faction cost** — gross player spend after the applicable faction return. This is a planning metric for the faction, not a personal discount unless the player and faction have separately agreed to that interpretation.

## Faction selection

A player profile may select any faction in the public registry or `Unaffiliated`. Faction selection:

- changes the economic context used for return/net-cost calculations;
- does not restrict the recipes, items, destinations, or reference material visible to the player;
- is stored in the versioned player profile and included in player/workspace exports;
- may be changed later without changing inventory quantities.

New and migrated profiles default to `Unaffiliated`. The calculator does not invent a faction identity, colony holding, rebate, or tax policy.

## Gross and net calculations

For a recipe path, the calculator first computes the gross plan from the recipe quantities, owned inventory, material sources, destination, tax, slot settings, drift, and transport assumptions. Gross player spend is invariant across factions when those inputs are identical.

A faction return is applied only when all of the following are true:

- the player has selected a faction with a valid policy;
- the relevant colony ownership is explicitly set to that faction in the local world snapshot;
- the policy is within the safe 0–100% range.

Missing, malformed, or out-of-range policy data fails closed to no return. A faction cannot receive a return merely because it is selected in a profile.

## Colony ownership and taxes

Colony ownership and tax settings are local user-maintained world context. Each colony can be:

- owned by a selectable faction;
- explicitly `Unknown / Owner not set`;
- assigned a tax value within the validated range.

Owner changes do not silently change tax values. The app labels this state as local and does not present it as live synchronized game truth. Use dated exports when sharing a world snapshot.

## Alternative paths

When a material has multiple recipe paths, the calculator preserves explicit player path choices. If cost-aware selection is enabled and the paths are priced, it compares faction net cost using the active faction and world context. Without a valid ownership/policy hook it falls back to ordinary sticker-price behavior rather than inventing a rebate.

## Unaffiliated mode

Unaffiliated mode is the honest gross-cost mode. It is useful when the player does not want to model a faction, when colony ownership is unknown, or when a return policy has not been verified. It does not assume CMG, EC, or any other organization owns a colony.

## Data and uncertainty

Faction aliases and recipe/client codes are maintained in `data/factions.json`. Unknown game mechanics are not silently generalized from one organization to every faction. If a policy, owner, tax, or alias is uncertain, leave it unset or document the source and date in the exported workspace.

To report a data or formula issue, open a public GitHub issue with a minimal reproducible recipe/path and sanitized export. Do not attach credentials, private player data, tokens, or private infrastructure details.
