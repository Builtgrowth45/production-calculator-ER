/**
 * src/views/comms.js — In-universe radio player + terminal audio
 */
'use strict';


  // ═══════════════════════════════════════════════════════════════════════════
  // § COMMS TAB — in-universe radio player
  // ═══════════════════════════════════════════════════════════════════════════

  let commsClips = [], commsPlaying = false, commsShuffle = true, commsCheckTimer = null;

  function stopComms() {
    stopAudio();
    commsPlaying = false;
    if (commsCheckTimer) { clearInterval(commsCheckTimer); commsCheckTimer = null; }
    var btn = document.getElementById('comms-play');
    if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
    document.querySelectorAll('.comms-clip').forEach(function(el) { el.classList.remove('playing'); });
  }

  function initComms() {
    if (document.getElementById('comms-list').children.length) return;
    
    // Load full clip list from manifest
    fetch('comms/manifest.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        commsClips = data;
        renderCommsList();
      })
      .catch(function() {
        // Fallback: minimal set
        commsClips = [
          {file:'CMGBuilding.ogg',cat:'faction',label:'CMG: Building the Future'},
          {file:'CMGDelivers.ogg',cat:'faction',label:'CMG Delivers'},
          {file:'f_DropYourWeapons1.ogg',cat:'speech',label:'NPC: Drop Your Weapons'},
        ];
        renderCommsList();
      });
  }

  function renderCommsList() {
    var filter = document.getElementById('comms-filter')?.value || 'all';
    var list = document.getElementById('comms-list');
    if (!list) return;
    var filtered = commsClips.filter(function(c) { return filter === 'all' || c.cat === filter; });
    list.innerHTML = filtered.map(function(c) {
      return '<div class="comms-clip" data-comms-file="' + c.file + '" data-comms-label="' + c.label + '">' + c.label + '</div>';
    }).join('');
    
    list.querySelectorAll('.comms-clip').forEach(function(el) {
      el.addEventListener('click', function() {
        playCommsClip(el.dataset.commsFile, el.dataset.commsLabel);
      });
    });
  }

  function playCommsClip(file, label) {
    stopAudio();
    playAudio('comms/' + file, 0.6);
    document.getElementById('comms-track').textContent = label || file;
    document.getElementById('comms-play').textContent = '⏸';
    document.getElementById('comms-play').classList.add('playing');
    document.querySelectorAll('.comms-clip').forEach(function(el) { el.classList.remove('playing'); });
    var active = document.querySelector('[data-comms-file="' + file + '"]');
    if (active) active.classList.add('playing');
    commsPlaying = true;
    // Clear any existing timer
    if (commsCheckTimer) { clearInterval(commsCheckTimer); }
    // Auto-advance when done
    commsCheckTimer = setInterval(function() {
      if (!_globalAudio || _globalAudio.paused || _globalAudio.ended) {
        clearInterval(commsCheckTimer);
        commsCheckTimer = null;
        commsPlaying = false;
        document.getElementById('comms-play').textContent = '▶';
        document.getElementById('comms-play').classList.remove('playing');
        if (commsShuffle) playRandomComms();
      }
    }, 500);
  }

  function playRandomComms() {
    var filter = document.getElementById('comms-filter')?.value || 'all';
    var pool = commsClips.filter(function(c) { return filter === 'all' || c.cat === filter; });
    if (!pool.length) return;
    var clip = pool[Math.floor(Math.random() * pool.length)];
    playCommsClip(clip.file, clip.label);
  }

  document.getElementById('comms-play')?.addEventListener('click', function() {
    if (commsPlaying) {
      stopAudio();
      if (commsCheckTimer) { clearInterval(commsCheckTimer); commsCheckTimer = null; }
      commsPlaying = false;
      this.textContent = '▶';
      this.classList.remove('playing');
    } else {
      playRandomComms();
    }
  });

  document.getElementById('comms-next')?.addEventListener('click', playRandomComms);
  document.getElementById('comms-shuffle')?.addEventListener('click', function() {
    commsShuffle = !commsShuffle;
    this.style.opacity = commsShuffle ? '1' : '0.4';
  });
  document.getElementById('comms-filter')?.addEventListener('change', function() {
    renderCommsList();
    if (commsShuffle && commsPlaying) playRandomComms();
  });
