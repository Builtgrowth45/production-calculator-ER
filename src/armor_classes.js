/**
 * src/armor_classes.js - armour weight class per family.
 * Mirrors data/armor_classes.json (the app has no bundler, so data ships as a
 * global). Edit BOTH files, or regenerate this one from the JSON.
 */
'use strict';
window.ARMOR_CLASSES = {
  "_note": "Armour weight class per family. Matched against an item name by LONGEST prefix, so 'Pythica S1' cannot swallow 'Pythica S2'. Faction is carried for cross-checking only — game_data's own _faction is authoritative and agrees with every entry here.",
  "_source": "Faction light/heavy tables supplied 2026-08-04. Validated against game_data: 228 of 255 armour pieces classified, zero faction disagreements, and within every faction+slot each Heavy out-armours each Light.",
  "_gloves_note": "Gloves carry identical stats whatever the class — every EC glove is armor 30 / shielding 30 / resistance 50 whether it is a light Dilatant or a heavy Aramid. For that slot the whole faction is interchangeable and the weight filter is advisory.",
  "not_in_game": {
    "_why": "Present in the client data but not live. Hidden from the gear picker entirely — offering something nobody can obtain is worse than a gap.",
    "prefixes": ["XenoTech Expeditionary"]
  },
  "no_class": {
    "_why": "Gloves that belong to no light/heavy family. Not a data gap — the classes do not apply to them, so they show a dash rather than 'unclassified'.",
    "prefixes": ["Infostyle Gloves", "Envirotech Gloves", "Infusion Gloves"]
  },
  "families": [
    { "prefix": "Locans Patrol",              "faction": "LED",       "weight": "Light" },
    { "prefix": "Locans Ethereal",            "faction": "LED",       "weight": "Light" },
    { "prefix": "Locans Pressured",           "faction": "LED",       "weight": "Light" },
    { "prefix": "Locans Defense",             "faction": "LED",       "weight": "Heavy" },
    { "prefix": "Locans Stabilized",          "faction": "LED",       "weight": "Heavy" },

    { "prefix": "Pythica Special Operations", "faction": "FDC",       "weight": "Light" },
    { "prefix": "Pythica Mobile Infantry",    "faction": "FDC",       "weight": "Light" },
    { "prefix": "Pythica S1",                 "faction": "FDC",       "weight": "Light" },
    { "prefix": "Pythica S2",                 "faction": "FDC",       "weight": "Light" },
    { "prefix": "Pythica Sustained Battle",   "faction": "FDC",       "weight": "Heavy" },
    { "prefix": "Pythica Durable Battle",     "faction": "FDC",       "weight": "Heavy" },

    { "prefix": "NanoTech Trauma",            "faction": "GOM",       "weight": "Light" },
    { "prefix": "NanoTech Scout",             "faction": "GOM",       "weight": "Light" },
    { "prefix": "NanoTech Vitality",          "faction": "GOM",       "weight": "Light" },
    { "prefix": "NanoTech Cognizant",         "faction": "GOM",       "weight": "Heavy" },
    { "prefix": "NanoTech Assault",           "faction": "GOM",       "weight": "Heavy" },
    { "prefix": "NanoTech Voltaic",           "faction": "GOM",       "weight": "Heavy" },

    { "prefix": "Venom",                      "faction": "BOS",       "weight": "Light" },
    { "prefix": "Detox",                      "faction": "BOS",       "weight": "Heavy" },
    { "prefix": "Leech",                      "faction": "BOS",       "weight": "Heavy" },

    { "prefix": "Delta Powered",              "faction": "MOTB",      "weight": "Light" },
    { "prefix": "Havoc Powered",              "faction": "MOTB",      "weight": "Light" },
    { "prefix": "Legionnaire Powered",        "faction": "MOTB",      "weight": "Heavy" },
    { "prefix": "Firstborn Powered",          "faction": "MOTB",      "weight": "Heavy" },
    { "prefix": "Justicar Powered",           "faction": "MOTB",      "weight": "Heavy" },

    { "prefix": "PreMet Buffer",              "faction": "CMG",       "weight": "Light" },
    { "prefix": "PreMet Contact",             "faction": "CMG",       "weight": "Light" },
    { "prefix": "PreMet Tremor",              "faction": "CMG",       "weight": "Light" },
    { "prefix": "PreMet Helmet",              "faction": "CMG",       "weight": "Light",
      "_note": "PreMet Tremor Helmet under a truncated name. It carries no stats in game_data, so the table is the only thing that classifies it — the price dump lists it as 'PreMet Tremor Helmet'." },
    { "prefix": "PreMet Impact",              "faction": "CMG",       "weight": "Heavy" },
    { "prefix": "PreMet Collision",           "faction": "CMG",       "weight": "Heavy" },

    { "prefix": "Dilatant 46b",               "faction": "EC",        "weight": "Light" },
    { "prefix": "Dilatant 50b",               "faction": "EC",        "weight": "Light" },
    { "prefix": "Aramid Basic",               "faction": "EC",        "weight": "Heavy" },
    { "prefix": "Aramid Altered",             "faction": "EC",        "weight": "Heavy" },
    { "prefix": "Aramid Modified",            "faction": "EC",        "weight": "Heavy" },
    { "prefix": "Aramid Tremor",              "faction": "EC",        "weight": "Heavy",
      "_note": "Aramid Altered Leg Pads under another name. Also statless in game_data; the price dump calls it 'Aramid Altered Leg Pads'." },

    { "prefix": "Infensus Shock",             "faction": "VI",        "weight": "Light" },
    { "prefix": "Infensus X1 Assault",        "faction": "VI",        "weight": "Light" },
    { "prefix": "Infensus X2 Assault",        "faction": "VI",        "weight": "Light" },
    { "prefix": "Infensus Essentials",        "faction": "VI",        "weight": "Light" },
    { "prefix": "Infensus Minimalist",        "faction": "VI",        "weight": "Light" },
    { "prefix": "Infensus Heavy",             "faction": "VI",        "weight": "Heavy" },

    { "prefix": "Metabolic",                  "faction": "UNIVERSAL", "weight": "Light" },
    { "prefix": "Hypobaric",                  "faction": "UNIVERSAL", "weight": "Light" },
    { "prefix": "Advanced Civilian",          "faction": "UNIVERSAL", "weight": "Heavy" },
    { "prefix": "MT-27",                      "faction": "UNIVERSAL", "weight": "Heavy" },
    { "prefix": "Tactical Systems",           "faction": "UNIVERSAL", "weight": "Heavy" }
  ]
}
;
