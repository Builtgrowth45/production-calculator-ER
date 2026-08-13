#!/usr/bin/env python3
"""Update data/game_data.json _client_re with exhaustive RE findings (2026-08-07)."""
import json

P = 'data/game_data.json'
data = json.load(open(P))
re_ = data['_client_re']

# ---- 1. Engine: correct updater claim ----
re_['engine']['updater'] = ('Velopack 1.2.0 (Update.exe) + Rust stub launcher - '
                            'generic package plumbing, no ER feed embedded')

# ---- 2. Binaries: correct roles/sizes; add launcher stack files ----
for b in re_['binaries']:
    if b['name'] == 'Object.lto':
        b['size'] = '1.52 MB'
        b['role'] = ('Game objects - item stats, weapon data, NPC definitions '
                     '(PE32 DLL disguised by .lto ext; exports ObjectDLLSetup + SetMasterDatabase)')
    elif b['name'] == 'ClientFx.fxd':
        b['size'] = '290 KB'
        b['role'] = ('ClientFX factory/player DLL (PE32 disguised by .fxd ext; '
                     '9 fx*/database exports, imports OpenAL)')
    elif b['name'] == 'd3d9.dll':
        b['size'] = '730 KB'
        b['role'] = ("Devs' proxy DLL - forwards full d3d9 API to System32, adds Opus VOIP "
                     "(masterserver.empire-rising.com:27888), Dear ImGui overlay, console/chat "
                     "hooks; patches CShell.dll integrity check in memory")
    elif b['name'] == 'CRes.dll':
        b['role'] = ('English Win32 resources/localization (item records: base cost float @+0x24, '
                     'production flag @+0x43, 5 recipe slots - no duration field)')

# ---- 3. Network: correct endpoints (was WRONG: 6112 / masterserver as master) ----
re_['network']['master_server'] = ('fom1.fomportal.com - game master/login (remote port NOT '
                                   'recovered statically; 59851 in fom.log is a LOCAL bind port)')
re_['network']['original_master'] = ('legacy faceofmankind.com URLs - dead/unreferenced resource text '
                                     '(account/support/www)')
re_['network']['encryption'] = ('RakNet RSA-512 public key (fom_public.key, 68 B: LE exponent 65537 + '
                                '64-B modulus) - key exchange, NOT launcher integrity. No TLS/crypto '
                                'imports in core binaries.')
re_['network']['protocol'] = ('RakNet v3/v4 framing - 4B bit_length + 4B sequence + 1B msg_id + payload; '
                              'raw sockets, no TLS layer proven')
re_['network']['voip'] = 'masterserver.empire-rising.com:27888/UDP - Opus audio, faction-channel sync'

# ---- 4. Console commands: add GM/admin surface + handler addrs ----
for c in re_['console_commands']:
    if c['cmd'] == 'productionprices':
        c['desc'] = ('Writes ProductionPrices.txt (handler 0x1013e939; client-side price getter '
                     '0x1013ddc0 = sum(material cost x qty, 5 slots) + fees + tax)')
re_['console_commands'].extend([
    {'cmd': 'spawn', 'desc': 'GM/admin request builder (client-side; server authorizes)'},
    {'cmd': 'payment', 'desc': 'GM/admin payment request builder'},
    {'cmd': 'teleport', 'desc': 'GM/admin teleport request builder'},
    {'cmd': 'shutdown', 'desc': 'GM/admin server shutdown request builder'},
    {'cmd': 'globalnotice', 'desc': 'GM/admin global notice request builder'},
    {'cmd': 'worldnotice', 'desc': 'GM/admin world notice request builder'},
])

# ---- 5. Data structures: add item record + shared memory ----
re_['data_structures']['CRes_Item_Record'] = ('base cost float @+0x24 | production flag @+0x43 | '
                                              '5 recipe slots - NO duration field (durations server-side)')
re_['data_structures']['Shared_Memory_Blob'] = ('"WhatAreULookingAt?" 470,692 B pagefile-backed RW, '
                                                'default DACL; player name @ +45140 (d3d9 reads it for VOIP)')

# ---- 6. Extraction stats: add exhaustive audit numbers ----
stats = re_['extraction_stats']
stats['worlds_mapped'] = 48
stats.update({
    'files_audited': 11824,
    'bytes_audited': 3113471464,
    'unique_sha256': 10217,
    'pe_modules': 21,
    'world_objects': 107765,
    'world_properties': 2268172,
    'dtx_textures': 8325,
    'ltb_models': 483,
    'wav_audio': 935,
    'sgt_directmusic': 125,
    'dtf_fonts': 31,
    'clientfx_groups': 110,
    'clientfx_effects': 339,
})

# ---- 7. NEW sections ----
re_['launcher_stack'] = {
    'summary': ('Empire_Rising_Launcher.exe (547,328 B Rust/Velopack stub) starts Update.exe via '
                'CreateProcessW; Update.exe (4,021,760 B Velopack 1.2.0) applies/starts/uninstalls '
                'local packages. Neither embeds or references fom_client.exe, settings.json, an ER '
                'hostname or an ER update feed. Owner/consumer of settings.json unresolved.'),
    'files': [
        {'name': 'Empire_Rising_Launcher.exe', 'size': '547,328 B',
         'role': 'Rust/Velopack stub - starts Update.exe (CreateProcessW); pipes/mutex are Rust std plumbing, not IPC/single-instance'},
        {'name': 'Update.exe', 'size': '4,021,760 B',
         'role': 'Velopack 1.2.0 local package apply/start/uninstall; app exe comes from package metadata'},
    ],
}

re_['integrity_check'] = {
    'location': 'Resources/CShell.dll (NOT the launcher - launchers have zero check code)',
    'mechanism': ('Name-only DENYLIST: _findfirst64i32("*.*") -> _strlwr -> strstr vs two '
                  'runtime-decoded substrings "d3d" and "cheat". NO hashing/size/content checks.'),
    'verifier': '0x101f50b0 (init call 0x1013ee86); per-file checker 0x101f5040; decoder 0x101d04e0',
    'bypass': 'Shipped d3d9.dll VirtualProtect-writes the integrity branch at CShell +0x13ee88 at runtime',
    'implication': ('Modified existing files pass; NEW files (e.g. winmm.dll proxy) fail. '
                    'Borderless exe-patch is launcher-safe.'),
}

re_['production'] = {
    'durations': ('SERVER-AUTHORITATIVE - NOT in client. CShell.dll has only dead debug strings '
                  '(end_cycle_time/max_cycle_time, 0 refs incl. .reloc scan); CRes.dll item records '
                  'have no duration field; server.dll is pure LithTech engine; FoM lineage decomp '
                  'confirms production packets carry {id, qty, status} only.'),
    'prices': ('CLIENT-SIDE. Console command `productionprices` (handler 0x1013e939) writes '
               'ProductionPrices.txt; price getter 0x1013ddc0 computes sum(material cost x qty, '
               '5 slots) + fees + tax - matches costs/calc.txt formula.'),
    'price_getter': '0x1013ddc0',
    'dump_handler': '0x1013e939',
}

re_['server_authoritative'] = [
    ['Production cycle durations', 'server (absent in client)'],
    ['Account/login', 'server-mediated; invalid-password statuses client-side'],
    ['World selection/session', 'server sends/accepts world IDs'],
    ['World state/gameplay', 'packet-driven, server-mediated'],
    ['Production prices/recipes', 'CLIENT-side (computed locally)'],
    ['VOIP channels', 'VOIP server remote; client requests channel changes; server validation unknown'],
    ['Folder integrity', 'entirely client-side, name-only, locally patchable'],
]

re_['security'] = {
    'tls': 'None in core game binaries (no TLS/Schannel/WinHTTP/crypto imports) - transport confidentiality unproven',
    'telemetry': 'No product telemetry uploader or hard-coded secrets found',
    'shared_memory': ('WhatAreULookingAt? (470,692 B) - predictable name, default DACL, no local auth; '
                      'same-session processes may read/modify'),
    'rsa_key': ('fom_public.key = RakNet RSA public key (68 B: LE exponent 65537 + 64-B modulus), '
                'handshake role - NOT launcher integrity'),
}

re_['corrections'] = [
    ('Launcher stack: prior ER-launcher-re/FINDINGS.md claims (single-instance mutex, launcher<->game '
     'named-pipe IPC, settings.json parsing, direct game launch) are SUPERSEDED - pipes/mutex are Rust '
     'std plumbing; neither supplied exe references the game, settings.json, an ER host or update feed.'),
    ('Master server: masterserver.empire-rising.com:6112 was WRONG - that host is the VOIP server on '
     ':27888/UDP; game master is fom1.fomportal.com (port unrecovered). 59851 in fom.log is a local bind port.'),
    ('World count: exactly 48 DATs (26 root/main + 22 apartment/HQ/prison) - not 27 main maps / 50 total.'),
    ('PE modules: 21 total - Object.lto (1.52 MB) and ClientFx.fxd (290 KB) are PE32 DLLs disguised by '
     'extension; l3codeca.acm is an MPEG Layer-3 ACM driver.'),
    ('d3d9.dll is the DEVS\' proxy: full d3d9 export forwarding + Opus VOIP + ImGui overlay + '
     'console/chat hooks + in-memory integrity patch.'),
    ('fom_public.key is a RakNet RSA handshake key, not a launcher integrity key.'),
]

re_['frontier'] = [
    'settings.json owner/consumer unresolved',
    'Game master service remote port unrecovered',
    'Credential transform (static CSHA1 present, role unclear)',
    'Full skeletal/animation/LOD/material compiled-LTB decoding',
    'Full DAT geometry/light-grid/BSP reconstruction',
    'DTF/texture-script and SGT event-track semantics',
    'Live packet capture for dynamic protocol fields',
]

json.dump(data, open(P, 'w'), indent=1)
print('game_data.json _client_re updated OK')
