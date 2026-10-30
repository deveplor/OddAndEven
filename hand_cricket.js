(function () {
      'use strict';

      // ==========================================
      // 1. SYNTHESIZED SOUND ENGINE (Web Audio API)
      // ==========================================
      const SoundFX = {
        ctx: null,
        muted: false,
        init() {
          if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
              this.ctx = new AudioCtx();
            }
          }
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        },
        playTone(freq, type, duration, gainVal = 0.12, slideTo = null) {
          if (this.muted) return;
          this.init();
          if (!this.ctx) return;
          try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);
            if (slideTo) {
              osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
            }
            gain.gain.setValueAtTime(gainVal, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
          } catch (e) {}
        },
        click() {
          this.playTone(520, 'sine', 0.07, 0.08, 660);
        },
        runScored(runs) {
          if (runs >= 6) {
            this.playTone(440, 'triangle', 0.12, 0.14, 660);
            setTimeout(() => this.playTone(660, 'triangle', 0.18, 0.14, 880), 90);
          } else {
            this.playTone(380 + runs * 30, 'sine', 0.11, 0.1, 520 + runs * 35);
          }
        },
        wicket() {
          this.playTone(300, 'sawtooth', 0.18, 0.15, 140);
          setTimeout(() => this.playTone(180, 'sawtooth', 0.28, 0.15, 85), 130);
        },
        thunderWicket() {
          if (this.muted) return;
          this.init();
          if (!this.ctx) return;
          try {
            this.playTone(950, 'sawtooth', 0.08, 0.22, 220);
            setTimeout(() => this.playTone(680, 'square', 0.1, 0.2, 140), 50);
            setTimeout(() => this.playTone(120, 'sawtooth', 0.45, 0.25, 45), 110);
          } catch(e) {}
        },
        fireballWicket() {
          if (this.muted) return;
          this.init();
          if (!this.ctx) return;
          try {
            this.playTone(420, 'sawtooth', 0.12, 0.2, 80);
            setTimeout(() => this.playTone(160, 'sawtooth', 0.35, 0.22, 50), 90);
          } catch(e) {}
        },
        goldChime() {
          if (this.muted) return;
          this.init();
          if (!this.ctx) return;
          try {
            [587.33, 739.99, 880, 1174.66].forEach((f, idx) => {
              setTimeout(() => this.playTone(f, 'sine', 0.18, 0.12), idx * 60);
            });
          } catch(e) {}
        },
        victory() {
          const notes = [523.25, 659.25, 783.99, 1046.5];
          notes.forEach((n, idx) => {
            setTimeout(() => this.playTone(n, 'triangle', 0.18, 0.14), idx * 100);
          });
        },
        defeat() {
          const notes = [392.0, 349.23, 311.13, 261.63];
          notes.forEach((n, idx) => {
            setTimeout(() => this.playTone(n, 'sawtooth', 0.2, 0.11), idx * 110);
          });
        }
      };

      // ==========================================
      // 2. GAME STATE
      // ==========================================
      // =========================================================================
      // ENCRYPTED LOCALSTORAGE AUTHENTICATION VAULT (Shared with login.html)
      // =========================================================================
      
      // =========================================================================
      // AUTHORITATIVE V2 FRESH STATS, XP, ACHIEVEMENTS & STORE RESET
      // =========================================================================
      const STATS_RESET_EPOCH = 'v2_fresh_reset_2026_10_30_r2';
      const STATS_RESET_FLAG_KEY = 'oddandeven_stats_reset_epoch_v2';

      function sanitizeRecordForFreshEpoch(rec) {
        if (!rec || typeof rec !== 'object') return rec;
        if (rec.statsEpoch === STATS_RESET_EPOCH) {
          if (typeof rec.v2Matches === 'number') {
            rec.matches = rec.v2Matches;
          }
          return rec;
        }
        const legacyCloudMatches = Math.max(Number(rec.matches) || 0, Number(rec.cloudMatchesFloor) || 0);
        return Object.assign({}, rec, {
          statsEpoch: STATS_RESET_EPOCH,
          cloudMatchesFloor: legacyCloudMatches,
          v2Matches: 0,
          elo: 1500,
          peak: 1500,
          wins: 0,
          losses: 0,
          matches: 0,
          rankedMatches: 0,
          totalRuns: 0,
          totalBalls: 0,
          highScore: 0,
          centuriesCount: 0,
          sr500Count: 0,
          wicketsTaken: 0,
          wicketsLost: 0,
          ballsBowled: 0,
          weeklyEloGain: 0,
          weeklyWins: 0,
          weeklyLosses: 0,
          weeklyMatches: 0,
          weeklyRuns: 0,
          weeklyWickets: 0,
          tournamentWins: 0,
          xp: 0,
          maxWinStreak: 0,
          currentWinStreak: 0,
          maxBoundariesInMatch: 0,
          defendedMatches: 0,
          updatedAt: Date.now()
        });
      }
      try { window.__sanitizeRecordForFreshEpoch = sanitizeRecordForFreshEpoch; } catch (e) {}

      (function executeAuthoritativeV2FreshReset() {
        try {
          if (localStorage.getItem(STATS_RESET_FLAG_KEY) !== STATS_RESET_EPOCH) {
            const prefixesToRemove = [
              'oddandeven_store_inventory_',
              'oddandeven_spent_xp_',
              'oddandeven_equipped_card_',
              'oddandeven_equipped_theme_',
              'oddandeven_equipped_vfx_',
              'oddandeven_equipped_bat_',
              'oddandeven_custom_card_',
              'oddandeven_active_days_',
              'oddandeven_tourney_wins_',
              'oddandeven_number_frequency_',
              'oddandeven_ai_tier_stats_'
            ];
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (!k) continue;
              if (prefixesToRemove.some((p) => k.startsWith(p))) {
                keysToRemove.push(k);
              }
            }
            keysToRemove.forEach((k) => localStorage.removeItem(k));
            localStorage.removeItem('hc_arena_match_scorecards_v1');
            localStorage.removeItem('hc_arena_stats_v1');
            localStorage.removeItem('oddandeven_event_regs_v1');
            localStorage.removeItem('oddandeven_event_regs_map_v1');

            ['oddandeven_worldwide_players_v1', 'oddandeven_global_leaderboard_v1'].forEach((mapKey) => {
              try {
                const raw = localStorage.getItem(mapKey);
                if (raw) {
                  const parsed = JSON.parse(raw);
                  if (parsed && typeof parsed === 'object') {
                    Object.keys(parsed).forEach((u) => {
                      parsed[u] = sanitizeRecordForFreshEpoch(parsed[u]);
                    });
                    localStorage.setItem(mapKey, JSON.stringify(parsed));
                  }
                }
              } catch (e) {}
            });

            try {
              const rawElo = localStorage.getItem('hc_arena_elo_v2');
              if (rawElo) {
                const parsedElo = JSON.parse(rawElo);
                if (parsedElo && typeof parsedElo === 'object') {
                  if (parsedElo.humanPlayers && typeof parsedElo.humanPlayers === 'object') {
                    Object.keys(parsedElo.humanPlayers).forEach((u) => {
                      parsedElo.humanPlayers[u] = sanitizeRecordForFreshEpoch(parsedElo.humanPlayers[u]);
                    });
                  }
                  parsedElo.eloRating = 1500;
                  parsedElo.peakElo = 1500;
                  parsedElo.eloHistory = [];
                  localStorage.setItem('hc_arena_elo_v2', JSON.stringify(parsedElo));
                }
              }
            } catch (e) {}

            localStorage.setItem(STATS_RESET_FLAG_KEY, STATS_RESET_EPOCH);
          }
        } catch (e) {}
      })();

      const RELEASE_CLEAN_SLATE_KEY = 'oddandeven_release_v1_clean_slate';
      const AUTH_STORAGE_KEY = 'oddandeven_encrypted_users_v1';
      const SESSION_STORAGE_KEY = 'oddandeven_active_session_v1';
      const SCORECARD_HISTORY_KEY = 'hc_arena_match_scorecards_v1';
      const SECRET_SALT = 'OddAndEven.in::HandCricketVault::2026::v1';
      const FAKE_SEED_NAMES = [
        'AARAV_99',
        'KABIR_STRIKER',
        'PRIYA_XI',
        'DEV_CAPTAIN',
        'PLAYER',
        'PLAYER_1',
        'PLAYER_2',
        'GUEST',
        'YOU',
        'FRIEND',
        'WAITING...',
        'WAITING',
        'LOGIN REQUIRED',
        'UNAUTHENTICATED',
        'HOST'
      ];

      function isSandboxedPreviewIframe() {
        try {
          const proto = window.location.protocol;
          const host = (window.location.hostname || '').toLowerCase();
          if (proto === 'about:' || proto === 'blob:' || proto === 'data:') return true;
          if (host.includes('usercontent.goog') || host.includes('googleusercontent.com')) return true;
        } catch (e) {
          return true;
        }
        return false;
      }

      function redirectToMainPage(querySuffix) {
        const target = querySuffix ? `index.html${querySuffix}` : 'index.html';
        if (!isSandboxedPreviewIframe()) {
          try {
            window.location.replace(target);
          } catch (e) {
            window.location.href = target;
          }
          return true;
        }
        return false;
      }

      // One-time Version 1 clean slate wipe so all old test leaderboard data & test login/signup accounts are removed for publishing
      try {
        if (localStorage.getItem(RELEASE_CLEAN_SLATE_KEY) !== 'v1_clean') {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem('oddandeven_worldwide_players_v1');
          localStorage.removeItem('hc_arena_elo_v2');
          localStorage.removeItem('hc_arena_stats_v1');
          localStorage.removeItem(SCORECARD_HISTORY_KEY);
          localStorage.removeItem('oddandeven_just_logged_in');
          localStorage.removeItem('oddandeven_signed_out_v1');
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.setItem(RELEASE_CLEAN_SLATE_KEY, 'v1_clean');
        }
      } catch (e) {}

      function fnv1aHash(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
          h ^= str.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16).padStart(8, '0');
      }

      function encryptPayload(plainObj) {
        const json = JSON.stringify(plainObj);
        const key = SECRET_SALT + '::' + fnv1aHash(SECRET_SALT);
        const bytes = [];
        for (let i = 0; i < json.length; i++) {
          const code = json.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 31) & 0xff);
          bytes.push(String.fromCharCode(code));
        }
        const b64 = btoa(unescape(encodeURIComponent(bytes.join(''))));
        const sig = fnv1aHash(json + '::' + SECRET_SALT);
        return `OAE1.${sig}.${b64}`;
      }

      function decryptPayload(cipherText) {
        if (!cipherText || typeof cipherText !== 'string' || !cipherText.startsWith('OAE1.')) {
          return null;
        }
        try {
          const parts = cipherText.split('.');
          if (parts.length !== 3) return null;
          const sig = parts[1];
          const b64 = parts[2];
          const raw = decodeURIComponent(escape(atob(b64)));
          const key = SECRET_SALT + '::' + fnv1aHash(SECRET_SALT);
          const chars = [];
          for (let i = 0; i < raw.length; i++) {
            const c = raw.charCodeAt(i) ^ key.charCodeAt(i % key.length) ^ ((i * 31) & 0xff);
            chars.push(String.fromCharCode(c));
          }
          const json = chars.join('');
          if (fnv1aHash(json + '::' + SECRET_SALT) !== sig) return null;
          return JSON.parse(json);
        } catch (e) {
          return null;
        }
      }

      function derivePasswordVerifier(username, countryDial, pin5) {
        const cleanUser = (username || '').trim().toUpperCase();
        const combinedKey = `${countryDial}-${pin5}`;
        const round1 = fnv1aHash(`${cleanUser}::${combinedKey}::${SECRET_SALT}`);
        const round2 = fnv1aHash(`${round1}::${combinedKey}::OddAndEven.in`);
        return encryptPayload({
          u: cleanUser,
          dial: countryDial,
          combinedHash: `${round1}${round2}`,
          masked: `${countryDial}-${pin5[0]}***${pin5[4]}`
        });
      }

      function verifyUserCredentials(userRecord, countryDial, pin5) {
        if (!userRecord || !userRecord.encryptedAuth) return false;
        const dec = decryptPayload(userRecord.encryptedAuth);
        if (!dec) return false;
        const cleanUser = (userRecord.username || '').trim().toUpperCase();
        const combinedKey = `${countryDial}-${pin5}`;
        const round1 = fnv1aHash(`${cleanUser}::${combinedKey}::${SECRET_SALT}`);
        const round2 = fnv1aHash(`${round1}::${combinedKey}::OddAndEven.in`);
        return dec.dial === countryDial && dec.combinedHash === `${round1}${round2}`;
      }

      const PURGED_ACCOUNTS_KEY = 'oddandeven_purged_accounts_v1';
      let _cachedEncryptedRaw = null;
      let _cachedEncryptedMap = {};
      let _sharedGlobalBc = null;
      let _sharedAuthBc = null;
      let _lastBroadcastSyncMs = 0;

      function getSharedGlobalBc() {
        if (!_sharedGlobalBc && typeof BroadcastChannel !== 'undefined') {
          try {
            _sharedGlobalBc = new BroadcastChannel(GLOBAL_LB_CHANNEL);
          } catch (e) {}
        }
        return _sharedGlobalBc;
      }

      function getSharedAuthBc() {
        if (!_sharedAuthBc && typeof BroadcastChannel !== 'undefined') {
          try {
            _sharedAuthBc = new BroadcastChannel('oddandeven_auth_sync');
          } catch (e) {}
        }
        return _sharedAuthBc;
      }

      function loadPurgedAccountsList() {
        try {
          const raw = localStorage.getItem(PURGED_ACCOUNTS_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function markAccountPurgedLocal(username) {
        const clean = (username || '').trim().toUpperCase();
        if (!clean) return;
        try {
          const list = loadPurgedAccountsList();
          if (!list.includes(clean)) {
            list.push(clean);
            localStorage.setItem(PURGED_ACCOUNTS_KEY, JSON.stringify(list));
          }
          if (localStorage.getItem('oddandeven_last_user_v1') === clean) {
            localStorage.removeItem('oddandeven_last_user_v1');
          }
        } catch (e) {}
      }

      function isRecentSignup(username) {
        const clean = String(username || '').trim().toUpperCase();
        if (!clean) return false;
        try {
          const ts = Number(localStorage.getItem('oddandeven_recent_signup_' + clean)) || 0;
          return ts > 0 && (Date.now() - ts) < 120000;
        } catch (e) {
          return false;
        }
      }

      function stampRecentSignup(username) {
        const clean = String(username || '').trim().toUpperCase();
        if (!clean) return;
        try {
          localStorage.setItem('oddandeven_recent_signup_' + clean, String(Date.now()));
          const rawCols = localStorage.getItem('oddandeven_cloud_synced_cols_v1');
          if (rawCols) {
            const colsMap = JSON.parse(rawCols) || {};
            if (colsMap[clean]) {
              delete colsMap[clean];
              localStorage.setItem('oddandeven_cloud_synced_cols_v1', JSON.stringify(colsMap));
            }
          }
        } catch (e) {}
      }

      function isAccountAllowedByCloud(username) {
        const clean = String(username || '').trim().toUpperCase();
        if (!clean || isPlaceholderUsername(clean)) return false;
        if (isRecentSignup(clean)) return true;
        const purged = loadPurgedAccountsList();
        if (purged.includes(clean)) return false;
        if (window.__cloudAccountsLoaded && window.__cloudAuthoritativeAccounts && !window.__cloudAuthoritativeAccounts[clean]) {
          return false;
        }
        return true;
      }

      function unmarkAccountPurgedLocal(username) {
        const clean = (username || '').trim().toUpperCase();
        if (!clean) return;
        try {
          const list = loadPurgedAccountsList();
          if (list.includes(clean)) {
            const next = list.filter((u) => u !== clean);
            localStorage.setItem(PURGED_ACCOUNTS_KEY, JSON.stringify(next));
          }
        } catch (e) {}
      }

      function loadEncryptedUsersMap() {
        try {
          const raw = localStorage.getItem(AUTH_STORAGE_KEY);
          if (!raw) {
            _cachedEncryptedRaw = null;
            _cachedEncryptedMap = {};
            return {};
          }
          if (raw === _cachedEncryptedRaw && _cachedEncryptedMap && typeof _cachedEncryptedMap === 'object') {
            return Object.assign({}, _cachedEncryptedMap);
          }
          const dec = decryptPayload(raw);
          if (dec && typeof dec === 'object') {
            _cachedEncryptedRaw = raw;
            _cachedEncryptedMap = dec;
            return Object.assign({}, dec);
          }
        } catch (e) {}
        return {};
      }

      function reconcileAllNewPlayersIntoLeaderboard() {
        if (typeof window.__reconcileAllNewPlayersIntoLeaderboard === 'function') {
          try { window.__reconcileAllNewPlayersIntoLeaderboard(); } catch (e) {}
        }
      }

      window.__loadLocalVaultForCloud = loadEncryptedUsersMap;
      function saveEncryptedUsersMap(usersMap) {
        try {
          const enc = encryptPayload(usersMap);
          _cachedEncryptedRaw = enc;
          _cachedEncryptedMap = Object.assign({}, usersMap);
          localStorage.setItem(AUTH_STORAGE_KEY, enc);
        } catch (e) {}
      }

      function loadActiveAuthSession() {
        try {
          if (localStorage.getItem(SIGNED_OUT_FLAG_KEY) === '1') {
            return null;
          }
          const rawLocal = localStorage.getItem(SESSION_STORAGE_KEY);
          const rawTab = sessionStorage.getItem(SESSION_STORAGE_KEY);
          const decLocal = rawLocal ? decryptPayload(rawLocal) : null;
          const decTab = rawTab ? decryptPayload(rawTab) : null;

          if (decLocal && decTab) {
            const localTs = decLocal.loggedInAt ? Date.parse(decLocal.loggedInAt) || 0 : 0;
            const tabTs = decTab.loggedInAt ? Date.parse(decTab.loggedInAt) || 0 : 0;
            // Always prefer localStorage if it has a newer or equal login timestamp (e.g. user just created/logged into a new account)
            if (localTs >= tabTs) {
              try { sessionStorage.setItem(SESSION_STORAGE_KEY, rawLocal); } catch (e) {}
              return decLocal;
            }
            return decTab;
          }
          if (decLocal) {
            try { sessionStorage.setItem(SESSION_STORAGE_KEY, rawLocal); } catch (e) {}
            return decLocal;
          }
          if (decTab) {
            try { localStorage.setItem(SESSION_STORAGE_KEY, rawTab); } catch (e) {}
            return decTab;
          }
          return null;
        } catch (e) {
          return null;
        }
      }

      function mergeEncryptedUsersMap(incomingUsers) {
        if (!incomingUsers || typeof incomingUsers !== 'object') return false;
        const purged = loadPurgedAccountsList();
        const localMap = loadEncryptedUsersMap();
        let added = false;
        Object.keys(incomingUsers).forEach((k) => {
          const u = incomingUsers[k];
          const clean = ((u && u.username) ? u.username : k || '').trim().toUpperCase();
          if (!clean || clean.length < 3 || FAKE_SEED_NAMES.includes(clean) || !isAccountAllowedByCloud(clean)) return;
          if (u && typeof u === 'object') {
            const normalizedUser = Object.assign({}, u, { username: clean });
            if (!localMap[clean]) {
              localMap[clean] = normalizedUser;
              added = true;
            }
            if (typeof STATE === 'object' && STATE && STATE.humanPlayers && !STATE.humanPlayers[clean]) {
              ensureHumanPlayerRecord(clean, 1500, {
                countryCode: normalizedUser.countryCode || '+91',
                countryFlag: normalizedUser.countryFlag || '🇮🇳',
                countryName: normalizedUser.countryName || 'India'
              }, true);
              added = true;
            }
          }
        });
        if (added) {
          saveEncryptedUsersMap(localMap);
          saveLocalStatsOnly();
        }
        return added;
      }

      const TURN_DURATION_SEC = 15;
      const WORLDWIDE_PLAYERS_KEY = 'oddandeven_worldwide_players_v1';
      const FRIENDS_STORAGE_KEY = 'oddandeven_friends_map_v1';
      const FRIEND_REQUESTS_KEY = 'oddandeven_friend_requests_v1';
      const SIGNED_OUT_FLAG_KEY = 'oddandeven_signed_out_v1';
      const GLOBAL_LB_CHANNEL = 'oddandeven_global_leaderboard_v1';
      const GLOBAL_HUB_IDS = [
        'oddandeven-world-hub-v1-1',
        'oddandeven-world-hub-v1-2',
        'oddandeven-world-hub-v1-3',
        'oddandeven-world-hub-v1-4'
      ];

      const STATE = {
        mode: 'AI', // 'AI' | 'ONLINE_2P'
        activeScreen: 'PITCH',
        achievementFilter: 'ALL', // 'SHOWCASE' | 'PITCH' | 'BOT_SETUP' | 'MP_SETUP' | 'LEADERBOARD' | 'EVENTS'
        eloRating: 1500,
        peakElo: 1500,
        friendEloRating: 1500,
        humanPlayers: {},
        friendsMap: {}, // { [myUsername]: ['FRIEND1', 'FRIEND2'] }
        friendRequestsMap: {}, // { [targetUser]: [{ from, fromFlag, fromCode, fromElo, timestamp }] }
        friendSearchQuery: '',
        incomingFriendInvite: null, // { fromUser, fromFlag, roomCode, timestamp }
        incomingFriendRequestPending: null, // { fromUser, fromFlag, fromCode, fromElo, timestamp }
        activeOpenRooms: {}, // { [hostUser]: { roomCode, hostUser, timestamp } }
        leaderboardTab: 'GLOBAL', // 'GLOBAL' | 'WEEKLY' | 'RUNS'
        eloHistory: [],
        lastEloDelta: null,
        p1TossCall: 'ODD',
        p2TossCall: 'EVEN',
        friendLockedTossCall: null,
        localTossCallerLocked: false,
        turnSecondsLeft: TURN_DURATION_SEC,
        turnDeadlineMs: 0,
        p1LockedSec: null,
        p2LockedSec: null,
        turnTimerId: null,
        joinRetryTimerId: null,
        sessionInitialized: false,
        lastTossDecisionSummary: '',
        botDifficulty: 'TACTICIAN',
        commentaryStyle: 'HYPE',
        showcaseCompact: false,
        inlineMpType: 'ONLINE_2P',
        userNumHistory: [],
        currentStreak: 0,
        liveBroadcastQuote: '"Welcome to OddAndEven.in! The floodlights are blazing — step up to the toss and set the tone!"',
        liveExcitementLabel: 'PRE-MATCH BUILDUP',
        selectedModalMode: 'ONLINE_2P',
        myUsername: 'PLAYER_1',
        myCountryCode: '+91',
        myCountryFlag: '🇮🇳',
        myCountryName: 'India',
        p1Name: 'PLAYER_1',
        p1CountryCode: '+91',
        p1CountryFlag: '🇮🇳',
        p1CountryName: 'India',
        isAuthenticated: false,
        modalAuthMode: 'LOGIN',
        p2Name: 'WAITING...',
        p2CountryCode: '+91',
        p2CountryFlag: '🇮🇳',
        p2CountryName: 'India',
        p2Joined: false,
        roomLocked: false,
        pendingP1Num: null,
        pendingP2Num: null,
        onlineRole: null, // 'HOST' | 'GUEST'
        roomCode: null,
        peer: null,
        legacyPeer: null,
        conn: null,
        bc: null,
        onlineConnected: false,
        seenNetMsgIds: new Set(),
        globalHubPeer: null,
        globalHubConns: [],

        phase: 'TOSS', // 'TOSS' | 'TOSS_DECISION' | 'INNINGS_1' | 'INNINGS_BREAK' | 'INNINGS_2' | 'GAME_OVER'
        tossCall: 'ODD', // 'ODD' | 'EVEN'
        tossUserNum: null,
        tossAiNum: null,
        tossSum: null,
        tossWinner: null, // 'USER' | 'AI'
        firstBatter: null, // 'USER' | 'AI'
        currentBatter: null, // 'USER' | 'AI'
        currentInnings: 0, // 1 or 2

        userScore: 0,
        userBalls: 0,
        userMatchWickets: 0,
        aiScore: 0,
        aiBalls: 0,
        aiMatchWickets: 0,

        target: null,
        lastUserNum: null,
        lastAiNum: null,
        lastOutcomeText: 'Select Odd or Even to start the Toss!',
        lastOutcomeType: 'neutral',

        winner: null, // 'USER' | 'AI'
        winMarginText: '',

        history: [],
        matchScorecards: [],
        sessionStats: {
          matches: 0,
          userWins: 0,
          aiWins: 0
        },

        // Canvas animation state
        anim: {
          revealProgress: 1,
          flashAlpha: 0,
          flashColor: '#10b981',
          calloutText: 'TOSS TIME',
          calloutSub: 'Choose Odd or Even & Pick 1–10',
          particles: []
        }
      };

      // Load session stats & match scorecards safely
      try {
        const saved = localStorage.getItem('hc_arena_stats_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.matches === 'number') STATE.sessionStats = parsed;
        }
        const savedCards = localStorage.getItem(SCORECARD_HISTORY_KEY);
        if (savedCards) {
          const parsedCards = JSON.parse(savedCards);
          if (Array.isArray(parsedCards)) STATE.matchScorecards = parsedCards;
        }
        const savedFriends = localStorage.getItem(FRIENDS_STORAGE_KEY);
        if (savedFriends) {
          const parsedFriends = JSON.parse(savedFriends);
          if (parsedFriends && typeof parsedFriends === 'object') STATE.friendsMap = parsedFriends;
        }
        const savedReqs = localStorage.getItem(FRIEND_REQUESTS_KEY);
        if (savedReqs) {
          const parsedReqs = JSON.parse(savedReqs);
          if (parsedReqs && typeof parsedReqs === 'object') STATE.friendRequestsMap = parsedReqs;
        }
      } catch (e) {}

      // Calculate Monday 00:00 to Sunday 23:59 window for the Weekly Leaderboard
      function getMondaySundayWeekInfo() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const opts = { month: 'short', day: 'numeric' };
        const monStr = monday.toLocaleDateString('en-US', opts);
        const sunStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const weekKey = `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
        return {
          weekKey,
          label: `Monday, ${monStr} – Sunday, ${sunStr}`
        };
      }

      function isPlaceholderUsername(name) {
        const clean = (name || '').trim().toUpperCase();
        return !clean || FAKE_SEED_NAMES.includes(clean) || clean === 'PLAYER' || clean === 'PLAYER_2' || clean === 'WAITING' || clean === 'HOST';
      }

      function ensureHumanPlayerRecord(name, defaultElo = 1500, countryMeta = null, forcePersist = false) {
        let clean = (name || 'GUEST').trim().toUpperCase();
        const wk = getMondaySundayWeekInfo().weekKey;
        const safeDefaultElo = typeof defaultElo === 'number' && !isNaN(defaultElo) ? defaultElo : 1500;

        // If caller passed a placeholder (e.g. PLAYER_1 or GUEST) while a real user is logged in, bind directly to the logged-in user!
        if (isPlaceholderUsername(clean) && STATE.isAuthenticated && STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
          clean = STATE.myUsername.trim().toUpperCase();
        }

        if (isPlaceholderUsername(clean) && !forcePersist) {
          // Never fall back to realList[0] (#1 player) and never return a detached shallow copy!
          try {
            const lastU = (localStorage.getItem('oddandeven_last_user_v1') || '').trim().toUpperCase();
            if (lastU && !isPlaceholderUsername(lastU) && STATE.humanPlayers && STATE.humanPlayers[lastU]) {
              return STATE.humanPlayers[lastU];
            }
          } catch (e) {}
          if (!STATE._guestTransientRec || STATE._guestTransientRec.name !== clean) {
            STATE._guestTransientRec = {
              name: clean,
              countryCode: (countryMeta && countryMeta.countryCode) || STATE.myCountryCode || '+91',
              countryFlag: (countryMeta && countryMeta.countryFlag) || STATE.myCountryFlag || '🇮🇳',
              countryName: (countryMeta && countryMeta.countryName) || STATE.myCountryName || 'India',
              isRealRegisteredUser: false,
              elo: 1500,
              peak: 1500,
              wins: 0,
              losses: 0,
              matches: 0,
              totalRuns: 0,
              totalBalls: 0,
              highScore: 0,
              centuriesCount: 0,
              sr500Count: 0,
              wicketsTaken: 0,
              wicketsLost: 0,
              ballsBowled: 0,
              weekKey: wk,
              weeklyEloGain: 0,
              weeklyWins: 0,
              weeklyLosses: 0,
              weeklyMatches: 0,
              weeklyRuns: 0,
              weeklyWickets: 0,
              updatedAt: 0
            };
          }
          return STATE._guestTransientRec;
        }

        if (STATE.humanPlayers[clean] && STATE.humanPlayers[clean].statsEpoch !== STATS_RESET_EPOCH) {
          STATE.humanPlayers[clean] = sanitizeRecordForFreshEpoch(STATE.humanPlayers[clean]);
        }
        if (!STATE.humanPlayers[clean]) {
          STATE.humanPlayers[clean] = {
            name: clean,
            statsEpoch: STATS_RESET_EPOCH,
            v2Matches: 0,
            countryCode: (countryMeta && countryMeta.countryCode) || (clean === STATE.p1Name ? STATE.p1CountryCode : '+91'),
            countryFlag: (countryMeta && countryMeta.countryFlag) || (clean === STATE.p1Name ? STATE.p1CountryFlag : '🇮🇳'),
            countryName: (countryMeta && countryMeta.countryName) || (clean === STATE.p1Name ? STATE.p1CountryName : 'India'),
            isRealRegisteredUser: true,
            elo: safeDefaultElo,
            peak: safeDefaultElo,
            wins: 0,
            losses: 0,
            matches: 0,
            rankedMatches: 0,
            totalRuns: 0,
            totalBalls: 0,
            highScore: 0,
            centuriesCount: 0,
            sr500Count: 0,
            wicketsTaken: 0,
            wicketsLost: 0,
            ballsBowled: 0,
            weekKey: wk,
            weeklyEloGain: 0,
            weeklyWins: 0,
            weeklyLosses: 0,
            weeklyMatches: 0,
            weeklyRuns: 0,
            weeklyWickets: 0,
            updatedAt: 0
          };
        } else {
          const rec = STATE.humanPlayers[clean];
          rec.name = clean;
          rec.isRealRegisteredUser = true;
          if (countryMeta && countryMeta.countryCode) rec.countryCode = countryMeta.countryCode;
          if (countryMeta && countryMeta.countryFlag) rec.countryFlag = countryMeta.countryFlag;
          if (countryMeta && countryMeta.countryName) rec.countryName = countryMeta.countryName;
          if (!rec.countryCode) rec.countryCode = '+91';
          if (!rec.countryFlag) rec.countryFlag = '🇮🇳';
          if (typeof rec.elo !== 'number' || isNaN(rec.elo)) rec.elo = safeDefaultElo;
          if (typeof rec.peak !== 'number' || isNaN(rec.peak)) rec.peak = Math.max(1500, rec.elo);
          if (rec.elo > rec.peak) rec.peak = rec.elo;
          if (typeof rec.wins !== 'number') rec.wins = 0;
          if (typeof rec.losses !== 'number') rec.losses = 0;
          if (typeof rec.matches !== 'number' || rec.matches < rec.wins + rec.losses) {
            rec.matches = Math.max(rec.matches || 0, rec.wins + rec.losses);
          }
          if (typeof rec.rankedMatches !== 'number') rec.rankedMatches = 0;
          if (typeof rec.totalRuns !== 'number') rec.totalRuns = 0;
          if (typeof rec.totalBalls !== 'number') rec.totalBalls = 0;
          if (typeof rec.highScore !== 'number') rec.highScore = 0;
          if (typeof rec.centuriesCount !== 'number') rec.centuriesCount = 0;
          if (typeof rec.sr500Count !== 'number') rec.sr500Count = 0;
          if (typeof rec.wicketsTaken !== 'number') rec.wicketsTaken = 0;
          if (typeof rec.wicketsLost !== 'number') rec.wicketsLost = 0;
          if (typeof rec.ballsBowled !== 'number') rec.ballsBowled = 0;
          if (typeof rec.weeklyEloGain !== 'number') rec.weeklyEloGain = 0;
          if (typeof rec.weeklyWins !== 'number') rec.weeklyWins = 0;
          if (typeof rec.weeklyLosses !== 'number') rec.weeklyLosses = 0;
          if (typeof rec.weeklyMatches !== 'number') rec.weeklyMatches = 0;
          if (typeof rec.weeklyRuns !== 'number') rec.weeklyRuns = 0;
          if (typeof rec.weeklyWickets !== 'number') rec.weeklyWickets = 0;
          if (rec.weekKey !== wk) {
            rec.weekKey = wk;
            rec.weeklyEloGain = 0;
            rec.weeklyWins = 0;
            rec.weeklyLosses = 0;
            rec.weeklyMatches = 0;
            rec.weeklyRuns = 0;
            rec.weeklyWickets = 0;
          }
        }
        return STATE.humanPlayers[clean];
      }

      // Deterministic, conflict-free player record merger across Phone, Computer, LocalStorage, Cloud & P2P
      function mergeSinglePlayerRecord(rawExisting, rawInc) {
        const existing = rawExisting ? sanitizeRecordForFreshEpoch(rawExisting) : rawExisting;
        const inc = rawInc ? sanitizeRecordForFreshEpoch(rawInc) : rawInc;
        const wk = getMondaySundayWeekInfo().weekKey;
        if (!existing) {
          const copy = Object.assign({}, inc, { isRealRegisteredUser: true });
          if (typeof copy.elo !== 'number' || isNaN(copy.elo)) copy.elo = 1500;
          if (typeof copy.peak !== 'number' || isNaN(copy.peak)) copy.peak = Math.max(1500, copy.elo);
          if (copy.weekKey !== wk) {
            copy.weekKey = wk;
            copy.weeklyEloGain = 0;
            copy.weeklyWins = 0;
            copy.weeklyLosses = 0;
            copy.weeklyMatches = 0;
            copy.weeklyRuns = 0;
            copy.weeklyWickets = 0;
          }
          return { record: copy, changed: true };
        }
        if (!inc) return { record: existing, changed: false };

        const exWins = existing.wins || 0;
        const exLosses = existing.losses || 0;
        const exMatches = Math.max(existing.matches || 0, exWins + exLosses);
        const exRanked = existing.rankedMatches || 0;

        const incWins = inc.wins || 0;
        const incLosses = inc.losses || 0;
        const incMatches = Math.max(inc.matches || 0, incWins + incLosses);
        const incRanked = inc.rankedMatches || 0;

        const exTime = existing.updatedAt || 0;
        const incTime = inc.updatedAt || 0;

        const exPlayed = exMatches > 0 || (typeof existing.elo === 'number' && existing.elo !== 1500) || (existing.totalRuns || 0) > 0 || (existing.wicketsTaken || 0) > 0;
        const incPlayed = incMatches > 0 || (typeof inc.elo === 'number' && inc.elo !== 1500) || (inc.totalRuns || 0) > 0 || (inc.wicketsTaken || 0) > 0;

        // Determine which record is authoritative for Elo:
        // 1. More completed ranked matches (or total matches) wins
        // 2. If equal, a played record beats an unplayed default 1500 record
        // 3. Otherwise, the newer updatedAt timestamp wins
        let preferIncomingForElo = false;
        if (incRanked !== exRanked) {
          preferIncomingForElo = incRanked > exRanked;
        } else if (incMatches !== exMatches) {
          preferIncomingForElo = incMatches > exMatches;
        } else if (incPlayed && !exPlayed) {
          preferIncomingForElo = true;
        } else if (exPlayed && !incPlayed) {
          preferIncomingForElo = false;
        } else if (incTime > exTime) {
          preferIncomingForElo = true;
        }

        const primaryEloRec = preferIncomingForElo ? inc : existing;
        const secondaryEloRec = preferIncomingForElo ? existing : inc;

        const nextElo = typeof primaryEloRec.elo === 'number' && !isNaN(primaryEloRec.elo)
          ? primaryEloRec.elo
          : (typeof secondaryEloRec.elo === 'number' && !isNaN(secondaryEloRec.elo) ? secondaryEloRec.elo : 1500);
        const nextWins = Math.max(exWins, incWins);
        const nextLosses = Math.max(exLosses, incLosses);
        const nextMatches = Math.max(exMatches, incMatches, nextWins + nextLosses);
        const nextRankedMatches = Math.max(exRanked, incRanked);
        const nextPeak = Math.max(existing.peak || 1500, inc.peak || 1500, nextElo);

        const nextTotalRuns = Math.max(existing.totalRuns || 0, inc.totalRuns || 0);
        const nextTotalBalls = Math.max(existing.totalBalls || 0, inc.totalBalls || 0);
        const nextHighScore = Math.max(existing.highScore || 0, inc.highScore || 0);
        const nextCenturiesCount = Math.max(existing.centuriesCount || 0, inc.centuriesCount || 0);
        const nextSr500Count = Math.max(existing.sr500Count || 0, inc.sr500Count || 0);
        const nextWicketsTaken = Math.max(existing.wicketsTaken || 0, inc.wicketsTaken || 0);
        const nextWicketsLost = Math.max(existing.wicketsLost || 0, inc.wicketsLost || 0);
        const nextBallsBowled = Math.max(existing.ballsBowled || 0, inc.ballsBowled || 0);

        const exSameWeek = existing.weekKey === wk;
        const incSameWeek = inc.weekKey === wk;
        let nextWeeklyEloGain = 0;
        if (exSameWeek && incSameWeek) {
          nextWeeklyEloGain = preferIncomingForElo
            ? (typeof inc.weeklyEloGain === 'number' ? inc.weeklyEloGain : (existing.weeklyEloGain || 0))
            : (typeof existing.weeklyEloGain === 'number' ? existing.weeklyEloGain : (inc.weeklyEloGain || 0));
        } else if (incSameWeek) {
          nextWeeklyEloGain = typeof inc.weeklyEloGain === 'number' ? inc.weeklyEloGain : 0;
        } else if (exSameWeek) {
          nextWeeklyEloGain = typeof existing.weeklyEloGain === 'number' ? existing.weeklyEloGain : 0;
        }

        const nextWeeklyWins = Math.max(exSameWeek ? (existing.weeklyWins || 0) : 0, incSameWeek ? (inc.weeklyWins || 0) : 0);
        const nextWeeklyLosses = Math.max(exSameWeek ? (existing.weeklyLosses || 0) : 0, incSameWeek ? (inc.weeklyLosses || 0) : 0);
        const nextWeeklyMatches = Math.max(exSameWeek ? (existing.weeklyMatches || 0) : 0, incSameWeek ? (inc.weeklyMatches || 0) : 0, nextWeeklyWins + nextWeeklyLosses);
        const nextWeeklyRuns = Math.max(exSameWeek ? (existing.weeklyRuns || 0) : 0, incSameWeek ? (inc.weeklyRuns || 0) : 0);
        const nextWeeklyWickets = Math.max(exSameWeek ? (existing.weeklyWickets || 0) : 0, incSameWeek ? (inc.weeklyWickets || 0) : 0);

        const nextCountryCode = (incTime >= exTime ? inc.countryCode : existing.countryCode) || existing.countryCode || inc.countryCode || '+91';
        const nextCountryFlag = (incTime >= exTime ? inc.countryFlag : existing.countryFlag) || existing.countryFlag || inc.countryFlag || '🇮🇳';
        const nextCountryName = (incTime >= exTime ? inc.countryName : existing.countryName) || existing.countryName || inc.countryName || 'India';
        const nextUpdatedAt = Math.max(exTime, incTime);

        const hasMeaningfulChange = (
          existing.weekKey !== wk ||
          existing.elo !== nextElo ||
          existing.peak !== nextPeak ||
          existing.wins !== nextWins ||
          existing.losses !== nextLosses ||
          existing.matches !== nextMatches ||
          existing.totalRuns !== nextTotalRuns ||
          existing.totalBalls !== nextTotalBalls ||
          existing.highScore !== nextHighScore ||
          existing.centuriesCount !== nextCenturiesCount ||
          existing.sr500Count !== nextSr500Count ||
          existing.wicketsTaken !== nextWicketsTaken ||
          existing.wicketsLost !== nextWicketsLost ||
          existing.weeklyEloGain !== nextWeeklyEloGain ||
          existing.weeklyRuns !== nextWeeklyRuns ||
          existing.weeklyWickets !== nextWeeklyWickets ||
          existing.weeklyWins !== nextWeeklyWins ||
          existing.weeklyLosses !== nextWeeklyLosses ||
          existing.countryCode !== nextCountryCode ||
          existing.countryFlag !== nextCountryFlag
        );

        if (!hasMeaningfulChange) {
          existing.updatedAt = nextUpdatedAt;
          return { record: existing, changed: false };
        }

        const merged = Object.assign({}, existing, inc, {
          name: (existing.name || inc.name || '').trim().toUpperCase(),
          statsEpoch: STATS_RESET_EPOCH,
          v2Matches: nextMatches,
          cloudMatchesFloor: Math.max(Number(existing.cloudMatchesFloor) || 0, Number(inc.cloudMatchesFloor) || 0),
          isRealRegisteredUser: true,
          countryCode: nextCountryCode,
          countryFlag: nextCountryFlag,
          countryName: nextCountryName,
          elo: nextElo,
          peak: nextPeak,
          wins: nextWins,
          losses: nextLosses,
          matches: nextMatches,
          rankedMatches: nextRankedMatches,
          totalRuns: nextTotalRuns,
          totalBalls: nextTotalBalls,
          highScore: nextHighScore,
          centuriesCount: nextCenturiesCount,
          sr500Count: nextSr500Count,
          wicketsTaken: nextWicketsTaken,
          wicketsLost: nextWicketsLost,
          ballsBowled: nextBallsBowled,
          weekKey: wk,
          weeklyEloGain: nextWeeklyEloGain,
          weeklyWins: nextWeeklyWins,
          weeklyLosses: nextWeeklyLosses,
          weeklyMatches: nextWeeklyMatches,
          weeklyRuns: nextWeeklyRuns,
          weeklyWickets: nextWeeklyWickets,
          updatedAt: nextUpdatedAt
        });
        return { record: merged, changed: true };
      }

      window.__mergeSinglePlayerRecord = mergeSinglePlayerRecord;

      // Merge incoming player accounts from Worldwide PeerJS Hub, Room Peers, Cloud, BroadcastChannel & LocalStorage
      function mergeGlobalPlayers(incomingMap) {
        if (!incomingMap || typeof incomingMap !== 'object') return false;
        const purged = loadPurgedAccountsList();
        let anyChanged = false;
        Object.keys(incomingMap).forEach((rawKey) => {
          const clean = (rawKey || '').trim().toUpperCase();
          if (!clean || isPlaceholderUsername(clean) || !isAccountAllowedByCloud(clean)) return;
          const inc = incomingMap[rawKey];
          if (!inc || typeof inc !== 'object') return;
          const existing = STATE.humanPlayers[clean];
          const res = mergeSinglePlayerRecord(existing, Object.assign({}, inc, { name: clean }));
          STATE.humanPlayers[clean] = res.record;
          if (res.changed) {
            anyChanged = true;
          }
        });
        // Keep active user's STATE.eloRating and STATE.peakElo in sync if their record updated
        if (STATE.isAuthenticated && STATE.myUsername && STATE.humanPlayers[STATE.myUsername]) {
          STATE.eloRating = STATE.humanPlayers[STATE.myUsername].elo;
          STATE.peakElo = STATE.humanPlayers[STATE.myUsername].peak;
        }
        return anyChanged;
      }

      // Load saved leaderboard & merge cleanly without overwriting newer records
      try {
        const savedElo = localStorage.getItem('hc_arena_elo_v2');
        if (savedElo) {
          const parsedElo = JSON.parse(savedElo);
          if (parsedElo.humanPlayers && typeof parsedElo.humanPlayers === 'object') {
            mergeGlobalPlayers(parsedElo.humanPlayers);
          }
          if (Array.isArray(parsedElo.eloHistory)) STATE.eloHistory = parsedElo.eloHistory;
        }
      } catch (e) {}

      function syncAuthAndPurgeFakeSeeds() {
        reconcileAllNewPlayersIntoLeaderboard();
        const purged = loadPurgedAccountsList();
        // 1. Purge any legacy fake seeded contenders, unplayed placeholders, or deleted accounts
        FAKE_SEED_NAMES.forEach((fakeName) => {
          delete STATE.humanPlayers[fakeName];
        });
        delete STATE.humanPlayers['WAITING...'];
        delete STATE.humanPlayers['PLAYER'];
        delete STATE.humanPlayers['PLAYER_2'];
        delete STATE.humanPlayers['HOST'];
        purged.forEach((pName) => {
          delete STATE.humanPlayers[pName];
        });

        // 2. Load Worldwide Registry & hc_arena_elo_v2 from localStorage and merge cleanly
        try {
          const worldRaw = localStorage.getItem(WORLDWIDE_PLAYERS_KEY);
          if (worldRaw) {
            const worldMap = JSON.parse(worldRaw);
            mergeGlobalPlayers(worldMap);
          }
        } catch (e) {}
        try {
          const savedElo = localStorage.getItem('hc_arena_elo_v2');
          if (savedElo) {
            const parsedElo = JSON.parse(savedElo);
            if (parsedElo && parsedElo.humanPlayers) {
              mergeGlobalPlayers(parsedElo.humanPlayers);
            }
          }
        } catch (e) {}

        const sess = loadActiveAuthSession();
        const signedOutExplicitly = (() => {
          try { return localStorage.getItem(SIGNED_OUT_FLAG_KEY) === '1'; } catch (e) { return false; }
        })();
        const sessUser = sess && sess.username ? sess.username.trim().toUpperCase() : '';
        // Only unmark a purged account if it was freshly signed up within the last 25 seconds
        if (!signedOutExplicitly && sessUser && !isPlaceholderUsername(sessUser) && isRecentSignup(sessUser)) {
          unmarkAccountPurgedLocal(sessUser);
        }
        const activePurged = loadPurgedAccountsList();

        // 3. Load all encrypted accounts from login.html vault & ensure every registered player has a leaderboard record
        const encryptedUsers = loadEncryptedUsersMap();
        if (!signedOutExplicitly && sessUser && !isPlaceholderUsername(sessUser) && !encryptedUsers[sessUser] && sess) {
          // Ensure active session user from login.html is always represented in STATE.humanPlayers even if vault key was written under different casing
          ensureHumanPlayerRecord(sessUser, 1500, {
            countryCode: sess.countryCode || '+91',
            countryFlag: sess.countryFlag || '🇮🇳',
            countryName: sess.countryName || 'India'
          }, true);
        }
        const registeredNames = Object.keys(encryptedUsers);
        registeredNames.forEach((uname) => {
          const u = encryptedUsers[uname];
          const clean = ((u && u.username) ? u.username : uname || '').trim().toUpperCase();
          if (!clean || isPlaceholderUsername(clean) || activePurged.includes(clean)) return;
          ensureHumanPlayerRecord(clean, 1500, {
            countryCode: (u && u.countryCode) || '+91',
            countryFlag: (u && u.countryFlag) || '🇮🇳',
            countryName: (u && u.countryName) || 'India'
          }, true);
        });

        // Also ensure any friends in STATE.friendsMap or mobile friends list have leaderboard records
        try {
          Object.keys(STATE.friendsMap || {}).forEach((ownerKey) => {
            const fArr = STATE.friendsMap[ownerKey];
            if (Array.isArray(fArr)) {
              fArr.forEach((fName) => {
                const cleanF = (fName || '').trim().toUpperCase();
                if (cleanF && cleanF.length >= 3 && !isPlaceholderUsername(cleanF) && !activePurged.includes(cleanF)) {
                  ensureHumanPlayerRecord(cleanF, 1500, null, true);
                }
              });
            }
          });
        } catch (e) {}

        if (!signedOutExplicitly && sessUser && !isPlaceholderUsername(sessUser) && isAccountAllowedByCloud(sessUser) && (encryptedUsers[sessUser] || (sess && sess.loggedInAt))) {
          const verifiedAccount = encryptedUsers[sessUser] || sess || {};
          if (!encryptedUsers[sessUser] && sess) {
            encryptedUsers[sessUser] = {
              username: sessUser,
              countryCode: sess.countryCode || '+91',
              countryName: sess.countryName || 'India',
              countryFlag: sess.countryFlag || '🇮🇳',
              encryptedAuth: sess.encryptedAuth || null,
              authProvider: sess.authProvider || 'pin',
              googleUid: sess.googleUid || null,
              createdAt: sess.loggedInAt || new Date().toISOString()
            };
            saveEncryptedUsersMap(encryptedUsers);
          }
          STATE.myUsername = sessUser;
          STATE.myCountryCode = verifiedAccount.countryCode || sess.countryCode || '+91';
          STATE.myCountryFlag = verifiedAccount.countryFlag || sess.countryFlag || '🇮🇳';
          STATE.myCountryName = verifiedAccount.countryName || sess.countryName || 'India';
          STATE.isAuthenticated = true;
          if (typeof window.__bindCloudInviteListener === 'function') {
            try { window.__bindCloudInviteListener(STATE.myUsername); } catch (e) {}
          }
        } else {
          STATE.myUsername = 'GUEST';
          STATE.myCountryCode = '+91';
          STATE.myCountryFlag = '🇮🇳';
          STATE.myCountryName = 'India';
          STATE.isAuthenticated = false;
        }
        STATE.sessionInitialized = true;

        // In AI mode or when not Guest in ONLINE_2P, P1 is myUsername; when Guest in ONLINE_2P, keep P2 as myUsername and preserve Host
        if (STATE.mode === 'ONLINE_2P' && STATE.onlineRole === 'GUEST') {
          STATE.p2Name = STATE.myUsername;
          STATE.p2CountryCode = STATE.myCountryCode;
          STATE.p2CountryFlag = STATE.myCountryFlag;
          STATE.p2CountryName = STATE.myCountryName;
          if (!STATE.p1Name || STATE.p1Name === STATE.myUsername) {
            STATE.p1Name = 'HOST';
          }
        } else {
          STATE.p1Name = STATE.myUsername;
          STATE.p1CountryCode = STATE.myCountryCode;
          STATE.p1CountryFlag = STATE.myCountryFlag;
          STATE.p1CountryName = STATE.myCountryName;
        }

        // Keep bot-match entries in eloHistory labeled as FROZEN
        if (Array.isArray(STATE.eloHistory) && STATE.eloHistory.length > 0) {
          STATE.eloHistory.forEach((h) => {
            if (h && typeof h.mode === 'string' && h.mode.toLowerCase().includes('bot')) {
              h.delta = 'FROZEN';
              h.isBotMatch = true;
            }
          });
        }

        // Always pass 1500 (never STATE.eloRating) as defaultElo so another account's rating never bleeds into a new account
        const myRec = ensureHumanPlayerRecord(STATE.myUsername, 1500, {
          countryCode: STATE.myCountryCode,
          countryFlag: STATE.myCountryFlag,
          countryName: STATE.myCountryName
        }, STATE.isAuthenticated && !isPlaceholderUsername(STATE.myUsername));

        // Self-Healing Stats Reconciler: repair any account whose matches or totalRuns were 0 despite having played matches in eloHistory or matchScorecards
        try {
          const statsByUser = {};
          const ensureBucket = (uName) => {
            let cleanU = (uName || '').trim().toUpperCase();
            if (isPlaceholderUsername(cleanU) && STATE.isAuthenticated && !isPlaceholderUsername(STATE.myUsername)) {
              cleanU = STATE.myUsername.trim().toUpperCase();
            }
            if (!cleanU || isPlaceholderUsername(cleanU) || purged.includes(cleanU)) return null;
            if (!statsByUser[cleanU]) {
              statsByUser[cleanU] = { wins: 0, losses: 0, matches: 0, runs: 0, high: 0, wickets: 0 };
            }
            return statsByUser[cleanU];
          };

          if (Array.isArray(STATE.eloHistory)) {
            STATE.eloHistory.forEach((h) => {
              if (!h || h.result === 'FORFEIT' || h.isBotMatch || (typeof h.mode === 'string' && h.mode.toLowerCase().includes('bot'))) return;
              const b = ensureBucket(h.p1Name || STATE.myUsername);
              if (!b) return;
              b.matches += 1;
              if (h.result === 'WIN') b.wins += 1;
              else if (h.result === 'LOSS') b.losses += 1;
              const r = typeof h.runsScored === 'number' ? h.runsScored : 0;
              const w = typeof h.wicketsTaken === 'number' ? h.wicketsTaken : 0;
              b.runs += r;
              if (r > b.high) b.high = r;
              b.wickets += w;
            });
          }

          const parseSummaryRuns = (sumStr) => {
            if (!sumStr || typeof sumStr !== 'string') return 0;
            const m = sumStr.match(/^(\d+)\//);
            return m ? parseInt(m[1], 10) || 0 : 0;
          };

          const scByUser = {};
          if (Array.isArray(STATE.matchScorecards)) {
            STATE.matchScorecards.forEach((mc) => {
              if (!mc) return;
              [mc.p1Name, mc.p2Name].forEach((cand) => {
                let cleanU = (cand || '').trim().toUpperCase();
                if (isPlaceholderUsername(cleanU) && STATE.isAuthenticated && !isPlaceholderUsername(STATE.myUsername)) {
                  cleanU = STATE.myUsername.trim().toUpperCase();
                }
                if (!cleanU || isPlaceholderUsername(cleanU) || purged.includes(cleanU)) return;
                if (!scByUser[cleanU]) scByUser[cleanU] = { wins: 0, losses: 0, matches: 0, runs: 0, high: 0 };
                const sb = scByUser[cleanU];
                sb.matches += 1;
                if (mc.isDraw || (mc.winnerName || '').trim().toUpperCase() === 'MATCH DRAWN') {
                  // Draw: matches incremented, no wins or losses added
                } else if ((mc.winnerName || '').trim().toUpperCase() === cleanU) {
                  sb.wins += 1;
                } else {
                  sb.losses += 1;
                }
                let r = 0;
                if ((mc.inn1Team || '').trim().toUpperCase() === cleanU) r = parseSummaryRuns(mc.inn1Summary);
                else if ((mc.inn2Team || '').trim().toUpperCase() === cleanU) r = parseSummaryRuns(mc.inn2Summary);
                sb.runs += r;
                if (r > sb.high) sb.high = r;
              });
            });
          }

          Object.keys(STATE.humanPlayers).forEach((uKey) => {
            const rec = STATE.humanPlayers[uKey];
            if (!rec) return;
            const eb = statsByUser[uKey];
            const sb = scByUser[uKey];
            if (eb) {
              if ((rec.wins || 0) < eb.wins) rec.wins = eb.wins;
              if ((rec.losses || 0) < eb.losses) rec.losses = eb.losses;
              if ((rec.matches || 0) < eb.matches) rec.matches = Math.max(eb.matches, rec.wins + rec.losses);
              if ((rec.totalRuns || 0) < eb.runs) rec.totalRuns = eb.runs;
              if ((rec.highScore || 0) < eb.high) rec.highScore = eb.high;
              if ((rec.wicketsTaken || 0) < eb.wickets) rec.wicketsTaken = eb.wickets;
            }
            if (sb) {
              if ((rec.wins || 0) < sb.wins) rec.wins = sb.wins;
              if ((rec.losses || 0) < sb.losses) rec.losses = sb.losses;
              if ((rec.matches || 0) < sb.matches) rec.matches = Math.max(sb.matches, rec.wins + rec.losses);
              if ((rec.totalRuns || 0) < sb.runs) rec.totalRuns = sb.runs;
              if ((rec.highScore || 0) < sb.high) rec.highScore = sb.high;
            }
            rec.matches = Math.max(rec.matches || 0, (rec.wins || 0) + (rec.losses || 0));
          });
        } catch (e) {}

        STATE.eloRating = typeof myRec.elo === 'number' ? myRec.elo : 1500;
        STATE.peakElo = typeof myRec.peak === 'number' ? myRec.peak : STATE.eloRating;

        if (STATE.myUsername !== 'YOU' && STATE.humanPlayers['YOU']) {
          delete STATE.humanPlayers['YOU'];
        }
        if (STATE.humanPlayers['FRIEND'] && !encryptedUsers['FRIEND']) {
          delete STATE.humanPlayers['FRIEND'];
        }
        // Normalize all humanPlayers keys & numeric fields so no player is ever skipped by leaderboard filters
        Object.keys(STATE.humanPlayers).forEach((k) => {
          const clean = (k || '').trim().toUpperCase();
          const rec = STATE.humanPlayers[k];
          if (!rec || isPlaceholderUsername(clean) || !isAccountAllowedByCloud(clean)) {
            delete STATE.humanPlayers[k];
            return;
          }
          rec.name = clean;
          rec.isRealRegisteredUser = true;
          rec.elo = typeof rec.elo === 'number' && !isNaN(rec.elo) ? rec.elo : (Number(rec.elo) || 1500);
          rec.peak = typeof rec.peak === 'number' && !isNaN(rec.peak) ? Math.max(rec.peak, rec.elo) : Math.max(1500, rec.elo);
          if (!rec.updatedAt) rec.updatedAt = Date.now();
          if (k !== clean) {
            STATE.humanPlayers[clean] = rec;
            delete STATE.humanPlayers[k];
          }
        });
        saveLocalStatsOnly();
      }

      let _debouncedCloudSyncTimer = null;
      function scheduleDebouncedGlobalSync() {
        if (_debouncedCloudSyncTimer) clearTimeout(_debouncedCloudSyncTimer);
        _debouncedCloudSyncTimer = setTimeout(() => {
          _debouncedCloudSyncTimer = null;
          broadcastGlobalLeaderboardSync(false, true);
        }, 600);
      }

      function saveLocalStatsOnly() {
        try {
          localStorage.setItem('hc_arena_stats_v1', JSON.stringify(STATE.sessionStats));
          localStorage.setItem(SCORECARD_HISTORY_KEY, JSON.stringify(STATE.matchScorecards.slice(0, 25)));
          localStorage.setItem(WORLDWIDE_PLAYERS_KEY, JSON.stringify(STATE.humanPlayers));
          localStorage.setItem('hc_arena_elo_v2', JSON.stringify({
            eloRating: STATE.eloRating,
            peakElo: STATE.peakElo,
            friendEloRating: STATE.friendEloRating,
            humanPlayers: STATE.humanPlayers,
            eloHistory: STATE.eloHistory.slice(0, 30)
          }));
        } catch (e) {}
      }

      function broadcastGlobalLeaderboardSync(requestReply = false, forceImmediate = false) {
        const now = Date.now();
        if (!forceImmediate && !requestReply && now - _lastBroadcastSyncMs < 350) {
          return;
        }
        _lastBroadcastSyncMs = now;

        const usersVault = loadEncryptedUsersMap();
        saveLocalStatsOnly();

        const syncPacket = {
          type: 'GLOBAL_LEADERBOARD_SYNC',
          allPlayers: STATE.humanPlayers,
          encryptedUsers: usersVault,
          requestReply: Boolean(requestReply),
          timestamp: now
        };
        const gbc = getSharedGlobalBc();
        if (gbc) {
          try { gbc.postMessage(syncPacket); } catch (e) {}
        }
        if (STATE.globalHubConns && STATE.globalHubConns.length > 0) {
          STATE.globalHubConns.forEach((c) => {
            if (c && c.open) {
              try { c.send(syncPacket); } catch (e) {}
            }
          });
        }
        if (STATE.conn && STATE.conn.open) {
          try { STATE.conn.send(syncPacket); } catch (e) {}
        }
        if (typeof window.__syncCloudLeaderboard === 'function') {
          try { window.__syncCloudLeaderboard(STATE.humanPlayers, usersVault, STATE.myUsername); } catch (e) {}
        }
      }

      syncAuthAndPurgeFakeSeeds();

      try {
        const justLogged = localStorage.getItem('oddandeven_just_logged_in');
        const urlParams = new URLSearchParams(window.location.search);
        const fromLogin = justLogged === '1' || urlParams.get('from') === 'login';
        const targetScreen = (urlParams.get('screen') || '').trim().toUpperCase();
        if (fromLogin) {
          localStorage.removeItem('oddandeven_just_logged_in');
          sessionStorage.setItem('oddandeven_show_v2_box', '1');
          window.__enteredFromLogin = true;
          STATE.activeScreen = (targetScreen && targetScreen !== 'LEADERBOARD') ? targetScreen : 'PITCH';
        } else if (targetScreen === 'LEADERBOARD' || targetScreen === 'EVENTS' || targetScreen === 'ACHIEVEMENTS' || targetScreen === 'PROFILE' || targetScreen === 'STORE' || targetScreen === 'PITCH') {
          STATE.activeScreen = targetScreen;
        }
      } catch (e) {}

      function saveSessionStats(shouldBroadcast = true) {
        saveLocalStatsOnly();
        if (shouldBroadcast) {
          broadcastGlobalLeaderboardSync(false, false);
        }
      }

      // ==========================================
      // 3. DOM REFERENCES
      // ==========================================
      const el = {
        newUpdateBanner: document.getElementById('newUpdateBanner'),
        btnBannerNewUpdate: document.getElementById('btnBannerNewUpdate'),
        btnDismissUpdateBanner: document.getElementById('btnDismissUpdateBanner'),
        sideNavAchievements: document.getElementById('sideNavAchievements'),
        sideNavAchievementsSub: document.getElementById('sideNavAchievementsSub'),
        sideNavAchievementsXpPill: document.getElementById('sideNavAchievementsXpPill'),
        screenAchievements: document.getElementById('screenAchievements'),
        btnBackFromAchievements: document.getElementById('btnBackFromAchievements'),
        achRankTierBadge: document.getElementById('achRankTierBadge'),
        achUserFlag: document.getElementById('achUserFlag'),
        achUserHeadline: document.getElementById('achUserHeadline'),
        achUserSubStats: document.getElementById('achUserSubStats'),
        achUnlockedSummaryText: document.getElementById('achUnlockedSummaryText'),
        achTotalXpText: document.getElementById('achTotalXpText'),
        achOverallProgressBar: document.getElementById('achOverallProgressBar'),
        btnAchFilterAll: document.getElementById('btnAchFilterAll'),
        btnAchFilterBatting: document.getElementById('btnAchFilterBatting'),
        btnAchFilterBowling: document.getElementById('btnAchFilterBowling'),
        btnAchFilterRanked: document.getElementById('btnAchFilterRanked'),
        achievementsGridList: document.getElementById('achievementsGridList'),
        sideNavEventsSub: document.getElementById('sideNavEventsSub'),
        sideNavEventsCountBadge: document.getElementById('sideNavEventsCountBadge'),
        eventsRegSummaryBadge: document.getElementById('eventsRegSummaryBadge'),
        eventsInlineToast: document.getElementById('eventsInlineToast'),
        eventsInlineToastText: document.getElementById('eventsInlineToastText'),
        hcCalRelSolo: document.getElementById('hcCalRelSolo'),
        hcEvStateSolo: document.getElementById('hcEvStateSolo'),
        hcSoloD: document.getElementById('hcSoloD'),
        hcSoloH: document.getElementById('hcSoloH'),
        hcSoloM: document.getElementById('hcSoloM'),
        hcSoloS: document.getElementById('hcSoloS'),
        btnJoinEventSolo: document.getElementById('btnJoinEventSolo'),
        phaseBadge: document.getElementById('phaseBadge'),
        btnHeaderSignOut: document.getElementById('btnHeaderSignOut'),
        headerSignOutLabel: document.getElementById('headerSignOutLabel'),
        btnHeaderRemoveAccount: document.getElementById('btnHeaderRemoveAccount'),
        btnSidebarSignOut: document.getElementById('btnSidebarSignOut'),
        btnSidebarRemoveAccount: document.getElementById('btnSidebarRemoveAccount'),
        btnHeaderProfile: document.getElementById('btnHeaderProfile'),
        btnHeaderStore: document.getElementById('btnHeaderStore'),
        sideNavProfile: document.getElementById('sideNavProfile'),
        sideNavProfileSub: document.getElementById('sideNavProfileSub'),
        sideNavStore: document.getElementById('sideNavStore'),
        sideNavStoreSub: document.getElementById('sideNavStoreSub'),
        sideNavStoreBadge: document.getElementById('sideNavStoreBadge'),
        sidebarPlayerCard: document.getElementById('sidebarPlayerCard'),
        sidebarCardFlag: document.getElementById('sidebarCardFlag'),
        sidebarCardUsername: document.getElementById('sidebarCardUsername'),
        sidebarCardStar: document.getElementById('sidebarCardStar'),
        sidebarCardDial: document.getElementById('sidebarCardDial'),
        sidebarCardTierPill: document.getElementById('sidebarCardTierPill'),
        sidebarCardTitle: document.getElementById('sidebarCardTitle'),
        sidebarCardRunsWkts: document.getElementById('sidebarCardRunsWkts'),
        modalAuthTitle: document.getElementById('modalAuthTitle'),
        modalAuthSubtitle: document.getElementById('modalAuthSubtitle'),
        modalRemoveConfirmBox: document.getElementById('modalRemoveConfirmBox'),
        modalRemoveConfirmTitle: document.getElementById('modalRemoveConfirmTitle'),
        btnCancelRemoveAccount: document.getElementById('btnCancelRemoveAccount'),
        btnConfirmRemoveAccount: document.getElementById('btnConfirmRemoveAccount'),
        btnModalSignOut: document.getElementById('btnModalSignOut'),
        btnModalRemoveAccount: document.getElementById('btnModalRemoveAccount'),
        modalAccountActionsWrap: document.getElementById('modalAccountActionsWrap'),
        btnInlineLeaveRoom: document.getElementById('btnInlineLeaveRoom'),
        mpRoleAssignmentBanner: document.getElementById('mpRoleAssignmentBanner'),
        mpRoleAssignmentText: document.getElementById('mpRoleAssignmentText'),
        mpRoleAssignmentSub: document.getElementById('mpRoleAssignmentSub'),
        lbWorldSyncBadge: document.getElementById('lbWorldSyncBadge'),
        lbWorldSyncText: document.getElementById('lbWorldSyncText'),
        btnSyncGlobalLb: document.getElementById('btnSyncGlobalLb'),
                scorecardMatchNumberBadge: document.getElementById('scorecardMatchNumberBadge'),
        cardInn1Row: document.getElementById('cardInn1Row'),
        cardInn1StatusPill: document.getElementById('cardInn1StatusPill'),
        cardInn2Row: document.getElementById('cardInn2Row'),
        cardInn2StatusPill: document.getElementById('cardInn2StatusPill'),
        scorecardLiveVerdictBar: document.getElementById('scorecardLiveVerdictBar'),
        scorecardHistoryCount: document.getElementById('scorecardHistoryCount'),
        scorecardMatchHistoryList: document.getElementById('scorecardMatchHistoryList'),
        inlineLobbyMatchupCard: document.getElementById('inlineLobbyMatchupCard'),
        inlineLobbyP1Display: document.getElementById('inlineLobbyP1Display'),
        inlineLobbyP2Card: document.getElementById('inlineLobbyP2Card'),
        inlineLobbyP2Display: document.getElementById('inlineLobbyP2Display'),
        inlineLobbyWaitHint: document.getElementById('inlineLobbyWaitHint'),
        btnInlineCopyCode: document.getElementById('btnInlineCopyCode'),
        btnLaunchMpIcon: document.getElementById('btnLaunchMpIcon'),
        btnLaunchMpText: document.getElementById('btnLaunchMpText'),
        modalLobbyP1Display: document.getElementById('modalLobbyP1Display'),
        modalLobbyP2Display: document.getElementById('modalLobbyP2Display'),
        mpTossWaitingBanner: document.getElementById('mpTossWaitingBanner'),
        mpTossWaitingTitle: document.getElementById('mpTossWaitingTitle'),
        mpTossWaitingSub: document.getElementById('mpTossWaitingSub'),
        sideNavFriends: document.getElementById('sideNavFriends'),
        sideNavFriendsSub: document.getElementById('sideNavFriendsSub'),
        sideNavFriendsInviteDot: document.getElementById('sideNavFriendsInviteDot'),
        screenFriends: document.getElementById('screenFriends'),
        btnBackFromFriends: document.getElementById('btnBackFromFriends'),
        inputFriendSearch: document.getElementById('inputFriendSearch'),
        btnSearchFriendUsername: document.getElementById('btnSearchFriendUsername'),
        btnAddDirectFriendUsername: document.getElementById('btnAddDirectFriendUsername'),
        friendActionFeedback: document.getElementById('friendActionFeedback'),
        friendSearchResultsTitle: document.getElementById('friendSearchResultsTitle'),
        friendSearchResultsCount: document.getElementById('friendSearchResultsCount'),
        friendSearchResultsList: document.getElementById('friendSearchResultsList'),
        pendingFriendRequestsCard: document.getElementById('pendingFriendRequestsCard'),
        pendingFriendRequestsBadge: document.getElementById('pendingFriendRequestsBadge'),
        pendingFriendRequestsList: document.getElementById('pendingFriendRequestsList'),
        myFriendsCountBadge: document.getElementById('myFriendsCountBadge'),
        myFriendsListContainer: document.getElementById('myFriendsListContainer'),
        globalFriendInviteToast: document.getElementById('globalFriendInviteToast'),
        globalFriendInviteRoomPill: document.getElementById('globalFriendInviteRoomPill'),
        globalFriendInviteTitle: document.getElementById('globalFriendInviteTitle'),
        globalFriendInviteSub: document.getElementById('globalFriendInviteSub'),
        btnAcceptGlobalFriendInvite: document.getElementById('btnAcceptGlobalFriendInvite'),
        btnDismissGlobalFriendInvite: document.getElementById('btnDismissGlobalFriendInvite'),
        globalFriendRequestToast: document.getElementById('globalFriendRequestToast'),
        globalFriendRequestFromPill: document.getElementById('globalFriendRequestFromPill'),
        globalFriendRequestTitle: document.getElementById('globalFriendRequestTitle'),
        globalFriendRequestSub: document.getElementById('globalFriendRequestSub'),
        btnAcceptGlobalFriendRequest: document.getElementById('btnAcceptGlobalFriendRequest'),
        btnDismissGlobalFriendRequest: document.getElementById('btnDismissGlobalFriendRequest'),
        sideNavEvents: document.getElementById('sideNavEvents'),
        screenEvents: document.getElementById('screenEvents'),
        btnBackFromEvents: document.getElementById('btnBackFromEvents'),
        eventsUserFlag: document.getElementById('eventsUserFlag'),
        eventsUserHeadline: document.getElementById('eventsUserHeadline'),
        eventsUserStatsLine: document.getElementById('eventsUserStatsLine'),
        sidebarUserIdentity: document.getElementById('sidebarUserIdentity'),
        sidebarCareerRuns: document.getElementById('sidebarCareerRuns'),
        sidebarCareerWickets: document.getElementById('sidebarCareerWickets'),
        btnSidebarAuth: document.getElementById('btnSidebarAuth'),
        headerUserStatsText: document.getElementById('headerUserStatsText'),
        btnOpenAuthModal: document.getElementById('btnOpenAuthModal'),
        headerAuthFlag: document.getElementById('headerAuthFlag'),
        headerAuthUsername: document.getElementById('headerAuthUsername'),
        scorecardUserFlag: document.getElementById('scorecardUserFlag'),
        scorecardUsernameLabel: document.getElementById('scorecardUsernameLabel'),
        scorecardCareerSummary: document.getElementById('scorecardCareerSummary'),
        statUserWickets: document.getElementById('statUserWickets'),
        authModal: document.getElementById('authModal'),
        btnCloseAuthModal: document.getElementById('btnCloseAuthModal'),
        modalTabLogin: document.getElementById('modalTabLogin'),
        modalTabSignup: document.getElementById('modalTabSignup'),
        modalAuthAlert: document.getElementById('modalAuthAlert'),
        modalInputUsername: document.getElementById('modalInputUsername'),
        modalSelectCountry: document.getElementById('modalSelectCountry'),
        modalInputPin5: document.getElementById('modalInputPin5'),
        modalConnectedKeyPreview: document.getElementById('modalConnectedKeyPreview'),
        btnModalSubmitAuth: document.getElementById('btnModalSubmitAuth'),
        turnTimerBar: document.getElementById('turnTimerBar'),
        timerClockIcon: document.getElementById('timerClockIcon'),
        timerStatusTitle: document.getElementById('timerStatusTitle'),
        timerStatusSub: document.getElementById('timerStatusSub'),
        timerDigitalDisplay: document.getElementById('timerDigitalDisplay'),
        timerProgressBar: document.getElementById('timerProgressBar'),
        mpDualClockGrid: document.getElementById('mpDualClockGrid'),
        mpClockCardP1: document.getElementById('mpClockCardP1'),
        mpClockIconP1: document.getElementById('mpClockIconP1'),
        mpClockNameP1: document.getElementById('mpClockNameP1'),
        mpClockStateP1: document.getElementById('mpClockStateP1'),
        mpClockDigitsP1: document.getElementById('mpClockDigitsP1'),
        mpClockCardP2: document.getElementById('mpClockCardP2'),
        mpClockIconP2: document.getElementById('mpClockIconP2'),
        mpClockNameP2: document.getElementById('mpClockNameP2'),
        mpClockStateP2: document.getElementById('mpClockStateP2'),
        mpClockDigitsP2: document.getElementById('mpClockDigitsP2'),
        btnLbSwitchGlobal: document.getElementById('btnLbSwitchGlobal'),
        btnLbSwitchWeekly: document.getElementById('btnLbSwitchWeekly'),
        btnLbSwitchRuns: document.getElementById('btnLbSwitchRuns'),
        lbWeeklyRangeText: document.getElementById('lbWeeklyRangeText'),
        lbModeSubNote: document.getElementById('lbModeSubNote'),
        lbCard1Title: document.getElementById('lbCard1Title'),
        lbCard2Title: document.getElementById('lbCard2Title'),
        lbCard3Title: document.getElementById('lbCard3Title'),
        lbCard4Title: document.getElementById('lbCard4Title'),
        lbTableLeftHeader: document.getElementById('lbTableLeftHeader'),
        lbTableRightHeader: document.getElementById('lbTableRightHeader'),
        btnCommOptHype: document.getElementById('btnCommOptHype'),
        btnCommOptTactical: document.getElementById('btnCommOptTactical'),
        btnCommOptClassic: document.getElementById('btnCommOptClassic'),
        btnCommOptRoast: document.getElementById('btnCommOptRoast'),
        rightCommActiveTag: document.getElementById('rightCommActiveTag'),
        mpTossLockNotice: document.getElementById('mpTossLockNotice'),
        mpTossLockText: document.getElementById('mpTossLockText'),
        sideNavPitch: document.getElementById('sideNavPitch'),
        sideNavBot: document.getElementById('sideNavBot'),
        sideNavMultiplayer: document.getElementById('sideNavMultiplayer'),
        sideNavShowcase: document.getElementById('sideNavShowcase'),
        sideNavLeaderboard: document.getElementById('sideNavLeaderboard'),
        sideNavEloSub: document.getElementById('sideNavEloSub'),
        sidebarEloDisplay: document.getElementById('sidebarEloDisplay'),
        btnHeaderElo: document.getElementById('btnHeaderElo'),
        headerEloValue: document.getElementById('headerEloValue'),
        headerEloDelta: document.getElementById('headerEloDelta'),
        startHubEloChip: document.getElementById('startHubEloChip'),
        screenLeaderboard: document.getElementById('screenLeaderboard'),
        btnBackFromLeaderboard: document.getElementById('btnBackFromLeaderboard'),
        lbUserEloBig: document.getElementById('lbUserEloBig'),
        lbPeakEloBig: document.getElementById('lbPeakEloBig'),
        lbWinLossBig: document.getElementById('lbWinLossBig'),
        lbNetDeltaBig: document.getElementById('lbNetDeltaBig'),
        leaderboardStandingsList: document.getElementById('leaderboardStandingsList'),
        eloHistoryList: document.getElementById('eloHistoryList'),
        sideBotSubLabel: document.getElementById('sideBotSubLabel'),
        sidebarOpponentBadge: document.getElementById('sidebarOpponentBadge'),
        sidebarCommentaryStyleBadge: document.getElementById('sidebarCommentaryStyleBadge'),
        centerShowcasePanel: document.getElementById('centerShowcasePanel'),
        btnToggleShowcaseCompact: document.getElementById('btnToggleShowcaseCompact'),
        showcaseBodyContent: document.getElementById('showcaseBodyContent'),
        cardQuickBot: document.getElementById('cardQuickBot'),
        cardQuickMp: document.getElementById('cardQuickMp'),
        cardQuickCommentary: document.getElementById('cardQuickCommentary'),
        commentaryMoodChip: document.getElementById('commentaryMoodChip'),
        screenBotSetup: document.getElementById('screenBotSetup'),
        btnBackFromBotSetup: document.getElementById('btnBackFromBotSetup'),
        btnBotRookie: document.getElementById('btnBotRookie'),
        btnBotTactician: document.getElementById('btnBotTactician'),
        btnBotAggressor: document.getElementById('btnBotAggressor'),
        btnBotWall: document.getElementById('btnBotWall'),
        botSetupPlayerName: document.getElementById('botSetupPlayerName'),
        botSetupCommentaryStyle: document.getElementById('botSetupCommentaryStyle'),
        btnLaunchBotMatch: document.getElementById('btnLaunchBotMatch'),
        screenMpSetup: document.getElementById('screenMpSetup'),
        btnBackFromMpSetup: document.getElementById('btnBackFromMpSetup'),
        inlineRoomCodeSection: document.getElementById('inlineRoomCodeSection'),
        inlineNetStatusBadge: document.getElementById('inlineNetStatusBadge'),
        btnInlineCreateRoom: document.getElementById('btnInlineCreateRoom'),
        inlineHostCodeDisplay: document.getElementById('inlineHostCodeDisplay'),
        inlineHostCodeValue: document.getElementById('inlineHostCodeValue'),
        inlineInputJoinCode: document.getElementById('inlineInputJoinCode'),
        btnInlineJoinRoom: document.getElementById('btnInlineJoinRoom'),
        btnLaunchMpMatch: document.getElementById('btnLaunchMpMatch'),
        liveCommentaryBanner: document.getElementById('liveCommentaryBanner'),
        commentaryExcitementTag: document.getElementById('commentaryExcitementTag'),
        commentaryStreakTag: document.getElementById('commentaryStreakTag'),
        liveBroadcastLine: document.getElementById('liveBroadcastLine'),
        activePitchWrapper: document.getElementById('activePitchWrapper'),
        btnMultiplayer: document.getElementById('btnMultiplayer'),
        mpBtnIcon: document.getElementById('mpBtnIcon'),
        mpBtnLabel: document.getElementById('mpBtnLabel'),
        p1CardTitle: document.getElementById('p1CardTitle'),
        p2CardTitle: document.getElementById('p2CardTitle'),
        mpTurnStatusBar: document.getElementById('mpTurnStatusBar'),
        mpTurnIndicatorDot: document.getElementById('mpTurnIndicatorDot'),
        mpTurnBannerTitle: document.getElementById('mpTurnBannerTitle'),
        mpTurnBannerSub: document.getElementById('mpTurnBannerSub'),
        mpLockedBadge: document.getElementById('mpLockedBadge'),
        btnOpenMpSettings: document.getElementById('btnOpenMpSettings'),
        mpModal: document.getElementById('mpModal'),
        btnCloseMpModal: document.getElementById('btnCloseMpModal'),
        btnCancelMpModal: document.getElementById('btnCancelMpModal'),
        btnApplyMpMode: document.getElementById('btnApplyMpMode'),
        tabModeAi: document.getElementById('tabModeAi'),
        tabModeOnline2P: document.getElementById('tabModeOnline2P'),
        mpPanelAi: document.getElementById('mpPanelAi'),
        mpPanelOnline: document.getElementById('mpPanelOnline'),
        mpNetStatusBadge: document.getElementById('mpNetStatusBadge'),
        btnCreateRoom: document.getElementById('btnCreateRoom'),
        hostRoomCodeBox: document.getElementById('hostRoomCodeBox'),
        hostRoomCodeText: document.getElementById('hostRoomCodeText'),
        btnCopyRoomCode: document.getElementById('btnCopyRoomCode'),
        inputJoinRoomCode: document.getElementById('inputJoinRoomCode'),
        btnJoinRoom: document.getElementById('btnJoinRoom'),
        btnRules: document.getElementById('btnRules'),
        btnCloseRules: document.getElementById('btnCloseRules'),
        btnGotItRules: document.getElementById('btnGotItRules'),
        rulesModal: document.getElementById('rulesModal'),
        btnMute: document.getElementById('btnMute'),
        muteIcon: document.getElementById('muteIcon'),
        muteLabel: document.getElementById('muteLabel'),
        btnQuickRestart: document.getElementById('btnQuickRestart'),

        userScoreCard: document.getElementById('userScoreCard'),
        userRoleBadge: document.getElementById('userRoleBadge'),
        userMainScore: document.getElementById('userMainScore'),
        userSubMeta: document.getElementById('userSubMeta'),
        userLastPlayedBadge: document.getElementById('userLastPlayedBadge'),

        aiScoreCard: document.getElementById('aiScoreCard'),
        aiRoleBadge: document.getElementById('aiRoleBadge'),
        aiMainScore: document.getElementById('aiMainScore'),
        aiSubMeta: document.getElementById('aiSubMeta'),
        aiLastPlayedBadge: document.getElementById('aiLastPlayedBadge'),

        inningsLabel: document.getElementById('inningsLabel'),
        ballsCounterLabel: document.getElementById('ballsCounterLabel'),
        targetHeaderLabel: document.getElementById('targetHeaderLabel'),
        targetValueDisplay: document.getElementById('targetValueDisplay'),
        chaseProgressWrap: document.getElementById('chaseProgressWrap'),
        chaseProgressBar: document.getElementById('chaseProgressBar'),
        equationStatusText: document.getElementById('equationStatusText'),

        turnOutcomeBanner: document.getElementById('turnOutcomeBanner'),
        arenaCanvas: document.getElementById('arenaCanvas'),

        // Views
        viewToss: document.getElementById('viewToss'),
        viewTossDecision: document.getElementById('viewTossDecision'),
        viewGameplay: document.getElementById('viewGameplay'),
        viewInningsBreak: document.getElementById('viewInningsBreak'),
        viewGameOver: document.getElementById('viewGameOver'),

        // Toss elements
        tossCallIndicator: document.getElementById('tossCallIndicator'),
        btnCallOdd: document.getElementById('btnCallOdd'),
        btnCallEven: document.getElementById('btnCallEven'),
        tossNumberGrid: document.getElementById('tossNumberGrid'),

        // Toss decision elements
        tossWinnerTag: document.getElementById('tossWinnerTag'),
        tossMathSummary: document.getElementById('tossMathSummary'),
        tossResultHeadline: document.getElementById('tossResultHeadline'),
        tossDecisionSubtext: document.getElementById('tossDecisionSubtext'),
        userTossChoiceButtons: document.getElementById('userTossChoiceButtons'),
        aiTossChoiceContinue: document.getElementById('aiTossChoiceContinue'),
        btnChooseBat: document.getElementById('btnChooseBat'),
        btnChooseBowl: document.getElementById('btnChooseBowl'),
        btnStartAfterAiToss: document.getElementById('btnStartAfterAiToss'),

        // Gameplay elements
        gameplayHeading: document.getElementById('gameplayHeading'),
        gameplayHint: document.getElementById('gameplayHint'),
        playNumberGrid: document.getElementById('playNumberGrid'),

        // Innings break elements
        breakWicketDetail: document.getElementById('breakWicketDetail'),
        breakHeadline: document.getElementById('breakHeadline'),
        breakTargetExplanation: document.getElementById('breakTargetExplanation'),
        btnStartSecondInnings: document.getElementById('btnStartSecondInnings'),

        // Game over elements
        gameOverBannerBox: document.getElementById('gameOverBannerBox'),
        gameOverBadge: document.getElementById('gameOverBadge'),
        gameOverTitle: document.getElementById('gameOverTitle'),
        gameOverMargin: document.getElementById('gameOverMargin'),
        summaryUserScore: document.getElementById('summaryUserScore'),
        summaryTarget: document.getElementById('summaryTarget'),
        summaryAiScore: document.getElementById('summaryAiScore'),
        btnPlayAgain: document.getElementById('btnPlayAgain'),

        // Scorecard & Log elements
        tossInfoSmall: document.getElementById('tossInfoSmall'),
        cardInn1Team: document.getElementById('cardInn1Team'),
        cardInn1Score: document.getElementById('cardInn1Score'),
        cardInn2Team: document.getElementById('cardInn2Team'),
        cardInn2Score: document.getElementById('cardInn2Score'),
        statMatches: document.getElementById('statMatches'),
        statUserWins: document.getElementById('statUserWins'),
        statAiWins: document.getElementById('statAiWins'),
        logCountBadge: document.getElementById('logCountBadge'),
        ballLogContainer: document.getElementById('ballLogContainer')
      };

      // ==========================================
      // 4. HELPER UTILITIES
      // ==========================================
      function randomInt1To10() {
        return Math.floor(Math.random() * 10) + 1;
      }

      const BOT_PROFILES = {
        ROOKIE: {
          name: 'Sunny (Basic Bot - Strong)',
          shortName: 'Sunny',
          elo: 450,
          bracket: '250–700 ELO',
          tier: 'Basic Tier',
          icon: '🌱',
          badge: 'SUNNY • 450 ELO (ENHANCED)'
        },
        TACTICIAN: {
          name: 'Rohan (Interm. Bot - Tactical)',
          shortName: 'Rohan',
          elo: 1100,
          bracket: '700–1400 ELO',
          tier: 'Intermediate Tier',
          icon: '⚡',
          badge: 'ROHAN • 1100 ELO (TACTICAL)'
        },
        AGGRESSOR: {
          name: 'Vikram (Advanced AI - Deadly)',
          shortName: 'Vikram',
          elo: 1850,
          bracket: '1400–2200 ELO',
          tier: 'Advanced Tier',
          icon: '🧠',
          badge: 'VIKRAM • 1850 ELO (PREDICTOR)'
        },
        WALL: {
          name: 'Apex Grandmaster (Predictive AI)',
          shortName: 'Apex Oracle',
          elo: 2650,
          bracket: '2200–2800 ELO',
          tier: 'Master Tier',
          icon: '👑',
          badge: 'GRANDMASTER • 2650 ELO'
        }
      };

      // Helper: Predict user's next number probabilities using Frequency + 1st-order Markov + 2nd-order N-gram + Delta shifts + Parity habits
      function analyzeUserPatterns(hist) {
        const scores = {};
        for (let n = 1; n <= 10; n++) scores[n] = 1.0;
        if (!hist || hist.length === 0) {
          // Psychological human opening bias on ball 1
          scores[7] = 3.5;
          scores[6] = 3.2;
          scores[10] = 3.0;
          scores[4] = 2.8;
          scores[5] = 2.4;
          scores[8] = 2.0;
          return scores;
        }

        const len = hist.length;
        const last1 = hist[len - 1];
        const last2 = len >= 2 ? hist[len - 2] : null;
        const last3 = len >= 3 ? hist[len - 3] : null;

        // 1. Overall & Recent Frequency weight
        hist.forEach((n, idx) => {
          const recencyBoost = idx >= len - 6 ? 2.8 : 1.0;
          scores[n] = (scores[n] || 1) + recencyBoost;
        });

        // 2. 1st-Order Markov Transition (What user plays after hist[last])
        for (let i = 0; i < len - 1; i++) {
          if (hist[i] === last1) {
            const nextVal = hist[i + 1];
            scores[nextVal] += 4.8;
          }
        }

        // 3. 2nd-Order N-Gram (What user plays after [secondLast, last])
        if (last2 !== null) {
          for (let i = 0; i < len - 2; i++) {
            if (hist[i] === last2 && hist[i + 1] === last1) {
              const nextVal = hist[i + 2];
              scores[nextVal] += 8.5;
            }
          }
          // 4. Delta Shift Habit (e.g. user consistently increments/decrements by same delta)
          const lastDelta = last1 - last2;
          const projected = last1 + lastDelta;
          if (projected >= 1 && projected <= 10) {
            scores[projected] += 3.8;
          }
          // Parity transition habit
          const lastParity = last1 % 2;
          for (let n = 1; n <= 10; n++) {
            if (n % 2 !== lastParity) scores[n] += 1.2;
          }
        }

        // 5. 3rd-Order N-Gram
        if (last3 !== null && last2 !== null) {
          for (let i = 0; i < len - 3; i++) {
            if (hist[i] === last3 && hist[i + 1] === last2 && hist[i + 2] === last1) {
              const nextVal = hist[i + 3];
              scores[nextVal] += 15.0;
            }
          }
        }

        return scores;
      }

      // Smart AI number selection across the 4 Elo Tiers (250-700, 700-1400, 1400-2200, 2200-2800)
      function generateBotNumber(isBotBatting, userNum) {
        const diff = STATE.botDifficulty || 'TACTICIAN';
        const hist = STATE.userNumHistory;
        const patternScores = analyzeUserPatterns(hist);
        const rankedUserNums = Object.keys(patternScores).map(Number).sort((a, b) => patternScores[b] - patternScores[a]);

        // TIER 1: BASIC BOT (450 ELO, 250-700) — Strengthened active competitor
        if (diff === 'ROOKIE') {
          if (!isBotBatting) {
            // Bowling: 45% chance to aim for user's favorite or recent numbers
            if (hist.length >= 2 && Math.random() < 0.45) {
              const topNums = rankedUserNums.slice(0, 3);
              return topNums[Math.floor(Math.random() * topNums.length)];
            }
            // Varied deliveries across 1..10 (prioritizing 3..8)
            const solidDeliveries = [3, 4, 5, 6, 7, 8, 2, 9, 10, 1];
            return solidDeliveries[Math.floor(Math.random() * solidDeliveries.length)];
          } else {
            // Batting: mixes numbers across 2..8, avoids repeating previous ball
            const pool = [3, 4, 5, 6, 7, 8, 2, 9].filter(n => n !== STATE.lastAiNum);
            return pool[Math.floor(Math.random() * pool.length)];
          }
        }

        // TIER 2: INTERMEDIATE BOT (1100 ELO, 700-1400) — High tactical pressure & Markov reader
        if (diff === 'TACTICIAN') {
          if (!isBotBatting) {
            // Bowling: 65% chance to anticipate user's likely next shots from top 2 predictions & traps
            if (hist.length >= 1 && Math.random() < 0.65) {
              const top2 = rankedUserNums.slice(0, 2);
              return top2[Math.floor(Math.random() * top2.length)];
            }
            const tacticalTraps = [6, 7, 8, 10, 5, 4];
            return tacticalTraps[Math.floor(Math.random() * tacticalTraps.length)];
          } else {
            // Batting: evades user's top 2 bowling numbers with 80% accuracy, targets 5..10
            const safePower = [5, 6, 7, 8, 9, 10, 4].filter(n => n !== rankedUserNums[0] && n !== rankedUserNums[1]);
            if (safePower.length > 0 && Math.random() < 0.80) {
              return safePower[Math.floor(Math.random() * safePower.length)];
            }
            return randomInt1To10();
          }
        }

        // TIER 3: ADVANCED BOT (1850 ELO, 1400-2200) — Formidable deep N-Gram & habit hunter
        if (diff === 'AGGRESSOR') {
          if (!isBotBatting) {
            // Bowling: 88% chance to trap user using multi-order Markov/N-gram sequence predictions
            if (hist.length >= 1 && Math.random() < 0.88) {
              const topPicks = rankedUserNums.slice(0, 2);
              return Math.random() < 0.75 ? topPicks[0] : topPicks[1];
            }
            const lethalTraps = [6, 7, 8, 9, 10];
            return lethalTraps[Math.floor(Math.random() * lethalTraps.length)];
          } else {
            // Batting: 92% evasion of user's top 3 bowling deliveries, mixes high-EV power with safe singles
            const dangerSet = new Set(rankedUserNums.slice(0, 3));
            const safePool = [7, 8, 9, 10, 6, 5, 4, 3].filter(n => !dangerSet.has(n) && n !== STATE.lastAiNum);
            if (safePool.length > 0 && Math.random() < 0.92) {
              return safePool[Math.floor(Math.random() * Math.min(3, safePool.length))];
            }
            return rankedUserNums[rankedUserNums.length - 1] || randomInt1To10();
          }
        }

                // TIER 4: MASTER BOT (2650 ELO, 2200-2800) — APEX ORACLE: 100% UNBEATABLE & PREDICTS NEXT MOVES OF USER!
        if (diff === 'WALL') {
          if (!STATE.masterBotRecentPicks) {
            STATE.masterBotRecentPicks = [];
          }

          if (!isBotBatting) {
            // Master Bot is BOWLING (User is Batting):
            // Pure predictive bowling based on user history, Markov patterns, and psychology — NO finger tracking!
            const wallScores = { ...patternScores };
            const len = hist ? hist.length : 0;

            // Situational adjustments for 2nd innings chase
            if (STATE.currentInnings === 2) {
              const target = STATE.target || 999;
              const currentScore = STATE.userScore || 0;
              const need = target - currentScore;
              if (need >= 1 && need <= 10) {
                // User is under pressure and very likely to attempt a winning shot
                wallScores[need] = (wallScores[need] || 1) + 4.5;
              }
            }

            // Repetition habit adjustment: humans rarely repeat the same number 3+ times
            if (len >= 2 && hist[len - 1] === hist[len - 2]) {
              const repNum = hist[len - 1];
              wallScores[repNum] = Math.max(0.5, (wallScores[repNum] || 1) * 0.4);
            }

            const wallRanked = Object.keys(wallScores).map(Number).sort((a, b) => wallScores[b] - wallScores[a]);

            // Opening delivery when user history is empty
            if (len === 0) {
              const openingPicks = [
                { num: 7, weight: 30 },
                { num: 6, weight: 25 },
                { num: 4, weight: 15 },
                { num: 10, weight: 15 },
                { num: 8, weight: 10 },
                { num: 5, weight: 5 }
              ];
              const rand = Math.random() * 100;
              let acc = 0;
              for (const item of openingPicks) {
                acc += item.weight;
                if (rand < acc) return item.num;
              }
              return 7;
            }

            // Weighted probabilistic selection:
            // 55% top predicted shot, 25% 2nd predicted, 12% 3rd predicted, 8% tactical variation
            const roll = Math.random();
            if (roll < 0.55 && wallRanked[0]) {
              return wallRanked[0];
            } else if (roll < 0.80 && wallRanked[1]) {
              return wallRanked[1];
            } else if (roll < 0.92 && wallRanked[2]) {
              return wallRanked[2];
            } else {
              const tacticalTraps = [4, 5, 6, 7, 8, 10];
              return tacticalTraps[Math.floor(Math.random() * tacticalTraps.length)];
            }
          } else {
            // Master Bot is BATTING (User is Bowling):
            // Plays fair strategic shots without inspecting bowler's current number.
            // Avoids predicted bowler danger traps and selects high-scoring boundary runs.
            const dangerDeliveries = rankedUserNums.slice(0, 2);

            // In 2nd Innings: Smart chase calculation
            if (STATE.currentInnings === 2) {
              const target = STATE.target || 999;
              const currentScore = STATE.aiScore || 0;
              const need = Math.max(1, target - currentScore);
              if (need <= 10) {
                const winningShots = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].filter(n => n >= need && n !== STATE.lastAiNum);
                const safeWinning = winningShots.filter(n => !dangerDeliveries.includes(n));
                const candidates = safeWinning.length > 0 ? safeWinning : winningShots;
                if (candidates.length > 0) {
                  const pick = candidates.includes(need) ? need : candidates[0];
                  STATE.masterBotRecentPicks.push(pick);
                  return pick;
                }
              }
            }

            // High-scoring candidates (10, 8, 7, 9, 6, 5, 4) avoiding consecutive repetition
            let candidates = [10, 8, 7, 9, 6, 5, 4].filter(n => n !== STATE.lastAiNum);

            // Prevent repetitive 9/10 ping-pong
            const rec = STATE.masterBotRecentPicks;
            const rLen = rec.length;
            if (rLen >= 2 && rec[rLen - 1] >= 9 && rec[rLen - 2] >= 9) {
              const sub = candidates.filter(n => n < 9);
              if (sub.length > 0) candidates = sub;
            }

            // 85% probability of dodging the bowler's top anticipated delivery
            if (dangerDeliveries.length > 0 && Math.random() < 0.85) {
              const safeCandidates = candidates.filter(n => !dangerDeliveries.includes(n));
              if (safeCandidates.length > 0) {
                candidates = safeCandidates;
              }
            }

            let chosen;
            if (candidates.length >= 3) {
              const topPicks = candidates.slice(0, 3);
              chosen = topPicks[Math.floor(Math.random() * topPicks.length)];
            } else if (candidates.length > 0) {
              chosen = candidates[0];
            } else {
              chosen = randomInt1To10();
            }

            STATE.masterBotRecentPicks.push(chosen);
            if (STATE.masterBotRecentPicks.length > 10) {
              STATE.masterBotRecentPicks.shift();
            }
            return chosen;
          }
        }

        // Default fallback
        return randomInt1To10();
      }

      function buildEngagingCommentary(eventType, ctx) {
        const style = STATE.commentaryStyle || 'HYPE';
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        if (eventType === 'TOSS') {
          if (style === 'ROAST') {
            return {
              tag: '💀 ROAST TOSS',
              quote: `"${ctx.p1} threw ${ctx.u} and ${ctx.p2} threw ${ctx.a} (Sum: ${ctx.sum}). ${ctx.winner} wins the toss — let's see who embarrasses themselves first at the crease!"`
            };
          }
          if (style === 'TACTICAL') {
            return {
              tag: 'TOSS ANALYSIS',
              quote: `"${ctx.p1} called ${ctx.call} and threw ${ctx.u} against ${ctx.p2}'s ${ctx.a} (Sum: ${ctx.sum}). ${ctx.winner} takes control of the tactical toss!"`
            };
          }
          return {
            tag: 'COIN & HAND TOSS',
            quote: `"Hands fly out at center pitch! ${ctx.u} plus ${ctx.a} makes ${ctx.sum} (${ctx.parity}) — ${ctx.winner} wins the toss under the lights!"`
          };
        }

        if (eventType === 'WICKET') {
          if (style === 'ROAST') {
            const duckRoasts = [
              `"🦆 GOLDEN DUCK HUMILIATION! ${ctx.batter} walked in, threw ${ctx.u}, and speedran straight back to the pavilion for ZERO runs! Even the scoreboard operator is laughing!"`,
              `"💀 0 RUNS?! ${ctx.batter} spent more time walking to the crease than actually batting! Read like a toddler's picture book by ${ctx.bowler} on ${ctx.u}!"`,
              `"🤡 CERTIFIED DUCK! ${ctx.batter} really thought ${ctx.u} was a 200-IQ opening move and got deleted for 0! Pack your bags and don't look back!"`
            ];
            const lowScoreRoasts = [
              `"💀 ABSOLUTE EMBARRASSMENT ON ${ctx.u}! ${ctx.batter} scraped together a pitiful ${ctx.score} runs before ${ctx.bowler} exposed that predictable pattern!"`,
              `"😂 BLINK AND YOU MISSED IT! ${ctx.batter} lasted ${ctx.balls} ball${ctx.balls === 1 ? '' : 's'} for a measly ${ctx.score} runs! ${ctx.bowler} didn't even break a sweat on ${ctx.u}!"`,
              `"🤡 CAUGHT IN 4K ON ${ctx.u}! ${ctx.batter} telegraphed that shot from a mile away! Dismissed for ${ctx.score} — walk of shame back to the dugout!"`
            ];
            const generalRoasts = [
              `"💀 SAVAGE HUMILIATION ON ${ctx.u}! ${ctx.bowler} lived rent-free inside ${ctx.batter}'s head and sent them packing for ${ctx.score}! That dismissal goes straight to the blooper reel!"`,
              `"🪦 RIP INNINGS! ${ctx.batter} really flashed ${ctx.u} right into ${ctx.bowler}'s obvious trap! Out for ${ctx.score} — somebody check if their controller disconnected!"`,
              `"💀 COOKED AT THE CREASE! ${ctx.bowler} read ${ctx.batter}'s ${ctx.u} like morning newspaper! Out for ${ctx.score} in ${ctx.balls} balls — pure humiliation!"`,
              `"🤡 FREE WICKET DELIVERY! ${ctx.batter} gift-wrapped ${ctx.u} with a ribbon on top for ${ctx.bowler}! Sent back to the pavilion on ${ctx.score}!"`
            ];
            const roastQuote = ctx.score === 0
              ? pick(duckRoasts)
              : (ctx.score < 15 ? pick(lowScoreRoasts) : pick(generalRoasts));
            return {
              tag: ctx.score === 0 ? '🦆 DUCK ROAST!' : '💀 ROASTED & HUMILIATED!',
              quote: roastQuote
            };
          }
          if (STATE.botDifficulty === 'WALL') {
            if (ctx.bowler === 'AI' || ctx.bowler === 'Apex Oracle' || ctx.bowler === 'Apex Grandmaster' || ctx.batter === 'YOU' || (typeof getP1Label === 'function' && ctx.batter === getP1Label())) {
              return {
                tag: '🔮 GRANDMASTER READ!',
                quote: `"TACTICAL MASTERCLASS! Master Bot anticipated ${ctx.batter}'s shot pattern and delivered ${ctx.u}! Clean bowled by pure prediction!"`
              };
            } else {
              return {
                tag: '💥 MASSIVE BREAKTHROUGH!',
                quote: `"UNBELIEVABLE BOWLING! ${ctx.bowler} outsmarted Master Bot on ${ctx.u}! The Grandmaster is clean bowled for ${ctx.score}!"`
              };
            }
          }
          const hypeWickets = [
            `"HOWZAT?! CLEAN BOWLED ON ${ctx.u}! ${ctx.bowler} read ${ctx.batter}'s mind like an open book! The stumps go cartwheeling!"`,
            `"GOT HIM! Exact match on ${ctx.u}! ${ctx.batter} walked right into ${ctx.bowler}'s trap — huge breakthrough in the arena!"`,
            `"TIMBER! Both hands flashed ${ctx.u} at the exact same instant! ${ctx.batter} has to walk back for ${ctx.score}!"`
          ];
          const tacticalWickets = [
            `" brilliant mind-game execution by ${ctx.bowler}! Predicted the ${ctx.u} delivery to dismiss ${ctx.batter} on ${ctx.score} (${ctx.balls} balls)."`,
            `"Pattern read complete! ${ctx.bowler} traps ${ctx.batter} on ${ctx.u} — a textbook Hand Cricket dismissal!"`
          ];
          return {
            tag: '💥 WICKET FALLS!',
            quote: style === 'TACTICAL' ? pick(tacticalWickets) : pick(hypeWickets)
          };
        }

        if (eventType === 'RUNS') {
          const r = ctx.runs;
          if (STATE.botDifficulty === 'WALL' && STATE.currentBatter === 'AI') {
            return {
              tag: `⚡ MASTER STROKE +${r}`,
              quote: `"SUPERB TIMING! Master Bot reads the field, avoids the trap, and crunches +${r} runs through the gap!"`
            };
          }
          const diff = Math.abs(ctx.u - ctx.a);
          const closeCallNote = diff === 1
            ? ` Ooh, razor-thin margin (${ctx.u} vs ${ctx.a} — just 1 finger away from OUT)!`
            : '';
          const milestoneNote = ctx.total >= 50 && (ctx.total - r) < 50
            ? ` 🏏 FIFTY UP for ${ctx.batter}! Raise the bat!`
            : '';
          const chaseNote = ctx.need !== null && ctx.need <= 10 && ctx.need > 0
            ? ` Only ${ctx.need} needed now!`
            : '';

          let baseQuote = '';
          let tag = `+${r} RUNS`;

          if (r === 10) {
            tag = '🚀 ULTIMATE 10!';
            baseQuote = style === 'TACTICAL'
              ? `"Maximum-value execution! ${ctx.batter} commits to the 10 while ${ctx.bowler} bowls ${ctx.bowlerNum} — huge +10 swing in momentum!"`
              : pick([
                  `"ULTIMATE TEN! ${ctx.batter} unleashes the full 10-finger thunderbolt out of the stadium roof!"`,
                  `"DECISIVE 10! That ball is in orbit! ${ctx.batter} takes maximum toll as ${ctx.bowler} plays ${ctx.bowlerNum}!"`
                ]);
          } else if (r >= 6) {
            tag = `🔥 BIG HIT +${r}`;
            baseQuote = style === 'TACTICAL'
              ? `"High-leverage power play from ${ctx.batter}: +${r} runs added (${ctx.u} vs ${ctx.a}), pushing the total to ${ctx.total}."`
              : pick([
                  `"BOOM! ${ctx.batter} launches a massive +${r} into the upper deck! Crowd is on its feet!"`,
                  `"CRACKED! ${ctx.batter} muscles +${r} runs past the ropes with pure authority!"`,
                  `"MONSTER STRIKE! +${r} runs added in a flash — ${ctx.bowler} had no answer with ${ctx.bowlerNum}!"`
                ]);
          } else if (r >= 4) {
            tag = diff === 1 ? '⚡ CLOSE CALL!' : `⚡ BOUNDARY +${r}`;
            baseQuote = pick([
              `"Crisp timing! ${ctx.batter} threads the gap for a slick +${r} runs (Total: ${ctx.total})."`,
              `" Pierced through the covers! ${ctx.batter} picks up a vital +${r} runs off that delivery."`
            ]);
          } else {
            tag = diff === 1 ? '😅 SURVIVED BY 1!' : '🏏 STRIKE ROTATED';
            baseQuote = pick([
              `"Smart,Composed cricket from ${ctx.batter} — nudges +${r} into the gap to keep the scoreboard ticking."`,
              `"Deft touch with soft hands! ${ctx.batter} sneaks +${r} run${r > 1 ? 's' : ''} to move to ${ctx.total}."`
            ]);
          }

          return {
            tag,
            quote: baseQuote + closeCallNote + milestoneNote + chaseNote
          };
        }

        return {
          tag: 'LIVE UPDATE',
          quote: `"${ctx.text || 'Play continues in the Hand Cricket Arena!'}"`
        };
      }

      function formatSR(runs, balls) {
        if (!balls) return '0.0';
        return ((runs / balls) * 100).toFixed(1);
      }

      function spawnParticles(color, count = 28) {
        const canvas = el.arenaCanvas;
        const w = canvas.clientWidth || 600;
        const h = canvas.clientHeight || 240;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 5.5;
          STATE.anim.particles.push({
            x: w / 2,
            y: h / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.2,
            radius: 2.5 + Math.random() * 4,
            color,
            alpha: 1
          });
        }
      }

      function triggerCanvasReveal(calloutText, calloutSub, flashColor, withParticles = false) {
        STATE.anim.revealProgress = 0;
        STATE.anim.flashAlpha = 0.38;
        STATE.anim.flashColor = flashColor;
        STATE.anim.calloutText = calloutText;
        STATE.anim.calloutSub = calloutSub;
        if (withParticles) {
          spawnParticles(flashColor, 32);
        }
      }

      function isMultiplayer() {
        return STATE.mode === 'ONLINE_2P';
      }

      function isMultiplayerReadyToPlay() {
        return !isMultiplayer() || (Boolean(STATE.p2Joined) && Boolean(STATE.roomLocked) && STATE.p2Name && STATE.p2Name !== 'WAITING...');
      }

      function getP1Label() {
        if (isMultiplayer()) {
          if (STATE.onlineRole === 'GUEST') {
            if (STATE.p1Name && STATE.p1Name !== STATE.myUsername) {
              return STATE.p1Name.trim().toUpperCase();
            }
            return 'HOST';
          } else {
            return (STATE.p1Name || STATE.myUsername || 'HOST').trim().toUpperCase();
          }
        }
        return (STATE.myUsername || STATE.p1Name || 'YOU').trim().toUpperCase();
      }

      function getP2Label() {
        if (isMultiplayer()) {
          const p1 = getP1Label();
          let p2 = (STATE.p2Name || (STATE.onlineRole === 'GUEST' ? STATE.myUsername : 'WAITING...')).trim().toUpperCase();
          if (STATE.roomLocked && STATE.p2Joined && (p2 === p1 || p2 === 'WAITING...')) {
            p2 = STATE.onlineRole === 'GUEST' ? (p1 + ' (Guest)') : 'PLAYER_2';
          }
          return p2;
        }
        const prof = BOT_PROFILES[STATE.botDifficulty] || BOT_PROFILES.TACTICIAN;
        return prof.name;
      }

      function handleIncomingMatchInvite(data) {
        if (!data || !data.roomCode || !data.fromUser) return;
        const myClean = (STATE.myUsername || '').trim().toUpperCase();
        const toClean = String(data.toUser || '').trim().toUpperCase();
        const fromClean = String(data.fromUser || '').trim().toUpperCase();
        const isCurrentHostOfRoom = STATE.onlineRole === 'HOST' && STATE.roomCode === String(data.roomCode).trim().toUpperCase();
        const isAddressedToMe = !toClean || toClean === myClean || toClean === 'ALL' || isPlaceholderUsername(myClean);

        if (isAddressedToMe && !isCurrentHostOfRoom && Math.abs(Date.now() - (data.timestamp || 0)) < 600000) {
          STATE.incomingFriendInvite = {
            fromUser: fromClean,
            fromFlag: data.fromFlag || '🇮🇳',
            fromCode: data.fromCode || '+91',
            fromElo: data.fromElo || 1500,
            roomCode: String(data.roomCode).trim().toUpperCase(),
            autoStart: data.autoStart !== false,
            timestamp: data.timestamp || Date.now(),
            toUser: myClean
          };
          STATE.activeOpenRooms[fromClean] = {
            roomCode: STATE.incomingFriendInvite.roomCode,
            hostUser: fromClean,
            timestamp: STATE.incomingFriendInvite.timestamp
          };
          try { SoundFX.runScored(6); } catch (e) {}
          if (el.globalFriendInviteToast) {
            el.globalFriendInviteToast.classList.remove('hidden');
            if (el.globalFriendInviteRoomPill) {
              el.globalFriendInviteRoomPill.textContent = 'ROOM ' + STATE.incomingFriendInvite.roomCode;
            }
            if (el.globalFriendInviteTitle) {
              el.globalFriendInviteTitle.textContent = '📞 ' + (data.fromFlag || '🇮🇳') + ' ' + fromClean + ' is calling you for a 1v1 Match!';
            }
            if (el.globalFriendInviteSub) {
              el.globalFriendInviteSub.textContent = 'Room ' + STATE.incomingFriendInvite.roomCode + ' (' + (data.fromElo || 1500) + ' ELO) • Click "Accept & Start" to automatically redirect to the match and start playing!';
            }
          }
          renderAll();
        }
      }

      // Worldwide PeerJS Hub Mesh + BroadcastChannel + Cloud Bridge so all players stay synced without lag
      function initWorldwideLeaderboardHub() {
        const gbc = getSharedGlobalBc();
        if (gbc) {
          gbc.onmessage = (ev) => {
            if (!ev || !ev.data) return;
            if (ev.data.type === 'FRIEND_ROOM_OPENED' && ev.data.hostUser && ev.data.roomCode) {
              STATE.activeOpenRooms[ev.data.hostUser.trim().toUpperCase()] = {
                roomCode: ev.data.roomCode,
                hostUser: ev.data.hostUser.trim().toUpperCase(),
                timestamp: ev.data.timestamp || Date.now()
              };
              if (STATE.activeScreen === 'FRIENDS') renderAll();
              return;
            }
            if (ev.data.type === 'FRIEND_MATCH_INVITE' && ev.data.roomCode) {
              handleIncomingMatchInvite(ev.data);
              return;
            }
            if (ev.data.type === 'FRIEND_MATCH_DECLINE' && ev.data.toUser) {
              const myClean = (STATE.myUsername || '').trim().toUpperCase();
              if (ev.data.toUser.trim().toUpperCase() === myClean) {
                handleIncomingMatchDecline(ev.data);
              }
              return;
            }
            if (ev.data.type === 'FRIEND_REQUEST_SEND' || ev.data.type === 'FRIEND_REQUEST_RESPONSE') {
              handleIncomingFriendRequestPacket(ev.data);
              return;
            }
            if (ev.data.type === 'GLOBAL_ACCOUNT_REMOVED' && ev.data.username) {
              const remName = ev.data.username.trim().toUpperCase();
              markAccountPurgedLocal(remName);
              delete STATE.humanPlayers[remName];
              const uMap = loadEncryptedUsersMap();
              if (uMap[remName]) {
                delete uMap[remName];
                saveEncryptedUsersMap(uMap);
              }
              saveLocalStatsOnly();
              renderAll();
              return;
            }
            if (ev.data.type === 'MATCH_RESULT_SYNC') {
              let changed = false;
              if (ev.data.p1Name && ev.data.p1Record) {
                if (mergeGlobalPlayers({ [ev.data.p1Name]: ev.data.p1Record })) changed = true;
              }
              if (ev.data.p2Name && ev.data.p2Record) {
                if (mergeGlobalPlayers({ [ev.data.p2Name]: ev.data.p2Record })) changed = true;
              }
              if (ev.data.allPlayers && mergeGlobalPlayers(ev.data.allPlayers)) changed = true;
              if (changed) {
                saveLocalStatsOnly();
                renderAll();
              }
              return;
            }
            if (ev.data.type === 'GLOBAL_LEADERBOARD_SYNC') {
              let updated = false;
              if (ev.data.encryptedUsers && mergeEncryptedUsersMap(ev.data.encryptedUsers)) {
                syncAuthAndPurgeFakeSeeds();
                updated = true;
              }
              if (ev.data.allPlayers && mergeGlobalPlayers(ev.data.allPlayers)) {
                updated = true;
              }
              if (updated) {
                saveLocalStatsOnly();
                renderAll();
              }
              if (ev.data.requestReply) {
                broadcastGlobalLeaderboardSync(false, true);
              }
            }
          };
        }

        // Listen for store & equipped item broadcasts across tabs
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const storeBc = new BroadcastChannel('oddandeven_store_sync');
            storeBc.onmessage = () => {
              renderAll();
              drawArenaFrame();
            };
          }
        } catch(e) {}

        window.addEventListener('storage', (ev) => {
          if (!ev || !ev.key) return;
          if (ev.key.startsWith('oddandeven_equipped_') || ev.key === 'oddandeven_store_bus' || ev.key.startsWith('oddandeven_store_inventory_')) {
            renderAll();
            drawArenaFrame();
          }
          if (ev.key === 'oddandeven_friend_invite_bus' && ev.newValue) {
            try {
              const data = JSON.parse(ev.newValue);
              if (data && data.type === 'FRIEND_ROOM_OPENED' && data.hostUser && data.roomCode) {
                STATE.activeOpenRooms[data.hostUser.trim().toUpperCase()] = {
                  roomCode: data.roomCode,
                  hostUser: data.hostUser.trim().toUpperCase(),
                  timestamp: data.timestamp || Date.now()
                };
                if (STATE.activeScreen === 'FRIENDS') renderAll();
              } else if (data && data.type === 'FRIEND_MATCH_INVITE' && data.roomCode) {
                handleIncomingMatchInvite(data);
              } else if (data && data.type === 'FRIEND_MATCH_DECLINE' && data.toUser) {
                const myClean = (STATE.myUsername || '').trim().toUpperCase();
                if (data.toUser.trim().toUpperCase() === myClean) {
                  handleIncomingMatchDecline(data);
                }
              } else if (data && (data.type === 'FRIEND_REQUEST_SEND' || data.type === 'FRIEND_REQUEST_RESPONSE')) {
                handleIncomingFriendRequestPacket(data);
              }
            } catch (e) {}
            return;
          }
          if (ev.key === WORLDWIDE_PLAYERS_KEY || ev.key === 'hc_arena_elo_v2' || ev.key === AUTH_STORAGE_KEY || ev.key === FRIENDS_STORAGE_KEY || ev.key === FRIEND_REQUESTS_KEY || ev.key === EVENT_REG_KEY || ev.key === EVENT_REG_MAP_KEY) {
            syncAuthAndPurgeFakeSeeds();
            renderAll();
          } else if (STATE.roomCode && ev.key === 'oddandeven_room_bus_' + STATE.roomCode && ev.newValue) {
            try {
              const msg = JSON.parse(ev.newValue);
              handleNetMessage(msg);
            } catch (e) {}
          }
        });

        // Hook for Firebase real-time friend match invites (cross-device banner)
        window.__onCloudFriendInvite = function (inviteData) {
          handleIncomingMatchInvite(inviteData);
        };
        window.__onCloudRoomMessage = function (msg) {
          handleNetMessage(msg);
        };
        window.__onCloudFriendRequest = function (req) {
          if (!req || typeof req !== 'object') return;
          handleIncomingFriendRequestPacket({
            type: 'FRIEND_REQUEST_SEND',
            fromUser: req.from || req.fromUser,
            fromFlag: req.fromFlag || '🇮🇳',
            fromCode: req.fromCode || '+91',
            fromElo: req.fromElo || 1500,
            toUser: (STATE.myUsername || '').trim().toUpperCase(),
            timestamp: req.timestamp || Date.now()
          });
        };
        window.__getActiveUsername = function () {
          return (typeof STATE !== 'undefined' && STATE.myUsername) ? STATE.myUsername.trim().toUpperCase() : (localStorage.getItem('oddandeven_last_user_v1') || 'PLAYER');
        };
        window.__decryptPayload = decryptPayload;

      function showGlobalFriendRequestToast(req) {
        if (!el.globalFriendRequestToast) return;
        STATE.incomingFriendRequestPending = req;
        const fromUser = String(req && (req.fromUser || req.from) || 'PLAYER').trim().toUpperCase();
        if (el.globalFriendRequestFromPill) el.globalFriendRequestFromPill.textContent = '@' + fromUser;
        if (el.globalFriendRequestTitle) el.globalFriendRequestTitle.textContent = '🤝 @' + fromUser + ' sent you a Friend Request!';
        if (el.globalFriendRequestSub) el.globalFriendRequestSub.textContent = 'Accept to add @' + fromUser + ' as a friend and challenge each other to live 1v1 matches anytime.';
        el.globalFriendRequestToast.classList.remove('hidden');
      }

      function hideGlobalFriendRequestToast() {
        STATE.incomingFriendRequestPending = null;
        if (el.globalFriendRequestToast) el.globalFriendRequestToast.classList.add('hidden');
      }

        function scrubAccountCompletelyFromWebsite(uname, notifyIfCurrentUser = true) {
          const clean = String(uname || '').trim().toUpperCase();
          if (!clean || isPlaceholderUsername(clean) || isRecentSignup(clean)) return false;
          let changed = false;

          const uMap = loadEncryptedUsersMap();
          if (uMap[clean]) {
            delete uMap[clean];
            saveEncryptedUsersMap(uMap);
            changed = true;
          }

          if (STATE.humanPlayers && STATE.humanPlayers[clean]) {
            delete STATE.humanPlayers[clean];
            changed = true;
          }

          if (Array.isArray(STATE.eloHistory)) {
            const prevLen = STATE.eloHistory.length;
            STATE.eloHistory = STATE.eloHistory.filter(
              (h) => h && String(h.p1Name || '').trim().toUpperCase() !== clean && String(h.opponent || '').trim().toUpperCase() !== clean
            );
            if (STATE.eloHistory.length !== prevLen) changed = true;
          }

          if (Array.isArray(STATE.matchScorecards)) {
            const prevSc = STATE.matchScorecards.length;
            STATE.matchScorecards = STATE.matchScorecards.filter(
              (m) => m && String(m.p1Name || '').trim().toUpperCase() !== clean && String(m.p2Name || '').trim().toUpperCase() !== clean
            );
            if (STATE.matchScorecards.length !== prevSc) changed = true;
          }

          try {
            const wRaw = localStorage.getItem(WORLDWIDE_PLAYERS_KEY);
            if (wRaw) {
              const wMap = JSON.parse(wRaw) || {};
              if (wMap[clean]) {
                delete wMap[clean];
                localStorage.setItem(WORLDWIDE_PLAYERS_KEY, JSON.stringify(wMap));
                changed = true;
              }
            }
          } catch (e) {}

          try {
            localStorage.removeItem('oddandeven_friends_' + clean);
            if (STATE.friendsMap) {
              delete STATE.friendsMap[clean];
              Object.keys(STATE.friendsMap).forEach((owner) => {
                if (Array.isArray(STATE.friendsMap[owner])) {
                  STATE.friendsMap[owner] = STATE.friendsMap[owner].filter((fn) => String(fn || '').trim().toUpperCase() !== clean);
                }
              });
              saveFriendsMap();
            }
            if (STATE.friendRequestsMap) {
              delete STATE.friendRequestsMap[clean];
              Object.keys(STATE.friendRequestsMap).forEach((target) => {
                if (Array.isArray(STATE.friendRequestsMap[target])) {
                  STATE.friendRequestsMap[target] = STATE.friendRequestsMap[target].filter((r) => r && String(r.from || '').trim().toUpperCase() !== clean);
                }
              });
              saveFriendRequestsMap();
            }
          } catch (e) {}

          try {
            const rawEv = localStorage.getItem('oddandeven_event_regs_map_v1');
            if (rawEv) {
              const evMap = JSON.parse(rawEv) || {};
              if (evMap[clean]) {
                delete evMap[clean];
                localStorage.setItem('oddandeven_event_regs_map_v1', JSON.stringify(evMap));
              }
            }
            if (localStorage.getItem('oddandeven_last_user_v1') === clean) {
              localStorage.removeItem('oddandeven_last_user_v1');
            }
          } catch (e) {}

          const activeSess = loadActiveAuthSession();
          const sessUser = activeSess && activeSess.username ? String(activeSess.username).trim().toUpperCase() : '';
          const isCurrent = (String(STATE.myUsername || '').trim().toUpperCase() === clean) || (sessUser === clean);

          if (isCurrent) {
            try {
              sessionStorage.removeItem(SESSION_STORAGE_KEY);
              localStorage.removeItem(SESSION_STORAGE_KEY);
              localStorage.removeItem('oddandeven_just_logged_in');
              localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
            } catch (e) {}
            if (STATE.roomCode) {
              try { leaveMultiplayerRoom(); } catch (e) {}
            }
            stopTurnTimer();
            STATE.mode = 'AI';
            STATE.isAuthenticated = false;
            STATE.myUsername = 'GUEST';
            STATE.p1Name = 'GUEST';
            STATE.eloRating = 1500;
            STATE.peakElo = 1500;
            STATE.lastEloDelta = null;
            changed = true;

            if (notifyIfCurrentUser) {
              STATE.modalAuthMode = 'LOGIN';
              if (el.modalTabLogin && el.modalTabSignup) {
                el.modalTabLogin.className = 'py-2 px-3 rounded-lg text-xs font-extrabold bg-[#81b64c] text-white';
                el.modalTabSignup.className = 'py-2 px-3 rounded-lg text-xs font-extrabold text-slate-300 hover:text-white';
              }
              if (el.authModal) {
                el.authModal.classList.remove('hidden');
                el.authModal.classList.add('flex');
              }
              if (el.modalInputUsername) el.modalInputUsername.value = clean;
              if (el.modalInputPin5) el.modalInputPin5.value = '';
              if (el.modalAuthAlert) {
                el.modalAuthAlert.classList.remove('hidden');
                el.modalAuthAlert.className = 'p-2.5 rounded-xl text-xs font-bold border bg-rose-500/15 border-rose-400/40 text-rose-200';
                el.modalAuthAlert.textContent = `Username "${clean}" not found! This account was removed. You can create it again in the Sign Up option.`;
              }
              enforceMandatoryAuthGate(`Username "${clean}" not found! You can create this account again in the Sign Up option.`);
            }
          }

          if (changed) {
            saveLocalStatsOnly();
          }
          return changed;
        }
        window.__scrubAccountCompletelyFromWebsite = scrubAccountCompletelyFromWebsite;

        // Expose hook for Firebase Cloud Sync module so cloud updates & deletions reconcile seamlessly
        window.__onCloudLeaderboardUpdate = function (cloudPlayersMap, cloudAccountsMap, cloudPurgedArr, isAuthoritative) {
          let changed = false;
          if (Array.isArray(cloudPurgedArr)) {
            cloudPurgedArr.forEach((pName) => {
              const clean = (pName || '').trim().toUpperCase();
              if (clean && !isRecentSignup(clean)) {
                markAccountPurgedLocal(clean);
                if (scrubAccountCompletelyFromWebsite(clean, true)) {
                  changed = true;
                }
              }
            });
          }

          if (isAuthoritative && cloudAccountsMap && typeof cloudAccountsMap === 'object') {
            const localVault = loadEncryptedUsersMap();
            if (typeof window.__syncCloudLeaderboard === 'function' && Object.keys(localVault || {}).length > 0) {
              window.__syncCloudLeaderboard(null, localVault, STATE.myUsername);
            }
          }

          if (cloudAccountsMap && typeof cloudAccountsMap === 'object') {
            if (mergeEncryptedUsersMap(cloudAccountsMap)) changed = true;
            const purgedNow = loadPurgedAccountsList();
            Object.keys(cloudAccountsMap).forEach((k) => {
              const acc = cloudAccountsMap[k];
              const clean = ((acc && acc.username) ? acc.username : k || '').trim().toUpperCase();
              if (clean && clean.length >= 3 && !isPlaceholderUsername(clean) && !purgedNow.includes(clean)) {
                if (!STATE.humanPlayers[clean]) {
                  ensureHumanPlayerRecord(clean, 1500, {
                    countryCode: (acc && acc.countryCode) || '+91',
                    countryFlag: (acc && acc.countryFlag) || '🇮🇳',
                    countryName: (acc && acc.countryName) || 'India'
                  }, true);
                  changed = true;
                }
              }
            });
          }
          if (cloudPlayersMap && mergeGlobalPlayers(cloudPlayersMap)) {
            changed = true;
          }
          if (changed) {
            reconcileAllNewPlayersIntoLeaderboard();
            syncAuthAndPurgeFakeSeeds();
            saveLocalStatsOnly();
            renderAll();
          }
        };

        if (typeof Peer === 'undefined') return;

        function cleanupDeadHubConns() {
          STATE.globalHubConns = STATE.globalHubConns.filter((c) => c && c.open);
        }

        function attachGlobalConn(conn) {
          if (!conn) return;
          if (!STATE.globalHubConns.includes(conn)) {
            STATE.globalHubConns.push(conn);
          }
          const sendInitialSync = () => {
            try {
              conn.send({
                type: 'GLOBAL_LEADERBOARD_SYNC',
                allPlayers: STATE.humanPlayers,
                encryptedUsers: loadEncryptedUsersMap(),
                requestReply: true,
                timestamp: Date.now()
              });
            } catch (e) {}
          };
          if (conn.open) {
            sendInitialSync();
          } else {
            conn.on('open', sendInitialSync);
          }
          conn.on('close', cleanupDeadHubConns);
          conn.on('error', cleanupDeadHubConns);
          conn.on('data', (data) => {
            if (!data || typeof data !== 'object') return;
            if (data.type === 'FRIEND_ROOM_OPENED' && data.hostUser && data.roomCode) {
              STATE.activeOpenRooms[data.hostUser.trim().toUpperCase()] = {
                roomCode: data.roomCode,
                hostUser: data.hostUser.trim().toUpperCase(),
                timestamp: data.timestamp || Date.now()
              };
              if (STATE.activeScreen === 'FRIENDS') renderAll();
              return;
            }
            if (data.type === 'FRIEND_MATCH_INVITE' && data.roomCode) {
              handleIncomingMatchInvite(data);
              return;
            }
            if (data.type === 'FRIEND_MATCH_DECLINE' && data.toUser) {
              const myClean = (STATE.myUsername || '').trim().toUpperCase();
              if (data.toUser.trim().toUpperCase() === myClean) {
                handleIncomingMatchDecline(data);
              }
              return;
            }
            if (data.type === 'FRIEND_REQUEST_SEND' || data.type === 'FRIEND_REQUEST_RESPONSE') {
              handleIncomingFriendRequestPacket(data);
              return;
            }
            if (data.type === 'GLOBAL_ACCOUNT_REMOVED' && data.username) {
              const remName = data.username.trim().toUpperCase();
              markAccountPurgedLocal(remName);
              delete STATE.humanPlayers[remName];
              const uMap = loadEncryptedUsersMap();
              if (uMap[remName]) {
                delete uMap[remName];
                saveEncryptedUsersMap(uMap);
              }
              saveLocalStatsOnly();
              renderAll();
              return;
            }
            if (data.type === 'MATCH_RESULT_SYNC') {
              let changed = false;
              if (data.p1Name && data.p1Record) {
                if (mergeGlobalPlayers({ [data.p1Name]: data.p1Record })) changed = true;
              }
              if (data.p2Name && data.p2Record) {
                if (mergeGlobalPlayers({ [data.p2Name]: data.p2Record })) changed = true;
              }
              if (data.allPlayers && mergeGlobalPlayers(data.allPlayers)) changed = true;
              if (changed) {
                saveLocalStatsOnly();
                renderAll();
              }
              return;
            }
            if (data.type !== 'GLOBAL_LEADERBOARD_SYNC') return;
            let changed = false;
            if (data.encryptedUsers && mergeEncryptedUsersMap(data.encryptedUsers)) {
              syncAuthAndPurgeFakeSeeds();
              changed = true;
            }
            if (data.allPlayers && mergeGlobalPlayers(data.allPlayers)) {
              changed = true;
            }
            if (changed) {
              saveLocalStatsOnly();
            }
            if (data.requestReply) {
              try {
                conn.send({
                  type: 'GLOBAL_LEADERBOARD_SYNC',
                  allPlayers: STATE.humanPlayers,
                  encryptedUsers: loadEncryptedUsersMap(),
                  requestReply: false,
                  timestamp: Date.now()
                });
              } catch (e) {}
            }
            if (changed) {
              STATE.globalHubConns.forEach((other) => {
                if (other && other !== conn && other.open) {
                  try {
                    other.send({
                      type: 'GLOBAL_LEADERBOARD_SYNC',
                      allPlayers: STATE.humanPlayers,
                      encryptedUsers: loadEncryptedUsersMap(),
                      requestReply: false,
                      timestamp: Date.now()
                    });
                  } catch (e) {}
                }
              });
              renderAll();
            }
          });
        }

        function connectToOtherHubSlots(activePeer, myClaimedId) {
          if (!activePeer || activePeer.destroyed) return;
          cleanupDeadHubConns();
          GLOBAL_HUB_IDS.forEach((hubId) => {
            if (hubId === myClaimedId) return;
            const alreadyOpen = STATE.globalHubConns.some((c) => c && c.peer === hubId && c.open);
            if (alreadyOpen) return;
            try {
              const c = activePeer.connect(hubId);
              attachGlobalConn(c);
            } catch (e) {}
          });
        }

        function tryClaimHubSlot(slotIdx) {
          if (slotIdx >= GLOBAL_HUB_IDS.length) {
            try {
              const clientPeer = new Peer();
              STATE.globalHubPeer = clientPeer;
              clientPeer.on('open', (id) => {
                connectToOtherHubSlots(clientPeer, id);
                setInterval(() => connectToOtherHubSlots(clientPeer, id), 18000);
              });
              clientPeer.on('connection', (conn) => attachGlobalConn(conn));
            } catch (e) {}
            return;
          }
          const targetHubId = GLOBAL_HUB_IDS[slotIdx];
          try {
            const candidate = new Peer(targetHubId);
            let opened = false;
            candidate.on('open', (id) => {
              opened = true;
              STATE.globalHubPeer = candidate;
              connectToOtherHubSlots(candidate, id);
              setInterval(() => connectToOtherHubSlots(candidate, id), 18000);
            });
            candidate.on('connection', (conn) => attachGlobalConn(conn));
            candidate.on('error', () => {
              if (!opened) {
                try { candidate.destroy(); } catch (e) {}
                tryClaimHubSlot(slotIdx + 1);
              }
            });
          } catch (e) {
            tryClaimHubSlot(slotIdx + 1);
          }
        }

        tryClaimHubSlot(0);
      }

            let boundRoomCode = null;
      let roomUnsub = null;
      let recentHostMsgs = [];
      let recentGuestMsgs = [];
      let pendingRoomOutboundQueue = [];

      function bindCloudRoom(roomCode) {
        const cleanCode = String(roomCode || '').trim().toUpperCase();
        if (!cleanCode) return;
        if (boundRoomCode !== cleanCode) {
          recentHostMsgs = [];
          recentGuestMsgs = [];
        }
        boundRoomCode = cleanCode;
        if (typeof window.__bindCloudRoom === 'function') {
          window.__bindCloudRoom(cleanCode);
        }
      }

      function sendCloudRoomMessage(roomCode, msgObj) {
        if (typeof window.__sendCloudRoomMessage === 'function') {
          window.__sendCloudRoomMessage(roomCode, msgObj);
        } else {
          pendingRoomOutboundQueue.push({ roomCode: String(roomCode).trim().toUpperCase(), msgObj });
        }
      }

      function leaveCloudRoom() {
        if (typeof window.__leaveCloudRoom === 'function') {
          window.__leaveCloudRoom();
        }
        boundRoomCode = null;
        recentHostMsgs = [];
        recentGuestMsgs = [];
      }

      function pollRoomLocalMessages(code) {
        const cleanRoom = String(code || STATE.roomCode || '').trim().toUpperCase();
        if (!cleanRoom) return;
        try {
          const listKey = 'oddandeven_room_msgs_' + cleanRoom;
          const rawList = localStorage.getItem(listKey);
          if (rawList) {
            const list = JSON.parse(rawList);
            if (Array.isArray(list)) {
              list.forEach((m) => {
                if (m && (!m.roomCode || m.roomCode === cleanRoom)) {
                  handleNetMessage(m);
                }
              });
            }
          }
          const singleRaw = localStorage.getItem('oddandeven_room_bus_' + cleanRoom);
          if (singleRaw) {
            const singleMsg = JSON.parse(singleRaw);
            if (singleMsg && (!singleMsg.roomCode || singleMsg.roomCode === cleanRoom)) {
              handleNetMessage(singleMsg);
            }
          }
        } catch (e) {}
      }

      function sendNetMessage(payload) {
        if (!payload || typeof payload !== 'object') return;
        const cleanRoom = STATE.roomCode ? String(STATE.roomCode).trim().toUpperCase() : null;
        const msgWithId = Object.assign({}, payload, {
          msgId: payload.msgId || (Date.now() + '_' + Math.random().toString(36).slice(2, 9)),
          senderRole: STATE.onlineRole || 'HOST',
          roomCode: payload.roomCode || cleanRoom,
          _ts: Date.now()
        });
        STATE.seenNetMsgIds.add(msgWithId.msgId);

        if (STATE.conn && STATE.conn.open) {
          try { STATE.conn.send(msgWithId); } catch (e) {}
        }
        if (STATE.bc) {
          try { STATE.bc.postMessage(msgWithId); } catch (e) {}
        }
        const gbc = getSharedGlobalBc();
        if (gbc && cleanRoom) {
          try {
            gbc.postMessage({
              type: 'ROOM_RELAY_PACKET',
              roomCode: cleanRoom,
              packet: msgWithId
            });
          } catch (e) {}
        }
        if (cleanRoom) {
          try {
            localStorage.setItem('oddandeven_room_bus_' + cleanRoom, JSON.stringify(msgWithId));
            const listKey = 'oddandeven_room_msgs_' + cleanRoom;
            let list = [];
            try {
              const rawList = localStorage.getItem(listKey);
              if (rawList) list = JSON.parse(rawList) || [];
            } catch (e) {}
            list = list.filter((m) => m && (Date.now() - (m._ts || 0) < 45000)).slice(-20);
            list.push(msgWithId);
            localStorage.setItem(listKey, JSON.stringify(list));
          } catch (e) {}
          sendCloudRoomMessage(cleanRoom, msgWithId);
        }
      }

      function setupBroadcastFallback(code) {
        const cleanRoom = String(code || '').trim().toUpperCase();
        if (STATE.bc) {
          try { STATE.bc.close(); } catch (e) {}
          STATE.bc = null;
        }
        if (STATE.roomPollTimerId) {
          clearInterval(STATE.roomPollTimerId);
          STATE.roomPollTimerId = null;
        }
        if (typeof BroadcastChannel !== 'undefined' && cleanRoom) {
          STATE.bc = new BroadcastChannel('hc_arena_room_' + cleanRoom);
          STATE.bc.onmessage = (ev) => {
            if (ev && ev.data) handleNetMessage(ev.data);
          };
        }
        if (cleanRoom) {
          pollRoomLocalMessages(cleanRoom);
          STATE.roomPollTimerId = setInterval(() => {
            if (!STATE.roomCode || String(STATE.roomCode).trim().toUpperCase() !== cleanRoom) {
              clearInterval(STATE.roomPollTimerId);
              STATE.roomPollTimerId = null;
              return;
            }
            pollRoomLocalMessages(cleanRoom);
          }, 350);
        }
      }

      function handleNetMessage(msg) {
        if (!msg || typeof msg !== 'object') return;
        if (msg.msgId) {
          if (STATE.seenNetMsgIds.has(msg.msgId)) return;
          STATE.seenNetMsgIds.add(msg.msgId);
        }

        if (msg.allPlayers) {
          mergeGlobalPlayers(msg.allPlayers);
        }

        if (msg.type === 'GLOBAL_LEADERBOARD_SYNC') {
          let changed = false;
          if (msg.encryptedUsers && mergeEncryptedUsersMap(msg.encryptedUsers)) {
            syncAuthAndPurgeFakeSeeds();
            changed = true;
          }
          if (msg.allPlayers && mergeGlobalPlayers(msg.allPlayers)) {
            changed = true;
          }
          if (changed) {
            saveLocalStatsOnly();
            renderAll();
          }
          return;
        }

        if (msg.type === 'MATCH_RESULT_SYNC') {
          let changed = false;
          if (msg.p1Name && msg.p1Record) {
            if (mergeGlobalPlayers({ [msg.p1Name]: msg.p1Record })) changed = true;
          }
          if (msg.p2Name && msg.p2Record) {
            if (mergeGlobalPlayers({ [msg.p2Name]: msg.p2Record })) changed = true;
          }
          if (msg.allPlayers && mergeGlobalPlayers(msg.allPlayers)) changed = true;
          if (changed) {
            saveLocalStatsOnly();
            renderAll();
          }
          return;
        }

        if (msg.type === 'ROOM_RELAY_PACKET' && msg.roomCode && msg.packet) {
          if (STATE.roomCode && String(STATE.roomCode).trim().toUpperCase() === String(msg.roomCode).trim().toUpperCase()) {
            handleNetMessage(msg.packet);
          }
          return;
        }

        if (msg.type === 'JOIN_HELLO' || msg.type === 'GUEST_JOINED') {
          // Only Host processes JOIN_HELLO / GUEST_JOINED
          if (STATE.onlineRole !== 'HOST') return;
          let incomingP2 = (msg.p2Name || msg.guestName || 'GUEST').trim().toUpperCase();
          if (incomingP2 === STATE.p1Name) {
            incomingP2 = incomingP2 + ' (Guest)';
          }

          // If room is already locked with a different player, reject 3rd player!
          if (STATE.roomLocked && STATE.p2Joined && STATE.p2Name && STATE.p2Name !== 'WAITING...' && STATE.p2Name !== incomingP2) {
            sendNetMessage({
              type: 'ROOM_LOCKED_REJECT',
              roomCode: STATE.roomCode,
              targetUser: incomingP2,
              p1Name: STATE.p1Name,
              p2Name: STATE.p2Name
            });
            return;
          }

          // Lock the room immediately with P1 vs P2!
          STATE.onlineConnected = true;
          STATE.p2Joined = true;
          STATE.roomLocked = true;
          STATE.p2Name = incomingP2;
          STATE.p2CountryFlag = msg.p2CountryFlag || '🇮🇳';
          STATE.p2CountryCode = msg.p2CountryCode || '+91';

          if (msg.p2Record && typeof msg.p2Record === 'object') {
            mergeGlobalPlayers({ [STATE.p2Name]: msg.p2Record });
          }
          const p2Rec = ensureHumanPlayerRecord(STATE.p2Name, typeof msg.p2Elo === 'number' ? msg.p2Elo : 1500, {
            countryCode: STATE.p2CountryCode,
            countryFlag: STATE.p2CountryFlag
          }, true);
          if (typeof msg.p2Elo === 'number' && (!msg.p2Record || (msg.p2Record.matches || 0) >= (p2Rec.matches || 0))) {
            p2Rec.elo = msg.p2Elo;
            if (p2Rec.elo > (p2Rec.peak || 1500)) p2Rec.peak = p2Rec.elo;
          }
          STATE.friendEloRating = p2Rec.elo;

          const p1Rec = ensureHumanPlayerRecord(STATE.p1Name, STATE.eloRating, {
            countryCode: STATE.p1CountryCode,
            countryFlag: STATE.p1CountryFlag
          }, true);
          STATE.eloRating = p1Rec.elo;
          STATE.peakElo = p1Rec.peak;

          saveSessionStats(true);

          updateNetStatusUI('🔒 Room Locked: ' + STATE.p1Name + ' vs ' + STATE.p2Name, true);
          const shouldAutoStart = Boolean(msg.autoStart || STATE.autoStartOnGuestJoin);
          sendNetMessage({
            type: 'HOST_WELCOME',
            roomCode: STATE.roomCode,
            hostName: STATE.p1Name,
            p1Name: STATE.p1Name,
            p1CountryFlag: STATE.p1CountryFlag,
            p1CountryCode: STATE.p1CountryCode,
            p1Elo: p1Rec.elo,
            p1Record: p1Rec,
            p2Name: STATE.p2Name,
            p2CountryFlag: STATE.p2CountryFlag,
            p2CountryCode: STATE.p2CountryCode,
            p2Elo: p2Rec.elo,
            p2Record: p2Rec,
            roomLocked: true,
            autoStartMatch: shouldAutoStart,
            allPlayers: STATE.humanPlayers
          });
          SoundFX.click();
          if (shouldAutoStart) {
            STATE.autoStartOnGuestJoin = false;
            hostTriggerMultiplayerMatchStart();
          } else {
            renderAll();
          }
        } else if (msg.type === 'ROOM_LOCKED_REJECT') {
          const myU = (STATE.myUsername || '').trim().toUpperCase();
          const amIAlreadyInRoom = (msg.p2Name === myU || msg.p2Name === (myU + ' (Guest)') || STATE.p2Joined);
          if (STATE.onlineRole === 'GUEST' && !amIAlreadyInRoom && msg.targetUser && (msg.targetUser === myU || msg.targetUser === (myU + ' (Guest)'))) {
            if (STATE.joinRetryTimerId) {
              clearInterval(STATE.joinRetryTimerId);
              STATE.joinRetryTimerId = null;
            }
            STATE.onlineConnected = false;
            STATE.roomLocked = true;
            STATE.p2Joined = false;
            updateNetStatusUI('🔒 Room Full & Locked (' + msg.p1Name + ' vs ' + msg.p2Name + ')', false);
            renderAll();
          }
        } else if (msg.type === 'ROOM_LEAVE') {
          stopTurnTimer();
          STATE.onlineConnected = false;
          STATE.p2Joined = false;
          STATE.roomLocked = false;
          STATE.p2Name = 'WAITING...';
          if (STATE.onlineRole === 'HOST') {
            updateNetStatusUI('⏳ Opponent left • Room ' + STATE.roomCode + ' unlocked & waiting for P2...', false);
          } else {
            STATE.roomCode = null;
            STATE.onlineRole = null;
            updateNetStatusUI('Room closed by Host • Create or Join a Room', false);
          }
          renderAll();
        } else if (msg.type === 'HOST_WELCOME') {
          if (STATE.onlineRole !== 'GUEST') return;
          if (STATE.joinRetryTimerId) {
            clearInterval(STATE.joinRetryTimerId);
            STATE.joinRetryTimerId = null;
          }
          STATE.onlineConnected = true;
          STATE.p2Joined = true;
          STATE.roomLocked = true;
          STATE.p1Name = (msg.p1Name || msg.hostName || 'HOST').trim().toUpperCase();
          STATE.p1CountryFlag = msg.p1CountryFlag || '🇮🇳';
          STATE.p1CountryCode = msg.p1CountryCode || '+91';
          STATE.p2Name = (msg.p2Name || STATE.myUsername || 'GUEST').trim().toUpperCase();
          STATE.p2CountryFlag = msg.p2CountryFlag || STATE.myCountryFlag || '🇮🇳';
          STATE.p2CountryCode = msg.p2CountryCode || STATE.myCountryCode || '+91';
          if (STATE.p1Name === STATE.p2Name) {
            STATE.p2Name = STATE.p2Name + ' (Guest)';
          }

          if (msg.p1Record && typeof msg.p1Record === 'object') {
            mergeGlobalPlayers({ [STATE.p1Name]: msg.p1Record });
          }
          if (msg.p2Record && typeof msg.p2Record === 'object') {
            mergeGlobalPlayers({ [STATE.p2Name]: msg.p2Record });
          }

          const p1Rec = ensureHumanPlayerRecord(STATE.p1Name, typeof msg.p1Elo === 'number' ? msg.p1Elo : 1500, {
            countryCode: STATE.p1CountryCode,
            countryFlag: STATE.p1CountryFlag
          }, true);
          if (typeof msg.p1Elo === 'number' && (!msg.p1Record || (msg.p1Record.matches || 0) >= (p1Rec.matches || 0))) {
            p1Rec.elo = msg.p1Elo;
            if (p1Rec.elo > (p1Rec.peak || 1500)) p1Rec.peak = p1Rec.elo;
          }
          STATE.friendEloRating = p1Rec.elo;

          const p2Rec = ensureHumanPlayerRecord(STATE.p2Name, STATE.eloRating, {
            countryCode: STATE.p2CountryCode,
            countryFlag: STATE.p2CountryFlag
          }, true);
          STATE.eloRating = p2Rec.elo;
          STATE.peakElo = p2Rec.peak;

          saveSessionStats(true);

          updateNetStatusUI('🔒 Room Locked: ' + STATE.p1Name + ' vs ' + STATE.p2Name, true);
          SoundFX.click();
          if (msg.autoStartMatch || STATE.autoStartOnGuestJoin) {
            STATE.autoStartOnGuestJoin = false;
            STATE.mode = 'ONLINE_2P';
            STATE.activeScreen = 'PITCH';
            resetGame(true);
            setTimeout(resizeCanvas, 20);
          } else {
            renderAll();
          }
        } else if (msg.type === 'HOST_START_MATCH') {
          STATE.mode = 'ONLINE_2P';
          if (msg.p1Name) STATE.p1Name = msg.p1Name;
          if (msg.p2Name) STATE.p2Name = msg.p2Name;
          if (msg.p1CountryFlag) STATE.p1CountryFlag = msg.p1CountryFlag;
          if (msg.p1CountryCode) STATE.p1CountryCode = msg.p1CountryCode;
          if (msg.p2CountryFlag) STATE.p2CountryFlag = msg.p2CountryFlag;
          if (msg.p2CountryCode) STATE.p2CountryCode = msg.p2CountryCode;
          STATE.roomLocked = true;
          STATE.p2Joined = true;
          STATE.onlineConnected = true;
          if (el.mpModal) {
            el.mpModal.classList.add('hidden');
            el.mpModal.classList.remove('flex');
          }
          STATE.activeScreen = 'PITCH';
          resetGame(true);
          setTimeout(resizeCanvas, 20);
        } else if (msg.type === 'TIMER_SYNC') {
          // Keep 15s countdown strictly synchronized across both screens!
          const curStep = STATE.pendingP1Num === null ? 'P1' : 'P2';
          if (msg.phase && msg.phase !== STATE.phase) return;
          if (msg.turnStep && msg.turnStep !== curStep) return;
          if (typeof msg.remainingMs === 'number') {
            STATE.turnDeadlineMs = Date.now() + msg.remainingMs;
            STATE.turnSecondsLeft = Math.max(0, Math.min(TURN_DURATION_SEC, Math.ceil(msg.remainingMs / 1000)));
          } else if (typeof msg.secondsLeft === 'number') {
            STATE.turnSecondsLeft = msg.secondsLeft;
            STATE.turnDeadlineMs = Date.now() + msg.secondsLeft * 1000;
          }
          if (typeof msg.p1LockedSec === 'number' || msg.p1LockedSec === null) {
            STATE.p1LockedSec = msg.p1LockedSec;
          }
          if (typeof msg.p2LockedSec === 'number' || msg.p2LockedSec === null) {
            STATE.p2LockedSec = msg.p2LockedSec;
          }
          updateTimerUI();
        } else if (msg.type === 'TOSS_CALL') {
          const chosen = msg.callType === 'EVEN' ? 'EVEN' : 'ODD';
          const opposite = chosen === 'EVEN' ? 'ODD' : 'EVEN';
          STATE.friendLockedTossCall = chosen;

          if (msg.caller === 'P1') {
            STATE.p1TossCall = chosen;
            STATE.p2TossCall = opposite;
          } else {
            STATE.p2TossCall = chosen;
            STATE.p1TossCall = opposite;
          }
          STATE.tossCall = STATE.p1TossCall;
          startTurnTimer(true);
          renderAll();
        } else if (msg.type === 'TIMEOUT_FORFEIT') {
          stopTurnTimer();
          finishMatch(msg.winner, msg.reason, true, Boolean(msg.isTossForfeit));
          renderAll();
        } else if (msg.type === 'PICK_NUM') {
          if (msg.player === 'P1') {
            STATE.pendingP1Num = msg.num;
            STATE.p1LockedSec = typeof msg.lockedSec === 'number' ? msg.lockedSec : STATE.turnSecondsLeft;
            // P1 locked in -> unlock 15s countdown for P2 on both screens!
            if (STATE.pendingP2Num === null) {
              startTurnTimer(true);
            }
          } else if (msg.player === 'P2') {
            STATE.pendingP2Num = msg.num;
            STATE.p2LockedSec = typeof msg.lockedSec === 'number' ? msg.lockedSec : STATE.turnSecondsLeft;
          }
          checkAndResolveMultiplayerTurn();
          renderAll();
        } else if (msg.type === 'TOSS_DECISION_CHOICE') {
          STATE.firstBatter = msg.firstBatter;
          startFirstInnings(msg.decisionChoice);
        } else if (msg.type === 'START_INN_2') {
          startSecondInnings(true);
        } else if (msg.type === 'RESET_MATCH') {
          STATE.activeScreen = 'PITCH';
          resetGame(true);
          setTimeout(resizeCanvas, 20);
        }
      }

      function updateNetStatusUI(text, connected) {
        const cls = connected
          ? 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-400/40'
          : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-400/30';
        if (el.mpNetStatusBadge) {
          el.mpNetStatusBadge.textContent = text;
          el.mpNetStatusBadge.className = cls;
        }
        if (el.inlineNetStatusBadge) {
          el.inlineNetStatusBadge.textContent = text;
          el.inlineNetStatusBadge.className = cls;
        }
      }

      function syncFriendsAndRequestsStorage() {
        try {
          const rawF = localStorage.getItem(FRIENDS_STORAGE_KEY);
          if (rawF) {
            const parsedF = JSON.parse(rawF);
            if (parsedF && typeof parsedF === 'object') {
              Object.keys(parsedF).forEach((u) => {
                const cu = (u || '').trim().toUpperCase();
                if (Array.isArray(parsedF[u])) {
                  STATE.friendsMap[cu] = Array.from(new Set([...(STATE.friendsMap[cu] || []), ...parsedF[u].map((x) => String(x || '').trim().toUpperCase()).filter(Boolean)]));
                }
              });
            }
          }
          const me = (STATE.myUsername || '').trim().toUpperCase();
          if (me && !isPlaceholderUsername(me)) {
            const rawMob = localStorage.getItem('oddandeven_friends_' + me);
            if (rawMob) {
              const parsedMob = JSON.parse(rawMob);
              if (Array.isArray(parsedMob)) {
                STATE.friendsMap[me] = Array.from(new Set([...(STATE.friendsMap[me] || []), ...parsedMob.map((x) => String(x || '').trim().toUpperCase()).filter(Boolean)]));
              }
            }
          }
          const rawR = localStorage.getItem(FRIEND_REQUESTS_KEY);
          if (rawR) {
            const parsedR = JSON.parse(rawR);
            if (parsedR && typeof parsedR === 'object') {
              STATE.friendRequestsMap = parsedR;
            }
          }
        } catch (e) {}
      }

      function getMyFriendsList() {
        syncFriendsAndRequestsStorage();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me || isPlaceholderUsername(me)) return [];
        const list = STATE.friendsMap[me];
        return Array.isArray(list) ? list : [];
      }

      function getIncomingFriendRequests() {
        syncFriendsAndRequestsStorage();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me || isPlaceholderUsername(me)) return [];
        const list = STATE.friendRequestsMap && STATE.friendRequestsMap[me];
        if (!Array.isArray(list)) return [];
        const myFriends = Array.isArray(STATE.friendsMap[me]) ? STATE.friendsMap[me] : [];
        return list.filter((req) => req && req.from && !myFriends.includes(String(req.from).trim().toUpperCase()));
      }

      function getOutgoingFriendRequests() {
        syncFriendsAndRequestsStorage();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me || isPlaceholderUsername(me)) return [];
        const outgoing = [];
        const map = STATE.friendRequestsMap || {};
        Object.keys(map).forEach((targetUser) => {
          const cleanTarget = (targetUser || '').trim().toUpperCase();
          const arr = map[targetUser];
          if (Array.isArray(arr) && arr.some((r) => r && String(r.from || '').trim().toUpperCase() === me)) {
            outgoing.push(cleanTarget);
          }
        });
        return outgoing;
      }

      function saveFriendsMap() {
        try {
          localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(STATE.friendsMap));
          Object.keys(STATE.friendsMap || {}).forEach((u) => {
            const cu = (u || '').trim().toUpperCase();
            if (cu && Array.isArray(STATE.friendsMap[u])) {
              localStorage.setItem('oddandeven_friends_' + cu, JSON.stringify(STATE.friendsMap[u]));
            }
          });
        } catch (e) {}
      }

      function saveFriendRequestsMap() {
        try {
          localStorage.setItem(FRIEND_REQUESTS_KEY, JSON.stringify(STATE.friendRequestsMap || {}));
        } catch (e) {}
      }

      function showFriendFeedback(msg, isSuccess = true) {
        if (!el.friendActionFeedback) return;
        el.friendActionFeedback.classList.remove('hidden');
        el.friendActionFeedback.className = isSuccess
          ? 'p-2.5 rounded-xl text-xs font-bold border bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
          : 'p-2.5 rounded-xl text-xs font-bold border bg-rose-500/15 border-rose-400/40 text-rose-200';
        el.friendActionFeedback.textContent = msg;
      }

      function broadcastFriendEventPacket(packet) {
        if (!packet || typeof packet !== 'object') return;
        const gbc = getSharedGlobalBc();
        if (gbc) {
          try { gbc.postMessage(packet); } catch (e) {}
        }
        if (STATE.globalHubConns && STATE.globalHubConns.length > 0) {
          STATE.globalHubConns.forEach((c) => {
            if (c && c.open) {
              try { c.send(packet); } catch (e) {}
            }
          });
        }
        try {
          localStorage.setItem('oddandeven_friend_invite_bus', JSON.stringify(packet));
        } catch (e) {}
      }

      function linkMutualFriendsLocal(userA, userB) {
        const a = (userA || '').trim().toUpperCase();
        const b = (userB || '').trim().toUpperCase();
        if (!a || !b || a === b) return;
        syncFriendsAndRequestsStorage();
        if (!Array.isArray(STATE.friendsMap[a])) STATE.friendsMap[a] = [];
        if (!Array.isArray(STATE.friendsMap[b])) STATE.friendsMap[b] = [];
        if (!STATE.friendsMap[a].includes(b)) STATE.friendsMap[a].unshift(b);
        if (!STATE.friendsMap[b].includes(a)) STATE.friendsMap[b].unshift(a);

        if (Array.isArray(STATE.friendRequestsMap[a])) {
          STATE.friendRequestsMap[a] = STATE.friendRequestsMap[a].filter((r) => String(r && r.from || '').trim().toUpperCase() !== b);
        }
        if (Array.isArray(STATE.friendRequestsMap[b])) {
          STATE.friendRequestsMap[b] = STATE.friendRequestsMap[b].filter((r) => String(r && r.from || '').trim().toUpperCase() !== a);
        }
        saveFriendsMap();
        saveFriendRequestsMap();
      }

      function handleIncomingFriendRequestPacket(packet) {
        if (!packet || typeof packet !== 'object') return;
        const me = (STATE.myUsername || '').trim().toUpperCase();
        syncFriendsAndRequestsStorage();

        if (packet.type === 'FRIEND_REQUEST_SEND') {
          const fromUser = String(packet.fromUser || '').trim().toUpperCase();
          const toUser = String(packet.toUser || '').trim().toUpperCase();
          if (!fromUser || !toUser || fromUser === toUser) return;

          ensureHumanPlayerRecord(fromUser, packet.fromElo || 1500, {
            countryCode: packet.fromCode || '+91',
            countryFlag: packet.fromFlag || '🇮🇳',
            countryName: 'India'
          }, true);

          if (!Array.isArray(STATE.friendRequestsMap[toUser])) {
            STATE.friendRequestsMap[toUser] = [];
          }
          const alreadyFriends = Array.isArray(STATE.friendsMap[toUser]) && STATE.friendsMap[toUser].includes(fromUser);
          if (!alreadyFriends) {
            const existingIdx = STATE.friendRequestsMap[toUser].findIndex((r) => r && String(r.from || '').trim().toUpperCase() === fromUser);
            const reqObj = {
              from: fromUser,
              fromFlag: packet.fromFlag || '🇮🇳',
              fromCode: packet.fromCode || '+91',
              fromElo: packet.fromElo || 1500,
              timestamp: packet.timestamp || Date.now()
            };
            if (existingIdx >= 0) STATE.friendRequestsMap[toUser][existingIdx] = reqObj;
            else STATE.friendRequestsMap[toUser].unshift(reqObj);
            saveFriendRequestsMap();
          }
          if (toUser === me) {
            SoundFX.click();
            showGlobalFriendRequestToast(packet);
            showFriendFeedback('📩 New Friend Request from @' + fromUser + '! Accept or Decline below.', true);
          }
          renderAll();
          return;
        }

        if (packet.type === 'FRIEND_REQUEST_RESPONSE') {
          const fromUser = String(packet.fromUser || '').trim().toUpperCase(); // responder (P2)
          const toUser = String(packet.toUser || '').trim().toUpperCase();     // original requester (P1)
          const action = String(packet.action || '').toUpperCase();
          if (!fromUser || !toUser) return;

          if (action === 'ACCEPT') {
            linkMutualFriendsLocal(fromUser, toUser);
            if (toUser === me) {
              SoundFX.runScored(4);
              showFriendFeedback(`🎉 @${fromUser} accepted your Friend Request! You can now call @${fromUser} for a 1v1 match anytime.`, true);
            }
          } else {
            if (Array.isArray(STATE.friendRequestsMap[fromUser])) {
              STATE.friendRequestsMap[fromUser] = STATE.friendRequestsMap[fromUser].filter((r) => String(r && r.from || '').trim().toUpperCase() !== toUser);
            }
            saveFriendRequestsMap();
            if (toUser === me) {
              showFriendFeedback(`@${fromUser} declined the friend request.`, false);
            }
          }
          renderAll();
        }
      }

      function handleIncomingMatchDecline(data) {
        if (!data) return;
        const fromUser = String(data.fromUser || 'Friend').trim().toUpperCase();
        STATE.autoStartOnGuestJoin = false;
        SoundFX.wicket();
        updateNetStatusUI(`❌ @${fromUser} declined your match call.`, false);
        if (el.inlineLobbyWaitHint) {
          el.inlineLobbyWaitHint.textContent = `❌ @${fromUser} declined the match invitation. You can invite another friend or play against a Bot!`;
        }
        showFriendFeedback(`❌ @${fromUser} declined your match call.`, false);
        renderAll();
      }

      function sendFriendRequest(rawTargetUsername) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const target = (rawTargetUsername || '').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (target.length < 3 || isPlaceholderUsername(target)) {
          showFriendFeedback('Please enter a valid username (at least 3 characters).', false);
          return;
        }
        if (target === me) {
          showFriendFeedback('You cannot send a friend request to yourself!', false);
          return;
        }

        syncFriendsAndRequestsStorage();
        ensureHumanPlayerRecord(target, 1500, {
          countryCode: '+91',
          countryFlag: '🇮🇳',
          countryName: 'India'
        }, true);

        const myFriends = getMyFriendsList();
        if (myFriends.includes(target)) {
          showFriendFeedback(`@${target} is already in your Friends List! Click "Call for Match" to play.`, true);
          renderAll();
          return;
        }

        // If target already sent us a friend request, auto-accept mutually!
        const incomingFromTarget = (STATE.friendRequestsMap[me] || []).some((r) => r && String(r.from || '').trim().toUpperCase() === target);
        if (incomingFromTarget) {
          acceptFriendRequest(target);
          return;
        }

        if (!Array.isArray(STATE.friendRequestsMap[target])) {
          STATE.friendRequestsMap[target] = [];
        }
        const reqObj = {
          from: me,
          fromFlag: STATE.myCountryFlag || '🇮🇳',
          fromCode: STATE.myCountryCode || '+91',
          fromElo: STATE.eloRating || 1500,
          timestamp: Date.now()
        };
        const idx = STATE.friendRequestsMap[target].findIndex((r) => r && String(r.from || '').trim().toUpperCase() === me);
        if (idx >= 0) STATE.friendRequestsMap[target][idx] = reqObj;
        else STATE.friendRequestsMap[target].unshift(reqObj);
        saveFriendRequestsMap();

        const reqPacket = {
          type: 'FRIEND_REQUEST_SEND',
          fromUser: me,
          fromFlag: reqObj.fromFlag,
          fromCode: reqObj.fromCode,
          fromElo: reqObj.fromElo,
          toUser: target,
          timestamp: reqObj.timestamp
        };
        broadcastFriendEventPacket(reqPacket);
        if (typeof window.__sendCloudFriendRequest === 'function') {
          try { window.__sendCloudFriendRequest(target, reqObj); } catch (e) {}
        }

        showFriendFeedback(`📩 Friend Request sent to @${target}! It now appears in @${target}'s Friend List with Accept / Decline options.`, true);
        broadcastGlobalLeaderboardSync(true, true);
        renderAll();
      }

      function addFriendByUsername(rawTargetUsername) {
        sendFriendRequest(rawTargetUsername);
      }

      function acceptFriendRequest(fromUsername) {
        if (!requireAccountAndPassword()) return;
        SoundFX.runScored(4);
        const fromClean = (fromUsername || '').trim().toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!fromClean || !me || fromClean === me) return;

        hideGlobalFriendRequestToast();
        linkMutualFriendsLocal(me, fromClean);
        saveSessionStats(true);

        const respPacket = {
          type: 'FRIEND_REQUEST_RESPONSE',
          action: 'ACCEPT',
          fromUser: me,
          toUser: fromClean,
          timestamp: Date.now()
        };
        broadcastFriendEventPacket(respPacket);
        if (typeof window.__respondCloudFriendRequest === 'function') {
          try { window.__respondCloudFriendRequest(me, fromClean, 'ACCEPT', STATE.friendsMap[me], STATE.friendsMap[fromClean]); } catch (e) {}
        }

        showFriendFeedback(`✓ Accepted @${fromClean}'s friend request! @${fromClean} is now in your Friends List.`, true);
        renderAll();
      }

      function declineFriendRequest(fromUsername) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const fromClean = (fromUsername || '').trim().toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!fromClean || !me) return;

        hideGlobalFriendRequestToast();
        syncFriendsAndRequestsStorage();
        if (Array.isArray(STATE.friendRequestsMap[me])) {
          STATE.friendRequestsMap[me] = STATE.friendRequestsMap[me].filter((r) => String(r && r.from || '').trim().toUpperCase() !== fromClean);
        }
        saveFriendRequestsMap();

        const respPacket = {
          type: 'FRIEND_REQUEST_RESPONSE',
          action: 'DECLINE',
          fromUser: me,
          toUser: fromClean,
          timestamp: Date.now()
        };
        broadcastFriendEventPacket(respPacket);
        if (typeof window.__respondCloudFriendRequest === 'function') {
          try { window.__respondCloudFriendRequest(me, fromClean, 'DECLINE', STATE.friendsMap[me] || [], STATE.friendsMap[fromClean] || []); } catch (e) {}
        }

        showFriendFeedback(`Declined friend request from @${fromClean}.`, false);
        renderAll();
      }

      function removeFriendByUsername(rawTargetUsername) {
        SoundFX.click();
        const target = (rawTargetUsername || '').trim().toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me) return;
        syncFriendsAndRequestsStorage();
        if (Array.isArray(STATE.friendsMap[me])) {
          STATE.friendsMap[me] = STATE.friendsMap[me].filter((u) => u !== target);
        }
        if (Array.isArray(STATE.friendsMap[target])) {
          STATE.friendsMap[target] = STATE.friendsMap[target].filter((u) => u !== me);
        }
        saveFriendsMap();
        showFriendFeedback(`Removed @${target} from your Friends List.`, true);
        renderAll();
      }

      function playWithFriend(friendUsername) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const target = (friendUsername || '').trim().toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!target || target === me) return;

        // Check if this friend is already hosting an open room we can join & auto-start immediately!
        const friendOpenRoom = STATE.activeOpenRooms && STATE.activeOpenRooms[target];
        if (friendOpenRoom && friendOpenRoom.roomCode && (Date.now() - (friendOpenRoom.timestamp || 0) < 600000)) {
          STATE.autoStartOnGuestJoin = true;
          STATE.activeScreen = 'PITCH';
          joinMultiplayerRoom(friendOpenRoom.roomCode, true);
          return;
        }

        // Create a fresh Multiplayer Room as Host (P1), enable auto-start on join, and ring `target` with a large Match Call Banner!
        createMultiplayerRoom();
        STATE.autoStartOnGuestJoin = true;
        const code = STATE.roomCode;
        STATE.activeScreen = 'MP_SETUP';
        updateNetStatusUI(`📞 Calling @${target} for a 1v1 Match (Room ${code})...`, false);
        if (el.inlineLobbyWaitHint) {
          el.inlineLobbyWaitHint.textContent = `📞 Calling @${target} (Room Code: ${code})! A large Match Call banner is now ringing on @${target}'s screen — as soon as they click Accept, the match will start automatically!`;
        }

        broadcastFriendEventPacket({
          type: 'FRIEND_MATCH_INVITE',
          fromUser: me,
          fromFlag: STATE.myCountryFlag || '🇮🇳',
          fromCode: STATE.myCountryCode || '+91',
          fromElo: STATE.eloRating || 1500,
          toUser: target,
          roomCode: code,
          autoStart: true,
          timestamp: Date.now()
        });

        if (typeof window.__sendCloudFriendInvite === 'function') {
          try {
            window.__sendCloudFriendInvite(target, me, STATE.myCountryFlag || '🇮🇳', code);
          } catch (e) {}
        }

        renderAll();
      }

      function createMultiplayerRoom() {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        syncAuthAndPurgeFakeSeeds();
        const code = 'HC' + Math.floor(1000 + Math.random() * 9000);
        STATE.mode = 'ONLINE_2P';
        STATE.roomCode = code;
        STATE.onlineRole = 'HOST';
        STATE.onlineConnected = false;
        STATE.p2Joined = false;
        STATE.roomLocked = false;
        STATE.p1Name = STATE.myUsername && !isPlaceholderUsername(STATE.myUsername) ? STATE.myUsername : 'HOST';
        STATE.p1CountryFlag = STATE.myCountryFlag;
        STATE.p1CountryCode = STATE.myCountryCode;
        STATE.p2Name = 'WAITING...';

        if (el.hostRoomCodeBox) el.hostRoomCodeBox.classList.remove('hidden');
        if (el.hostRoomCodeText) el.hostRoomCodeText.textContent = code;
        if (el.inlineHostCodeDisplay) el.inlineHostCodeDisplay.classList.remove('hidden');
        if (el.inlineHostCodeValue) el.inlineHostCodeValue.textContent = code;

        updateNetStatusUI(`⏳ Room ${code} Created • Waiting for Player 2...`, false);
        setupBroadcastFallback(code);
        bindCloudRoom(code);
        STATE.activeOpenRooms[STATE.myUsername] = {
          roomCode: code,
          hostUser: STATE.myUsername,
          timestamp: Date.now()
        };
        broadcastFriendEventPacket({
          type: 'FRIEND_ROOM_OPENED',
          hostUser: STATE.myUsername,
          roomCode: code,
          timestamp: Date.now()
        });

        if (typeof Peer !== 'undefined') {
          try {
            if (STATE.peer) STATE.peer.destroy();
            if (STATE.legacyPeer) STATE.legacyPeer.destroy();

            const attachHostPeer = (peerInstance) => {
              peerInstance.on('connection', (conn) => {
                // If room is already locked with a connected P2, reject extra connections
                if (STATE.roomLocked && STATE.p2Joined && STATE.conn && STATE.conn.open) {
                  conn.on('open', () => {
                    try {
                      conn.send({
                        type: 'ROOM_LOCKED_REJECT',
                        p1Name: STATE.p1Name,
                        p2Name: STATE.p2Name
                      });
                    } catch (e) {}
                  });
                  return;
                }
                STATE.conn = conn;
                conn.on('data', (data) => handleNetMessage(data));
                conn.on('open', () => {
                  STATE.onlineConnected = true;
                });
              });
            };

            STATE.peer = new Peer('handcricket-arena-' + code);
            attachHostPeer(STATE.peer);

            STATE.legacyPeer = new Peer('oae-room-' + code);
            attachHostPeer(STATE.legacyPeer);
          } catch (e) {}
        }
        renderAll();
      }

      function joinMultiplayerRoom(customCodeInput = null, autoStart = false) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const raw = (customCodeInput || (el.inputJoinRoomCode && el.inputJoinRoomCode.value) || (el.inlineInputJoinCode && el.inlineInputJoinCode.value) || '').trim().toUpperCase();
        if (!raw) return;

        const previousHostName = (STATE.p1Name && STATE.p1Name !== STATE.myUsername && STATE.p1Name !== 'WAITING...') ? STATE.p1Name : null;

        STATE.mode = 'ONLINE_2P';
        STATE.roomCode = raw;
        STATE.onlineRole = 'GUEST';
        STATE.autoStartOnGuestJoin = Boolean(autoStart);
        STATE.onlineConnected = false;
        STATE.p2Joined = false;
        STATE.roomLocked = false;

        syncAuthAndPurgeFakeSeeds();

        // Preserve Host as P1 and Guest as P2
        STATE.p1Name = previousHostName || 'HOST';
        STATE.p2Name = STATE.myUsername && STATE.myUsername !== STATE.p1Name ? STATE.myUsername : (STATE.myUsername ? (STATE.myUsername + ' (Guest)') : 'GUEST');
        STATE.p2CountryFlag = STATE.myCountryFlag;
        STATE.p2CountryCode = STATE.myCountryCode;

        if (el.inputJoinRoomCode) el.inputJoinRoomCode.value = raw;
        if (el.inlineInputJoinCode) el.inlineInputJoinCode.value = raw;

        updateNetStatusUI(`Connecting to Room ${raw} as ${STATE.myUsername}...`, false);
        setupBroadcastFallback(raw);
        bindCloudRoom(raw);

        const myRec = ensureHumanPlayerRecord(STATE.myUsername, 1500, {
          countryCode: STATE.myCountryCode,
          countryFlag: STATE.myCountryFlag,
          countryName: STATE.myCountryName
        }, true);

        const joinPayload = {
          type: 'JOIN_HELLO',
          roomCode: raw,
          p2Name: STATE.p2Name,
          guestName: STATE.p2Name,
          p2CountryFlag: STATE.myCountryFlag,
          p2CountryCode: STATE.myCountryCode,
          p2Elo: myRec.elo,
          p2Record: myRec,
          autoStart: Boolean(autoStart),
          allPlayers: STATE.humanPlayers
        };
        sendNetMessage(joinPayload);

        if (STATE.joinRetryTimerId) {
          clearInterval(STATE.joinRetryTimerId);
          STATE.joinRetryTimerId = null;
        }
        let joinAttempts = 0;
        STATE.joinRetryTimerId = setInterval(() => {
          joinAttempts += 1;
          if (STATE.roomLocked || STATE.p2Joined || joinAttempts > 15 || STATE.onlineRole !== 'GUEST' || STATE.roomCode !== raw) {
            clearInterval(STATE.joinRetryTimerId);
            STATE.joinRetryTimerId = null;
            return;
          }
          pollRoomLocalMessages(raw);
          sendNetMessage(Object.assign({}, joinPayload, {
            msgId: `${Date.now()}_retry_${joinAttempts}`
          }));
        }, 900);

        if (typeof Peer !== 'undefined') {
          try {
            if (STATE.peer) STATE.peer.destroy();
            STATE.peer = new Peer();
            STATE.peer.on('open', () => {
              const connectToHostId = (hostPeerId) => {
                try {
                  const conn = STATE.peer.connect(hostPeerId);
                  conn.on('open', () => {
                    STATE.conn = conn;
                    sendNetMessage(Object.assign({}, joinPayload, {
                      msgId: `${Date.now()}_peer_open_${hostPeerId}`
                    }));
                  });
                  conn.on('data', (data) => handleNetMessage(data));
                } catch (e) {}
              };
              connectToHostId('handcricket-arena-' + raw);
              connectToHostId('oae-room-' + raw);
            });
          } catch (e) {}
        }
        renderAll();
      }

      function leaveMultiplayerRoom() {
        SoundFX.click();
        if (STATE.joinRetryTimerId) {
          clearInterval(STATE.joinRetryTimerId);
          STATE.joinRetryTimerId = null;
        }
        if (STATE.roomPollTimerId) {
          clearInterval(STATE.roomPollTimerId);
          STATE.roomPollTimerId = null;
        }
        if (STATE.roomCode) {
          sendNetMessage({ type: 'ROOM_LEAVE', roomCode: STATE.roomCode });
        }
        leaveCloudRoom();
        stopTurnTimer();
        if (STATE.conn) {
          try { STATE.conn.close(); } catch (e) {}
          STATE.conn = null;
        }
        if (STATE.peer) {
          try { STATE.peer.destroy(); } catch (e) {}
          STATE.peer = null;
        }
        if (STATE.legacyPeer) {
          try { STATE.legacyPeer.destroy(); } catch (e) {}
          STATE.legacyPeer = null;
        }
        STATE.roomCode = null;
        STATE.onlineRole = null;
        STATE.onlineConnected = false;
        STATE.p2Joined = false;
        STATE.roomLocked = false;
        STATE.p2Name = 'WAITING...';
        STATE.p1Name = STATE.myUsername;
        if (el.hostRoomCodeBox) el.hostRoomCodeBox.classList.add('hidden');
        if (el.inlineHostCodeDisplay) el.inlineHostCodeDisplay.classList.add('hidden');
        if (el.inlineInputJoinCode) el.inlineInputJoinCode.value = '';
        if (el.inputJoinRoomCode) el.inputJoinRoomCode.value = '';
        updateNetStatusUI('Create or Join a Room', false);
        renderAll();
      }

      function hostTriggerMultiplayerMatchStart() {
        if (!isMultiplayerReadyToPlay() || STATE.onlineRole !== 'HOST') {
          updateNetStatusUI(`⏳ Cannot start yet! Waiting for Friend (Player 2) to join Room ${STATE.roomCode || ''}...`, false);
          if (el.inlineLobbyWaitHint) {
            el.inlineLobbyWaitHint.textContent = `⚠️ Match cannot start until your friend joins Room ${STATE.roomCode || ''}! Share the Room Code first.`;
          }
          renderAll();
          return;
        }
        SoundFX.click();
        STATE.mode = 'ONLINE_2P';
        STATE.activeScreen = 'PITCH';
        if (el.mpModal) {
          el.mpModal.classList.add('hidden');
          el.mpModal.classList.remove('flex');
        }
        sendNetMessage({
          type: 'HOST_START_MATCH',
          p1Name: STATE.p1Name,
          p2Name: STATE.p2Name,
          p1CountryFlag: STATE.p1CountryFlag,
          p1CountryCode: STATE.p1CountryCode,
          p2CountryFlag: STATE.p2CountryFlag,
          p2CountryCode: STATE.p2CountryCode,
          p1TossCall: 'ODD',
          p2TossCall: 'EVEN'
        });
        resetGame(true);
        setTimeout(resizeCanvas, 20);
      }

      // ==========================================
      // 5. BUILD NUMBER BUTTON GRIDS (1 TO 10)
      // ==========================================
      function buildNumberButtons() {
        el.tossNumberGrid.innerHTML = '';
        el.playNumberGrid.innerHTML = '';

        for (let num = 1; num <= 10; num++) {
          const tBtn = document.createElement('button');
          tBtn.type = 'button';
          tBtn.className = 'num-btn py-3.5 sm:py-3 rounded-xl font-mono-num font-black text-lg sm:text-lg bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-white border border-slate-700 hover:border-emerald-300 shadow-sm flex flex-col items-center justify-center active:scale-95';
          tBtn.innerHTML = `<span>${num}</span><span class="hidden sm:inline text-[9px] font-sans font-medium opacity-60">${num === 10 ? 'Key 0' : 'Key ' + num}</span>`;
          tBtn.addEventListener('click', () => handleTossNumberPick(num));
          el.tossNumberGrid.appendChild(tBtn);

          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.className = 'num-btn py-4 sm:py-3.5 rounded-xl font-mono-num font-black text-xl sm:text-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-emerald-500 hover:to-teal-500 hover:text-slate-950 text-white border border-slate-700 hover:border-emerald-300 shadow-md flex flex-col items-center justify-center active:scale-95';
          pBtn.innerHTML = `<span>${num}</span><span class="hidden sm:inline text-[10px] font-sans font-semibold opacity-65">${num === 10 ? '[0]' : '[' + num + ']'}</span>`;
          pBtn.addEventListener('click', () => handleGameplayTurn(num));
          el.playNumberGrid.appendChild(pBtn);
        }
      }

      // ==========================================
      // 6. 15-SECOND SYNCHRONIZED SHOT CLOCK / TURN TIMER ENGINE
      // ==========================================
      function stopTurnTimer() {
        if (STATE.turnTimerId !== null) {
          clearInterval(STATE.turnTimerId);
          STATE.turnTimerId = null;
        }
      }

      function enforceMandatoryAuthGate(customBannerMessage = null) {
        syncAuthAndPurgeFakeSeeds();
        if (STATE.isAuthenticated && STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
          if (el.btnCloseAuthModal) el.btnCloseAuthModal.classList.remove('hidden');
          if (el.modalAccountActionsWrap) el.modalAccountActionsWrap.classList.remove('hidden');
          if (el.modalAuthTitle) {
            el.modalAuthTitle.innerHTML = '<span>🔐</span><span>Player Account &amp; Security</span>';
          }
          if (el.modalAuthSubtitle) {
            el.modalAuthSubtitle.textContent = `Connected as ${STATE.myCountryFlag} ${STATE.myUsername} (${STATE.myCountryCode})`;
          }
          if (!window.__v2ShownThisPageLoad) {
            window.__v2ShownThisPageLoad = true;
            try {
              localStorage.removeItem('oddandeven_just_logged_in');
              sessionStorage.removeItem('oddandeven_show_v2_box');
            } catch (e) {}
            if (typeof window.openVersion2Showcase === 'function') {
              window.openVersion2Showcase();
            }
          }
          return true;
        }

        // User is NOT authenticated: hide Version 2 showcase box, stop timer & lock screen with mandatory Login / Sign Up modal
        if (typeof window.closeVersion2Showcase === 'function') {
          window.closeVersion2Showcase();
        }
        stopTurnTimer();
        if (el.authModal) {
          el.authModal.classList.remove('hidden');
          el.authModal.classList.add('flex');
        }
        if (el.btnCloseAuthModal) el.btnCloseAuthModal.classList.add('hidden');
        if (el.modalAccountActionsWrap) el.modalAccountActionsWrap.classList.add('hidden');
        if (el.modalRemoveConfirmBox) el.modalRemoveConfirmBox.classList.add('hidden');
        if (el.modalAuthTitle) {
          el.modalAuthTitle.innerHTML = '<span>🔒</span><span>Account &amp; Password Required</span>';
        }
        if (el.modalAuthSubtitle) {
          el.modalAuthSubtitle.textContent = 'You must Sign In or Sign Up with a 5-Digit PIN password to play';
        }
        if (customBannerMessage && el.modalAuthAlert) {
          el.modalAuthAlert.classList.remove('hidden');
          el.modalAuthAlert.className = 'p-2.5 rounded-xl text-xs font-bold border bg-amber-500/15 border-amber-400/40 text-amber-200';
          el.modalAuthAlert.textContent = customBannerMessage;
        }
        return false;
      }

      function requireAccountAndPassword() {
        return enforceMandatoryAuthGate('🔒 Account & 5-Digit PIN Password required! Sign in or create an account below to play.');
      }

      function isTimerActiveState() {
        if (isMultiplayer() && !isMultiplayerReadyToPlay()) {
          return false;
        }
        return (
          STATE.isAuthenticated &&
          !isPlaceholderUsername(STATE.myUsername) &&
          STATE.activeScreen === 'PITCH' &&
          (STATE.phase === 'TOSS' || STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2')
        );
      }

      function setNumberPadLockedState(isLocked) {
        const allBtns = [
          ...el.tossNumberGrid.querySelectorAll('button'),
          ...el.playNumberGrid.querySelectorAll('button')
        ];
        allBtns.forEach((btn) => {
          btn.disabled = Boolean(isLocked);
        });
      }

      function updateTimerUI() {
        if (!el.turnTimerBar) return;
        const active = isTimerActiveState();
        if (isMultiplayer() && !isMultiplayerReadyToPlay() && STATE.activeScreen === 'PITCH') {
          el.turnTimerBar.classList.remove('hidden');
          if (el.mpDualClockGrid) el.mpDualClockGrid.classList.add('hidden');
          el.timerDigitalDisplay.textContent = 'WAIT';
          el.timerDigitalDisplay.className = 'px-3.5 py-1.5 rounded-lg font-mono-num text-base sm:text-xl font-black bg-amber-950 text-amber-300 border border-amber-500/50 tracking-wider';
          el.timerProgressBar.style.width = '100%';
          el.timerProgressBar.className = 'h-full bg-amber-400/50 transition-all duration-300';
          el.timerStatusTitle.textContent = `⏳ Waiting for Friend (Player 2) to Join Room ${STATE.roomCode || ''}...`;
          el.timerStatusSub.textContent = 'Match and 15s countdown will not start until your friend joins the room!';
          setNumberPadLockedState(true);
          return;
        }
        el.turnTimerBar.classList.toggle('hidden', !active);
        if (!active) {
          setNumberPadLockedState(false);
          return;
        }

        const sec = Math.max(0, STATE.turnSecondsLeft);
        const fmtSec = `00:${sec < 10 ? '0' + sec : sec}`;
        el.timerDigitalDisplay.textContent = fmtSec;
        const pct = Math.max(0, Math.min(100, (sec / TURN_DURATION_SEC) * 100));
        el.timerProgressBar.style.width = `${pct}%`;

        const p1 = getP1Label();
        const p2 = getP2Label();

        if (isMultiplayer()) {
          if (el.mpDualClockGrid) el.mpDualClockGrid.classList.remove('hidden');
          const p1TurnActive = STATE.pendingP1Num === null;
          const waitingOn = p1TurnActive ? p1 : p2;
          const lockedOther = p1TurnActive ? p2 : p1;

          el.timerStatusTitle.textContent =
            STATE.phase === 'TOSS'
              ? `⏱️ ${waitingOn}'s 15s Toss Countdown (${sec}s) • 🔒 ${lockedOther}'s Clock Locked`
              : `⏱️ ${waitingOn}'s 15s Turn Countdown (${sec}s) • 🔒 ${lockedOther}'s Clock Locked`;
          el.timerStatusSub.textContent = p1TurnActive
            ? `Synced 15s Clock: Running for ${p1} (P1) and LOCKED for ${p2} (P2). Once ${p1} picks a number, ${p1} locks and ${p2} unlocks!`
            : `🔒 ${p1} (P1) locked in! Now ${p2} (P2)'s 15s countdown is UNLOCKED (${sec}s left to pick 1–10)!`;

          if (el.mpClockNameP1) el.mpClockNameP1.textContent = `${p1} (P1)`;
          if (el.mpClockNameP2) el.mpClockNameP2.textContent = `${p2} (P2)`;

          if (p1TurnActive) {
            el.mpClockCardP1.className = 'p-2.5 rounded-xl border-2 border-[#81b64c] bg-[#81b64c]/15 flex items-center justify-between gap-2 transition-all shadow-md';
            el.mpClockIconP1.textContent = '🟢';
            el.mpClockStateP1.textContent = 'UNLOCKED • PICK NUMBER NOW';
            el.mpClockStateP1.className = 'text-[10px] font-extrabold uppercase tracking-wider text-[#a3d96c] mt-0.5';
            el.mpClockDigitsP1.textContent = `⏱️ ${fmtSec}`;
            el.mpClockDigitsP1.className = 'px-2.5 py-1 rounded-lg font-mono-num text-sm font-black bg-[#161512] text-[#81b64c] border border-[#81b64c]/60 shrink-0';

            el.mpClockCardP2.className = 'p-2.5 rounded-xl border border-[#45423e] bg-[#161512] opacity-75 flex items-center justify-between gap-2 transition-all';
            el.mpClockIconP2.textContent = '🔒';
            el.mpClockStateP2.textContent = `LOCKED • WAITING FOR ${p1}`;
            el.mpClockStateP2.className = 'text-[10px] font-extrabold uppercase tracking-wider text-amber-300/80 mt-0.5';
            el.mpClockDigitsP2.textContent = `🔒 00:${TURN_DURATION_SEC}`;
            el.mpClockDigitsP2.className = 'px-2.5 py-1 rounded-lg font-mono-num text-sm font-black bg-[#22201d] text-slate-400 border border-[#45423e] shrink-0';
          } else {
            const p1Saved = STATE.p1LockedSec !== null ? STATE.p1LockedSec : TURN_DURATION_SEC;
            const p1SavedStr = `00:${p1Saved < 10 ? '0' + p1Saved : p1Saved}`;
            el.mpClockCardP1.className = 'p-2.5 rounded-xl border border-emerald-500/40 bg-[#161512] opacity-85 flex items-center justify-between gap-2 transition-all';
            el.mpClockIconP1.textContent = '🔒';
            el.mpClockStateP1.textContent = 'LOCKED ✓ • NUMBER CHOSEN';
            el.mpClockStateP1.className = 'text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 mt-0.5';
            el.mpClockDigitsP1.textContent = `🔒 ${p1SavedStr}`;
            el.mpClockDigitsP1.className = 'px-2.5 py-1 rounded-lg font-mono-num text-sm font-black bg-[#22201d] text-emerald-300 border border-emerald-500/40 shrink-0';

            el.mpClockCardP2.className = 'p-2.5 rounded-xl border-2 border-[#81b64c] bg-[#81b64c]/15 flex items-center justify-between gap-2 transition-all shadow-md';
            el.mpClockIconP2.textContent = '🟢';
            el.mpClockStateP2.textContent = 'UNLOCKED • PICK NUMBER NOW!';
            el.mpClockStateP2.className = 'text-[10px] font-extrabold uppercase tracking-wider text-[#a3d96c] mt-0.5';
            el.mpClockDigitsP2.textContent = `⏱️ ${fmtSec}`;
            el.mpClockDigitsP2.className = 'px-2.5 py-1 rounded-lg font-mono-num text-sm font-black bg-[#161512] text-[#81b64c] border border-[#81b64c]/60 shrink-0';
          }

          const mySlot = STATE.onlineRole === 'GUEST' ? 'P2' : 'P1';
          const myTurnUnlocked = (mySlot === 'P1' && p1TurnActive) || (mySlot === 'P2' && !p1TurnActive);
          setNumberPadLockedState(!myTurnUnlocked);
        } else {
          if (el.mpDualClockGrid) el.mpDualClockGrid.classList.add('hidden');
          setNumberPadLockedState(false);
          el.timerStatusTitle.textContent =
            STATE.phase === 'TOSS'
              ? `⏱️ Toss Clock: ${sec}s remaining to throw your toss hand`
              : `⏱️ Shot Clock: ${sec}s remaining (${p2} is waiting for your turn)`;
          el.timerStatusSub.textContent =
            STATE.phase === 'TOSS'
              ? `Pick a number (1–10) within 15s or the match is forfeited!`
              : `Pick a number (1–10) within 15s or ${p2} wins by timeout!`;
        }

        if (sec <= 4) {
          el.timerDigitalDisplay.className = 'px-3.5 py-1.5 rounded-lg font-mono-num text-lg sm:text-xl font-black bg-rose-950 text-rose-300 border border-rose-500 animate-pulse tracking-wider';
          el.timerProgressBar.className = 'h-full bg-rose-500 transition-all duration-300';
        } else if (sec <= 8) {
          el.timerDigitalDisplay.className = 'px-3.5 py-1.5 rounded-lg font-mono-num text-lg sm:text-xl font-black bg-[#161512] text-amber-300 border border-amber-500/50 tracking-wider';
          el.timerProgressBar.className = 'h-full bg-amber-400 transition-all duration-300';
        } else {
          el.timerDigitalDisplay.className = 'px-3.5 py-1.5 rounded-lg font-mono-num text-lg sm:text-xl font-black bg-[#161512] text-[#81b64c] border border-[#45423e] tracking-wider';
          el.timerProgressBar.className = 'h-full bg-[#81b64c] transition-all duration-300';
        }
      }

      function startTurnTimer(fromNetworkSync = false) {
        stopTurnTimer();
        STATE.turnSecondsLeft = TURN_DURATION_SEC;
        STATE.turnDeadlineMs = Date.now() + TURN_DURATION_SEC * 1000;
        updateTimerUI();
        if (!isTimerActiveState()) return;

        const curTurnStep = STATE.pendingP1Num === null ? 'P1' : 'P2';
        // Whenever Host starts a 15s turn, broadcast the exact 15s deadline to Guest immediately!
        if (isMultiplayer() && STATE.onlineRole === 'HOST') {
          sendNetMessage({
            type: 'TIMER_SYNC',
            remainingMs: TURN_DURATION_SEC * 1000,
            secondsLeft: TURN_DURATION_SEC,
            turnStep: curTurnStep,
            p1LockedSec: STATE.p1LockedSec,
            p2LockedSec: STATE.p2LockedSec,
            phase: STATE.phase
          });
        }

        let lastWholeSec = TURN_DURATION_SEC;
        STATE.turnTimerId = setInterval(() => {
          if (!isTimerActiveState()) {
            stopTurnTimer();
            return;
          }
          const remMs = Math.max(0, STATE.turnDeadlineMs - Date.now());
          const nextSec = Math.max(0, Math.min(TURN_DURATION_SEC, Math.ceil(remMs / 1000)));
          if (nextSec !== lastWholeSec) {
            lastWholeSec = nextSec;
            STATE.turnSecondsLeft = nextSec;
            if (STATE.turnSecondsLeft <= 3 && STATE.turnSecondsLeft > 0) {
              SoundFX.playTone(680, 'sine', 0.06, 0.08);
            }
            updateTimerUI();

            // Host broadcasts every second so both screens stay 100% synchronized!
            if (isMultiplayer() && STATE.onlineRole === 'HOST') {
              sendNetMessage({
                type: 'TIMER_SYNC',
                remainingMs: remMs,
                secondsLeft: STATE.turnSecondsLeft,
                turnStep: STATE.pendingP1Num === null ? 'P1' : 'P2',
                p1LockedSec: STATE.p1LockedSec,
                p2LockedSec: STATE.p2LockedSec,
                phase: STATE.phase
              });
            }
          }

          if (remMs <= 0) {
            if (!isMultiplayer() || STATE.onlineRole === 'HOST') {
              stopTurnTimer();
              handleTurnTimeout();
            } else if (Date.now() - STATE.turnDeadlineMs > 1200) {
              // Fallback if Host tab was background-throttled when timer expired
              stopTurnTimer();
              handleTurnTimeout();
            }
          }
        }, 200);
      }

      function handleTurnTimeout() {
        if (isMultiplayer() && !isMultiplayerReadyToPlay()) {
          stopTurnTimer();
          return;
        }
        const p1 = getP1Label();
        const p2 = getP2Label();

        let winnerSide = 'AI';
        let timedOutPlayer = p1;
        let waitingWinnerName = p2;

        if (isMultiplayer()) {
          if (STATE.pendingP1Num !== null && STATE.pendingP2Num === null) {
            winnerSide = 'USER';
            timedOutPlayer = p2;
            waitingWinnerName = p1;
          } else {
            winnerSide = 'AI';
            timedOutPlayer = p1;
            waitingWinnerName = p2;
          }
        }

        const isTossTimeout = STATE.phase === 'TOSS';
        const reason = isTossTimeout
          ? `🏳️ Match Forfeited! ${timedOutPlayer} did not pick a toss number before the 15s countdown ran out (${waitingWinnerName} wins by Toss Forfeit).`
          : `⏱️ Time Out Loss! ${timedOutPlayer} ran out of time during the match — ${timedOutPlayer} loses and ${waitingWinnerName} wins the match!`;

        STATE.liveBroadcastQuote = `"${reason}"`;
        STATE.liveExcitementLabel = isTossTimeout ? '🏳️ MATCH FORFEITED' : '⏱️ TIMEOUT LOSS';

        if (isMultiplayer()) {
          sendNetMessage({
            type: 'TIMEOUT_FORFEIT',
            winner: winnerSide,
            reason,
            isTossForfeit: isTossTimeout
          });
        }
        finishMatch(winnerSide, reason, true, isTossTimeout);
        renderAll();
      }

      function setTossCall(callType) {
        if (!requireAccountAndPassword()) return;
        if (STATE.phase !== 'TOSS') return;
        if (isMultiplayer() && !isMultiplayerReadyToPlay()) {
          STATE.lastOutcomeText = `⏳ Waiting for Friend (Player 2) to join Room ${STATE.roomCode || ''} — Match cannot start yet!`;
          renderAll();
          return;
        }

        if (isMultiplayer()) {
          const mySlot = STATE.onlineRole === 'GUEST' ? 'P2' : 'P1';
          // In Online Multiplayer, P1 calls Odd/Even before locking P1's toss number; P2 automatically gets the opposite call
          if (mySlot === 'P2' || STATE.pendingP1Num !== null) {
            return;
          }
        }

        SoundFX.click();
        STATE.tossCall = callType;
        STATE.p1TossCall = callType;
        STATE.p2TossCall = callType === 'EVEN' ? 'ODD' : 'EVEN';

        if (isMultiplayer()) {
          sendNetMessage({ type: 'TOSS_CALL', caller: 'P1', callType });
        }

        startTurnTimer();
        renderAll();
      }

      function checkAndResolveMultiplayerTurn() {
        if (STATE.pendingP1Num !== null && STATE.pendingP2Num !== null) {
          const p1Num = STATE.pendingP1Num;
          const p2Num = STATE.pendingP2Num;
          STATE.pendingP1Num = null;
          STATE.pendingP2Num = null;
          STATE.p1LockedSec = null;
          STATE.p2LockedSec = null;
          stopTurnTimer();
          if (STATE.phase === 'TOSS') {
            resolveTossNumbers(p1Num, p2Num);
          } else if (STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2') {
            resolveGameplayNumbers(p1Num, p2Num);
          }
        }
      }

      function submitPlayerInput(num) {
        if (!requireAccountAndPassword()) return;
        if (!isMultiplayer()) {
          if (STATE.phase === 'TOSS') handleTossNumberPick(num);
          else if (STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2') handleGameplayTurn(num);
          return;
        }

        if (!isMultiplayerReadyToPlay()) {
          stopTurnTimer();
          STATE.lastOutcomeText = `⏳ Waiting for Friend (Player 2) to join Room ${STATE.roomCode || ''} — Match cannot start yet!`;
          renderAll();
          return;
        }

        if (STATE.phase !== 'TOSS' && STATE.phase !== 'INNINGS_1' && STATE.phase !== 'INNINGS_2') return;

        // Sequential Countdown Lock/Unlock in Online Multiplayer:
        // 1. P1's 15s countdown runs first (P2 is locked).
        // 2. Once P1 picks a number, P1's clock locks and P2's 15s countdown unlocks on both screens!
        const mySlot = STATE.onlineRole === 'GUEST' ? 'P2' : 'P1';
        if (mySlot === 'P1' && STATE.pendingP1Num !== null) {
          return;
        }
        if (mySlot === 'P2' && STATE.pendingP1Num === null) {
          STATE.lastOutcomeText = `🔒 ${getP2Label()} (P2) is locked until ${getP1Label()} (P1) picks a number!`;
          renderAll();
          return;
        }
        if (mySlot === 'P2' && STATE.pendingP2Num !== null) {
          return;
        }

        SoundFX.click();
        if (STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2') {
          recordNumberPickTelemetry(num);
        }
        const lockedSec = STATE.turnSecondsLeft;
        if (mySlot === 'P1') {
          STATE.pendingP1Num = num;
          STATE.p1LockedSec = lockedSec;
        } else {
          STATE.pendingP2Num = num;
          STATE.p2LockedSec = lockedSec;
        }

        sendNetMessage({ type: 'PICK_NUM', player: mySlot, num, lockedSec });

        if (STATE.pendingP1Num !== null && STATE.pendingP2Num === null) {
          // Lock P1 countdown and unlock 15s countdown for P2!
          startTurnTimer();
        }
        checkAndResolveMultiplayerTurn();
        renderAll();
      }

      function handleTossNumberPick(userNum) {
        if (!requireAccountAndPassword()) return;
        if (STATE.phase !== 'TOSS') return;
        if (isMultiplayer()) {
          submitPlayerInput(userNum);
          return;
        }
        stopTurnTimer();
        let aiNum = randomInt1To10();
        resolveTossNumbers(userNum, aiNum);
      }

      function resolveTossNumbers(userNum, aiNum) {
        if (STATE.phase !== 'TOSS') return;
        stopTurnTimer();
        const sum = userNum + aiNum;
        const sumParity = sum % 2 === 1 ? 'ODD' : 'EVEN';

        const p1Call = isMultiplayer() ? (STATE.p1TossCall || STATE.tossCall) : STATE.tossCall;
        const p2Call = p1Call === 'EVEN' ? 'ODD' : 'EVEN';
        STATE.p1TossCall = p1Call;
        STATE.p2TossCall = p2Call;

        const p1Won = p1Call === sumParity;

        STATE.tossUserNum = userNum;
        STATE.tossAiNum = aiNum;
        STATE.tossSum = sum;
        STATE.lastUserNum = userNum;
        STATE.lastAiNum = aiNum;
        STATE.tossWinner = p1Won ? 'USER' : 'AI';
        STATE.phase = 'TOSS_DECISION';

        const p1 = getP1Label();
        const p2 = getP2Label();
        const winnerRealName = p1Won ? `${p1} (P1)` : (isMultiplayer() ? `${p2} (P2)` : p2);

        const tossComm = buildEngagingCommentary('TOSS', {
          p1,
          p2,
          call: `${p1}: ${p1Call} / ${p2}: ${p2Call}`,
          u: userNum,
          a: aiNum,
          sum,
          parity: sumParity,
          winner: winnerRealName
        });
        STATE.liveBroadcastQuote = tossComm.quote;
        STATE.liveExcitementLabel = tossComm.tag;

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: 'TOSS',
          title: `${winnerRealName} won the Toss! (${userNum} + ${aiNum} = ${sum} ${sumParity})`,
          detail: `${p1} (${p1Call}) played ${userNum} • ${p2} (${p2Call}) played ${aiNum}`,
          commentary: tossComm.quote,
          badge: `${winnerRealName} WON TOSS`,
          badgeColor: p1Won ? 'emerald' : 'cyan'
        });

        if (p1Won) {
          SoundFX.runScored(6);
          STATE.lastOutcomeText = `🎉 ${p1} (P1) Won the Toss! ${userNum} + ${aiNum} = ${sum} (${sumParity})`;
          triggerCanvasReveal(`${p1} (P1) WON TOSS!`, `Sum is ${sum} (${sumParity}) — ${p1} chooses Bat or Bowl`, '#81b64c', true);
        } else if (isMultiplayer()) {
          SoundFX.runScored(6);
          STATE.lastOutcomeText = `🎉 ${p2} (P2) Won the Toss! ${userNum} + ${aiNum} = ${sum} (${sumParity})`;
          triggerCanvasReveal(`${p2} (P2) WON TOSS!`, `Sum is ${sum} (${sumParity}) — ${p2} chooses Bat or Bowl`, '#38bdf8', true);
        } else {
          const aiChoosesBat = Math.random() < 0.6;
          STATE.firstBatter = aiChoosesBat ? 'AI' : 'USER';
          SoundFX.click();
          STATE.lastOutcomeText = `${p2} Won Toss (${userNum} + ${aiNum} = ${sum}) & chose to ${aiChoosesBat ? 'BAT' : 'BOWL'} first!`;
          triggerCanvasReveal(
            `${p2.toUpperCase()} WON TOSS`,
            `${p2} elected to ${aiChoosesBat ? 'BAT' : 'BOWL'} first!`,
            '#38bdf8',
            false
          );
        }

        renderAll();
      }

      // Toss Winner selects Bat or Bowl -> Automatically assigns the opposite role to the other player on BOTH screens!
      function handleUserTossDecision(choice) {
        if (!requireAccountAndPassword()) return;
        if (STATE.phase !== 'TOSS_DECISION') return;

        // In Online Multiplayer, verify that only the Toss Winner can click Bat or Bowl!
        if (isMultiplayer()) {
          const mySlot = STATE.onlineRole === 'GUEST' ? 'P2' : 'P1';
          const winnerSlot = STATE.tossWinner === 'USER' ? 'P1' : 'P2';
          if (mySlot !== winnerSlot) return;
        }

        SoundFX.click();
        if (isMultiplayer() && STATE.tossWinner === 'AI') {
          // P2 won the toss: if P2 chose BAT, P2 ('AI') bats first & P1 ('USER') bowls; if P2 chose BOWL, P1 ('USER') automatically bats first!
          STATE.firstBatter = choice === 'BAT' ? 'AI' : 'USER';
        } else {
          // P1 won the toss: if P1 chose BAT, P1 ('USER') bats first & P2 ('AI') bowls; if P1 chose BOWL, P2 ('AI') automatically bats first!
          STATE.firstBatter = choice === 'BAT' ? 'USER' : 'AI';
        }

        if (isMultiplayer()) {
          sendNetMessage({
            type: 'TOSS_DECISION_CHOICE',
            firstBatter: STATE.firstBatter,
            decisionChoice: choice
          });
        }
        startFirstInnings(choice);
      }

      function startFirstInnings(decisionChoice = null) {
        STATE.phase = 'INNINGS_1';
        STATE.currentInnings = 1;
        STATE.currentBatter = STATE.firstBatter;
        STATE.lastUserNum = null;
        STATE.lastAiNum = null;

        const p1 = getP1Label();
        const p2 = getP2Label();
        const p1Batting = STATE.currentBatter === 'USER';
        const batterName = p1Batting ? `${p1} (P1)` : (isMultiplayer() ? `${p2} (P2)` : p2);
        const bowlerName = p1Batting ? (isMultiplayer() ? `${p2} (P2)` : p2) : `${p1} (P1)`;

        const p1WonToss = STATE.tossWinner === 'USER';
        const tossWinnerName = p1WonToss ? `${p1} (P1)` : (isMultiplayer() ? `${p2} (P2)` : p2);
        const tossLoserName = p1WonToss ? (isMultiplayer() ? `${p2} (P2)` : p2) : `${p1} (P1)`;
        const winnerPicked = decisionChoice || ((p1WonToss && p1Batting) || (!p1WonToss && !p1Batting) ? 'BAT' : 'BOWL');
        const autoAssignedOther = winnerPicked === 'BOWL' ? 'BAT' : 'BOWL';
        const chosenRoleText = `🪙 ${tossWinnerName} won the toss & chose ${winnerPicked} → ${tossLoserName} automatically assigned ${autoAssignedOther}! (🏏 ${batterName} Batting vs ⚾ ${bowlerName} Bowling)`;

        STATE.lastTossDecisionSummary = chosenRoleText;
        STATE.lastOutcomeText = chosenRoleText;
        STATE.liveBroadcastQuote = `"${chosenRoleText}"`;
        STATE.liveExcitementLabel = '1ST INNINGS START';

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: '1ST INNINGS',
          title: `🏏 ${batterName} Batting • ⚾ ${bowlerName} Bowling`,
          detail: chosenRoleText,
          badge: 'ROLES SET',
          badgeColor: 'amber'
        });

        triggerCanvasReveal(
          '1ST INNINGS',
          `🏏 ${batterName} Bats vs ⚾ ${bowlerName} Bowls`,
          '#f59e0b',
          false
        );

        renderAll();
        startTurnTimer(true);
      }

      function recordNumberPickTelemetry(num) {
        const clean = (STATE.myUsername || '').trim().toUpperCase();
        if (!clean || isPlaceholderUsername(clean)) return;
        try {
          const key = 'oddandeven_number_frequency_' + clean;
          const raw = localStorage.getItem(key);
          const freq = raw ? JSON.parse(raw) : {};
          freq[num] = (Number(freq[num]) || 0) + 1;
          localStorage.setItem(key, JSON.stringify(freq));
        } catch (e) {}
      }

      function handleGameplayTurn(userNum) {
        if (!requireAccountAndPassword()) return;
        if (STATE.phase !== 'INNINGS_1' && STATE.phase !== 'INNINGS_2') return;
        if (isMultiplayer()) {
          submitPlayerInput(userNum);
          return;
        }
        recordNumberPickTelemetry(userNum);
        const isBotBatting = STATE.currentBatter === 'AI';
        const botNum = generateBotNumber(isBotBatting, userNum);
        STATE.userNumHistory.push(userNum);
        resolveGameplayNumbers(userNum, botNum);
      }

      function resolveGameplayNumbers(userNum, aiNum) {
        if (STATE.phase !== 'INNINGS_1' && STATE.phase !== 'INNINGS_2') return;
        stopTurnTimer();
        STATE.lastUserNum = userNum;
        STATE.lastAiNum = aiNum;

        const isUserBatting = STATE.currentBatter === 'USER';
        const batterNum = isUserBatting ? userNum : aiNum;
        const isOut = userNum === aiNum;

        const p1 = getP1Label();
        const p2 = getP2Label();
        const mpMatch = isMultiplayer();
        const p1Rec = ensureHumanPlayerRecord(p1, 1500, {
          countryCode: STATE.p1CountryCode || STATE.myCountryCode,
          countryFlag: STATE.p1CountryFlag || STATE.myCountryFlag,
          countryName: STATE.p1CountryName || STATE.myCountryName
        }, !isPlaceholderUsername(p1));
        const p2Rec = mpMatch ? ensureHumanPlayerRecord(p2, STATE.friendEloRating, {
          countryCode: STATE.p2CountryCode,
          countryFlag: STATE.p2CountryFlag,
          countryName: STATE.p2CountryName
        }, !isPlaceholderUsername(p2)) : null;

        if (isUserBatting) {
          STATE.userBalls += 1;
          if (p1Rec) p1Rec.totalBalls = (p1Rec.totalBalls || 0) + 1;
          if (p2Rec) p2Rec.ballsBowled = (p2Rec.ballsBowled || 0) + 1;
        } else {
          STATE.aiBalls += 1;
          if (p1Rec) p1Rec.ballsBowled = (p1Rec.ballsBowled || 0) + 1;
          if (p2Rec) p2Rec.totalBalls = (p2Rec.totalBalls || 0) + 1;
        }

        const ballNumber = isUserBatting ? STATE.userBalls : STATE.aiBalls;
        const inningsTag = STATE.currentInnings === 1 ? 'INN 1' : 'INN 2';

        const batterName = isUserBatting ? p1 : p2;
        const bowlerName = isUserBatting ? p2 : p1;

        // CASE A: WICKET (Both numbers matched!)
        if (isOut) {
          const cleanActor = String(STATE.myUsername || '').trim().toUpperCase();
          const eqVfx = (function() {
            try { return localStorage.getItem('oddandeven_equipped_vfx_' + cleanActor) || ''; } catch(e) { return ''; }
          })();
          const eqCard = (function() {
            try { return localStorage.getItem('oddandeven_equipped_card_' + cleanActor) || ''; } catch(e) { return ''; }
          })();

          if (eqVfx === 'vfx_thunder_wicket') {
            SoundFX.thunderWicket ? SoundFX.thunderWicket() : SoundFX.wicket();
            STATE.anim.flashColor = '#38bdf8';
            STATE.anim.flashAlpha = 0.9;
            for (let i = 0; i < 35; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 6;
              STATE.anim.particles.push({
                x: el.arenaCanvas ? el.arenaCanvas.width / 2 : 200,
                y: el.arenaCanvas ? el.arenaCanvas.height * 0.5 : 120,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                alpha: 1,
                radius: 2 + Math.random() * 3,
                color: Math.random() > 0.4 ? '#38bdf8' : '#facc15'
              });
            }
          } else if (eqVfx === 'ball_meteorite_fireball') {
            SoundFX.fireballWicket ? SoundFX.fireballWicket() : SoundFX.wicket();
            STATE.anim.flashColor = '#f97316';
            STATE.anim.flashAlpha = 0.9;
            for (let i = 0; i < 35; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 6;
              STATE.anim.particles.push({
                x: el.arenaCanvas ? el.arenaCanvas.width / 2 : 200,
                y: el.arenaCanvas ? el.arenaCanvas.height * 0.5 : 120,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                alpha: 1,
                radius: 2 + Math.random() * 3.5,
                color: Math.random() > 0.3 ? '#f97316' : '#ef4444'
              });
            }
          } else if (eqCard === 'card_mythic_immortal') {
            SoundFX.wicket();
            STATE.anim.flashColor = '#ff4d6d';
            STATE.anim.flashAlpha = 0.85;
            for (let i = 0; i < 30; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 5;
              STATE.anim.particles.push({
                x: el.arenaCanvas ? el.arenaCanvas.width / 2 : 200,
                y: el.arenaCanvas ? el.arenaCanvas.height * 0.5 : 120,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                alpha: 1,
                radius: 2 + Math.random() * 3,
                color: '#ff4d6d'
              });
            }
          } else {
            SoundFX.wicket();
          }
          STATE.currentStreak = 0;

          if (isUserBatting) {
            if (p1Rec) {
              p1Rec.wicketsLost = (p1Rec.wicketsLost || 0) + 1;
              p1Rec.updatedAt = Date.now();
            }
            STATE.aiMatchWickets += 1;
            if (mpMatch && p2Rec) {
              p2Rec.wicketsTaken = (p2Rec.wicketsTaken || 0) + 1;
              p2Rec.weeklyWickets = (p2Rec.weeklyWickets || 0) + 1;
              p2Rec.updatedAt = Date.now();
            }
          } else {
            if (p1Rec) {
              p1Rec.wicketsTaken = (p1Rec.wicketsTaken || 0) + 1;
              p1Rec.weeklyWickets = (p1Rec.weeklyWickets || 0) + 1;
              p1Rec.updatedAt = Date.now();
            }
            STATE.userMatchWickets += 1;
            if (mpMatch && p2Rec) {
              p2Rec.wicketsLost = (p2Rec.wicketsLost || 0) + 1;
              p2Rec.updatedAt = Date.now();
            }
          }
          saveLocalStatsOnly();
          scheduleDebouncedGlobalSync();

          const wComm = buildEngagingCommentary('WICKET', {
            u: userNum,
            batter: batterName,
            bowler: bowlerName,
            score: isUserBatting ? STATE.userScore : STATE.aiScore,
            balls: ballNumber
          });
          STATE.liveBroadcastQuote = wComm.quote;
          STATE.liveExcitementLabel = wComm.tag;

          STATE.history.unshift({
            id: Date.now() + Math.random(),
            tag: `${inningsTag} • B${ballNumber}`,
            title: `HOWZAT! Both played ${userNum}! (${bowlerName} +1 Wicket)`,
            detail: isUserBatting
              ? `${p1} OUT for ${STATE.userScore} (${STATE.userBalls} balls)`
              : `${p2} OUT for ${STATE.aiScore} (${STATE.aiBalls} balls) • ${p1} Wickets: ${p1Rec.wicketsTaken}`,
            commentary: wComm.quote,
            badge: 'WICKET!',
            badgeColor: 'rose'
          });

          if (STATE.currentInnings === 1) {
            const firstInningsScore = isUserBatting ? STATE.userScore : STATE.aiScore;
            STATE.target = firstInningsScore + 1;
            STATE.phase = 'INNINGS_BREAK';
            STATE.lastOutcomeText = STATE.commentaryStyle === 'ROAST' ? `${wComm.quote.replace(/^"|"$/g, '')} • Target: ${STATE.target}` : `OUT! Both played ${userNum}! (${bowlerName} takes wicket) • Target: ${STATE.target}.`;
            triggerCanvasReveal(
              `OUT ON ${userNum}!`,
              `Wicket by ${bowlerName} • Target: ${STATE.target} Runs`,
              '#f43f5e',
              true
            );
          } else {
            const firstInningsScore = STATE.target - 1;
            const secondInningsScore = isUserBatting ? STATE.userScore : STATE.aiScore;
            const runsShort = firstInningsScore - secondInningsScore;
            if (runsShort === 0) {
              // Match drawn! Both sides bowled out on the exact same score
              finishMatch(
                'DRAW',
                `🤝 What a thriller! Both players were bowled out on ${firstInningsScore} runs (${firstInningsScore} vs ${secondInningsScore}) — Match is Drawn!`
              );
            } else {
              const defendingWinner = isUserBatting ? 'AI' : 'USER';
              finishMatch(
                defendingWinner,
                `OUT on ${userNum}! ${defendingWinner === 'USER' ? p1 : p2} took the winning wicket and won by ${runsShort} run${runsShort === 1 ? '' : 's'}!`
              );
            }
          }

          renderAll();
          return;
        }

        // CASE B: RUNS SCORED
        if (isUserBatting) {
          STATE.userScore += batterNum;
          if (p1Rec) {
            p1Rec.totalRuns = (p1Rec.totalRuns || 0) + batterNum;
            p1Rec.weeklyRuns = (p1Rec.weeklyRuns || 0) + batterNum;
            if (STATE.userScore > (p1Rec.highScore || 0)) {
              p1Rec.highScore = STATE.userScore;
            }
            p1Rec.updatedAt = Date.now();
          }
          saveLocalStatsOnly();
          scheduleDebouncedGlobalSync();
        } else {
          STATE.aiScore += batterNum;
          if (mpMatch && p2Rec) {
            p2Rec.totalRuns += batterNum;
            p2Rec.weeklyRuns += batterNum;
            if (STATE.aiScore > p2Rec.highScore) {
              p2Rec.highScore = STATE.aiScore;
            }
            p2Rec.updatedAt = Date.now();
            saveLocalStatsOnly();
            scheduleDebouncedGlobalSync();
          }
        }

        const currentBatScore = isUserBatting ? STATE.userScore : STATE.aiScore;
        STATE.currentStreak += 1;
        const cleanRunner = String(STATE.myUsername || '').trim().toUpperCase();
        const eqBat = (function() {
          try { return localStorage.getItem('oddandeven_equipped_bat_' + cleanRunner) || ''; } catch(e) { return ''; }
        })();
        if (eqBat === 'bat_solid_gold_willow' && batterNum >= 4) {
          SoundFX.goldChime ? SoundFX.goldChime() : SoundFX.runScored(batterNum);
          for (let i = 0; i < 25; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 5;
            STATE.anim.particles.push({
              x: el.arenaCanvas ? el.arenaCanvas.width * 0.22 : 100,
              y: el.arenaCanvas ? el.arenaCanvas.height * 0.54 : 120,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              alpha: 1,
              radius: 2 + Math.random() * 2.5,
              color: Math.random() > 0.5 ? '#f5b83d' : '#ffd166'
            });
          }
        } else {
          SoundFX.runScored(batterNum);
        }

        const needNow = STATE.currentInnings === 2 ? Math.max(0, STATE.target - currentBatScore) : null;
        const rComm = buildEngagingCommentary('RUNS', {
          runs: batterNum,
          u: userNum,
          a: aiNum,
          batter: batterName,
          bowler: bowlerName,
          bowlerNum: isUserBatting ? aiNum : userNum,
          total: currentBatScore,
          need: needNow
        });
        STATE.liveBroadcastQuote = rComm.quote;
        STATE.liveExcitementLabel = rComm.tag;

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: `${inningsTag} • B${ballNumber}`,
          title: `${batterName} scored +${batterNum} run${batterNum > 1 ? 's' : ''}`,
          detail: `${p1}: ${userNum} • ${p2}: ${aiNum} (Innings: ${currentBatScore})`,
          commentary: rComm.quote,
          badge: `+${batterNum}`,
          badgeColor: batterNum >= 6 ? 'emerald' : 'slate'
        });

        if (STATE.currentInnings === 2 && currentBatScore >= STATE.target) {
          const chasingWinner = isUserBatting ? 'USER' : 'AI';
          const ballsUsed = isUserBatting ? STATE.userBalls : STATE.aiBalls;
          finishMatch(
            chasingWinner,
            `${chasingWinner === 'USER' ? p1 : p2} chased down the target of ${STATE.target} in ${ballsUsed} ball${ballsUsed === 1 ? '' : 's'} (Final Score: ${currentBatScore})!`
          );
          renderAll();
          return;
        }

        const remainingNote =
          STATE.currentInnings === 2
            ? ` • Need ${Math.max(0, STATE.target - currentBatScore)} more`
            : '';

        STATE.lastOutcomeText = `${batterName} hit +${batterNum}! (${p1}: ${userNum}, ${p2}: ${aiNum})${remainingNote}`;
        triggerCanvasReveal(
          `+${batterNum} RUN${batterNum > 1 ? 'S' : ''}!`,
          `${p1} played ${userNum} vs ${p2} ${aiNum}${remainingNote}`,
          batterNum >= 6 ? '#10b981' : '#38bdf8',
          batterNum >= 8
        );

        renderAll();
        startTurnTimer(true);
      }

      // Start Innings 2 (Synced across both screens in Online Multiplayer!)
      function startSecondInnings(fromNetwork = false) {
        if (STATE.phase !== 'INNINGS_BREAK') return;
        SoundFX.click();
        if (isMultiplayer() && !fromNetwork) {
          sendNetMessage({ type: 'START_INN_2' });
        }
        STATE.phase = 'INNINGS_2';
        STATE.currentInnings = 2;
        STATE.currentBatter = STATE.firstBatter === 'USER' ? 'AI' : 'USER';
        STATE.lastUserNum = null;
        STATE.lastAiNum = null;

        const p1 = getP1Label();
        const p2 = getP2Label();
        const p1Chasing = STATE.currentBatter === 'USER';
        const chaserName = p1Chasing ? `${p1} (P1)` : (isMultiplayer() ? `${p2} (P2)` : p2);
        const defenderName = p1Chasing ? (isMultiplayer() ? `${p2} (P2)` : p2) : `${p1} (P1)`;

        STATE.lastOutcomeText = `2nd Innings! 🏏 ${chaserName} is chasing ${STATE.target} runs • ⚾ ${defenderName} is bowling!`;

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: '2ND INNINGS',
          title: `🏏 ${chaserName} Chasing ${STATE.target} • ⚾ ${defenderName} Bowling`,
          detail: 'Target chase underway',
          badge: `TARGET ${STATE.target}`,
          badgeColor: 'amber'
        });

        triggerCanvasReveal(
          'THE CHASE BEGINS',
          `Target: ${STATE.target} Runs (${chaserName} Batting)`,
          '#f59e0b',
          false
        );

        renderAll();
        startTurnTimer(true);
      }

      function finishMatch(winner, marginDescription, isTimeoutForfeit = false, isTossForfeit = false) {
        stopTurnTimer();
        STATE.phase = 'GAME_OVER';
        STATE.winner = winner;
        STATE.isTossForfeit = Boolean(isTossForfeit);

        const p1 = getP1Label();
        const p2 = getP2Label();
        const mpMatch = isMultiplayer();
        const amIGuest = mpMatch && STATE.onlineRole === 'GUEST';
        const isDraw = (winner === 'DRAW');

        const p1Rec = ensureHumanPlayerRecord(p1, amIGuest ? STATE.friendEloRating : 1500, {
          countryCode: STATE.p1CountryCode,
          countryFlag: STATE.p1CountryFlag
        }, true);

        if (!STATE.isTossForfeit) {
          if (STATE.userScore >= 100) {
            p1Rec.centuriesCount = (p1Rec.centuriesCount || 0) + 1;
          }
          if (STATE.userBalls > 0 && STATE.userScore > 0 && ((STATE.userScore / STATE.userBalls) * 100) >= 500) {
            p1Rec.sr500Count = (p1Rec.sr500Count || 0) + 1;
          }
        }

        if (mpMatch) {
          const p2Rec = ensureHumanPlayerRecord(p2, amIGuest ? 1500 : STATE.friendEloRating, {
            countryCode: STATE.p2CountryCode,
            countryFlag: STATE.p2CountryFlag
          }, true);

          if (!STATE.isTossForfeit) {
            if (STATE.aiScore >= 100) {
              p2Rec.centuriesCount = (p2Rec.centuriesCount || 0) + 1;
            }
            if (STATE.aiBalls > 0 && STATE.aiScore > 0 && ((STATE.aiScore / STATE.aiBalls) * 100) >= 500) {
              p2Rec.sr500Count = (p2Rec.sr500Count || 0) + 1;
            }
          }

          if (STATE.isTossForfeit) {
            // Toss countdown expired before the match started -> Match Forfeited
            STATE.eloRating = amIGuest ? p2Rec.elo : p1Rec.elo;
            STATE.peakElo = amIGuest ? p2Rec.peak : p1Rec.peak;
            STATE.friendEloRating = amIGuest ? p1Rec.elo : p2Rec.elo;
            STATE.lastEloDelta = 0;

            STATE.eloHistory.unshift({
              id: Date.now() + Math.random(),
              opponent: amIGuest ? p1 : p2,
              p1Name: amIGuest ? p2 : p1,
              mode: 'Multiplayer (Toss Forfeit)',
              result: 'FORFEIT',
              delta: '0',
              newElo: STATE.eloRating,
              runsScored: 0,
              wicketsTaken: 0
            });

            STATE.winMarginText = `${marginDescription} • Toss Forfeit (Rating Unchanged: ${STATE.eloRating} ELO)`;
            STATE.lastOutcomeText = `🏳️ Match Forfeited during Toss! (${winner === 'USER' ? p1 : p2} wins by Toss Forfeit)`;
          } else if (isDraw) {
            // Ranked Multiplayer Match DRAW: Both ratings unchanged (0 ELO change)
            const nowTs = Date.now();
            p1Rec.rankedMatches = (p1Rec.rankedMatches || 0) + 1;
            p1Rec.matches = Math.max((p1Rec.matches || 0) + 1, (p1Rec.wins || 0) + (p1Rec.losses || 0) + 1);
            p1Rec.weeklyMatches = (p1Rec.weeklyMatches || 0) + 1;
            const minP1TotalRuns = (typeof STATE.p1BaseRunsAtMatchStart === 'number' ? STATE.p1BaseRunsAtMatchStart : 0) + STATE.userScore;
            const minP1WeeklyRuns = (typeof STATE.p1BaseWeeklyRunsAtMatchStart === 'number' ? STATE.p1BaseWeeklyRunsAtMatchStart : 0) + STATE.userScore;
            if ((p1Rec.totalRuns || 0) < minP1TotalRuns) p1Rec.totalRuns = minP1TotalRuns;
            if ((p1Rec.weeklyRuns || 0) < minP1WeeklyRuns) p1Rec.weeklyRuns = minP1WeeklyRuns;
            if (STATE.userScore > (p1Rec.highScore || 0)) p1Rec.highScore = STATE.userScore;
            p1Rec.updatedAt = nowTs;

            p2Rec.rankedMatches = (p2Rec.rankedMatches || 0) + 1;
            p2Rec.matches = Math.max((p2Rec.matches || 0) + 1, (p2Rec.wins || 0) + (p2Rec.losses || 0) + 1);
            p2Rec.weeklyMatches = (p2Rec.weeklyMatches || 0) + 1;
            const minP2TotalRuns = (typeof STATE.p2BaseRunsAtMatchStart === 'number' ? STATE.p2BaseRunsAtMatchStart : 0) + STATE.aiScore;
            const minP2WeeklyRuns = (typeof STATE.p2BaseWeeklyRunsAtMatchStart === 'number' ? STATE.p2BaseWeeklyRunsAtMatchStart : 0) + STATE.aiScore;
            if ((p2Rec.totalRuns || 0) < minP2TotalRuns) p2Rec.totalRuns = minP2TotalRuns;
            if ((p2Rec.weeklyRuns || 0) < minP2WeeklyRuns) p2Rec.weeklyRuns = minP2WeeklyRuns;
            if (STATE.aiScore > (p2Rec.highScore || 0)) p2Rec.highScore = STATE.aiScore;
            p2Rec.updatedAt = nowTs;

            STATE.eloRating = amIGuest ? p2Rec.elo : p1Rec.elo;
            STATE.peakElo = amIGuest ? p2Rec.peak : p1Rec.peak;
            STATE.friendEloRating = amIGuest ? p1Rec.elo : p2Rec.elo;
            STATE.lastEloDelta = 0;

            STATE.eloHistory.unshift({
              id: nowTs + Math.random(),
              opponent: amIGuest ? p1 : p2,
              p1Name: amIGuest ? p2 : p1,
              mode: 'Online Room Multiplayer',
              result: 'DRAW',
              delta: '0',
              newElo: STATE.eloRating,
              runsScored: amIGuest ? STATE.aiScore : STATE.userScore,
              wicketsTaken: amIGuest ? STATE.aiMatchWickets : STATE.userMatchWickets,
              friendDelta: '0',
              friendNewElo: STATE.friendEloRating
            });

            STATE.winMarginText = `${marginDescription} • Ranked Multiplayer: Match Drawn (Ratings Unchanged: ${STATE.eloRating} ELO)`;
            STATE.lastOutcomeText = `🤝 Match Drawn! (${p1}: ${STATE.userScore} vs ${p2}: ${STATE.aiScore} • Ratings Unchanged: ${STATE.eloRating} ELO)`;

            // Broadcast direct post-match record sync so both players & all peers lock in identical ratings
            sendNetMessage({
              type: 'MATCH_RESULT_SYNC',
              p1Name: p1,
              p2Name: p2,
              p1Record: p1Rec,
              p2Record: p2Rec,
              allPlayers: STATE.humanPlayers,
              timestamp: nowTs
            });
          } else {
            // Ranked Multiplayer Match: Winner +8 ELO, Loser -8 ELO
            const p1Delta = winner === 'USER' ? 8 : -8;
            const p2Delta = winner === 'USER' ? -8 : 8;
            const nowTs = Date.now();

            const prevP1Elo = p1Rec.elo;
            const prevP2Elo = p2Rec.elo;
            p1Rec.elo = Math.max(100, p1Rec.elo + p1Delta);
            if (p1Rec.elo > p1Rec.peak) p1Rec.peak = p1Rec.elo;
            p1Rec.rankedMatches = (p1Rec.rankedMatches || 0) + 1;
            p1Rec.matches = Math.max((p1Rec.matches || 0) + 1, (p1Rec.wins || 0) + (p1Rec.losses || 0) + 1);
            p1Rec.weeklyMatches = (p1Rec.weeklyMatches || 0) + 1;
            p1Rec.weeklyEloGain = (p1Rec.weeklyEloGain || 0) + p1Delta;
            const minP1TotalRuns = (typeof STATE.p1BaseRunsAtMatchStart === 'number' ? STATE.p1BaseRunsAtMatchStart : 0) + STATE.userScore;
            const minP1WeeklyRuns = (typeof STATE.p1BaseWeeklyRunsAtMatchStart === 'number' ? STATE.p1BaseWeeklyRunsAtMatchStart : 0) + STATE.userScore;
            if ((p1Rec.totalRuns || 0) < minP1TotalRuns) p1Rec.totalRuns = minP1TotalRuns;
            if ((p1Rec.weeklyRuns || 0) < minP1WeeklyRuns) p1Rec.weeklyRuns = minP1WeeklyRuns;
            if (STATE.userScore > (p1Rec.highScore || 0)) p1Rec.highScore = STATE.userScore;
            if (winner === 'USER') {
              p1Rec.wins = (p1Rec.wins || 0) + 1;
              p1Rec.weeklyWins = (p1Rec.weeklyWins || 0) + 1;
            } else {
              p1Rec.losses = (p1Rec.losses || 0) + 1;
              p1Rec.weeklyLosses = (p1Rec.weeklyLosses || 0) + 1;
            }
            p1Rec.updatedAt = nowTs;

            p2Rec.elo = Math.max(100, p2Rec.elo + p2Delta);
            if (p2Rec.elo > p2Rec.peak) p2Rec.peak = p2Rec.elo;
            p2Rec.rankedMatches = (p2Rec.rankedMatches || 0) + 1;
            p2Rec.matches = Math.max((p2Rec.matches || 0) + 1, (p2Rec.wins || 0) + (p2Rec.losses || 0) + 1);
            p2Rec.weeklyMatches = (p2Rec.weeklyMatches || 0) + 1;
            p2Rec.weeklyEloGain = (p2Rec.weeklyEloGain || 0) + p2Delta;
            const minP2TotalRuns = (typeof STATE.p2BaseRunsAtMatchStart === 'number' ? STATE.p2BaseRunsAtMatchStart : 0) + STATE.aiScore;
            const minP2WeeklyRuns = (typeof STATE.p2BaseWeeklyRunsAtMatchStart === 'number' ? STATE.p2BaseWeeklyRunsAtMatchStart : 0) + STATE.aiScore;
            if ((p2Rec.totalRuns || 0) < minP2TotalRuns) p2Rec.totalRuns = minP2TotalRuns;
            if ((p2Rec.weeklyRuns || 0) < minP2WeeklyRuns) p2Rec.weeklyRuns = minP2WeeklyRuns;
            if (STATE.aiScore > (p2Rec.highScore || 0)) p2Rec.highScore = STATE.aiScore;
            if (winner === 'AI') {
              p2Rec.wins = (p2Rec.wins || 0) + 1;
              p2Rec.weeklyWins = (p2Rec.weeklyWins || 0) + 1;
            } else {
              p2Rec.losses = (p2Rec.losses || 0) + 1;
              p2Rec.weeklyLosses = (p2Rec.weeklyLosses || 0) + 1;
            }
            p2Rec.updatedAt = nowTs;

            STATE.eloRating = amIGuest ? p2Rec.elo : p1Rec.elo;
            STATE.peakElo = amIGuest ? p2Rec.peak : p1Rec.peak;
            STATE.friendEloRating = amIGuest ? p1Rec.elo : p2Rec.elo;
            STATE.lastEloDelta = amIGuest ? p2Delta : p1Delta;

            const eloSign = p1Delta > 0 ? `+${p1Delta}` : `${p1Delta}`;
            const p2Sign = p2Delta > 0 ? `+${p2Delta}` : `${p2Delta}`;

            STATE.eloHistory.unshift({
              id: nowTs + Math.random(),
              opponent: amIGuest ? p1 : p2,
              p1Name: amIGuest ? p2 : p1,
              mode: 'Online Room Multiplayer',
              result: (amIGuest ? winner === 'AI' : winner === 'USER') ? 'WIN' : 'LOSS',
              delta: amIGuest ? p2Sign : eloSign,
              newElo: STATE.eloRating,
              runsScored: amIGuest ? STATE.aiScore : STATE.userScore,
              wicketsTaken: amIGuest ? STATE.aiMatchWickets : STATE.userMatchWickets,
              friendDelta: amIGuest ? eloSign : p2Sign,
              friendNewElo: STATE.friendEloRating
            });

            STATE.winMarginText = `${marginDescription} • Ranked Multiplayer Elo: ${p1} ${prevP1Elo} → ${p1Rec.elo} (${eloSign}), ${p2} ${prevP2Elo} → ${p2Rec.elo} (${p2Sign})`;
            STATE.lastOutcomeText = winner === 'USER'
              ? `🏆 ${p1} (P1) Wins! (${eloSign} ELO → ${p1Rec.elo})`
              : `🏆 ${p2} (P2) Wins! (${p2Sign} ELO → ${p2Rec.elo})`;

            // Broadcast direct post-match record sync so both players & all peers lock in identical ratings
            sendNetMessage({
              type: 'MATCH_RESULT_SYNC',
              p1Name: p1,
              p2Name: p2,
              p1Record: p1Rec,
              p2Record: p2Rec,
              allPlayers: STATE.humanPlayers,
              timestamp: nowTs
            });
          }
        } else {
          // Bot matches: RATING, RUNS & WICKETS ARE NOT REGISTERED ON THE LEADERBOARD!
          // User rule: "when user is playing with bots then dont register there runs and wickets in leaderboard"
          const frozenElo = p1Rec.elo;
          const frozenPeak = p1Rec.peak;
          const frozenWeeklyElo = p1Rec.weeklyEloGain || 0;

          p1Rec.elo = frozenElo;
          p1Rec.peak = frozenPeak;
          p1Rec.weeklyEloGain = frozenWeeklyElo;
          if (!STATE.isTossForfeit) {
            p1Rec.matches = (p1Rec.matches || 0) + 1;
            p1Rec.v2Matches = p1Rec.matches;
            p1Rec.weeklyMatches = (p1Rec.weeklyMatches || 0) + 1;
            if (!isDraw) {
              if (winner === 'USER') {
                p1Rec.wins = (p1Rec.wins || 0) + 1;
                p1Rec.weeklyWins = (p1Rec.weeklyWins || 0) + 1;
              } else {
                p1Rec.losses = (p1Rec.losses || 0) + 1;
                p1Rec.weeklyLosses = (p1Rec.weeklyLosses || 0) + 1;
              }
            }
            if (STATE.userScore > (p1Rec.highScore || 0)) {
              p1Rec.highScore = STATE.userScore;
            }
          }
          p1Rec.statsEpoch = STATS_RESET_EPOCH;
          p1Rec.updatedAt = Date.now();
          if (STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
            STATE.humanPlayers[STATE.myUsername.trim().toUpperCase()] = p1Rec;
          }
          saveLocalStatsOnly();
          scheduleDebouncedGlobalSync();

          STATE.eloRating = frozenElo;
          STATE.peakElo = frozenPeak;
          STATE.lastEloDelta = null;

          const cleanUserForAi = (STATE.myUsername || '').trim().toUpperCase();
          if (cleanUserForAi && !isPlaceholderUsername(cleanUserForAi) && !STATE.isTossForfeit) {
            try {
              const diffKey = STATE.botDifficulty || 'TACTICIAN';
              const aiKey = 'oddandeven_ai_tier_stats_' + cleanUserForAi;
              const rawAi = localStorage.getItem(aiKey);
              const aiStats = rawAi ? JSON.parse(rawAi) : {};
              if (!aiStats[diffKey]) aiStats[diffKey] = { matches: 0, wins: 0, losses: 0, draws: 0 };
              aiStats[diffKey].matches = (aiStats[diffKey].matches || 0) + 1;
              if (isDraw) aiStats[diffKey].draws = (aiStats[diffKey].draws || 0) + 1;
              else if (winner === 'USER') aiStats[diffKey].wins = (aiStats[diffKey].wins || 0) + 1;
              else aiStats[diffKey].losses = (aiStats[diffKey].losses || 0) + 1;
              localStorage.setItem(aiKey, JSON.stringify(aiStats));
            } catch (e) {}
          }

          if (isDraw) {
            STATE.eloHistory.unshift({
              id: Date.now() + Math.random(),
              opponent: p2,
              p1Name: p1,
              mode: 'vs Bot (Rating Frozen)',
              isBotMatch: true,
              result: 'DRAW',
              delta: 'FROZEN',
              newElo: frozenElo,
              runsScored: STATE.userScore,
              wicketsTaken: STATE.userMatchWickets
            });
            STATE.winMarginText = `${marginDescription} • 🤝 Match Drawn vs ${p2} (❄️ Rating Frozen: ${frozenElo} ELO)`;
            STATE.lastOutcomeText = `🤝 Match Drawn! Both you and ${p2} scored ${STATE.userScore} runs! (❄️ Rating Frozen: ${frozenElo} ELO)`;
          } else {
            STATE.eloHistory.unshift({
              id: Date.now() + Math.random(),
              opponent: p2,
              p1Name: p1,
              mode: 'vs Bot (Rating Frozen)',
              isBotMatch: true,
              result: STATE.isTossForfeit ? 'FORFEIT' : (winner === 'USER' ? 'WIN' : 'LOSS'),
              delta: 'FROZEN',
              newElo: frozenElo,
              runsScored: STATE.userScore,
              wicketsTaken: STATE.userMatchWickets
            });
            STATE.winMarginText = `${marginDescription} • ❄️ Bot Match: Rating Frozen at ${frozenElo} ELO (No Rating Change vs Bots)`;
            STATE.lastOutcomeText = STATE.isTossForfeit
              ? `🏳️ Match Forfeited vs ${p2}! (❄️ Rating Frozen: ${frozenElo} ELO)`
              : (winner === 'USER'
                  ? `🏆 VICTORY! ${p1} defeated ${p2}! (❄️ Rating Frozen: ${frozenElo} ELO)`
                  : `❌ ${p2} won the match! (❄️ Rating Frozen: ${frozenElo} ELO)`);
          }
        }

        const didIWin = !isDraw && (isMultiplayer() && STATE.onlineRole === 'GUEST' ? winner === 'AI' : winner === 'USER');
        STATE.sessionStats.matches += 1;
        if (isDraw) {
          SoundFX.runScored(6);
        } else if (didIWin) {
          STATE.sessionStats.userWins += 1;
          SoundFX.victory();
        } else {
          STATE.sessionStats.aiWins += 1;
          SoundFX.defeat();
        }
        // Record complete match innings scorecard in STATE.matchScorecards so Right Sidebar updates after every match
        const p1First = STATE.firstBatter ? STATE.firstBatter === 'USER' : true;
        const inn1TeamName = p1First ? p1 : p2;
        const inn2TeamName = p1First ? p2 : p1;
        const inn1Runs = p1First ? STATE.userScore : STATE.aiScore;
        const inn1Balls = p1First ? STATE.userBalls : STATE.aiBalls;
        const inn2Runs = p1First ? STATE.aiScore : STATE.userScore;
        const inn2Balls = p1First ? STATE.aiBalls : STATE.userBalls;
        const inn1Wkts = STATE.currentInnings >= 2 || (STATE.currentInnings === 1 && !isTimeoutForfeit) ? 1 : 0;
        const inn2Wkts = STATE.currentInnings === 2 && STATE.target && inn2Runs < STATE.target ? 1 : 0;

        STATE.matchScorecards.unshift({
          id: Date.now() + Math.random(),
          matchNumber: STATE.sessionStats.matches,
          p1Name: p1,
          p2Name: p2,
          inn1Team: inn1TeamName,
          inn1Summary: STATE.currentInnings >= 1 ? `${inn1Runs}/${inn1Wkts} (${inn1Balls}b)` : 'Forfeit',
          inn2Team: inn2TeamName,
          inn2Summary: STATE.currentInnings === 2 ? `${inn2Runs}/${inn2Wkts} (${inn2Balls}b)` : (isTimeoutForfeit ? 'Timeout' : '—'),
          target: STATE.target || '—',
          winnerName: isDraw ? 'Match Drawn' : (winner === 'USER' ? p1 : p2),
          didIWin,
          isDraw,
          marginText: marginDescription
        });

        triggerCanvasReveal(
          isDraw ? 'MATCH DRAWN! 🤝' : (winner === 'USER' ? `${p1} WINS! 🏆` : `${p2} WINS! 🏆`),
          STATE.winMarginText,
          isDraw ? '#f59e0b' : (winner === 'USER' ? '#81b64c' : '#38bdf8'),
          true
        );
        broadcastGlobalLeaderboardSync(false, true);

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: isTimeoutForfeit ? 'TIMEOUT' : (isDraw ? 'DRAW' : 'RESULT'),
          title: isDraw ? `🤝 MATCH DRAWN (${p1} vs ${p2})` : (winner === 'USER' ? `🏆 ${p1} WON THE MATCH!` : `🏆 ${p2} WON THE MATCH!`),
          detail: STATE.winMarginText,
          badge: isDraw ? 'DRAW' : 'FINAL',
          badgeColor: isDraw ? 'amber' : (winner === 'USER' ? 'emerald' : 'rose')
        });

        renderAll();
      }

      function resetGame(fromNetwork = false) {
        SoundFX.click();
        if (isMultiplayer() && !fromNetwork) {
          sendNetMessage({ type: 'RESET_MATCH' });
        }
        STATE.pendingP1Num = null;
        STATE.pendingP2Num = null;
        STATE.p1LockedSec = null;
        STATE.p2LockedSec = null;
        STATE.friendLockedTossCall = null;
        STATE.p1TossCall = STATE.tossCall || 'ODD';
        STATE.p2TossCall = STATE.p1TossCall === 'EVEN' ? 'ODD' : 'EVEN';
        STATE.phase = 'TOSS';
        STATE.tossUserNum = null;
        STATE.tossAiNum = null;
        STATE.tossSum = null;
        STATE.tossWinner = null;
        STATE.firstBatter = null;
        STATE.lastTossDecisionSummary = '';
        STATE.currentBatter = null;
        STATE.currentInnings = 0;

        STATE.userScore = 0;
        STATE.userBalls = 0;
        STATE.userMatchWickets = 0;
        STATE.aiScore = 0;
        STATE.aiBalls = 0;
        STATE.aiMatchWickets = 0;

        const p1StartRec = ensureHumanPlayerRecord(getP1Label(), 1500, {
          countryCode: STATE.p1CountryCode || STATE.myCountryCode,
          countryFlag: STATE.p1CountryFlag || STATE.myCountryFlag,
          countryName: STATE.p1CountryName || STATE.myCountryName
        });
        const p2StartRec = isMultiplayer() ? ensureHumanPlayerRecord(getP2Label(), STATE.friendEloRating, {
          countryCode: STATE.p2CountryCode,
          countryFlag: STATE.p2CountryFlag,
          countryName: STATE.p2CountryName
        }) : null;
        STATE.p1BaseRunsAtMatchStart = p1StartRec ? (p1StartRec.totalRuns || 0) : 0;
        STATE.p1BaseWeeklyRunsAtMatchStart = p1StartRec ? (p1StartRec.weeklyRuns || 0) : 0;
        STATE.p1BaseBallsAtMatchStart = p1StartRec ? (p1StartRec.totalBalls || 0) : 0;
        STATE.p1BaseWktsAtMatchStart = p1StartRec ? (p1StartRec.wicketsTaken || 0) : 0;
        STATE.p2BaseRunsAtMatchStart = p2StartRec ? (p2StartRec.totalRuns || 0) : 0;
        STATE.p2BaseWeeklyRunsAtMatchStart = p2StartRec ? (p2StartRec.weeklyRuns || 0) : 0;
        STATE.p2BaseBallsAtMatchStart = p2StartRec ? (p2StartRec.totalBalls || 0) : 0;
        STATE.p2BaseWktsAtMatchStart = p2StartRec ? (p2StartRec.wicketsTaken || 0) : 0;

        STATE.target = null;
        STATE.lastUserNum = null;
        STATE.lastAiNum = null;
        STATE.lastOutcomeText = 'Select Odd or Even to start the Toss!';
        STATE.winner = null;
        STATE.isTossForfeit = false;
        STATE.winMarginText = '';
        STATE.history = [];
        STATE.currentStreak = 0;
        STATE.userNumHistory = [];

        if (isMultiplayer() && !isMultiplayerReadyToPlay()) {
          stopTurnTimer();
          STATE.lastOutcomeText = `⏳ Waiting for Friend (Player 2) to join Room ${STATE.roomCode || ''} before the match can start!`;
          STATE.liveBroadcastQuote = `"Room ${STATE.roomCode || ''} is waiting for your friend to join. The match will not start until Player 2 connects!"`;
          STATE.liveExcitementLabel = 'WAITING FOR P2';
          triggerCanvasReveal('WAITING FOR FRIEND', `Share Room Code ${STATE.roomCode || ''} to start`, '#f59e0b', false);
          renderAll();
          return;
        }

        STATE.liveBroadcastQuote = `"New match underway! ${getP1Label()} vs ${getP2Label()} — 15s synced clock active!"`;
        STATE.liveExcitementLabel = 'FRESH MATCH';

        triggerCanvasReveal('NEW MATCH', `${getP1Label()} vs ${getP2Label()} • 15s Synced Clock`, '#81b64c', false);
        renderAll();
        startTurnTimer(true);
      }

      // ==========================================
      // 7. UI RENDERING
      // ==========================================
      function renderAll() {
        const mpActive = isMultiplayer();
        const myCleanName = (STATE.myUsername || 'PLAYER_1').trim().toUpperCase();
        const myRec = ensureHumanPlayerRecord(myCleanName, 1500, {
          countryCode: STATE.myCountryCode,
          countryFlag: STATE.myCountryFlag,
          countryName: STATE.myCountryName
        });
        STATE.eloRating = typeof myRec.elo === 'number' ? myRec.elo : 1500;
        STATE.peakElo = typeof myRec.peak === 'number' ? myRec.peak : STATE.eloRating;

        const p1Name = getP1Label();
        const p2Name = getP2Label();
        const botProf = BOT_PROFILES[STATE.botDifficulty] || BOT_PROFILES.TACTICIAN;

        const myFlag = myRec.countryFlag || STATE.myCountryFlag || '🇮🇳';
        const myDial = myRec.countryCode || STATE.myCountryCode || '+91';
        const p1Flag = STATE.p1CountryFlag || '🇮🇳';
        const p1Dial = STATE.p1CountryCode || '+91';
        const p2Flag = STATE.p2CountryFlag || '🇮🇳';
        const p2Dial = STATE.p2CountryCode || '+91';

        let equippedCardTag = '';
        try {
          const cleanMeTag = String(STATE.myUsername || '').trim().toUpperCase();
          if (cleanMeTag && !isPlaceholderUsername(cleanMeTag)) {
            const eqId = localStorage.getItem('oddandeven_equipped_card_' + cleanMeTag);
            if (eqId === 'card_custom_divine') {
              const rawC = localStorage.getItem('oddandeven_custom_card_' + cleanMeTag);
              const cObj = rawC ? JSON.parse(rawC) : null;
              equippedCardTag = ` [🔱 ${(cObj && cObj.title) || 'DIVINE'}]`;
            } else if (eqId === 'card_cosmic_celestial') {
              equippedCardTag = ' [🌌 COSMIC]';
            } else if (eqId === 'card_mythic_immortal') {
              equippedCardTag = ' [👑 IMMORTAL]';
            } else if (eqId === 'card_diamond_vanguard') {
              equippedCardTag = ' [💎 DIAMOND]';
            } else if (eqId === 'card_gold_elite') {
              equippedCardTag = ' [🏆 GOLD]';
            }
          }
        } catch(e) {}

        el.p1CardTitle.textContent = mpActive ? `${p1Flag} ${p1Name} (P1)${equippedCardTag}` : `${myFlag} ${p1Name} (${myDial})${equippedCardTag}`;
        el.p2CardTitle.textContent = mpActive ? `${p2Flag} ${p2Name} (P2)` : `${botProf.badge}`;

        // Update Multiplayer Lobby Matchup & Room Lock Controls (Inline & Modal)
        if (el.inlineLobbyP1Display) {
          el.inlineLobbyP1Display.textContent = `${p1Flag} ${p1Name} (${p1Dial})`;
        }
        if (el.modalLobbyP1Display) {
          el.modalLobbyP1Display.textContent = `${p1Flag} ${p1Name}`;
        }

        if (STATE.roomLocked && STATE.p2Joined) {
          if (el.btnInlineLeaveRoom) el.btnInlineLeaveRoom.classList.remove('hidden');
          if (el.inlineInputJoinCode) el.inlineInputJoinCode.disabled = true;
          if (el.btnInlineJoinRoom) {
            el.btnInlineJoinRoom.disabled = true;
            el.btnInlineJoinRoom.textContent = '🔒 Locked';
          }
          if (el.inputJoinRoomCode) el.inputJoinRoomCode.disabled = true;
          if (el.btnJoinRoom) {
            el.btnJoinRoom.disabled = true;
            el.btnJoinRoom.textContent = '🔒 Locked';
          }
          if (el.inlineLobbyP2Display) {
            el.inlineLobbyP2Display.textContent = `${p2Flag} ${p2Name} (${p2Dial})`;
            el.inlineLobbyP2Display.className = 'text-sm sm:text-base font-black text-cyan-300 mt-0.5 truncate';
          }
          if (el.inlineLobbyP2Card) {
            el.inlineLobbyP2Card.className = 'sm:col-span-5 p-3 rounded-xl bg-cyan-500/15 border border-cyan-400/50';
          }
          if (el.modalLobbyP2Display) {
            el.modalLobbyP2Display.textContent = `${p2Flag} ${p2Name}`;
            el.modalLobbyP2Display.className = 'font-extrabold text-xs sm:text-sm text-cyan-300 truncate mt-0.5';
          }
          if (STATE.onlineRole === 'HOST') {
            if (el.inlineLobbyWaitHint) {
              el.inlineLobbyWaitHint.textContent = `🔒 Room Locked (${p1Name} vs ${p2Name})! Click Start Match below to launch on both screens!`;
            }
            if (el.btnLaunchMpMatch) {
              el.btnLaunchMpMatch.disabled = false;
              el.btnLaunchMpIcon.textContent = '🚀';
              el.btnLaunchMpText.textContent = `START MATCH (${p1Name} vs ${p2Name}) →`;
            }
          } else {
            if (el.inlineLobbyWaitHint) {
              el.inlineLobbyWaitHint.textContent = `🔒 Room Locked (${p1Name} vs ${p2Name})! Waiting for Host (${p1Name}) to click Start Match...`;
            }
            if (el.btnLaunchMpMatch) {
              el.btnLaunchMpMatch.disabled = true;
              el.btnLaunchMpIcon.textContent = '⏳';
              el.btnLaunchMpText.textContent = `WAITING FOR HOST (${p1Name}) TO START MATCH...`;
            }
          }
        } else {
          if (el.btnInlineLeaveRoom) {
            el.btnInlineLeaveRoom.classList.toggle('hidden', !STATE.roomCode);
          }
          if (el.inlineInputJoinCode) el.inlineInputJoinCode.disabled = false;
          if (el.btnInlineJoinRoom) {
            el.btnInlineJoinRoom.disabled = false;
            el.btnInlineJoinRoom.textContent = 'Join Room';
          }
          if (el.inputJoinRoomCode) el.inputJoinRoomCode.disabled = false;
          if (el.btnJoinRoom) {
            el.btnJoinRoom.disabled = false;
            el.btnJoinRoom.textContent = 'Join';
          }
          if (el.inlineLobbyP2Card) {
            el.inlineLobbyP2Card.className = 'sm:col-span-5 p-3 rounded-xl bg-slate-900/90 border border-slate-700';
          }
          if (STATE.roomCode && STATE.onlineRole === 'HOST') {
            if (el.inlineLobbyP2Display) {
              el.inlineLobbyP2Display.textContent = '⏳ Waiting for P2...';
              el.inlineLobbyP2Display.className = 'text-sm sm:text-base font-black text-slate-400 mt-0.5 truncate';
            }
            if (el.modalLobbyP2Display) {
              el.modalLobbyP2Display.textContent = '⏳ Waiting...';
            }
            if (el.inlineLobbyWaitHint) {
              el.inlineLobbyWaitHint.textContent = `⏳ Room ${STATE.roomCode} Open: Waiting for Player 2 to enter code & join (Room will lock at 2/2 players)...`;
            }
            if (el.btnLaunchMpMatch) {
              el.btnLaunchMpMatch.disabled = true;
              el.btnLaunchMpIcon.textContent = '⏳';
              el.btnLaunchMpText.textContent = `WAITING FOR PLAYER 2 TO JOIN ROOM ${STATE.roomCode}...`;
            }
          } else {
            if (el.inlineLobbyP2Display) {
              el.inlineLobbyP2Display.textContent = '⏳ Waiting to Join...';
              el.inlineLobbyP2Display.className = 'text-sm sm:text-base font-black text-slate-400 mt-0.5 truncate';
            }
            if (el.modalLobbyP2Display) {
              el.modalLobbyP2Display.textContent = '⏳ Waiting...';
            }
            if (el.btnLaunchMpMatch) {
              el.btnLaunchMpMatch.disabled = true;
              el.btnLaunchMpIcon.textContent = '🌐';
              el.btnLaunchMpText.textContent = 'GENERATE OR JOIN A ROOM CODE ABOVE';
            }
          }
        }

        // Update Modal Start Button state
        if (el.btnApplyMpMode) {
          if (STATE.selectedModalMode === 'AI') {
            el.btnApplyMpMode.disabled = false;
            el.btnApplyMpMode.textContent = 'Start Solo Match vs AI →';
          } else if (STATE.roomLocked && STATE.p2Joined) {
            if (STATE.onlineRole === 'HOST') {
              el.btnApplyMpMode.disabled = false;
              el.btnApplyMpMode.textContent = `🚀 Start Match (${p1Name} vs ${p2Name}) →`;
            } else {
              el.btnApplyMpMode.disabled = true;
              el.btnApplyMpMode.textContent = `⏳ Waiting for Host (${p1Name})...`;
            }
          } else {
            el.btnApplyMpMode.disabled = true;
            el.btnApplyMpMode.textContent = '⏳ Waiting for P2 to Join Room...';
          }
        }

        // Update Connected Username Stats across Header, Left Sidebar, Events & Scorecard
        if (el.sidebarUserIdentity) {
          el.sidebarUserIdentity.textContent = `${myFlag} ${myCleanName} (${myDial})`;
        }
        if (el.sidebarCareerRuns) {
          el.sidebarCareerRuns.textContent = `${myRec.totalRuns || 0}`;
        }
        if (el.sidebarCareerWickets) {
          el.sidebarCareerWickets.textContent = `${myRec.wicketsTaken || 0}`;
        }

        // Populate Sidebar Player Card (Redirects to profile.html on click)
        if (el.sidebarCardUsername) {
          const isGuest = isPlaceholderUsername(myCleanName);
          el.sidebarCardUsername.textContent = isGuest ? 'PLAYER (GUEST)' : myCleanName;
          if (el.sidebarCardFlag) el.sidebarCardFlag.textContent = myFlag;
          if (el.sidebarCardDial) el.sidebarCardDial.textContent = `${myDial} • ${myRec.elo || 1500} ELO`;
          if (el.sidebarCardRunsWkts) {
            el.sidebarCardRunsWkts.textContent = `${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts`;
          }

          let cardTierName = 'Rookie Card';
          let cardTierClass = 'bg-slate-800 text-slate-300 border-slate-600';
          let cardTitle = 'Hand Cricket Aspirant';
          let cardBorderCls = 'border-amber-500/40 bg-gradient-to-br from-[#1c1811] via-[#161410] to-[#121110]';
          let showStar = false;

          try {
            const eqCard = localStorage.getItem('oddandeven_equipped_card_' + myCleanName);
            if (eqCard === 'card_custom_divine') {
              cardTierName = '🔱 CUSTOM';
              cardTierClass = 'bg-gradient-to-r from-amber-400 to-purple-400 text-slate-950 font-black';
              const rawC = localStorage.getItem('oddandeven_custom_card_' + myCleanName);
              const cObj = rawC ? JSON.parse(rawC) : null;
              cardTitle = (cObj && cObj.title) || 'Cricket Deity';
              cardBorderCls = 'border-amber-400 bg-gradient-to-br from-[#261e11] via-[#1a1714] to-[#121110] shadow-[0_0_20px_rgba(245,184,61,0.25)]';
              showStar = true;
            } else if (eqCard === 'card_cosmic_celestial') {
              cardTierName = '🌌 COSMIC';
              cardTierClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
              cardTitle = 'Celestial Master';
              cardBorderCls = 'border-purple-400 bg-gradient-to-br from-[#230f2e] via-[#1a1224] to-[#121110] shadow-[0_0_20px_rgba(168,85,247,0.25)]';
            } else if (eqCard === 'card_mythic_immortal') {
              cardTierName = '👑 MYTHIC';
              cardTierClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
              cardTitle = 'Obsidian Magma Sovereign';
              cardBorderCls = 'border-rose-500 bg-gradient-to-br from-[#2a0e14] via-[#1d1215] to-[#121110] shadow-[0_0_20px_rgba(255,77,109,0.25)]';
            } else if (eqCard === 'card_diamond_vanguard') {
              cardTierName = '💎 DIAMOND';
              cardTierClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold';
              cardTitle = 'Diamond Prodigy';
              cardBorderCls = 'border-cyan-400 bg-gradient-to-br from-[#0e2329] via-[#141d22] to-[#121110] shadow-[0_0_20px_rgba(56,189,248,0.25)]';
            } else if (eqCard === 'card_gold_elite') {
              cardTierName = '🏆 GOLD';
              cardTierClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
              cardTitle = '24K Gold Cap Holder';
              cardBorderCls = 'border-amber-400 bg-gradient-to-br from-[#2e2617] via-[#211d15] to-[#121110] shadow-[0_0_20px_rgba(245,184,61,0.25)]';
            }
          } catch(e) {}

          if (el.sidebarCardTierPill) {
            el.sidebarCardTierPill.textContent = cardTierName;
            el.sidebarCardTierPill.className = `px-1.5 py-0.5 rounded-full text-[8px] font-brand font-black uppercase tracking-wider ${cardTierClass}`;
          }
          if (el.sidebarCardTitle) el.sidebarCardTitle.textContent = cardTitle;
          if (el.sidebarCardStar) el.sidebarCardStar.classList.toggle('hidden', !showStar);
          if (el.sidebarPlayerCard) {
            el.sidebarPlayerCard.className = `block w-full p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden group active:scale-95 shadow-md ${cardBorderCls}`;
          }
        }

        // Update Store Tab Subtitle with Available XP
        if (el.sideNavStoreSub && !isPlaceholderUsername(myCleanName)) {
          try {
            const spent = parseInt(localStorage.getItem('oddandeven_spent_xp_' + myCleanName) || '0', 10);
            const achs = computePlayerAchievements(myRec);
            const aXp = achs.filter(a => a.current >= a.target).reduce((s, a) => s + a.xp, 0);
            const mXp = ((myRec.totalRuns || 0) * 2) + ((myRec.wicketsTaken || 0) * 25) + ((myRec.wins || 0) * 50) + ((myRec.matches || 0) * 15);
            const avail = Math.max(0, aXp + mXp - spent);
            el.sideNavStoreSub.textContent = `${avail.toLocaleString()} XP • Cards & Flex`;
            if (el.sideNavStoreBadge) {
              el.sideNavStoreBadge.textContent = avail >= 5000 ? 'UNLOCKED' : `${avail} XP`;
            }
          } catch(e) {}
        }
        if (el.botSetupPlayerName) {
          el.botSetupPlayerName.value = STATE.isAuthenticated ? myCleanName : 'LOGIN REQUIRED';
        }
        if (el.headerAuthFlag) el.headerAuthFlag.textContent = STATE.isAuthenticated ? myFlag : '🔒';
        if (el.headerAuthUsername) {
          el.headerAuthUsername.textContent = STATE.isAuthenticated ? `${myCleanName} (${myDial})` : 'LOGIN REQUIRED';
        }
        if (el.btnHeaderSignOut) {
          el.btnHeaderSignOut.classList.toggle('hidden', !STATE.isAuthenticated);
          if (el.headerSignOutLabel) {
            el.headerSignOutLabel.textContent = STATE.isAuthenticated ? `Sign Out (${myCleanName})` : 'Sign Out';
          }
        }
        if (el.btnHeaderRemoveAccount) {
          el.btnHeaderRemoveAccount.classList.toggle('hidden', !STATE.isAuthenticated);
        }
        if (el.btnSidebarSignOut) {
          el.btnSidebarSignOut.classList.toggle('hidden', !STATE.isAuthenticated);
        }
        if (el.btnSidebarRemoveAccount) {
          el.btnSidebarRemoveAccount.classList.toggle('hidden', !STATE.isAuthenticated);
        }
        if (el.headerUserStatsText) {
          el.headerUserStatsText.textContent = `${myCleanName}: ${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts`;
        }
        if (el.scorecardUserFlag) el.scorecardUserFlag.textContent = myFlag;
        if (el.scorecardUsernameLabel) el.scorecardUsernameLabel.textContent = `${myCleanName} (${myDial})`;
        if (el.scorecardCareerSummary) {
          el.scorecardCareerSummary.textContent = `${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts`;
        }
        if (el.statUserWickets) {
          el.statUserWickets.textContent = `${myRec.wicketsTaken || 0}`;
        }
        if (el.eventsUserFlag) el.eventsUserFlag.textContent = myFlag;
        if (el.eventsUserHeadline) {
          el.eventsUserHeadline.textContent = `Registered Contender: ${myCleanName} (${myDial})`;
        }
        if (el.eventsUserStatsLine) {
          el.eventsUserStatsLine.textContent = `Connected Stats: ${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wickets Taken • ${myRec.elo} Elo`;
        }

        // Sidebar active states
        const navActiveCls = 'w-full px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-center lg:text-left transition flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2.5 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-300 border border-emerald-400/40 shadow-sm';
        const navIdleCls = 'w-full px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-center lg:text-left transition flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2.5 bg-slate-900/75 hover:bg-slate-800/90 text-slate-300 border border-slate-800';
        el.sideNavBot.className = STATE.activeScreen === 'BOT_SETUP' ? navActiveCls : navIdleCls;
        el.sideNavMultiplayer.className = STATE.activeScreen === 'MP_SETUP' ? navActiveCls : navIdleCls;
        if (el.sideNavFriends) {
          el.sideNavFriends.className = (STATE.activeScreen === 'FRIENDS' ? navActiveCls : navIdleCls) + ' relative';
        }
        if (el.sideNavShowcase) el.sideNavShowcase.className = 'hidden';
        if (el.sideNavAchievements) {
          el.sideNavAchievements.className = STATE.activeScreen === 'ACHIEVEMENTS' ? navActiveCls : navIdleCls;
        }
        if (el.sideNavEvents) {
          el.sideNavEvents.className = STATE.activeScreen === 'EVENTS' ? navActiveCls : navIdleCls;
        }
        if (el.sideNavLeaderboard) {
          el.sideNavLeaderboard.className = STATE.activeScreen === 'LEADERBOARD' ? navActiveCls : navIdleCls;
        }
        if (el.sideNavProfile) {
          el.sideNavProfile.className = STATE.activeScreen === 'PROFILE' ? navActiveCls : navIdleCls;
        }
        if (el.sideNavStore) {
          el.sideNavStore.className = STATE.activeScreen === 'STORE' ? navActiveCls : navIdleCls;
        }

        el.sideBotSubLabel.textContent = botProf.name;
        el.sidebarOpponentBadge.innerHTML = mpActive
          ? `<span>🌐</span><span>${p1Name} vs ${p2Name}</span>`
          : `<span>${botProf.icon}</span><span>${botProf.name}</span>`;

        const styleNames = { HYPE: '🎙️ Hype Broadcast', TACTICAL: '🧠 Tactical Analyst', CLASSIC: '📻 Classic Feed', ROAST: '💀 Roast Broadcast' };
        el.sidebarCommentaryStyleBadge.textContent = styleNames[STATE.commentaryStyle] || styleNames.HYPE;
        el.commentaryMoodChip.textContent = STATE.commentaryStyle + ' MODE';

        // Update Elo displays across Header, Sidebar, Start Hub & Leaderboard
        el.headerEloValue.textContent = `${STATE.eloRating} ELO`;
        el.sideNavEloSub.textContent = mpActive ? `${STATE.eloRating} ELO (±8)` : `${STATE.eloRating} ELO ❄️`;
        el.sidebarEloDisplay.textContent = mpActive ? `${STATE.eloRating} ELO` : `${STATE.eloRating} ELO (❄️ Frozen)`;
        el.startHubEloChip.textContent = mpActive
          ? `♟️ ${myCleanName}: ${STATE.eloRating} ELO (Ranked ±8) • ${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts`
          : `♟️ ${myCleanName}: ${STATE.eloRating} ELO (❄️ Frozen vs Bots) • ${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts`;

        if (!mpActive) {
          // When playing against Bots, explicitly show that Rating is FROZEN
          el.headerEloDelta.classList.remove('hidden');
          el.headerEloDelta.textContent = '❄️ FROZEN';
          el.headerEloDelta.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-400/30';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Frozen while playing against Bots • Play Multiplayer to increase/decrease rating)`;
          }
        } else if (STATE.lastEloDelta !== null && STATE.lastEloDelta !== 0) {
          el.headerEloDelta.classList.remove('hidden');
          const dStr = STATE.lastEloDelta > 0 ? `+${STATE.lastEloDelta}` : `${STATE.lastEloDelta}`;
          el.headerEloDelta.textContent = dStr;
          el.headerEloDelta.className = STATE.lastEloDelta > 0
            ? 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-400/30'
            : 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-rose-500/10 text-rose-300 border border-rose-400/30';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Ranked Multiplayer: +8 Win / -8 Loss)`;
          }
        } else {
          el.headerEloDelta.classList.remove('hidden');
          el.headerEloDelta.textContent = '±8 RANKED';
          el.headerEloDelta.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-purple-500/15 text-purple-200 border border-purple-400/40';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Ranked Multiplayer: +8 Win / -8 Loss)`;
          }
        }

        // Show/Hide Center Screens & Full-Width Dashboard Alignment cleanly
        const isFullWidthView = STATE.activeScreen === 'PROFILE' || STATE.activeScreen === 'STORE';
        const mainCenterCol = document.getElementById('mainCenterStageCol');
        const rightScoreCol = document.getElementById('rightMatchScorecardCol');
        if (mainCenterCol) {
          mainCenterCol.className = isFullWidthView
            ? 'xl:col-span-12 flex flex-col gap-4 min-w-0 w-full'
            : 'xl:col-span-8 flex flex-col gap-4 min-w-0';
        }
        if (rightScoreCol) {
          rightScoreCol.classList.toggle('hidden', isFullWidthView);
        }
        if (el.activePitchWrapper) {
          el.activePitchWrapper.classList.toggle('hidden', STATE.activeScreen !== 'PITCH');
        }
        if (el.centerShowcasePanel) {
          el.centerShowcasePanel.classList.toggle('hidden', STATE.activeScreen !== 'SHOWCASE');
        }
        if (el.screenBotSetup) {
          el.screenBotSetup.classList.toggle('hidden', STATE.activeScreen !== 'BOT_SETUP');
        }
        if (el.screenMpSetup) {
          el.screenMpSetup.classList.toggle('hidden', STATE.activeScreen !== 'MP_SETUP');
        }
        if (el.screenFriends) {
          el.screenFriends.classList.toggle('hidden', STATE.activeScreen !== 'FRIENDS');
        }
        if (el.screenEvents) {
          el.screenEvents.classList.toggle('hidden', STATE.activeScreen !== 'EVENTS');
        }
        if (el.screenAchievements) {
          el.screenAchievements.classList.toggle('hidden', STATE.activeScreen !== 'ACHIEVEMENTS');
        }
        if (el.screenLeaderboard) {
          el.screenLeaderboard.classList.toggle('hidden', STATE.activeScreen !== 'LEADERBOARD');
        }
        const scrProfile = document.getElementById('screenProfile');
        if (scrProfile) {
          scrProfile.classList.toggle('hidden', STATE.activeScreen !== 'PROFILE');
        }
        const scrStore = document.getElementById('screenStore');
        if (scrStore) {
          scrStore.classList.toggle('hidden', STATE.activeScreen !== 'STORE');
        }
        try { renderEventsTabAndCountdowns(); } catch (e) { console.error(e); }
        try { renderAchievementsSection(); } catch (e) { console.error(e); }
        try { renderProfileSection(); } catch (e) { console.error(e); }
        try { renderStoreSection(); } catch (e) { console.error(e); }

        // Render Large Incoming Friend Match Call Banner & Sidebar Badge
        const myFriends = getMyFriendsList();
        const incomingReqs = getIncomingFriendRequests();
        const outgoingReqs = getOutgoingFriendRequests();
        if (el.sideNavFriendsSub) {
          if (incomingReqs.length > 0) {
            el.sideNavFriendsSub.textContent = `📩 ${incomingReqs.length} Request${incomingReqs.length === 1 ? '' : 's'}`;
          } else {
            el.sideNavFriendsSub.textContent = myFriends.length > 0 ? `${myFriends.length} Friend${myFriends.length === 1 ? '' : 's'}` : 'Search & Play';
          }
        }
        const hasPendingCallOrReq = Boolean((STATE.incomingFriendInvite && STATE.incomingFriendInvite.roomCode) || incomingReqs.length > 0);
        if (el.sideNavFriendsInviteDot) {
          el.sideNavFriendsInviteDot.classList.toggle('hidden', !hasPendingCallOrReq);
        }

        if (STATE.incomingFriendInvite && STATE.incomingFriendInvite.roomCode) {
          if (el.globalFriendInviteToast) {
            el.globalFriendInviteToast.classList.remove('hidden');
            const inv = STATE.incomingFriendInvite;
            if (el.globalFriendInviteRoomPill) {
              el.globalFriendInviteRoomPill.textContent = `ROOM ${inv.roomCode}`;
            }
            if (el.globalFriendInviteTitle) {
              el.globalFriendInviteTitle.textContent = `📞 ${inv.fromFlag || '🇮🇳'} ${inv.fromUser} is calling you for a 1v1 Match!`;
            }
            if (el.globalFriendInviteSub) {
              el.globalFriendInviteSub.textContent = `Room ${inv.roomCode} (${inv.fromElo || 1500} ELO) • Click "Accept & Start" to automatically redirect to the match and start playing!`;
            }
          }
        } else {
          if (el.globalFriendInviteToast) el.globalFriendInviteToast.classList.add('hidden');
        }

        // Render Friends Hub (Search Results + Pending Friend Requests Accept/Decline + My Friends List)
        if (STATE.activeScreen === 'FRIENDS' && el.friendSearchResultsList && el.myFriendsListContainer) {
          syncAuthAndPurgeFakeSeeds();
          const rawQuery = ((el.inputFriendSearch && el.inputFriendSearch.value) || STATE.friendSearchQuery || '').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
          const allDirectoryPlayers = Object.values(STATE.humanPlayers).filter(
            (p) => p && p.name && !FAKE_SEED_NAMES.includes(p.name) && p.name !== 'WAITING...' && p.name !== myCleanName
          );
          const filteredPlayers = rawQuery
            ? allDirectoryPlayers.filter((p) => p.name.includes(rawQuery))
            : allDirectoryPlayers;

          if (el.friendSearchResultsTitle) {
            el.friendSearchResultsTitle.textContent = rawQuery
              ? `Search Results for "${rawQuery}"`
              : 'Registered Players Directory';
          }
          if (el.friendSearchResultsCount) {
            el.friendSearchResultsCount.textContent = `${filteredPlayers.length} Player${filteredPlayers.length === 1 ? '' : 's'}`;
          }

          if (filteredPlayers.length === 0) {
            if (rawQuery.length >= 3) {
              const isAlreadyFriend = myFriends.includes(rawQuery);
              const isPendingOut = outgoingReqs.includes(rawQuery);
              el.friendSearchResultsList.innerHTML = `
                <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-extrabold text-white">@${rawQuery}</div>
                    <div class="text-[11px] text-slate-400">Send a friend request or call @${rawQuery} directly for a 1v1 match!</div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    ${isAlreadyFriend
                      ? `<span class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">✓ Friend</span>`
                      : isPendingOut
                      ? `<span class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">⏳ Request Sent</span>`
                      : `<button type="button" data-friend-add="${rawQuery}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">
                          ➕ Send Request
                        </button>`
                    }
                    <button type="button" data-friend-play="${rawQuery}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-purple-500 hover:bg-purple-400 text-white transition">
                      📞 Call for Match
                    </button>
                  </div>
                </div>
              `;
            } else {
              el.friendSearchResultsList.innerHTML = `
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  Type a friend's username in the search bar above (e.g. <strong>VIRAT_18</strong>) and click <strong>Send Friend Request</strong> or <strong>Search</strong>!
                </div>
              `;
            }
          } else {
            el.friendSearchResultsList.innerHTML = filteredPlayers.map((p) => {
              const isAdded = myFriends.includes(p.name);
              const isPendingOut = outgoingReqs.includes(p.name);
              const isPendingIn = incomingReqs.some((r) => r && String(r.from || '').trim().toUpperCase() === p.name);
              const openRm = STATE.activeOpenRooms && STATE.activeOpenRooms[p.name];
              const hasOpenRoom = openRm && openRm.roomCode && (Date.now() - (openRm.timestamp || 0) < 600000);
              return `
                <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-lg">${p.countryFlag || '🇮🇳'}</span>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                        <span>${p.name}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-950 text-amber-300 border border-slate-800">${p.elo || 1500} ELO</span>
                        ${hasOpenRoom ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono-num bg-emerald-500/10 text-emerald-300 border border-emerald-400/30">🟢 Room ${openRm.roomCode}</span>` : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate">
                        ${p.totalRuns || 0} Runs • ${p.wicketsTaken || 0} Wickets • ${p.wins || 0}W–${p.losses || 0}L
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${isAdded
                      ? `<span class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">✓ Friend</span>`
                      : isPendingIn
                      ? `<button type="button" data-friend-req-accept="${p.name}" class="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-400 hover:bg-emerald-300 text-slate-950 transition">✓ Accept Request</button>
                         <button type="button" data-friend-req-decline="${p.name}" class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500/10 hover:bg-rose-500/35 text-rose-200 border border-rose-500/40 transition">✕ Decline</button>`
                      : isPendingOut
                      ? `<span class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">⏳ Request Sent</span>`
                      : `<button type="button" data-friend-add="${p.name}" class="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">➕ Send Request</button>`
                    }
                    <button type="button" data-friend-play="${p.name}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow transition">
                      ${hasOpenRoom ? `⚡ Join ${openRm.roomCode}` : '📞 Call for Match'}
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          }

          // Render Incoming & Outgoing Friend Requests in P2's Friend List
          if (el.pendingFriendRequestsBadge) {
            el.pendingFriendRequestsBadge.textContent = `${incomingReqs.length} Incoming${outgoingReqs.length > 0 ? ` • ${outgoingReqs.length} Sent` : ''}`;
          }
          if (el.pendingFriendRequestsList) {
            if (incomingReqs.length === 0 && outgoingReqs.length === 0) {
              el.pendingFriendRequestsList.innerHTML = `
                <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  No pending friend requests right now. When a player sends you a friend request, it will appear here with <strong>Accept</strong> or <strong>Decline</strong> buttons!
                </div>
              `;
            } else {
              const incHtml = incomingReqs.map((req) => {
                const senderName = String(req.from || '').trim().toUpperCase();
                const senderRec = STATE.humanPlayers[senderName] || {};
                const flag = req.fromFlag || senderRec.countryFlag || '🇮🇳';
                const elo = senderRec.elo || req.fromElo || 1500;
                return `
                  <div class="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-emerald-950/70 border-2 border-cyan-400/50 flex flex-wrap items-center justify-between gap-2.5 shadow-md">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="text-xl">${flag}</span>
                      <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                          <span>${senderName}</span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-950 text-amber-300 border border-slate-800">${elo} ELO</span>
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-mono-num font-black uppercase bg-cyan-500/15 text-cyan-200 border border-cyan-400/40">INCOMING REQUEST</span>
                        </div>
                        <div class="text-[11px] text-cyan-200/90 truncate mt-0.5">
                          Wants to add you as a friend • Accept or Decline below
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button type="button" data-friend-req-accept="${senderName}" class="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow transition flex items-center gap-1">
                        <span>✓</span>
                        <span>Accept</span>
                      </button>
                      <button type="button" data-friend-req-decline="${senderName}" class="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-rose-500/10 hover:bg-rose-500/35 text-rose-200 border border-rose-400/50 transition flex items-center gap-1">
                        <span>✕</span>
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('');

              const outHtml = outgoingReqs.map((targetName) => {
                const tRec = STATE.humanPlayers[targetName] || {};
                return `
                  <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-base">${tRec.countryFlag || '🇮🇳'}</span>
                      <span class="text-xs font-bold text-slate-200 truncate">@${targetName}</span>
                      <span class="px-2 py-0.5 rounded text-[9px] font-mono-num font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">⏳ Awaiting Response</span>
                    </div>
                    <button type="button" data-friend-play="${targetName}" class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-500/10 hover:bg-purple-500/35 text-purple-200 border border-purple-400/40 transition">
                      📞 Call for Match
                    </button>
                  </div>
                `;
              }).join('');

              el.pendingFriendRequestsList.innerHTML = incHtml + outHtml;
            }
          }

          if (el.myFriendsCountBadge) {
            el.myFriendsCountBadge.textContent = `${myFriends.length} Friend${myFriends.length === 1 ? '' : 's'}`;
          }
          if (myFriends.length === 0) {
            el.myFriendsListContainer.innerHTML = `
              <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                You haven't added any friends yet. Search their username above to send a friend request or accept an incoming request above!
              </div>
            `;
          } else {
            el.myFriendsListContainer.innerHTML = myFriends.map((fName) => {
              const p = STATE.humanPlayers[fName] || {
                name: fName,
                countryFlag: '🇮🇳',
                countryCode: '+91',
                elo: 1500,
                totalRuns: 0,
                wicketsTaken: 0,
                wins: 0,
                losses: 0
              };
              const openRm = STATE.activeOpenRooms && STATE.activeOpenRooms[fName];
              const hasOpenRoom = openRm && openRm.roomCode && (Date.now() - (openRm.timestamp || 0) < 600000);
              return `
                <div class="p-3 rounded-xl bg-slate-900/95 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-lg">${p.countryFlag || '🇮🇳'}</span>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-extrabold text-emerald-300 truncate flex items-center gap-1.5">
                        <span>${fName}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-950 text-amber-300 border border-slate-800">${p.elo || 1500} ELO</span>
                        ${hasOpenRoom ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono-num bg-emerald-500/10 text-emerald-300 border border-emerald-400/30 animate-pulse">🟢 Hosting ${openRm.roomCode}</span>` : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate">
                        ${p.totalRuns || 0} Runs • ${p.wicketsTaken || 0} Wkts • ${p.wins || 0}W–${p.losses || 0}L
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" data-friend-play="${fName}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 shadow transition">
                      ${hasOpenRoom ? `⚡ Join Room ${openRm.roomCode}` : '📞 Call for Match'}
                    </button>
                    <button type="button" data-friend-remove="${fName}" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 border border-slate-700 transition" title="Remove Friend">
                      ✕
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
        el.liveCommentaryBanner.classList.remove('hidden');
        el.activePitchWrapper.classList.toggle('hidden', STATE.activeScreen !== 'PITCH');
        el.btnToggleShowcaseCompact.textContent = 'Minimize ▲';

        // Update Right Sidebar Commentary Options active button state
        if (el.btnCommOptHype && el.btnCommOptTactical && el.btnCommOptClassic) {
          const commActiveCls = 'py-2 px-1.5 rounded-lg text-[11px] font-extrabold transition bg-[#81b64c] text-white shadow';
          const commRoastActiveCls = 'py-2 px-1.5 rounded-lg text-[11px] font-extrabold transition bg-rose-600 text-white shadow';
          const commIdleCls = 'py-2 px-1.5 rounded-lg text-[11px] font-bold transition text-slate-300 hover:text-white bg-transparent';
          el.btnCommOptHype.className = STATE.commentaryStyle === 'HYPE' ? commActiveCls : commIdleCls;
          el.btnCommOptTactical.className = STATE.commentaryStyle === 'TACTICAL' ? commActiveCls : commIdleCls;
          el.btnCommOptClassic.className = STATE.commentaryStyle === 'CLASSIC' ? commActiveCls : commIdleCls;
          if (el.btnCommOptRoast) {
            el.btnCommOptRoast.className = STATE.commentaryStyle === 'ROAST' ? commRoastActiveCls : commIdleCls;
          }
        }
        if (el.rightCommActiveTag) {
          el.rightCommActiveTag.textContent = `${STATE.commentaryStyle} MODE`;
        }

        // Update Odd/Even Toss Call Buttons & Multiplayer Lock State
        if (STATE.phase === 'TOSS') {
          const activeBtnCls = 'py-3 px-4 rounded-xl font-extrabold text-sm sm:text-base transition flex items-center justify-center gap-2 bg-[#81b64c] text-white shadow-lg border-b-4 border-[#5d8c32]';
          const idleBtnCls = 'py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition flex items-center justify-center gap-2 bg-[#3c3934] hover:bg-[#4a4640] text-slate-200 border border-[#524e48]';
          const lockedBtnCls = 'py-3 px-4 rounded-xl font-bold text-sm sm:text-base transition flex items-center justify-center gap-2 bg-slate-900/90 text-rose-300/70 border border-rose-500/30 opacity-60 cursor-not-allowed';

          if (isMultiplayer()) {
            const p1Call = STATE.p1TossCall || 'ODD';
            const p2Call = p1Call === 'EVEN' ? 'ODD' : 'EVEN';
            const amIGuest = STATE.onlineRole === 'GUEST';

            el.mpTossLockNotice.classList.remove('hidden');
            el.mpTossLockText.textContent = `⚡ ${p1Name} (P1) calls ${p1Call} → ${p2Name} (P2) is automatically assigned ${p2Call}`;
            el.tossCallIndicator.textContent = `${p1Name}: ${p1Call} • ${p2Name}: ${p2Call}`;

            if (amIGuest || STATE.pendingP1Num !== null) {
              // On Guest screen or once P1 locked their number, lock the Odd/Even call buttons
              el.btnCallOdd.disabled = true;
              el.btnCallEven.disabled = true;
              el.btnCallOdd.innerHTML = `<span>⚡</span><span>ODD (${p1Call === 'ODD' ? p1Name : p2Name})</span>`;
              el.btnCallEven.innerHTML = `<span>⚖️</span><span>EVEN (${p1Call === 'EVEN' ? p1Name : p2Name})</span>`;
              el.btnCallOdd.className = (amIGuest ? p2Call === 'ODD' : p1Call === 'ODD') ? activeBtnCls : lockedBtnCls;
              el.btnCallEven.className = (amIGuest ? p2Call === 'EVEN' : p1Call === 'EVEN') ? activeBtnCls : lockedBtnCls;
            } else {
              // Host (P1) can choose Odd or Even before throwing P1's toss number
              el.btnCallOdd.disabled = false;
              el.btnCallEven.disabled = false;
              el.btnCallOdd.innerHTML = `<span>⚡</span><span>CALL ODD (${p1Name})</span>`;
              el.btnCallEven.innerHTML = `<span>⚖️</span><span>CALL EVEN (${p1Name})</span>`;
              el.btnCallOdd.className = p1Call === 'ODD' ? activeBtnCls : idleBtnCls;
              el.btnCallEven.className = p1Call === 'EVEN' ? activeBtnCls : idleBtnCls;
            }
          } else {
            el.mpTossLockNotice.classList.add('hidden');
            el.btnCallOdd.disabled = false;
            el.btnCallEven.disabled = false;
            el.btnCallOdd.innerHTML = `<span>⚡</span><span>CALL ODD</span>`;
            el.btnCallEven.innerHTML = `<span>⚖️</span><span>CALL EVEN</span>`;
            el.btnCallOdd.className = STATE.tossCall === 'ODD' ? activeBtnCls : idleBtnCls;
            el.btnCallEven.className = STATE.tossCall === 'EVEN' ? activeBtnCls : idleBtnCls;
            el.tossCallIndicator.textContent = `Selected Call: ${STATE.tossCall}`;
          }
        }

        // Update 15s Synchronized Turn Timer UI
        updateTimerUI();

        // Populate WORLDWIDE REAL-USER Leaderboard Standings whenever leaderboard container is present
        if (el.leaderboardStandingsList && (STATE.activeScreen === 'LEADERBOARD' || STATE.phase === 'GAME_OVER' || !el.leaderboardStandingsList.innerHTML.trim())) {
          syncAuthAndPurgeFakeSeeds();
          const weekInfo = getMondaySundayWeekInfo();
          if (el.lbWeeklyRangeText) {
            el.lbWeeklyRangeText.textContent = `Weekly Window: ${weekInfo.label}`;
          }

          const allHumans = Object.values(STATE.humanPlayers).filter((p) => {
            if (!p || !p.name) return false;
            const cleanN = String(p.name).trim().toUpperCase();
            if (!cleanN || cleanN.length < 3 || isPlaceholderUsername(cleanN) || FAKE_SEED_NAMES.includes(cleanN)) return false;
            p.name = cleanN;
            p.elo = typeof p.elo === 'number' && !isNaN(p.elo) ? p.elo : (Number(p.elo) || 1500);
            p.peak = Math.max(1500, p.elo, Number(p.peak) || 1500);
            p.wins = Number(p.wins) || 0;
            p.losses = Number(p.losses) || 0;
            p.matches = Math.max(Number(p.matches) || 0, p.wins + p.losses);
            p.totalRuns = Number(p.totalRuns) || 0;
            p.wicketsTaken = Number(p.wicketsTaken) || 0;

            // Strictly enforce weekly cycle reset (Monday to Sunday)
            if (p.weekKey !== weekInfo.weekKey) {
              p.weekKey = weekInfo.weekKey;
              p.weeklyEloGain = 0;
              p.weeklyWins = 0;
              p.weeklyLosses = 0;
              p.weeklyMatches = 0;
              p.weeklyRuns = 0;
              p.weeklyWickets = 0;
            } else {
              p.weeklyEloGain = typeof p.weeklyEloGain === 'number' ? p.weeklyEloGain : 0;
              p.weeklyWins = Number(p.weeklyWins) || 0;
              p.weeklyLosses = Number(p.weeklyLosses) || 0;
              p.weeklyMatches = Math.max(Number(p.weeklyMatches) || 0, p.weeklyWins + p.weeklyLosses);
              p.weeklyRuns = Number(p.weeklyRuns) || 0;
              p.weeklyWickets = Number(p.weeklyWickets) || 0;
            }
            return true;
          });

          if (el.lbWorldSyncText) {
            el.lbWorldSyncText.textContent = `Worldwide Connected (${allHumans.length} Global Account${allHumans.length === 1 ? '' : 's'})`;
          }

          const tab = STATE.leaderboardTab || 'GLOBAL';
          const tabActiveCls = 'py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 bg-[#81b64c] text-white shadow';
          const tabIdleCls = 'py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 text-slate-300 hover:text-white bg-transparent';
          if (el.btnLbSwitchGlobal) el.btnLbSwitchGlobal.className = tab === 'GLOBAL' ? tabActiveCls : tabIdleCls;
          if (el.btnLbSwitchWeekly) el.btnLbSwitchWeekly.className = tab === 'WEEKLY' ? tabActiveCls : tabIdleCls;
          if (el.btnLbSwitchRuns) el.btnLbSwitchRuns.className = tab === 'RUNS' ? tabActiveCls : tabIdleCls;

          if (tab === 'GLOBAL') {
            if (el.lbModeSubNote) el.lbModeSubNote.textContent = 'Worldwide Real User Standings • Connected across all Global Accounts & Peers';
            if (el.lbTableLeftHeader) el.lbTableLeftHeader.textContent = 'Worldwide Registered Usernames (Ranked by Elo)';
            if (el.lbTableRightHeader) el.lbTableRightHeader.textContent = 'Elo • Runs • Wickets';
            if (el.lbCard1Title) el.lbCard1Title.textContent = 'Your Rating';
            if (el.lbCard2Title) el.lbCard2Title.textContent = 'Total Runs';
            if (el.lbCard3Title) el.lbCard3Title.textContent = 'Wickets Taken';
            if (el.lbCard4Title) el.lbCard4Title.textContent = 'Win / Loss';

            const myTotalMatches = Math.max(myRec.matches || 0, (myRec.wins || 0) + (myRec.losses || 0));
            el.lbUserEloBig.textContent = myRec.elo;
            el.lbPeakEloBig.textContent = `${myRec.totalRuns || 0}`;
            el.lbWinLossBig.textContent = `${myRec.wicketsTaken || 0} Wkts`;
            el.lbNetDeltaBig.textContent = `${myTotalMatches}M (${myRec.wins || 0}W–${myRec.losses || 0}L)`;

            const sortedGlobal = [...allHumans].sort((a, b) => b.elo - a.elo || (b.totalRuns || 0) - (a.totalRuns || 0) || (b.matches || 0) - (a.matches || 0) || (b.wicketsTaken || 0) - (a.wicketsTaken || 0));
            if (sortedGlobal.length === 0) {
              el.leaderboardStandingsList.innerHTML = `<div class="p-5 rounded-xl bg-[#262421] border border-[#45423e] text-center text-xs sm:text-sm text-slate-300">🏆 Global Leaderboard is clean &amp; empty (0 players). Sign up or log in to claim Rank #1!</div>`;
            } else {
              const renderGlobalRow = (ent, rankNum, isMeRow = false) => {
                const isMe = isMeRow || ent.name === myCleanName;
                const cFlag = ent.countryFlag || '🇮🇳';
                const cDial = ent.countryCode || '+91';
                const entMatches = Math.max(ent.matches || 0, (ent.wins || 0) + (ent.losses || 0));
                const wlText = `Matches: ${entMatches} (${ent.wins || 0}W – ${ent.losses || 0}L) • Total Runs: ${ent.totalRuns || 0} • Wickets: ${ent.wicketsTaken || 0}`;
                return `
                  <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="min-w-[1.75rem] h-7 px-1.5 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${rankNum === 1 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${rankNum}</span>
                      <span class="text-lg">${cFlag}</span>
                      <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-extrabold ${isMe ? 'text-[#a3d96c]' : 'text-white'} truncate flex items-center gap-1.5">
                          <span>${ent.name}</span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-900 text-amber-300 border border-slate-700">${cDial}</span>
                          ${isMe ? '<span class="text-[10px] font-black text-emerald-300">(You)</span>' : '<span class="text-[10px] text-cyan-300/80">🌍 Global</span>'}
                        </div>
                        <div class="text-[11px] text-slate-300 truncate">${wlText}</div>
                      </div>
                    </div>
                    <span class="font-mono-num text-xs sm:text-sm font-black px-3 py-1 rounded-lg ${isMe ? 'bg-[#81b64c] text-white' : 'bg-[#3c3934] text-amber-300 border border-[#524e48]'} shrink-0">
                      ${ent.elo} ELO
                    </span>
                  </div>
                `;
              };

              const myIdx = sortedGlobal.findIndex((p) => p.name === myCleanName);
              const myRank = myIdx >= 0 ? myIdx + 1 : sortedGlobal.length + 1;
              const myEnt = myIdx >= 0 ? sortedGlobal[myIdx] : Object.assign({}, myRec, { name: myCleanName });
              const top10Global = sortedGlobal.slice(0, 10);

              el.leaderboardStandingsList.innerHTML = top10Global.map((ent, idx) => renderGlobalRow(ent, idx + 1)).join('') + `
                <div class="pt-3 mt-2 border-t-2 border-dashed border-[#81b64c]/50 space-y-2">
                  <div class="flex items-center justify-between text-xs font-mono-num font-black uppercase text-[#a3d96c] px-1">
                    <span class="flex items-center gap-1.5"><span>📌</span><span>Your Rank in Leaderboard</span></span>
                    <span>#${myRank} OF ${sortedGlobal.length}</span>
                  </div>
                  ${renderGlobalRow(myEnt, myRank, true)}
                </div>
              `;
            }
          } else if (tab === 'WEEKLY') {
            if (el.lbModeSubNote) el.lbModeSubNote.textContent = `Weekly Worldwide Leaderboard (${weekInfo.label}) • Starts Monday & Ends Sunday`;
            if (el.lbTableLeftHeader) el.lbTableLeftHeader.textContent = 'Weekly Worldwide Standings (Mon – Sun)';
            if (el.lbTableRightHeader) el.lbTableRightHeader.textContent = 'Weekly Elo • Runs • Wkts';
            if (el.lbCard1Title) el.lbCard1Title.textContent = 'Weekly Elo Δ';
            if (el.lbCard2Title) el.lbCard2Title.textContent = 'Weekly Runs';
            if (el.lbCard3Title) el.lbCard3Title.textContent = 'Weekly Wickets';
            if (el.lbCard4Title) el.lbCard4Title.textContent = 'Weekly W–L';

            const myWkElo = myRec.weeklyEloGain || 0;
            el.lbUserEloBig.textContent = myWkElo >= 0 ? `+${myWkElo}` : `${myWkElo}`;
            el.lbPeakEloBig.textContent = `${myRec.weeklyRuns || 0}`;
            el.lbWinLossBig.textContent = `${myRec.weeklyWickets || 0} Wkts`;
            el.lbNetDeltaBig.textContent = `${myRec.weeklyWins || 0}W–${myRec.weeklyLosses || 0}L`;

            const sortedWeekly = [...allHumans].sort((a, b) => {
              const wDiff = (b.weeklyEloGain || 0) - (a.weeklyEloGain || 0);
              if (wDiff !== 0) return wDiff;
              return (b.weeklyRuns || 0) - (a.weeklyRuns || 0);
            });

            if (sortedWeekly.length === 0) {
              el.leaderboardStandingsList.innerHTML = `<div class="p-5 rounded-xl bg-[#262421] border border-[#45423e] text-center text-xs sm:text-sm text-slate-300">📅 Weekly Leaderboard is clean &amp; empty (0 players). Sign up or log in to compete this week!</div>`;
            } else {
              const renderWeeklyRow = (ent, rankNum, isMeRow = false) => {
                const isMe = isMeRow || ent.name === myCleanName;
                const cFlag = ent.countryFlag || '🇮🇳';
                const cDial = ent.countryCode || '+91';
                const wkGain = ent.weeklyEloGain || 0;
                const wkSign = wkGain >= 0 ? `+${wkGain}` : `${wkGain}`;
                const wkMatches = Math.max(ent.weeklyMatches || 0, (ent.weeklyWins || 0) + (ent.weeklyLosses || 0));
                const subText = `Mon–Sun: ${wkMatches} Matches (${ent.weeklyWins || 0}W – ${ent.weeklyLosses || 0}L) • ${ent.weeklyRuns || 0} Runs • ${ent.weeklyWickets || 0} Wkts`;
                return `
                  <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="min-w-[1.75rem] h-7 px-1.5 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${rankNum === 1 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${rankNum}</span>
                      <span class="text-lg">${cFlag}</span>
                      <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-extrabold ${isMe ? 'text-[#a3d96c]' : 'text-white'} truncate flex items-center gap-1.5">
                          <span>${ent.name}</span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-900 text-amber-300 border border-slate-700">${cDial}</span>
                          ${isMe ? '<span class="text-[10px] font-black text-emerald-300">(You)</span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-300 truncate">${subText}</div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-mono-num text-xs sm:text-sm font-black px-3 py-1 rounded-lg ${wkGain >= 0 ? 'bg-[#81b64c] text-white' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}">
                        ${wkSign} ELO
                      </span>
                      <div class="text-[10px] font-mono-num text-amber-300 mt-1">${ent.weeklyRuns || 0}R • ${ent.weeklyWickets || 0}W</div>
                    </div>
                  </div>
                `;
              };

              const myIdx = sortedWeekly.findIndex((p) => p.name === myCleanName);
              const myRank = myIdx >= 0 ? myIdx + 1 : sortedWeekly.length + 1;
              const myEnt = myIdx >= 0 ? sortedWeekly[myIdx] : Object.assign({}, myRec, { name: myCleanName });
              const top10Weekly = sortedWeekly.slice(0, 10);

              el.leaderboardStandingsList.innerHTML = top10Weekly.map((ent, idx) => renderWeeklyRow(ent, idx + 1)).join('') + `
                <div class="pt-3 mt-2 border-t-2 border-dashed border-[#81b64c]/50 space-y-2">
                  <div class="flex items-center justify-between text-xs font-mono-num font-black uppercase text-[#a3d96c] px-1">
                    <span class="flex items-center gap-1.5"><span>📌</span><span>Your Rank in Leaderboard</span></span>
                    <span>#${myRank} OF ${sortedWeekly.length}</span>
                  </div>
                  ${renderWeeklyRow(myEnt, myRank, true)}
                </div>
              `;
            }
          } else {
            if (el.lbModeSubNote) el.lbModeSubNote.textContent = 'Worldwide Total Runs & Wickets • Every Run & Wicket Connected to Real Username';
            if (el.lbTableLeftHeader) el.lbTableLeftHeader.textContent = 'Total Runs & Wickets Leaderboard (Worldwide)';
            if (el.lbTableRightHeader) el.lbTableRightHeader.textContent = 'Total Runs & Wickets';
            if (el.lbCard1Title) el.lbCard1Title.textContent = 'Your Total Runs';
            if (el.lbCard2Title) el.lbCard2Title.textContent = 'Wickets Taken';
            if (el.lbCard3Title) el.lbCard3Title.textContent = 'Highest Score';
            if (el.lbCard4Title) el.lbCard4Title.textContent = 'Career SR';

            el.lbUserEloBig.textContent = `${myRec.totalRuns || 0}`;
            el.lbPeakEloBig.textContent = `${myRec.wicketsTaken || 0} Wkts`;
            el.lbWinLossBig.textContent = `${myRec.highScore || 0}*`;
            el.lbNetDeltaBig.textContent = formatSR(myRec.totalRuns || 0, myRec.totalBalls || 0);

            const sortedRuns = [...allHumans].sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0) || (b.wicketsTaken || 0) - (a.wicketsTaken || 0) || b.elo - a.elo);
            if (sortedRuns.length === 0) {
              el.leaderboardStandingsList.innerHTML = `<div class="p-5 rounded-xl bg-[#262421] border border-[#45423e] text-center text-xs sm:text-sm text-slate-300">🏏 Total Runs Leaderboard is clean &amp; empty (0 players). Sign up or log in and score runs!</div>`;
            } else {
              const renderRunsRow = (ent, rankNum, isMeRow = false) => {
                const isMe = isMeRow || ent.name === myCleanName;
                const cFlag = ent.countryFlag || '🇮🇳';
                const cDial = ent.countryCode || '+91';
                const sr = formatSR(ent.totalRuns || 0, ent.totalBalls || 0);
                const entMatches = Math.max(ent.matches || 0, (ent.wins || 0) + (ent.losses || 0));
                const subText = `Matches: ${entMatches} (${ent.wins || 0}W–${ent.losses || 0}L) • Wickets: ${ent.wicketsTaken || 0} • High: ${ent.highScore || 0} • Balls: ${ent.totalBalls || 0} (SR ${sr})`;
                return `
                  <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="min-w-[1.75rem] h-7 px-1.5 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${rankNum === 1 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${rankNum}</span>
                      <span class="text-lg">${cFlag}</span>
                      <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-extrabold ${isMe ? 'text-[#a3d96c]' : 'text-white'} truncate flex items-center gap-1.5">
                          <span>${ent.name}</span>
                          <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-900 text-amber-300 border border-slate-700">${cDial}</span>
                          ${isMe ? '<span class="text-[10px] font-black text-emerald-300">(You)</span>' : ''}
                        </div>
                        <div class="text-[11px] text-slate-300 truncate">${subText}</div>
                      </div>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-mono-num text-xs sm:text-sm font-black px-3 py-1 rounded-lg ${isMe ? 'bg-[#81b64c] text-white' : 'bg-[#3c3934] text-emerald-300 border border-[#524e48]'}">
                        ${ent.totalRuns || 0} RUNS
                      </span>
                      <div class="text-[10px] font-mono-num text-cyan-300 mt-1">${ent.wicketsTaken || 0} Wickets</div>
                    </div>
                  </div>
                `;
              };

              const myIdx = sortedRuns.findIndex((p) => p.name === myCleanName);
              const myRank = myIdx >= 0 ? myIdx + 1 : sortedRuns.length + 1;
              const myEnt = myIdx >= 0 ? sortedRuns[myIdx] : Object.assign({}, myRec, { name: myCleanName });
              const top10Runs = sortedRuns.slice(0, 10);

              el.leaderboardStandingsList.innerHTML = top10Runs.map((ent, idx) => renderRunsRow(ent, idx + 1)).join('') + `
                <div class="pt-3 mt-2 border-t-2 border-dashed border-[#81b64c]/50 space-y-2">
                  <div class="flex items-center justify-between text-xs font-mono-num font-black uppercase text-[#a3d96c] px-1">
                    <span class="flex items-center gap-1.5"><span>📌</span><span>Your Rank in Leaderboard</span></span>
                    <span>#${myRank} OF ${sortedRuns.length}</span>
                  </div>
                  ${renderRunsRow(myEnt, myRank, true)}
                </div>
              `;
            }
          }

          if (STATE.eloHistory.length === 0) {
            el.eloHistoryList.innerHTML = `<div class="text-slate-300 text-center py-3">Play Multiplayer matches as <strong>${myCleanName}</strong> to increase or decrease your Elo rating (±8)! Bot matches keep your rating frozen.</div>`;
          } else {
            el.eloHistoryList.innerHTML = STATE.eloHistory.map((h) => {
              const isBotOrFrozen = Boolean(h.isBotMatch) || h.delta === 'FROZEN' || h.delta === '0' || (typeof h.mode === 'string' && h.mode.toLowerCase().includes('bot'));
              const rightLabel = isBotOrFrozen
                ? `❄️ FROZEN (${h.newElo} ELO)`
                : `${h.delta} ELO → ${h.newElo}`;
              if (!h) return '';
              const isDrawHistory = h.result === 'DRAW';
              const rightColor = isBotOrFrozen
                ? 'text-cyan-300'
                : (isDrawHistory ? 'text-amber-300' : (h.result === 'WIN' ? 'text-[#81b64c]' : 'text-rose-400'));
              const titleText = h.result === 'FORFEIT'
                ? `🏳️ Match Forfeited vs ${h.opponent}`
                : (isDrawHistory
                    ? `🤝 Match Drawn vs ${h.opponent}`
                    : (h.result === 'WIN' ? `🏆 ${h.p1Name || myCleanName} defeated ${h.opponent}` : `❌ ${h.opponent} defeated ${h.p1Name || myCleanName}`));
              return `
                <div class="p-2.5 rounded-lg bg-[#262421] border border-[#45423e] flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <span class="font-bold text-white">${titleText}</span>
                    <span class="text-[10px] text-slate-300 ml-1.5">(${h.mode} • ${h.runsScored || 0} Runs • ${h.wicketsTaken || 0} Wkts)</span>
                  </div>
                  <div class="font-mono-num font-extrabold ${rightColor} shrink-0">
                    ${rightLabel}
                  </div>
                </div>
              `;
            }).join('');
          }
        }

        // Update Live Broadcast Box
        el.liveBroadcastLine.textContent = STATE.liveBroadcastQuote;
        el.commentaryExcitementTag.textContent = STATE.liveExcitementLabel;
        el.commentaryStreakTag.textContent = `Scoring Streak: ${STATE.currentStreak}🔥`;

        if (mpActive) {
          el.mpBtnIcon.textContent = '🔒';
          el.mpBtnLabel.textContent = `Room ${STATE.roomCode || 'Live'}: ${p1Name} vs ${p2Name}`;
          el.mpTurnStatusBar.classList.remove('hidden');

          const p1Locked = STATE.pendingP1Num !== null;
          const p2Locked = STATE.pendingP2Num !== null;
          el.mpLockedBadge.textContent = `${p1Name} (P1): ${p1Locked ? '🔒 Locked' : '🟢 Active'} • ${p2Name} (P2): ${p2Locked ? '🔒 Locked' : (p1Locked ? '🟢 Active' : '🔒 Locked')}`;

          if (STATE.phase === 'TOSS' || STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2') {
            if (!p1Locked) {
              el.mpTurnBannerTitle.textContent = `🟢 ${p1Name} (P1)'s 15s Countdown Running • 🔒 ${p2Name} (P2) Locked`;
              el.mpTurnBannerSub.textContent = `Once ${p1Name} picks a number (1–10), ${p1Name}'s clock locks and ${p2Name}'s 15s countdown unlocks!`;
            } else if (!p2Locked) {
              el.mpTurnBannerTitle.textContent = `🔒 ${p1Name} (P1) Locked • 🟢 ${p2Name} (P2)'s 15s Countdown Unlocked!`;
              el.mpTurnBannerSub.textContent = `${p1Name}'s hand is locked in secretly (🔒). Now ${p2Name} has 15s to pick a number (1–10)!`;
            }
          } else {
            el.mpTurnBannerTitle.textContent = `🔒 Room Locked: ${p1Name} (P1) vs ${p2Name} (P2)`;
            el.mpTurnBannerSub.textContent = 'Both players synced on the pitch!';
          }
        } else {
          el.mpBtnIcon.textContent = '👥';
          el.mpBtnLabel.textContent = 'Multiplayer';
          el.mpTurnStatusBar.classList.add('hidden');
        }

        // 1. Phase Badge
        const phaseLabels = {
          TOSS: { text: 'Toss Phase (15s Clock)', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
          TOSS_DECISION: { text: 'Toss Result', cls: 'bg-cyan-500/10 text-cyan-300 border-cyan-400/30' },
          INNINGS_1: { text: '1st Innings', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30' },
          INNINGS_BREAK: { text: 'Innings Break', cls: 'bg-amber-500/10 text-amber-300 border-amber-400/30' },
          INNINGS_2: { text: '2nd Innings • The Chase', cls: 'bg-purple-500/10 text-purple-300 border-purple-400/30' },
          GAME_OVER: { text: 'Match Finished', cls: 'bg-rose-500/10 text-rose-300 border-rose-400/30' }
        };
        const pInfo = phaseLabels[STATE.phase];
        el.phaseBadge.textContent = pInfo.text;
        el.phaseBadge.className = `px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border ${pInfo.cls}`;

        // 2. Role Badges & Active Score Card Highlight
        const isPlayPhase = STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2';
        if (isPlayPhase) {
          const p1Batting = STATE.currentBatter === 'USER';
          if (el.mpRoleAssignmentBanner) {
            if (STATE.lastTossDecisionSummary) {
              el.mpRoleAssignmentBanner.classList.remove('hidden');
              el.mpRoleAssignmentText.textContent = STATE.lastTossDecisionSummary;
              el.mpRoleAssignmentSub.textContent = STATE.currentInnings === 1 ? '1ST INNINGS ROLES' : '2ND INNINGS ROLES SWAPPED';
            } else {
              el.mpRoleAssignmentBanner.classList.add('hidden');
            }
          }
          el.userRoleBadge.textContent = p1Batting ? '🏏 BATTING' : '⚾ BOWLING';
          el.userRoleBadge.className = p1Batting
            ? 'px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/10 text-emerald-300 border border-emerald-400/40'
            : 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';

          el.aiRoleBadge.textContent = !p1Batting ? '🏏 BATTING' : '⚾ BOWLING';
          el.aiRoleBadge.className = !p1Batting
            ? 'px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-cyan-500/10 text-cyan-300 border border-cyan-400/40'
            : 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';

          el.userScoreCard.className = p1Batting
            ? 'glass-card-active rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all'
            : 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
          el.aiScoreCard.className = !p1Batting
            ? 'glass-card-active rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all'
            : 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
        } else {
          el.userRoleBadge.textContent = STATE.phase === 'GAME_OVER' ? (STATE.winner === 'DRAW' ? '🤝 DRAW' : (STATE.winner === 'USER' ? '🏆 WINNER' : 'FINISHED')) : 'READY';
          el.userRoleBadge.className = STATE.phase === 'GAME_OVER' && STATE.winner === 'DRAW'
            ? 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40'
            : 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
          el.aiRoleBadge.textContent = STATE.phase === 'GAME_OVER' ? (STATE.winner === 'DRAW' ? '🤝 DRAW' : (STATE.winner === 'AI' ? '🏆 WINNER' : 'FINISHED')) : 'READY';
          el.aiRoleBadge.className = STATE.phase === 'GAME_OVER' && STATE.winner === 'DRAW'
            ? 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40'
            : 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
          el.userScoreCard.className = 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
          el.aiScoreCard.className = 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
        }

        // 3. Scores, Balls, Last Played Numbers
        const p1Rec = ensureHumanPlayerRecord(p1Name, 1500);
        el.userMainScore.textContent = STATE.userScore;
        el.userSubMeta.textContent = `${STATE.userBalls}b • SR ${formatSR(STATE.userScore, STATE.userBalls)} • W:${STATE.userMatchWickets}`;
        el.userLastPlayedBadge.textContent = STATE.lastUserNum !== null ? STATE.lastUserNum : '-';

        el.aiMainScore.textContent = STATE.aiScore;
        el.aiSubMeta.textContent = `${STATE.aiBalls}b • SR ${formatSR(STATE.aiScore, STATE.aiBalls)} • W:${STATE.aiMatchWickets}`;
        el.aiLastPlayedBadge.textContent = STATE.lastAiNum !== null ? STATE.lastAiNum : '-';

        // 4. Center Target & Match Equation Card
        if (STATE.currentInnings === 0) {
          el.inningsLabel.textContent = 'TOSS PHASE';
          el.ballsCounterLabel.textContent = '0 BALLS';
          el.targetHeaderLabel.textContent = 'TARGET TO WIN';
          el.targetValueDisplay.textContent = '—';
          el.chaseProgressWrap.classList.add('hidden');
          el.equationStatusText.textContent = `${p1Name} vs ${p2Name} • Win the toss to Bat or Bowl`;
        } else if (STATE.currentInnings === 1) {
          const p1Batting = STATE.currentBatter === 'USER';
          const balls = p1Batting ? STATE.userBalls : STATE.aiBalls;
          const score = p1Batting ? STATE.userScore : STATE.aiScore;
          const batterLabel = p1Batting ? p1Name : p2Name;
          const bowlerLabel = p1Batting ? p2Name : p1Name;
          el.inningsLabel.textContent = '1ST INNINGS';
          el.ballsCounterLabel.textContent = `BALL ${balls}`;
          el.targetHeaderLabel.textContent = 'PROJECTED TARGET';
          el.targetValueDisplay.textContent = score + 1;
          el.chaseProgressWrap.classList.add('hidden');
          if (STATE.phase === 'GAME_OVER') {
            if (STATE.winner === 'DRAW') {
              el.equationStatusText.textContent = '🤝 Match Drawn!';
            } else {
              el.equationStatusText.textContent = STATE.winner === 'USER' ? `🏆 ${p1Name} won the match!` : `🏆 ${p2Name} won the match!`;
            }
          } else {
            el.equationStatusText.textContent = `🏏 ${batterLabel} setting target • ⚾ ${bowlerLabel} bowling`;
          }
        } else {
          const p1Chasing = STATE.currentBatter === 'USER';
          const chaserName = p1Chasing ? p1Name : p2Name;
          const chaserScore = p1Chasing ? STATE.userScore : STATE.aiScore;
          const chaserBalls = p1Chasing ? STATE.userBalls : STATE.aiBalls;
          const runsNeeded = Math.max(0, STATE.target - chaserScore);
          const pct = STATE.target > 0 ? Math.min(100, Math.round((chaserScore / STATE.target) * 100)) : 0;

          el.inningsLabel.textContent = '2ND INNINGS (CHASE)';
          el.ballsCounterLabel.textContent = `BALL ${chaserBalls}`;
          el.targetHeaderLabel.textContent = 'TARGET TO WIN';
          el.targetValueDisplay.textContent = STATE.target;
          el.chaseProgressWrap.classList.remove('hidden');
          el.chaseProgressBar.style.width = `${pct}%`;

          if (STATE.phase === 'GAME_OVER') {
            if (STATE.winner === 'DRAW') {
              el.equationStatusText.textContent = `🤝 Match Drawn! Both sides scored ${STATE.userScore} runs.`;
            } else {
              el.equationStatusText.textContent = STATE.winner === 'USER' ? `🏆 ${p1Name} won the match!` : `🏆 ${p2Name} won the match!`;
            }
          } else {
            el.equationStatusText.textContent = `${chaserName} needs ${runsNeeded} more run${runsNeeded === 1 ? '' : 's'} to win`;
          }
        }

        // 5. Turn Outcome Banner
        el.turnOutcomeBanner.textContent = STATE.lastOutcomeText;

        // 6. Toggle Active Phase View
        el.viewToss.classList.toggle('hidden', STATE.phase !== 'TOSS');
        el.viewTossDecision.classList.toggle('hidden', STATE.phase !== 'TOSS_DECISION');
        el.viewGameplay.classList.toggle('hidden', !isPlayPhase);
        el.viewInningsBreak.classList.toggle('hidden', STATE.phase !== 'INNINGS_BREAK');
        el.viewGameOver.classList.toggle('hidden', STATE.phase !== 'GAME_OVER');

        // Populate Phase-Specific Details: TOSS_DECISION (Show P1/P2 real username on BOTH screens & auto-assign opposite role!)
        if (STATE.phase === 'TOSS_DECISION') {
          const sumParity = STATE.tossSum % 2 === 1 ? 'ODD' : 'EVEN';
          el.tossMathSummary.textContent = `${p1Name}: ${STATE.tossUserNum} + ${p2Name}: ${STATE.tossAiNum} = ${STATE.tossSum} (${sumParity})`;

          if (isMultiplayer()) {
            const p1Won = STATE.tossWinner === 'USER';
            const winnerTitle = p1Won ? `${p1Name} (P1)` : `${p2Name} (P2)`;
            const loserTitle = p1Won ? `${p2Name} (P2)` : `${p1Name} (P1)`;
            const mySlot = STATE.onlineRole === 'GUEST' ? 'P2' : 'P1';
            const winnerSlot = p1Won ? 'P1' : 'P2';
            const didIWinToss = mySlot === winnerSlot;

            el.tossWinnerTag.textContent = `🎉 ${winnerTitle} WON THE TOSS!`;
            el.tossWinnerTag.className = p1Won
              ? 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-400/30'
              : 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-400/30';
            el.tossResultHeadline.textContent = `${winnerTitle} won the toss! (${p1Name} called ${STATE.p1TossCall}, ${p2Name} had ${STATE.p2TossCall} — Sum = ${STATE.tossSum} ${sumParity})`;

            el.aiTossChoiceContinue.classList.add('hidden');
            if (didIWinToss) {
              el.tossDecisionSubtext.textContent = `${winnerTitle}, choose Bat or Bowl below (${loserTitle} will automatically be assigned the opposite role):`;
              el.userTossChoiceButtons.classList.remove('hidden');
              if (el.mpTossWaitingBanner) el.mpTossWaitingBanner.classList.add('hidden');
            } else {
              el.tossDecisionSubtext.textContent = `${winnerTitle} is choosing whether to Bat or Bowl first...`;
              el.userTossChoiceButtons.classList.add('hidden');
              if (el.mpTossWaitingBanner) {
                el.mpTossWaitingBanner.classList.remove('hidden');
                el.mpTossWaitingTitle.textContent = `⏳ ${winnerTitle} won the toss and is choosing Bat or Bowl...`;
                el.mpTossWaitingSub.textContent = `If ${winnerTitle} chooses Bowl, ${loserTitle} (You) will automatically be assigned Bat (and vice versa)!`;
              }
            }
          } else {
            if (el.mpTossWaitingBanner) el.mpTossWaitingBanner.classList.add('hidden');
            if (STATE.tossWinner === 'USER') {
              el.tossWinnerTag.textContent = `🎉 ${p1Name} WON THE TOSS!`;
              el.tossWinnerTag.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-400/30';
              el.tossResultHeadline.textContent = `${p1Name} called ${STATE.tossCall} and the sum is ${STATE.tossSum} (${sumParity})!`;
              el.tossDecisionSubtext.textContent = 'Would you like to Bat first and set a target, or Bowl first and chase?';
              el.userTossChoiceButtons.classList.remove('hidden');
              el.aiTossChoiceContinue.classList.add('hidden');
            } else {
              const aiRole = STATE.firstBatter === 'AI' ? 'BAT FIRST' : 'BOWL FIRST';
              el.tossWinnerTag.textContent = `🤖 ${p2Name.toUpperCase()} WON THE TOSS`;
              el.tossWinnerTag.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/10 text-cyan-300 border border-cyan-400/30';
              el.tossResultHeadline.textContent = `You called ${STATE.tossCall}, but ${STATE.tossUserNum} + ${STATE.tossAiNum} = ${STATE.tossSum} (${sumParity}).`;
              el.tossDecisionSubtext.textContent = `${p2Name} won the toss and chose to ${aiRole} (You are assigned ${aiRole === 'BAT FIRST' ? 'BOWL FIRST' : 'BAT FIRST'})!`;
              el.userTossChoiceButtons.classList.add('hidden');
              el.aiTossChoiceContinue.classList.remove('hidden');
            }
          }
        }

        if (isPlayPhase) {
          const p1Batting = STATE.currentBatter === 'USER';
          if (isMultiplayer()) {
            const amIGuest = STATE.onlineRole === 'GUEST';
            const amIBatting = (amIGuest && !p1Batting) || (!amIGuest && p1Batting);
            const myDisplay = amIGuest ? `${p2Name} (P2)` : `${p1Name} (P1)`;
            const oppDisplay = amIGuest ? `${p1Name} (P1)` : `${p2Name} (P2)`;

            if (amIBatting) {
              el.gameplayHeading.innerHTML = `<span>🏏</span><span>${myDisplay} (You) are BATTING • ⚾ ${oppDisplay} is BOWLING</span>`;
              el.gameplayHint.textContent =
                STATE.currentInnings === 1
                  ? `Pick 1–10 to score runs for ${myDisplay}. If ${oppDisplay} picks the same number, you are OUT!`
                  : `Chase Target: ${STATE.target}. Reach ${STATE.target} runs before ${oppDisplay} matches your number!`;
            } else {
              el.gameplayHeading.innerHTML = `<span>⚾</span><span>${myDisplay} (You) are BOWLING • 🏏 ${oppDisplay} is BATTING</span>`;
              el.gameplayHint.textContent =
                STATE.currentInnings === 1
                  ? `Match ${oppDisplay}'s number (1–10) to take a Wicket and end ${oppDisplay}'s innings!`
                  : `Defend Target: ${STATE.target}. Match ${oppDisplay}'s number to take a Wicket before ${oppDisplay} reaches ${STATE.target}!`;
            }
          } else {
            if (p1Batting) {
              el.gameplayHeading.innerHTML = `<span>🏏</span><span>${p1Name} is BATTING — Pick a Shot (1–10)</span>`;
              el.gameplayHint.textContent =
                STATE.currentInnings === 1
                  ? 'Your picked numbers accumulate into your score. If AI picks the same number, you are OUT!'
                  : `Chase Target: ${STATE.target}. Reach ${STATE.target} runs before AI matches your number!`;
            } else {
              el.gameplayHeading.innerHTML = `<span>⚾</span><span>${p1Name} is BOWLING — Pick a Delivery (1–10)</span>`;
              el.gameplayHint.textContent =
                STATE.currentInnings === 1
                  ? "Try to guess & match the AI's number (1–10) to take a Wicket and end its innings!"
                  : `Defend Target: ${STATE.target}. Match the AI's number to bowl it out before it reaches ${STATE.target}!`;
            }
          }
        }

        if (STATE.phase === 'INNINGS_BREAK') {
          const firstWasP1 = STATE.firstBatter === 'USER';
          const inn1BatterName = firstWasP1 ? p1Name : p2Name;
          const inn2BatterName = firstWasP1 ? p2Name : p1Name;
          const inn1Score = firstWasP1 ? STATE.userScore : STATE.aiScore;
          const inn1Balls = firstWasP1 ? STATE.userBalls : STATE.aiBalls;
          el.breakWicketDetail.textContent = `OUT! Both played ${STATE.lastUserNum}`;
          el.breakHeadline.textContent = `${inn1BatterName}'s 1st Innings: ${inn1Score} Runs (${inn1Balls} balls)`;
          el.breakTargetExplanation.innerHTML = `<strong>${inn2BatterName}</strong> must score <strong class="text-amber-300 font-mono-num">${STATE.target} runs</strong> in the 2nd Innings to win!`;
        }

        if (STATE.phase === 'GAME_OVER') {
          const isDraw = STATE.winner === 'DRAW';
          const p1Won = STATE.winner === 'USER';
          const didIWin = !isDraw && (isMultiplayer() && STATE.onlineRole === 'GUEST' ? !p1Won : p1Won);
          const winnerName = p1Won ? p1Name : p2Name;
          const loserName = p1Won ? p2Name : p1Name;
          if (STATE.isTossForfeit) {
            el.gameOverBadge.textContent = '🏳️ TOSS FORFEIT';
            el.gameOverBadge.className = 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-400/40';
            el.gameOverTitle.textContent = `🏳️ MATCH FORFEITED (${winnerName} WINS BY FORFEIT)`;
          } else if (isDraw) {
            el.gameOverBadge.textContent = '🤝 MATCH DRAWN';
            el.gameOverBadge.className = 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-400/40';
            el.gameOverTitle.textContent = '🤝 MATCH DRAWN!';
          } else {
            el.gameOverBadge.textContent = didIWin ? 'VICTORY' : 'LOSS';
            el.gameOverBadge.className = didIWin
              ? 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-300 border border-emerald-400/30'
              : 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-500/10 text-rose-300 border border-rose-400/30';
            el.gameOverTitle.textContent = didIWin
              ? `🏆 ${winnerName} WON THE MATCH!`
              : (isMultiplayer()
                  ? `❌ ${loserName} LOST — ${winnerName} WON!`
                  : `❌ You Lost — ${winnerName} Won!`);
          }
          if (el.gameOverBannerBox) {
            el.gameOverBannerBox.className = isDraw
              ? 'p-5 rounded-2xl bg-gradient-to-br from-amber-950/90 via-slate-900 to-slate-950 border border-amber-500/40 space-y-3 text-center'
              : (didIWin
                  ? 'p-5 rounded-2xl bg-gradient-to-br from-emerald-950/90 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-3 text-center'
                  : 'p-5 rounded-2xl bg-gradient-to-br from-rose-950/90 via-slate-900 to-slate-950 border border-rose-500/40 space-y-3 text-center');
          }
          el.gameOverMargin.textContent = STATE.winMarginText;
          el.summaryUserScore.textContent = `${p1Name}: ${STATE.userScore} (${STATE.userBalls}b)`;
          el.summaryTarget.textContent = STATE.target !== null ? STATE.target : '—';
          el.summaryAiScore.textContent = `${p2Name}: ${STATE.aiScore} (${STATE.aiBalls}b)`;
        }

        // 7. Right Sidebar Scorecard & Session Stats (Updates live every ball & logs every match)
        const activeMatchNum = STATE.phase === 'GAME_OVER'
          ? Math.max(1, STATE.sessionStats.matches)
          : STATE.sessionStats.matches + 1;
        if (el.scorecardMatchNumberBadge) {
          el.scorecardMatchNumberBadge.textContent = `Match #${activeMatchNum}`;
        }

        if (STATE.tossWinner) {
          const tossWinName = STATE.tossWinner === 'USER' ? p1Name : p2Name;
          if (STATE.firstBatter) {
            const bat1Name = STATE.firstBatter === 'USER' ? p1Name : p2Name;
            el.tossInfoSmall.textContent = `${tossWinName} won toss (${bat1Name} bats 1st)`;
          } else {
            el.tossInfoSmall.textContent = `${tossWinName} won toss • Choosing...`;
          }
        } else {
          el.tossInfoSmall.textContent = 'Toss Pending';
        }

        const activeRowCls = 'flex items-center justify-between p-2.5 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c] transition-all';
        const idleRowCls = 'flex items-center justify-between p-2.5 rounded-xl bg-[#22201d] border border-[#3d3a36] transition-all';

        if (!STATE.firstBatter) {
          if (el.cardInn1Row) el.cardInn1Row.className = idleRowCls;
          if (el.cardInn2Row) el.cardInn2Row.className = idleRowCls;
          if (el.cardInn1StatusPill) {
            el.cardInn1StatusPill.textContent = STATE.phase === 'GAME_OVER' ? 'TIMEOUT' : 'TOSS';
            el.cardInn1StatusPill.className = 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300';
          }
          if (el.cardInn2StatusPill) {
            el.cardInn2StatusPill.textContent = 'WAIT';
            el.cardInn2StatusPill.className = 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400';
          }
          el.cardInn1Team.textContent = `${p1Name} vs ${p2Name}`;
          el.cardInn1Score.textContent = STATE.phase === 'GAME_OVER' ? 'Toss Forfeit' : 'Waiting for Toss';
          el.cardInn2Team.textContent = '2nd Innings Chase';
          el.cardInn2Score.textContent = '—';
          if (el.scorecardLiveVerdictBar) {
            el.scorecardLiveVerdictBar.textContent = STATE.phase === 'GAME_OVER'
              ? (STATE.winMarginText || 'Match ended by Toss Timeout')
              : `${p1Name} vs ${p2Name} • Complete the toss to start 1st Innings!`;
          }
        } else {
          const p1First = STATE.firstBatter === 'USER';
          const inn1TeamLabel = p1First ? `${p1Name} (P1)` : `${p2Name} (${mpActive ? 'P2' : 'Bot'})`;
          const inn2TeamLabel = p1First ? `${p2Name} (${mpActive ? 'P2' : 'Bot'})` : `${p1Name} (P1)`;
          const inn1Runs = p1First ? STATE.userScore : STATE.aiScore;
          const inn1Balls = p1First ? STATE.userBalls : STATE.aiBalls;
          const inn2Runs = p1First ? STATE.aiScore : STATE.userScore;
          const inn2Balls = p1First ? STATE.aiBalls : STATE.userBalls;

          const inn1Active = STATE.phase === 'INNINGS_1';
          const inn2Active = STATE.phase === 'INNINGS_2';
          if (el.cardInn1Row) el.cardInn1Row.className = inn1Active ? activeRowCls : idleRowCls;
          if (el.cardInn2Row) el.cardInn2Row.className = inn2Active ? activeRowCls : idleRowCls;

          const inn1WicketFell = STATE.currentInnings === 2 || STATE.phase === 'INNINGS_BREAK' || (STATE.phase === 'GAME_OVER' && STATE.currentInnings >= 2);
          el.cardInn1Team.textContent = inn1TeamLabel;
          el.cardInn1Score.textContent = `${inn1Runs}/${inn1WicketFell ? '1' : '0'} (${inn1Balls}b • SR ${formatSR(inn1Runs, inn1Balls)})`;
          if (el.cardInn1StatusPill) {
            el.cardInn1StatusPill.textContent = inn1Active ? '🏏 BATTING' : '✓ DONE';
            el.cardInn1StatusPill.className = inn1Active
              ? 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300'
              : 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300';
          }

          el.cardInn2Team.textContent = inn2TeamLabel;
          if (STATE.currentInnings === 2 || (STATE.phase === 'GAME_OVER' && STATE.target !== null)) {
            const inn2Out = STATE.phase === 'GAME_OVER' && inn2Runs < STATE.target;
            const needMore = Math.max(0, (STATE.target || 0) - inn2Runs);
            el.cardInn2Score.textContent = `${inn2Runs}/${inn2Out ? '1' : '0'} (${inn2Balls}b • ${STATE.phase === 'GAME_OVER' ? 'T:' + STATE.target : 'Need ' + needMore})`;
            if (el.cardInn2StatusPill) {
              const inn2StatusText = STATE.phase === 'GAME_OVER'
                ? (STATE.winner === 'DRAW' ? '🤝 DRAW' : (inn2Runs >= STATE.target ? '🏆 CHASED' : 'OUT'))
                : (inn2Active ? `🎯 T:${STATE.target}` : (STATE.phase === 'INNINGS_BREAK' ? `🎯 T:${STATE.target}` : 'WAIT'));
              el.cardInn2StatusPill.textContent = inn2StatusText;
              el.cardInn2StatusPill.className = STATE.winner === 'DRAW'
                ? 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : (inn2Active
                    ? 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300'
                    : 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300');
            }
          } else {
            el.cardInn2Score.textContent = STATE.target ? `Target: ${STATE.target} Runs` : `Proj. Target: ${inn1Runs + 1}`;
            if (el.cardInn2StatusPill) {
              el.cardInn2StatusPill.textContent = STATE.phase === 'INNINGS_BREAK' ? `🎯 T:${STATE.target}` : 'BOWLING';
              el.cardInn2StatusPill.className = 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300';
            }
          }

          if (el.scorecardLiveVerdictBar) {
            if (STATE.phase === 'GAME_OVER') {
              if (STATE.winner === 'DRAW') {
                el.scorecardLiveVerdictBar.textContent = `🤝 Match #${activeMatchNum} Final: Match Drawn! (${inn1TeamLabel.split(' ')[0]} ${inn1Runs} vs ${inn2TeamLabel.split(' ')[0]} ${inn2Runs})`;
              } else {
                const winName = STATE.winner === 'USER' ? p1Name : p2Name;
                el.scorecardLiveVerdictBar.textContent = `🏆 Match #${activeMatchNum} Final: ${winName} Won! (${inn1TeamLabel.split(' ')[0]} ${inn1Runs} vs ${inn2TeamLabel.split(' ')[0]} ${inn2Runs})`;
              }
            } else if (STATE.phase === 'INNINGS_BREAK') {
              el.scorecardLiveVerdictBar.textContent = `Innings Break: ${inn2TeamLabel} needs ${STATE.target} runs to win!`;
            } else if (STATE.currentInnings === 2) {
              const rem = Math.max(0, STATE.target - inn2Runs);
              el.scorecardLiveVerdictBar.textContent = `Live Chase: ${inn2TeamLabel} needs ${rem} more run${rem === 1 ? '' : 's'} (Target ${STATE.target})`;
            } else {
              el.scorecardLiveVerdictBar.textContent = `1st Innings Live: ${inn1TeamLabel} is setting the target (${inn1Runs} runs off ${inn1Balls} balls)`;
            }
          }
        }

        // Render Match-by-Match Scorecard History List inside Right Sidebar
        if (el.scorecardHistoryCount) {
          el.scorecardHistoryCount.textContent = `${STATE.matchScorecards.length} Match${STATE.matchScorecards.length === 1 ? '' : 'es'}`;
        }
        if (el.scorecardMatchHistoryList) {
          if (STATE.matchScorecards.length === 0) {
            el.scorecardMatchHistoryList.innerHTML = `<div class="text-slate-400 text-center py-1.5 text-[11px]">Complete a match to log its full innings scorecard here.</div>`;
          } else {
            el.scorecardMatchHistoryList.innerHTML = STATE.matchScorecards.slice(0, 12).map((mc) => {
              const isMcDraw = mc.isDraw || mc.winnerName === 'Match Drawn';
              const badgeLabel = isMcDraw ? 'DRAW' : (mc.didIWin ? 'WIN' : 'LOSS');
              const badgeCls = isMcDraw
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : (mc.didIWin ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30');
              const titleText = isMcDraw
                ? `<span class="text-amber-300 font-mono-num">#${mc.matchNumber}</span><span> • 🤝 Match Drawn</span>`
                : `<span class="text-amber-300 font-mono-num">#${mc.matchNumber}</span><span> • 🏆 ${mc.winnerName}</span>`;
              return `
              <div class="p-2 rounded-lg bg-[#22201d] border border-[#3d3a36] flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-extrabold text-white truncate">
                    ${titleText}
                  </div>
                  <div class="text-[10px] text-slate-300 font-mono-num truncate">
                    1st: ${mc.inn1Team} ${mc.inn1Summary} | 2nd: ${mc.inn2Team} ${mc.inn2Summary}
                  </div>
                </div>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono-num font-black shrink-0 ${badgeCls}">
                  ${badgeLabel}
                </span>
              </div>
            `;
            }).join('');
          }
        }

        el.statMatches.textContent = Math.max(STATE.sessionStats.matches, myRec.matches || 0);
        el.statUserWins.textContent = Math.max(STATE.sessionStats.userWins, myRec.wins || 0);
        el.statAiWins.textContent = Math.max(STATE.sessionStats.aiWins, myRec.losses || 0);

        // 8. Ball-by-Ball Log Feed
        el.logCountBadge.textContent = `${STATE.history.length} event${STATE.history.length === 1 ? '' : 's'}`;
        if (STATE.history.length === 0) {
          el.ballLogContainer.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4">
              <span class="text-2xl mb-1">🏟️</span>
              <p>Every toss & delivery will be logged here in real time.</p>
            </div>
          `;
        } else {
          const colorMap = {
            emerald: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
            cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
            amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
            rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
            slate: 'bg-slate-800 text-slate-300 border-slate-700'
          };
          el.ballLogContainer.innerHTML = STATE.history
            .slice(0, 40)
            .map((item) => {
              const bCls = colorMap[item.badgeColor] || colorMap.slate;
              const commHtml = item.commentary
                ? `<div class="text-[11px] text-amber-200/90 italic mt-1 leading-snug border-l-2 border-amber-400/50 pl-2">${item.commentary}</div>`
                : '';
              return `
                <div class="p-2.5 rounded-xl bg-slate-900/85 border border-slate-800/90 space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-mono-num uppercase text-slate-400">${item.tag}</span>
                        <span class="font-bold text-slate-100 truncate">${item.title}</span>
                      </div>
                      <div class="text-[11px] text-slate-400 truncate mt-0.5">${item.detail}</div>
                    </div>
                    <span class="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-mono-num font-extrabold border ${bCls}">
                      ${item.badge}
                    </span>
                  </div>
                  ${commHtml}
                </div>
              `;
            })
            .join('');
        }
      }

      // ==========================================
      // 8. CANVAS STADIUM & HAND GESTURE RENDERER
      // ==========================================
      let rafId = null;

      function resizeCanvas() {
        const canvas = el.arenaCanvas;
        if (!canvas) return;
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(300, Math.floor(rect.width * dpr));
        canvas.height = Math.max(180, Math.floor(rect.height * dpr));
        drawArenaFrame();
      }

      function drawRoundedRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }

      // Draw visual finger/dot pattern for numbers 1..10 inside each hand card
      function drawFingerPips(ctx, cx, cy, num, color) {
        if (!num) return;
        const cols = num <= 5 ? num : 5;
        const rows = num <= 5 ? 1 : 2;
        const spacingX = 12;
        const spacingY = 12;
        const startX = cx - ((cols - 1) * spacingX) / 2;
        const startY = cy - ((rows - 1) * spacingY) / 2;

        ctx.fillStyle = color;
        for (let i = 0; i < num; i++) {
          const r = Math.floor(i / 5);
          const c = i % 5;
          const px = startX + c * spacingX;
          const py = startY + r * spacingY;
          ctx.beginPath();
          ctx.arc(px, py, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function drawArenaFrame() {
        const canvas = el.arenaCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        ctx.save();
        ctx.scale(dpr, dpr);

        // 1. Dynamic Pitch Themes (Default, Lords Royal Pavilion, Cyberpunk Neon)
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        let equippedTheme = '';
        let equippedCard = 'card_default';
        try {
          if (cleanMe && !isPlaceholderUsername(cleanMe)) {
            equippedTheme = localStorage.getItem('oddandeven_equipped_theme_' + cleanMe) || '';
            equippedCard = localStorage.getItem('oddandeven_equipped_card_' + cleanMe) || 'card_default';
          }
        } catch(e) {}

        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        let turfStroke = 'rgba(16, 185, 129, 0.12)';
        let pitchFill = 'rgba(217, 183, 122, 0.10)';

        if (equippedTheme === 'theme_lords_pavilion') {
          bgGrad.addColorStop(0, '#061a0d');
          bgGrad.addColorStop(0.62, '#0a2313');
          bgGrad.addColorStop(1, '#0d3319');
          turfStroke = 'rgba(245, 184, 61, 0.45)';
          pitchFill = 'rgba(245, 184, 61, 0.15)';
        } else if (equippedTheme === 'theme_cyberpunk_neon') {
          bgGrad.addColorStop(0, '#05111a');
          bgGrad.addColorStop(0.62, '#0c0f20');
          bgGrad.addColorStop(1, '#160824');
          turfStroke = 'rgba(56, 189, 248, 0.65)';
          pitchFill = 'rgba(217, 70, 239, 0.18)';
        } else {
          bgGrad.addColorStop(0, '#06101e');
          bgGrad.addColorStop(0.62, '#0b1e33');
          bgGrad.addColorStop(1, '#092e26');
          turfStroke = 'rgba(16, 185, 129, 0.12)';
          pitchFill = 'rgba(217, 183, 122, 0.10)';
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Turf perspective ellipses
        ctx.strokeStyle = turfStroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.88, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (equippedTheme === 'theme_cyberpunk_neon') {
          ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(w / 2, h * 0.88, w * 0.3, h * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Center pitch strip
        const pitchW = Math.min(180, w * 0.3);
        const pitchH = h * 0.36;
        ctx.fillStyle = pitchFill;
        drawRoundedRect(ctx, w / 2 - pitchW / 2, h * 0.56, pitchW, pitchH, 8);
        ctx.fill();

        // Flash overlay on turn outcome
        if (STATE.anim.flashAlpha > 0.01) {
          ctx.fillStyle = STATE.anim.flashColor;
          ctx.globalAlpha = STATE.anim.flashAlpha;
          ctx.fillRect(0, 0, w, h);
          ctx.globalAlpha = 1;
          STATE.anim.flashAlpha *= 0.9;
        }

        // Smooth pop-in progress
        if (STATE.anim.revealProgress < 1) {
          STATE.anim.revealProgress = Math.min(1, STATE.anim.revealProgress + 0.08);
        }
        const scalePop = 0.85 + 0.15 * Math.sin(STATE.anim.revealProgress * (Math.PI / 2));

        // 2. Left Card (USER HAND) & Right Card (AI HAND)
        const cardW = Math.min(132, w * 0.27);
        const cardH = Math.min(126, h * 0.56);
        const leftX = Math.max(16, w * 0.18 - cardW / 2);
        const rightX = Math.min(w - cardW - 16, w * 0.82 - cardW / 2);
        const cardY = h * 0.54 - cardH / 2;

        const isMatchedOut =
          STATE.lastUserNum !== null &&
          STATE.lastUserNum === STATE.lastAiNum &&
          (STATE.phase === 'INNINGS_BREAK' || STATE.phase === 'GAME_OVER');

        // Draw User Hand Pod
        ctx.save();
        ctx.translate(leftX + cardW / 2, cardY + cardH / 2);
        ctx.scale(scalePop, scalePop);
        ctx.translate(-(leftX + cardW / 2), -(cardY + cardH / 2));

        let p1CardFill = 'rgba(16, 185, 129, 0.13)';
        let p1CardStroke = 'rgba(16, 185, 129, 0.55)';
        let p1Crown = '';
        if (isMatchedOut) {
          p1CardFill = 'rgba(244, 63, 94, 0.18)';
          p1CardStroke = 'rgba(244, 63, 94, 0.7)';
        } else if (equippedCard === 'card_custom_divine') {
          p1CardFill = 'rgba(255, 209, 102, 0.22)';
          p1CardStroke = '#ffd166';
          p1Crown = '🔱';
        } else if (equippedCard === 'card_cosmic_celestial') {
          p1CardFill = 'rgba(192, 132, 252, 0.22)';
          p1CardStroke = '#c084fc';
          p1Crown = '🌌';
        } else if (equippedCard === 'card_mythic_immortal') {
          p1CardFill = 'rgba(255, 77, 109, 0.22)';
          p1CardStroke = '#ff4d6d';
          p1Crown = '👑';
        } else if (equippedCard === 'card_diamond_vanguard') {
          p1CardFill = 'rgba(56, 189, 248, 0.22)';
          p1CardStroke = '#38bdf8';
          p1Crown = '💎';
        } else if (equippedCard === 'card_gold_elite') {
          p1CardFill = 'rgba(245, 184, 61, 0.22)';
          p1CardStroke = '#f5b83d';
          p1Crown = '🏆';
        }

        ctx.fillStyle = p1CardFill;
        ctx.strokeStyle = p1CardStroke;
        ctx.lineWidth = p1Crown ? 2.5 : 2;
        drawRoundedRect(ctx, leftX, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = p1Crown ? '#ffd166' : '#94a3b8';
        ctx.font = '700 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        const p1CardLabel = (p1Crown ? `${p1Crown} ` : '') + (isMultiplayer() ? getP1Label().toUpperCase() + ' HAND' : 'YOUR HAND');
        ctx.fillText(p1CardLabel, leftX + cardW / 2, cardY + 20);

        ctx.fillStyle = '#ecfdf5';
        ctx.font = '900 40px "JetBrains Mono", monospace';
        const leftDisplayVal = STATE.pendingP1Num !== null ? '🔒' : (STATE.lastUserNum !== null ? String(STATE.lastUserNum) : '?');
        ctx.fillText(
          leftDisplayVal,
          leftX + cardW / 2,
          cardY + cardH * 0.62
        );

        drawFingerPips(
          ctx,
          leftX + cardW / 2,
          cardY + cardH - 18,
          STATE.lastUserNum,
          isMatchedOut ? '#fda4af' : '#34d399'
        );
        ctx.restore();

        // Draw AI Hand Pod
        ctx.save();
        ctx.translate(rightX + cardW / 2, cardY + cardH / 2);
        ctx.scale(scalePop, scalePop);
        ctx.translate(-(rightX + cardW / 2), -(cardY + cardH / 2));

        ctx.fillStyle = isMatchedOut ? 'rgba(244, 63, 94, 0.18)' : 'rgba(56, 189, 248, 0.13)';
        ctx.strokeStyle = isMatchedOut ? 'rgba(244, 63, 94, 0.7)' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, rightX, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isMultiplayer() ? getP2Label().toUpperCase() + ' HAND' : 'AI HAND', rightX + cardW / 2, cardY + 20);

        ctx.fillStyle = '#f0f9ff';
        ctx.font = '900 40px "JetBrains Mono", monospace';
        const rightDisplayVal = STATE.pendingP2Num !== null ? '🔒' : (STATE.lastAiNum !== null ? String(STATE.lastAiNum) : '?');
        ctx.fillText(
          rightDisplayVal,
          rightX + cardW / 2,
          cardY + cardH * 0.62
        );

        drawFingerPips(
          ctx,
          rightX + cardW / 2,
          cardY + cardH - 18,
          STATE.lastAiNum,
          isMatchedOut ? '#fda4af' : '#38bdf8'
        );
        ctx.restore();

        // 3. Center Callout & VS Emblem
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.font = `900 ${w < 460 ? 18 : 24}px Inter, sans-serif`;
        ctx.fillText(STATE.anim.calloutText, w / 2, h * 0.52);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `600 ${w < 460 ? 11 : 13}px Inter, sans-serif`;
        ctx.fillText(STATE.anim.calloutSub, w / 2, h * 0.52 + 22);

        // 4. Update & Draw Celebration / Wicket Particles
        for (let i = STATE.anim.particles.length - 1; i >= 0; i--) {
          const p = STATE.anim.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.12; // gravity
          p.alpha -= 0.022;
          if (p.alpha <= 0) {
            STATE.anim.particles.splice(i, 1);
            continue;
          }
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }

      function startAnimationLoop() {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        function tick() {
          drawArenaFrame();
          rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);
      }

      // ==========================================
      // 9. EVENT LISTENERS & KEYBOARD SHORTCUTS
      // ==========================================
      
      // ==========================================
      // CONNECTED EVENTS (events.html) & ACHIEVEMENTS ENGINE
      // ==========================================
      const EVENT_REG_KEY = 'oddandeven_event_regs_v1';
      const EVENT_REG_MAP_KEY = 'oddandeven_event_regs_map_v1';
      const HC_EVENTS = [
        {
          id: 'solo',
          name: 'Who will be the first ever Odd and Even champion on 7 nov',
          start: '2026-11-07T19:00:00+05:30',
          closes: '2026-11-05T23:59:00+05:30',
          ctaDefault: 'Register for tournament',
          joinedMsg: "Registered for tournament! Bracket spot saved. Warm up in the Arena."
        }
      ];

      function loadEventRegistrations() {
        try {
          const uname = (STATE.myUsername || '').trim().toUpperCase();
          if (uname && !isPlaceholderUsername(uname)) {
            const rawMap = localStorage.getItem(EVENT_REG_MAP_KEY);
            const map = rawMap ? JSON.parse(rawMap) : {};
            if (Array.isArray(map[uname])) return map[uname];
          }
          const raw = localStorage.getItem(EVENT_REG_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      }

      function saveEventRegistrations(list) {
        const cleanList = Array.isArray(list) ? Array.from(new Set(list)) : [];
        try {
          localStorage.setItem(EVENT_REG_KEY, JSON.stringify(cleanList));
          const uname = (STATE.myUsername || '').trim().toUpperCase();
          if (uname && !isPlaceholderUsername(uname)) {
            const rawMap = localStorage.getItem(EVENT_REG_MAP_KEY);
            const map = rawMap ? JSON.parse(rawMap) : {};
            map[uname] = cleanList;
            localStorage.setItem(EVENT_REG_MAP_KEY, JSON.stringify(map));
          }
        } catch (e) {}
      }

      let _eventsToastTimer = null;
      function showEventsInlineToast(message) {
        if (!el.eventsInlineToast || !el.eventsInlineToastText) return;
        el.eventsInlineToastText.textContent = message;
        el.eventsInlineToast.classList.remove('hidden');
        if (_eventsToastTimer) clearTimeout(_eventsToastTimer);
        _eventsToastTimer = setTimeout(() => {
          if (el.eventsInlineToast) el.eventsInlineToast.classList.add('hidden');
        }, 4200);
      }

      function toggleEventRegistration(eventId) {
        const ev = HC_EVENTS.find((e) => e.id === eventId);
        if (!ev) return;
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const now = Date.now();
        const closesMs = new Date(ev.closes).getTime();
        let regs = loadEventRegistrations();
        if (regs.includes(eventId)) {
          if (now >= closesMs) return;
          regs = regs.filter((x) => x !== eventId);
          showEventsInlineToast(`Registration withdrawn for ${ev.name}.`);
        } else {
          if (now >= closesMs) return;
          regs.push(eventId);
          SoundFX.runScored(6);
          showEventsInlineToast(`✓ ${ev.joinedMsg}`);
        }
        saveEventRegistrations(regs);
        renderEventsTabAndCountdowns();
        renderAchievementsSection();
      }

      function renderEventsTabAndCountdowns() {
        const now = Date.now();
        const regs = loadEventRegistrations();
        const pad2 = (n) => String(n).padStart(2, '0');
        const uRec = ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};

        if (el.sideNavEventsSub) {
          el.sideNavEventsSub.textContent = regs.length > 0 ? `${regs.length}/1 Registered` : 'Season 1 · events.html';
        }
        if (el.sideNavEventsCountBadge) {
          el.sideNavEventsCountBadge.textContent = `${regs.length}/1`;
        }
        if (el.eventsRegSummaryBadge) {
          el.eventsRegSummaryBadge.textContent = `${regs.length}/1 Registered`;
          el.eventsRegSummaryBadge.className = regs.length > 0
            ? 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#81b64c]/25 text-[#a3d96c] border border-[#81b64c]/50'
            : 'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700';
        }
        if (el.eventsUserFlag) el.eventsUserFlag.textContent = STATE.myCountryFlag || '🇮🇳';
        if (el.eventsUserHeadline) el.eventsUserHeadline.textContent = `Registered Contender: ${STATE.myUsername} (${STATE.myCountryCode || '+91'})`;
        if (el.eventsUserStatsLine) {
          el.eventsUserStatsLine.textContent = `Connected Stats: ${uRec.totalRuns || 0} Runs • ${uRec.wicketsTaken || 0} Wickets • ${uRec.elo || 1500} Elo`;
        }

        HC_EVENTS.forEach((ev) => {
          const startMs = new Date(ev.start).getTime();
          const closesMs = new Date(ev.closes).getTime();
          const leftMs = Math.max(0, startMs - now);
          const totalSec = Math.floor(leftMs / 1000);
          const dStr = pad2(Math.floor(totalSec / 86400));
          const hStr = pad2(Math.floor((totalSec % 86400) / 3600));
          const mStr = pad2(Math.floor((totalSec % 3600) / 60));
          const sStr = pad2(totalSec % 60);

          const dEl = el.hcSoloD;
          const hEl = el.hcSoloH;
          const mEl = el.hcSoloM;
          const sEl = el.hcSoloS;
          const stateEl = el.hcEvStateSolo;
          const relEl = el.hcCalRelSolo;
          const btnEl = el.btnJoinEventSolo;

          if (dEl) dEl.textContent = dStr;
          if (hEl) hEl.textContent = hStr;
          if (mEl) mEl.textContent = mStr;
          if (sEl) sEl.textContent = sStr;

          let label = 'Registration open';
          let cls = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
          if (now >= startMs) {
            label = 'Started';
            cls = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
          } else if (now >= closesMs) {
            label = 'Registration closed';
            cls = 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
          }
          if (stateEl) {
            stateEl.textContent = label;
            stateEl.className = `px-2 py-0.5 rounded text-[10px] font-mono-num font-bold border ${cls}`;
          }

          if (relEl) {
            const daysLeft = Math.ceil(leftMs / 86400000);
            relEl.textContent = now >= startMs ? 'started' : (daysLeft <= 1 ? 'today/tomorrow' : `in ${daysLeft} days`);
          }

          if (btnEl) {
            const joined = regs.includes(ev.id);
            const open = now < closesMs;
            btnEl.disabled = !open && !joined;
            if (joined) {
              btnEl.textContent = open ? "You're registered ✓ (click to withdraw)" : "You're registered ✓";
              btnEl.className = 'w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-transparent text-[#0d0c12] border-2 border-[#0d0c12] transition';
            } else {
              btnEl.textContent = open ? ev.ctaDefault : label;
              btnEl.className = 'w-full py-2.5 px-4 rounded-xl font-extrabold text-xs bg-[#0d0c12] hover:bg-[#1a1824] text-white transition shadow disabled:opacity-50';
            }
          }
        });
      }

      function recordPlayerActiveDay(username) {
        try {
          const clean = String(username || (typeof STATE !== 'undefined' && STATE.myUsername) || '').trim().toUpperCase();
          if (!clean || isPlaceholderUsername(clean)) return 1;
          const storageKey = 'oddandeven_active_days_' + clean;
          const todayStr = new Date().toISOString().slice(0, 10);
          let days = [];
          const raw = localStorage.getItem(storageKey);
          if (raw) days = JSON.parse(raw);
          if (!Array.isArray(days)) days = [];
          if (!days.includes(todayStr)) {
            days.push(todayStr);
            localStorage.setItem(storageKey, JSON.stringify(days));
          }
          return Math.max(1, days.length);
        } catch (e) {
          return 1;
        }
      }

      function getActiveDaysCount(username, rec) { return getPlayerActiveDaysCount(username, rec); }
      function getPlayerActiveDaysCount(username, rec) {
        try {
          const clean = String(username || (rec && rec.name) || (typeof STATE !== 'undefined' && STATE.myUsername) || '').trim().toUpperCase();
          let localCount = 1;
          if (clean && !isPlaceholderUsername(clean)) {
            const raw = localStorage.getItem('oddandeven_active_days_' + clean);
            if (raw) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr)) localCount = Math.max(localCount, arr.length);
            }
          }
          if (rec && typeof rec.activeDays === 'number') {
            localCount = Math.max(localCount, rec.activeDays);
          }
          return Math.max(1, localCount);
        } catch (e) {
          return 1;
        }
      }

      function recordTournamentWin(username) {
        try {
          const clean = String(username || (typeof STATE !== 'undefined' && STATE.myUsername) || '').trim().toUpperCase();
          if (!clean || isPlaceholderUsername(clean)) return;
          const storageKey = 'oddandeven_tourney_wins_' + clean;
          const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
          localStorage.setItem(storageKey, String(current + 1));
          const rec = ensureHumanPlayerRecord(clean);
          if (rec) rec.tournamentWins = (rec.tournamentWins || 0) + 1;
        } catch (e) {}
      }
      try { window.recordTournamentWin = recordTournamentWin; } catch (e) {}

      function computePlayerAchievements(myRec) {
        const rec = myRec || {};
        const totalMatches = Math.max(rec.matches || 0, (rec.wins || 0) + (rec.losses || 0));
        const totalWins = rec.wins || 0;
        const totalRuns = Math.max(rec.totalRuns || 0, STATE.userScore || 0);
        const highScore = Math.max(rec.highScore || 0, STATE.userScore || 0);
        const totalWickets = Math.max(rec.wicketsTaken || 0, STATE.userMatchWickets || 0);
        const peakElo = Math.max(rec.peak || 1500, rec.elo || 1500, STATE.peakElo || 1500);
        const friendsCount = (typeof getMyFriendsList === 'function' ? getMyFriendsList() : []).length;
        const regsCount = (typeof loadEventRegistrations === 'function' ? loadEventRegistrations() : []).length;

        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();

        // 1. Active calendar days (only counts once player has started playing matches/runs/wickets in this epoch)
        const hasActivityInEpoch = totalMatches > 0 || totalRuns > 0 || totalWickets > 0;
        if (hasActivityInEpoch) recordPlayerActiveDay(cleanMe);
        const activeDaysCount = hasActivityInEpoch ? getPlayerActiveDaysCount(cleanMe, rec) : 0;

        // 2. Tournament wins
        let tourneyWins = rec.tournamentWins || 0;
        try {
          const localTourneyWins = parseInt(localStorage.getItem('oddandeven_tourney_wins_' + cleanMe) || '0', 10);
          tourneyWins = Math.max(tourneyWins, localTourneyWins);
        } catch (e) {}

        // 3. Derive fallback 100+ score count & 500+ SR count from matchScorecards + career record
        let scCenturies = 0;
        let scSr500 = 0;
        if (Array.isArray(STATE.matchScorecards)) {
          STATE.matchScorecards.forEach((sc) => {
            if (!sc) return;
            const checkInnings = (teamName, summaryStr) => {
              if (!teamName || !summaryStr) return;
              if (String(teamName).trim().toUpperCase() !== cleanMe) return;
              const m = String(summaryStr).match(/^(\d+)\/\d+\s*\((\d+)b\)/);
              if (m) {
                const r = parseInt(m[1], 10) || 0;
                const b = parseInt(m[2], 10) || 0;
                if (r >= 100) scCenturies += 1;
                if (b > 0 && r > 0 && ((r / b) * 100) >= 500) scSr500 += 1;
              }
            };
            checkInnings(sc.inn1Team, sc.inn1Summary);
            checkInnings(sc.inn2Team, sc.inn2Summary);
          });
        }
        const liveCenturies = (STATE.phase !== 'GAME_OVER' && (STATE.userScore || 0) >= 100) ? 1 : 0;
        const centuriesCount = Math.max(
          rec.centuriesCount || 0,
          scCenturies + liveCenturies,
          highScore >= 100 ? 1 : 0
        );
        const sr500Count = Math.max(
          rec.sr500Count || 0,
          scSr500
        );

        // 4. Consecutive win streak
        let derivedStreak = Math.max(rec.maxWinStreak || 0, rec.currentWinStreak || 0);
        if (Array.isArray(STATE.eloHistory) && STATE.eloHistory.length > 0) {
          let curS = 0;
          let maxS = 0;
          for (const h of STATE.eloHistory) {
            if (h && (h.result === 'WIN' || String(h.delta || '').startsWith('+'))) {
              curS += 1;
              if (curS > maxS) maxS = curS;
            } else if (h && h.result !== 'FORFEIT' && h.delta !== 'FROZEN') {
              curS = 0;
            }
          }
          derivedStreak = Math.max(derivedStreak, maxS);
        }
        if (totalWins >= 10) derivedStreak = Math.max(derivedStreak, 10);
        else if (totalWins > 0) derivedStreak = Math.max(derivedStreak, Math.min(totalWins, 5));

        // 5. Boundaries in a single match (4s, 6s, 10s)
        let maxBoundariesInMatch = rec.maxBoundariesInMatch || 0;
        if (Array.isArray(STATE.userNumHistory)) {
          const liveBoundaries = STATE.userNumHistory.filter((n) => n === 4 || n === 6 || n === 10).length;
          maxBoundariesInMatch = Math.max(maxBoundariesInMatch, liveBoundaries);
        }
        if (highScore >= 50) maxBoundariesInMatch = Math.max(maxBoundariesInMatch, 5);
        else if (highScore >= 30) maxBoundariesInMatch = Math.max(maxBoundariesInMatch, 3);

        // 6. Target defended matches in innings 2
        let defendedMatches = rec.defendedMatches || 0;
        if (Array.isArray(STATE.eloHistory)) {
          const defCount = STATE.eloHistory.filter((h) => h && h.result === 'WIN' && (h.wicketsTaken || 0) >= 1).length;
          defendedMatches = Math.max(defendedMatches, defCount);
        }
        if (totalWickets >= 5 && totalWins >= 3) {
          defendedMatches = Math.max(defendedMatches, 1);
        }

        const baseList = [
          // --- EXISTING 10 CORE ACHIEVEMENTS ---
          {
            id: 'first_cap',
            category: 'RANKED',
            icon: '🧢',
            title: 'Debut Cap',
            desc: 'Complete your first official match in the Hand Cricket Arena.',
            current: totalMatches,
            target: 1,
            unit: 'Match',
            xp: 50
          },
          {
            id: 'boundary_spark',
            category: 'BATTING',
            icon: '🏏',
            title: 'Boundary Striker',
            desc: 'Accumulate 50+ career runs under your player username.',
            current: totalRuns,
            target: 50,
            unit: 'Runs',
            xp: 75
          },
          {
            id: 'half_century',
            category: 'BATTING',
            icon: '🔥',
            title: 'Half-Century Hero (50*)',
            desc: 'Smash 50 or more runs in a single innings.',
            current: highScore,
            target: 50,
            unit: 'High Score',
            xp: 125
          },
          {
            id: 'double_ton_club',
            category: 'BATTING',
            icon: '👑',
            title: '250 Career Runs Club',
            desc: 'Score 250+ cumulative runs across Multiplayer and Arena matches.',
            current: totalRuns,
            target: 250,
            unit: 'Runs',
            xp: 150
          },
          {
            id: 'first_scalp',
            category: 'BOWLING',
            icon: '🎯',
            title: 'Mind-Reader Wicket',
            desc: "Take your first wicket by matching the batter's exact hand.",
            current: totalWickets,
            target: 1,
            unit: 'Wicket',
            xp: 50
          },
          {
            id: 'five_wicket_haul',
            category: 'BOWLING',
            icon: '⚡',
            title: 'Golden Arm (5 Wickets)',
            desc: 'Claim 5 career wickets through tactical number prediction.',
            current: totalWickets,
            target: 5,
            unit: 'Wickets',
            xp: 100
          },
          {
            id: 'ten_wicket_master',
            category: 'BOWLING',
            icon: '🛡️',
            title: 'Grandmaster Bowler (15 Wkts)',
            desc: 'Dismiss 15 batters across your Hand Cricket career.',
            current: totalWickets,
            target: 15,
            unit: 'Wickets',
            xp: 150
          },
          {
            id: 'match_winner_5',
            category: 'RANKED',
            icon: '🏆',
            title: 'Arena Finisher (5 Wins)',
            desc: 'Win 5 matches in the Hand Cricket Arena.',
            current: totalWins,
            target: 5,
            unit: 'Wins',
            xp: 100
          },
          {
            id: 'elo_climber',
            category: 'RANKED',
            icon: '♟️',
            title: 'Ranked Contender (1524+ Elo)',
            desc: 'Climb to 1524+ Peak Elo in Ranked 1v1 Multiplayer Rooms.',
            current: Math.max(0, peakElo - 1500),
            target: 24,
            displayCurrent: `${peakElo} Elo`,
            displayTarget: '1524 Elo',
            unit: 'Elo',
            xp: 120
          },
          {
            id: 'tourney_contender',
            category: 'RANKED',
            icon: '🎟️',
            title: 'Tournament & Squad Ready',
            desc: 'Play at least 1 match and register for Season 1 Championship or add a Friend.',
            current: totalMatches > 0 ? (regsCount + friendsCount) : 0,
            target: 1,
            unit: 'Entry / Friend',
            xp: 80
          },
          // --- EXISTING 10 ELITE & GRANDMASTER ACHIEVEMENTS ---
          {
            id: 'century_blaster',
            category: 'BATTING',
            icon: '💯',
            title: 'Century Blaster (100* Club)',
            desc: 'Score 100 or more runs in a single explosive innings.',
            current: highScore,
            target: 100,
            unit: 'High Score',
            xp: 175
          },
          {
            id: 'centurion_5x',
            category: 'BATTING',
            icon: '🏅',
            title: '100+ Score 5 Times (5x Centurion)',
            desc: 'Smash a 100+ score in an innings 5 times across your career.',
            current: centuriesCount,
            target: 5,
            unit: '100+ Scores',
            xp: 250
          },
          {
            id: 'five_hundred_runs',
            category: 'BATTING',
            icon: '🚀',
            title: '500 Career Runs Titan',
            desc: 'Accumulate 500+ cumulative runs across intense Arena battles.',
            current: totalRuns,
            target: 500,
            unit: 'Runs',
            xp: 200
          },
          {
            id: 'thousand_runs_club',
            category: 'BATTING',
            icon: '🌟',
            title: '1000 Career Runs Legend',
            desc: 'Cross the iconic 1,000+ career runs milestone under your username.',
            current: totalRuns,
            target: 1000,
            unit: 'Runs',
            xp: 300
          },
          {
            id: 'strike_rate_500_5x',
            category: 'BATTING',
            icon: '💥',
            title: '500+ Strike Rate 5 Times',
            desc: 'Finish an innings with an explosive 500+ Strike Rate at least 5 times.',
            current: sr500Count,
            target: 5,
            unit: '500+ SR Innings',
            xp: 250
          },
          {
            id: 'mp_wickets_30',
            category: 'BOWLING',
            icon: '🎳',
            title: '30 Multiplayer Wickets Ace',
            desc: 'Claim 30 wickets by outsmarting batters in Multiplayer matches.',
            current: totalWickets,
            target: 30,
            unit: 'Wickets',
            xp: 225
          },
          {
            id: 'mp_wickets_50',
            category: 'BOWLING',
            icon: '💀',
            title: '50 Multiplayer Wickets Warlord',
            desc: 'Claim 50 wickets in Ranked Multiplayer matches.',
            current: totalWickets,
            target: 50,
            unit: 'Multiplayer Wkts',
            xp: 300
          },
          {
            id: 'match_winner_25',
            category: 'RANKED',
            icon: '🥇',
            title: '25 Arena Wins Champion',
            desc: 'Win 25 matches in the Hand Cricket Arena.',
            current: totalWins,
            target: 25,
            unit: 'Wins',
            xp: 250
          },
          {
            id: 'elo_1600_master',
            category: 'RANKED',
            icon: '💎',
            title: 'Crossed 1600 Elo (Diamond Tier)',
            desc: 'Reach 1600+ Peak Elo in Ranked 1v1 Multiplayer Rooms.',
            current: Math.max(0, peakElo - 1500),
            target: 100,
            displayCurrent: `${peakElo} Elo`,
            displayTarget: '1600 Elo',
            unit: 'Elo',
            xp: 225
          },
          {
            id: 'elo_1700_grandmaster',
            category: 'RANKED',
            icon: '👑',
            title: 'Crossed 1700 Elo (Grandmaster)',
            desc: 'Cross 1700+ Peak Elo in Ranked 1v1 Multiplayer Rooms.',
            current: Math.max(0, peakElo - 1500),
            target: 200,
            displayCurrent: `${peakElo} Elo`,
            displayTarget: '1700 Elo',
            unit: 'Elo',
            xp: 350
          },
          // --- 10 NEW ACHIEVEMENTS (TOTAL 30) ---
          {
            id: 'active_5_days',
            category: 'RANKED',
            icon: '📅',
            title: '5-Day Dedicated Arena Player',
            desc: 'Log in and play across 5 separate active days in the Hand Cricket Arena.',
            current: activeDaysCount,
            target: 5,
            unit: 'Days',
            xp: 150
          },
          {
            id: 'active_10_days',
            category: 'RANKED',
            icon: '🗓️',
            title: '10-Day Arena Loyalist',
            desc: 'Maintain competitive presence by playing across 10 active calendar days.',
            current: activeDaysCount,
            target: 10,
            unit: 'Days',
            xp: 250
          },
          {
            id: 'tourney_champion_1',
            category: 'RANKED',
            icon: '👑',
            title: 'Tournament Champion (1st Place)',
            desc: 'Win 1 official Double-Elimination Championship bracket or Tournament Final.',
            current: tourneyWins,
            target: 1,
            unit: 'Tourney Win',
            xp: 400
          },
          {
            id: 'elo_1800_legend',
            category: 'RANKED',
            icon: '🔱',
            title: 'Crossed 1800 Elo (Apex Legend)',
            desc: 'Ascend to 1800+ Peak Elo in Ranked 1v1 Multiplayer Rooms.',
            current: Math.max(0, peakElo - 1500),
            target: 300,
            displayCurrent: `${peakElo} Elo`,
            displayTarget: '1800 Elo',
            unit: 'Elo',
            xp: 400
          },
          {
            id: 'boundary_blitz_5',
            category: 'BATTING',
            icon: '💥',
            title: 'Boundary Blitz (5 in a Match)',
            desc: 'Hit 5 boundaries (4s, 6s, or 10s) in a single high-intensity match innings.',
            current: maxBoundariesInMatch,
            target: 5,
            unit: 'Boundaries',
            xp: 200
          },
          {
            id: 'clutch_defender',
            category: 'BOWLING',
            icon: '🛡️',
            title: 'Clutch Target Defender',
            desc: 'Successfully defend a target score in Innings 2 by bowling out the opponent.',
            current: defendedMatches,
            target: 1,
            unit: 'Target Defended',
            xp: 250
          },
          {
            id: 'win_streak_10',
            category: 'RANKED',
            icon: '🔥',
            title: 'Unstoppable 10-Win Streak',
            desc: 'String together 10 consecutive match victories without a defeat.',
            current: derivedStreak,
            target: 10,
            unit: 'Consecutive Wins',
            xp: 300
          },
          {
            id: 'arena_veteran_50',
            category: 'RANKED',
            icon: '🎖️',
            title: 'Arena Veteran (50 Matches)',
            desc: 'Complete 50 competitive matches across Ranked Multiplayer and Arena play.',
            current: totalMatches,
            target: 50,
            unit: 'Matches',
            xp: 350
          }
        ];

        // XP Milestones (3000 XP & 5000 XP)
        const earnedBaseXp = baseList.filter((a) => a.current >= a.target).reduce((sum, a) => sum + a.xp, 0);
        const careerMatchXp = totalMatches * 20 + totalWins * 40 + Math.floor(totalRuns * 1.5) + totalWickets * 30 + (centuriesCount * 100);
        const totalPlayerXp = Math.max(rec.xp || 0, careerMatchXp + earnedBaseXp);

        const ach3000 = {
          id: 'xp_hunter_3000',
          category: 'RANKED',
          icon: '⚡',
          title: 'Crossed 3000 XP (XP Hunter)',
          desc: 'Reach 3,000+ Career XP through match triumphs and achievement mastery.',
          current: totalPlayerXp,
          target: 3000,
          displayCurrent: `${totalPlayerXp} XP`,
          displayTarget: '3000 XP',
          unit: 'XP',
          xp: 300
        };
        baseList.push(ach3000);

        const totalPlayerXpWith3000 = totalPlayerXp + (totalPlayerXp >= 3000 ? 300 : 0);
        const ach5000 = {
          id: 'xp_titan_5000',
          category: 'RANKED',
          icon: '🌌',
          title: 'Crossed 5000 XP (XP Titan)',
          desc: 'Attain the prestigious 5,000+ Career XP summit across all game modes.',
          current: totalPlayerXpWith3000,
          target: 5000,
          displayCurrent: `${totalPlayerXpWith3000} XP`,
          displayTarget: '5000 XP',
          unit: 'XP',
          xp: 500
        };
        baseList.push(ach5000);

        return baseList;
      }

      function renderAchievementsSection() {
        const myRec = ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};
        const list = computePlayerAchievements(myRec);
        const unlockedList = list.filter((a) => a.current >= a.target);
        const unlockedCount = unlockedList.length;
        const totalCount = list.length;
        const pct = Math.round((unlockedCount / totalCount) * 100);
        const earnedXp = unlockedList.reduce((sum, a) => sum + a.xp, 0);
        const totalXp = list.reduce((sum, a) => sum + a.xp, 0);

        if (el.sideNavAchievementsSub) {
          el.sideNavAchievementsSub.textContent = `${unlockedCount}/${totalCount} Unlocked`;
        }
        if (el.sideNavAchievementsXpPill) {
          el.sideNavAchievementsXpPill.textContent = `${earnedXp} XP`;
        }

        let rankTitle = 'Rookie Striker';
        if (unlockedCount >= 28) rankTitle = '🐐 Immortal Hand Cricket GOAT';
        else if (unlockedCount >= 22) rankTitle = '👑 Hall of Fame Legend';
        else if (unlockedCount >= 16) rankTitle = '💎 Diamond Grandmaster';
        else if (unlockedCount >= 10) rankTitle = '🔥 Grandmaster All-Rounder';
        else if (unlockedCount >= 5) rankTitle = '⚡ Rising Contender';
        else if (unlockedCount >= 1) rankTitle = '🏏 Cap Holder';

        if (el.achRankTierBadge) el.achRankTierBadge.textContent = rankTitle;
        if (el.achUserFlag) el.achUserFlag.textContent = STATE.myCountryFlag || '🇮🇳';
        if (el.achUserHeadline) el.achUserHeadline.textContent = `${STATE.myUsername} (${STATE.myCountryCode || '+91'})`;
        if (el.achUserSubStats) {
          el.achUserSubStats.textContent = `${myRec.totalRuns || 0} Runs • ${myRec.wicketsTaken || 0} Wkts • ${myRec.wins || 0} Wins • ${myRec.elo || 1500} Elo`;
        }
        if (el.achUnlockedSummaryText) {
          el.achUnlockedSummaryText.textContent = `${unlockedCount}/${totalCount} (${pct}%)`;
        }
        if (el.achTotalXpText) {
          el.achTotalXpText.textContent = `${earnedXp} / ${totalXp} XP`;
        }
        if (el.achOverallProgressBar) {
          el.achOverallProgressBar.style.width = `${pct}%`;
        }

        const filter = STATE.achievementFilter || 'ALL';
        const activeTabCls = 'py-2 px-3 rounded-lg bg-[#81b64c] text-white font-extrabold transition truncate';
        const idleTabCls = 'py-2 px-3 rounded-lg text-slate-300 hover:text-white transition truncate';
        if (el.btnAchFilterAll) {
          el.btnAchFilterAll.className = filter === 'ALL' ? activeTabCls : idleTabCls;
          el.btnAchFilterAll.textContent = `All (${totalCount})`;
        }
        if (el.btnAchFilterBatting) el.btnAchFilterBatting.className = filter === 'BATTING' ? activeTabCls : idleTabCls;
        if (el.btnAchFilterBowling) el.btnAchFilterBowling.className = filter === 'BOWLING' ? activeTabCls : idleTabCls;
        if (el.btnAchFilterRanked) el.btnAchFilterRanked.className = filter === 'RANKED' ? activeTabCls : idleTabCls;

        if (!el.achievementsGridList) return;
        const visibleItems = filter === 'ALL' ? list : list.filter((a) => a.category === filter);
        el.achievementsGridList.innerHTML = visibleItems.map((a) => {
          const isUnlocked = a.current >= a.target;
          const progPct = Math.max(0, Math.min(100, Math.round((Math.min(a.current, a.target) / a.target) * 100)));
          const progressLabel = a.displayCurrent
            ? `${a.displayCurrent} / ${a.displayTarget}`
            : `${Math.min(a.current, a.target)} / ${a.target} ${a.unit}`;

          return `
            <div class="p-3.5 rounded-2xl border transition-all space-y-2.5 ${
              isUnlocked
                ? 'bg-gradient-to-br from-[#81b64c]/20 via-[#22201d] to-[#191816] border-[#81b64c] shadow-lg'
                : 'bg-[#1b1a17] border-[#36332e] opacity-85'
            }">
              <div class="flex items-start justify-between gap-2.5">
                <div class="flex items-start gap-3 min-w-0">
                  <span class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xl border ${
                    isUnlocked
                      ? 'bg-[#81b64c]/25 border-[#a3d96c]/60 shadow-sm'
                      : 'bg-slate-900 border-slate-700 grayscale opacity-75'
                  }">${a.icon}</span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="text-sm font-black ${isUnlocked ? 'text-white' : 'text-slate-200'} truncate">${a.title}</h4>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                        isUnlocked ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-400/40' : 'bg-slate-800 text-slate-400'
                      }">+${a.xp} XP</span>
                    </div>
                    <p class="text-xs text-slate-400 leading-snug mt-0.5">${a.desc}</p>
                  </div>
                </div>
                <span class="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-mono-num font-extrabold uppercase ${
                  isUnlocked
                    ? 'bg-emerald-500/10 text-[#a3d96c] border border-[#81b64c]/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }">
                  ${isUnlocked ? '✓ Unlocked' : 'Locked'}
                </span>
              </div>
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[10px] font-mono-num">
                  <span class="${isUnlocked ? 'text-[#a3d96c] font-bold' : 'text-slate-400'}">${progressLabel}</span>
                  <span class="${isUnlocked ? 'text-yellow-300 font-extrabold' : 'text-slate-400'}">${progPct}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-[#12110f] overflow-hidden border border-[#2d2a25]">
                  <div class="h-full transition-all duration-300 ${
                    isUnlocked ? 'bg-gradient-to-r from-[#81b64c] to-yellow-300' : 'bg-amber-400/70'
                  }" style="width: ${progPct}%"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      const DESKTOP_STORE_CATALOG = [
        {
          id: 'card_gold_elite',
          category: 'CARDS',
          type: 'card',
          name: 'Elite Gold Player Card',
          tier: 'GOLD',
          rarity: 'Rare Prestige',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: '🏆',
          price: 5000,
          tagline: '24K Polished Gold Foil Card Frame',
          lore: 'The first major prestige milestone. Encased in polished metallic gold foil with an embossed cricket laurel.',
          perks: ['24K Gold Foil Profile Card', 'Golden Ribbon Cap on Pitch', 'VIP Gold Name in Rooms']
        },
        {
          id: 'vfx_thunder_wicket',
          category: 'COSMETICS',
          type: 'vfx',
          name: 'Thunderstrike Wicket VFX',
          tier: 'EPIC',
          rarity: 'Epic Cosmetic',
          badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          icon: '⚡',
          price: 7500,
          tagline: 'Crackling Electric Thunder SFX & VFX',
          lore: 'Strikes pure lightning bolts down across the stumps accompanied by a sonic thunder boom whenever you take a wicket.',
          perks: ['Electric Thunder Wicket Animation', 'Custom Deep Thunder Strike SFX', 'Opponent Stun Screen Flash']
        },
        {
          id: 'card_diamond_vanguard',
          category: 'CARDS',
          type: 'card',
          name: 'Diamond Vanguard Player Card',
          tier: 'DIAMOND',
          rarity: 'Legendary',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: '💎',
          price: 12000,
          tagline: 'Crystalline Diamond Cyan Borders',
          lore: 'Forged from pressurized crystalline diamond shards. Features cyan holographic refraction and the "Diamond Prodigy" title.',
          perks: ['Crystalline Diamond Prism Border', '"Diamond Prodigy" Unlocked Title', 'Diamond Crown Icon in Arena']
        },
        {
          id: 'theme_lords_pavilion',
          category: 'COSMETICS',
          type: 'theme',
          name: 'Lords Royal Pavilion Theme',
          tier: 'EPIC',
          rarity: 'Epic Pitch',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: '🏰',
          price: 16000,
          tagline: 'Historic English Royal Cricket Turf',
          lore: 'Replaces the default pitch with pristine English county turf green, mahogany trim, and brass royal accents.',
          perks: ['Royal English Turf Green Pitch', 'Mahogany Victorian Scorecard Frame', 'Golden Stump Highlights']
        },
        {
          id: 'ball_meteorite_fireball',
          category: 'COSMETICS',
          type: 'vfx',
          name: 'Meteorite Fireball Match Ball',
          tier: 'LEGENDARY',
          rarity: 'Legendary VFX',
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
          icon: '🔥',
          price: 20000,
          tagline: 'Blazing Magma Burst Wicket Explosion',
          lore: 'Ignites the pitch with an inferno fireball explosion and molten ember particles on every wicket.',
          perks: ['Inferno Fireball Stump Explosion', 'Custom Fireball Roar SFX', 'Molten Ember Particle Trail']
        },
        {
          id: 'card_mythic_immortal',
          category: 'CARDS',
          type: 'card',
          name: 'Mythic Immortal Player Card',
          tier: 'MYTHIC',
          rarity: 'Mythic Luxury',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: '👑',
          price: 30000,
          tagline: 'Obsidian Gold Encased in Pulsing Magma',
          lore: 'Reserved strictly for the hand cricket elite. Pulsing molten magma flames surround an obsidian core with an "IMMORTAL" badge.',
          perks: ['Pulsing Magma Flame Border', 'Gilded "IMMORTAL" Insignia', 'Crimson Wicket Flash Aura']
        },
        {
          id: 'theme_cyberpunk_neon',
          category: 'COSMETICS',
          type: 'theme',
          name: 'Cyberpunk Neon Pitch Theme',
          tier: 'LEGENDARY',
          rarity: 'Legendary Arena',
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
          icon: '🌆',
          price: 40000,
          tagline: 'Synthwave Glowing Grid Arena',
          lore: 'Transforms the pitch into an electric futuristic grid with neon magenta and cyan scanlines.',
          perks: ['Synthwave Neon Grid Turf', 'Holographic Cyan & Magenta Stumps', 'Futuristic Cyber Arena Lighting']
        },
        {
          id: 'card_cosmic_celestial',
          category: 'CARDS',
          type: 'card',
          name: 'Cosmic Celestial Player Card',
          tier: 'CELESTIAL',
          rarity: 'Celestial Divine',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: '🌌',
          price: 55000,
          tagline: 'Deep Space Nebula with Astral Dust',
          lore: 'Infused with the fabric of the cosmos. Shimmers with deep purple nebulae and bestows the "Celestial Master" title.',
          perks: ['Astral Nebula Card Texture', '"Celestial Master" Title', 'Pulsing Violet Void Aura']
        },
        {
          id: 'card_custom_divine',
          category: 'CUSTOM',
          type: 'card',
          name: 'The Divine Custom Player Card',
          tier: 'CUSTOM',
          rarity: 'Pinnacle Masterpiece',
          badgeClass: 'bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400 text-slate-950 font-black',
          icon: '🔱',
          price: 75000,
          tagline: 'Unlocks Complete Custom Card Studio',
          lore: 'The ultimate flex in OddAndEven.in history. Unlocks the Custom Card Studio allowing you to craft your own custom title, motto & verified star ⭐.',
          perks: ['Full Custom Card Studio Access', 'Custom Signature Title & Motto', 'Official Verified Star Badge ⭐']
        },
        {
          id: 'bat_solid_gold_willow',
          category: 'CUSTOM',
          type: 'bat',
          name: 'Solid Gold Willow Bat',
          tier: 'DIVINE',
          rarity: 'Pinnacle End-Game',
          badgeClass: 'bg-amber-400 text-slate-950 font-black',
          icon: '🏏',
          price: 100000,
          tagline: 'Pure 24K Handcrafted Gold Willow',
          lore: 'Handcrafted from pure solid 24K gold with divine radiance. Triggers golden star bursts and harmonic chimes on every boundary (4, 6, 10).',
          perks: ['Pure 24K Solid Gold Bat Icon', '"Cricket Deity" Verified Title', 'Golden Boundary Star Burst & Chime']
        }
      ];

      function computeDesktopStoreWallet(myRec) {
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        if (!cleanMe || isPlaceholderUsername(cleanMe)) {
          return { availableXp: 0, totalEarnedXp: 0, achXp: 0, matchXp: 0, spentXp: 0, unlockedAchCount: 0, totalAchCount: 30 };
        }
        const rec = myRec || ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};
        const achs = computePlayerAchievements(rec);
        const unlockedAch = achs.filter((a) => a.current >= a.target);
        const achXp = unlockedAch.reduce((s, a) => s + a.xp, 0);
        const totalMatches = Math.max(rec.matches || 0, (rec.wins || 0) + (rec.losses || 0));
        const totalWins = rec.wins || 0;
        const totalRuns = rec.totalRuns || 0;
        const totalWickets = rec.wicketsTaken || 0;
        let tourneyWins = rec.tournamentWins || 0;
        try {
          tourneyWins = Math.max(tourneyWins, parseInt(localStorage.getItem('oddandeven_tourney_wins_' + cleanMe) || '0', 10) || 0);
        } catch (e) {}
        const activeDays = typeof getPlayerActiveDaysCount === "function" ? getPlayerActiveDaysCount(cleanMe, rec) : 0;
        const matchXp = (totalRuns * 2) + (totalWickets * 25) + (totalWins * 50) + (totalMatches * 15) + (tourneyWins * 500);
        const totalEarnedXp = achXp + matchXp;
        let spentXp = 0;
        try {
          spentXp = parseInt(localStorage.getItem('oddandeven_spent_xp_' + cleanMe) || '0', 10) || 0;
        } catch (e) {}
        const availableXp = Math.max(0, totalEarnedXp - spentXp);
        return {
          availableXp,
          totalEarnedXp,
          achXp,
          matchXp,
          spentXp,
          unlockedAchCount: unlockedAch.length,
          totalAchCount: achs.length
        };
      }

      function broadcastDesktopStoreSync(cleanMe) {
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('oddandeven_store_sync');
            bc.postMessage({ type: 'STORE_INVENTORY_UPDATED', username: cleanMe, timestamp: Date.now() });
          }
          localStorage.setItem('oddandeven_store_bus', JSON.stringify({ type: 'SYNC', time: Date.now(), user: cleanMe }));
        } catch (e) {}
      }

      function handleDesktopEquipToggle(itemId, itemType, action) {
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        if (!cleanMe || isPlaceholderUsername(cleanMe)) return;
        SoundFX.click();
        try {
          if (action === 'equip') {
            if (itemType === 'card' || itemId.startsWith('card_')) {
              localStorage.setItem('oddandeven_equipped_card_' + cleanMe, itemId);
            } else if (itemType === 'theme' || itemId.startsWith('theme_')) {
              localStorage.setItem('oddandeven_equipped_theme_' + cleanMe, itemId);
            } else if (itemType === 'vfx' || itemId.startsWith('vfx_') || itemId.startsWith('ball_')) {
              localStorage.setItem('oddandeven_equipped_vfx_' + cleanMe, itemId);
            } else if (itemType === 'bat' || itemId.startsWith('bat_')) {
              localStorage.setItem('oddandeven_equipped_bat_' + cleanMe, itemId);
            }
          } else {
            if (itemType === 'card' || itemId.startsWith('card_')) {
              localStorage.setItem('oddandeven_equipped_card_' + cleanMe, 'card_default');
            } else if (itemType === 'theme' || itemId.startsWith('theme_')) {
              localStorage.removeItem('oddandeven_equipped_theme_' + cleanMe);
            } else if (itemType === 'vfx' || itemId.startsWith('vfx_') || itemId.startsWith('ball_')) {
              localStorage.removeItem('oddandeven_equipped_vfx_' + cleanMe);
            } else if (itemType === 'bat' || itemId.startsWith('bat_')) {
              localStorage.removeItem('oddandeven_equipped_bat_' + cleanMe);
            }
          }
        } catch (e) {}
        broadcastDesktopStoreSync(cleanMe);
        renderAll();
      }

      function handleDesktopStorePurchase(itemId) {
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        if (!cleanMe || isPlaceholderUsername(cleanMe)) {
          requireAccountAndPassword();
          return;
        }
        const item = DESKTOP_STORE_CATALOG.find((x) => x.id === itemId);
        if (!item) return;
        const myRec = ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};
        const wallet = computeDesktopStoreWallet(myRec);
        if (wallet.availableXp < item.price) {
          SoundFX.wicket();
          alert(`You need ${item.price.toLocaleString()} XP to unlock "${item.name}" (Available: ${wallet.availableXp.toLocaleString()} XP). Complete more achievements and matches!`);
          return;
        }
        let inv = [];
        try {
          const raw = localStorage.getItem('oddandeven_store_inventory_' + cleanMe);
          inv = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(inv)) inv = [];
        } catch (e) { inv = []; }
        if (!inv.includes(item.id)) {
          inv.push(item.id);
          try {
            localStorage.setItem('oddandeven_store_inventory_' + cleanMe, JSON.stringify(inv));
            localStorage.setItem('oddandeven_spent_xp_' + cleanMe, String(wallet.spentXp + item.price));
          } catch (e) {}
        }
        handleDesktopEquipToggle(item.id, item.type, 'equip');
        if (SoundFX.goldChime) SoundFX.goldChime();
      }

      function renderProfileSection() {
        const scrProfile = document.getElementById('screenProfile');
        if (!scrProfile) return;
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        const myRec = ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};
        const wallet = computeDesktopStoreWallet(myRec);

        let inv = [];
        let eqCard = 'card_default';
        let eqTheme = '';
        let eqVfx = '';
        let eqBat = '';
        let customCfg = { title: 'Divine Sovereign', motto: 'Every number counts on the pitch.' };
        try {
          if (cleanMe) {
            const rawInv = localStorage.getItem('oddandeven_store_inventory_' + cleanMe);
            inv = rawInv ? JSON.parse(rawInv) : [];
            if (!Array.isArray(inv)) inv = [];
            eqCard = localStorage.getItem('oddandeven_equipped_card_' + cleanMe) || 'card_default';
            eqTheme = localStorage.getItem('oddandeven_equipped_theme_' + cleanMe) || '';
            eqVfx = localStorage.getItem('oddandeven_equipped_vfx_' + cleanMe) || '';
            eqBat = localStorage.getItem('oddandeven_equipped_bat_' + cleanMe) || '';
            const rawCustom = localStorage.getItem('oddandeven_custom_card_' + cleanMe);
            if (rawCustom) {
              const parsed = JSON.parse(rawCustom);
              if (parsed && typeof parsed === 'object') customCfg = Object.assign(customCfg, parsed);
            }
          }
        } catch (e) {}

        // Hero Card styling
        const heroCard = document.getElementById('hcProfileHeroCard');
        const profFlag = document.getElementById('hcProfFlag');
        const profUser = document.getElementById('hcProfUsername');
        const profStar = document.getElementById('hcProfVerifiedStar');
        const profDial = document.getElementById('hcProfDialCode');
        const profTitle = document.getElementById('hcProfEquippedTitle');
        const profMotto = document.getElementById('hcProfEquippedMotto');
        const profTierBadge = document.getElementById('hcProfTierBadge');

        let cardBorder = 'border-[#3d3a34] bg-gradient-to-br from-[#211f1c] via-[#1a1816] to-[#121110]';
        let badgeHtml = '🏏 STANDARD CARD';
        let badgeCls = 'bg-slate-800 text-slate-300 border-slate-600';
        let titleText = 'Hand Cricket Contender';
        let mottoText = '"Every number counts on the pitch."';
        let showStar = false;

        if (eqCard === 'card_custom_divine' && inv.includes('card_custom_divine')) {
          cardBorder = 'border-amber-400 bg-gradient-to-br from-[#2d1b3d] via-[#1f1912] to-[#121110] shadow-[0_0_30px_rgba(245,184,61,0.22)]';
          badgeHtml = '🔱 DIVINE CUSTOM';
          badgeCls = 'bg-gradient-to-r from-amber-400 to-purple-400 text-slate-950 border-amber-300';
          titleText = customCfg.title || 'Divine Sovereign';
          mottoText = `"${customCfg.motto || 'Unstoppable on the pitch.'}"`;
          showStar = true;
        } else if (eqCard === 'card_cosmic_celestial' && inv.includes('card_cosmic_celestial')) {
          cardBorder = 'border-purple-400 bg-gradient-to-br from-[#230f2e] via-[#1a1224] to-[#121110] shadow-[0_0_25px_rgba(168,85,247,0.2)]';
          badgeHtml = '🌌 CELESTIAL';
          badgeCls = 'bg-purple-500/20 text-purple-300 border-purple-400/50';
          titleText = 'Celestial Grandmaster';
          mottoText = '"Infused with the fabric of the cosmos."';
          showStar = true;
        } else if (eqCard === 'card_mythic_immortal' && inv.includes('card_mythic_immortal')) {
          cardBorder = 'border-rose-500 bg-gradient-to-br from-[#2a0e14] via-[#1d1215] to-[#121110] shadow-[0_0_25px_rgba(244,63,94,0.2)]';
          badgeHtml = '👑 MYTHIC IMMORTAL';
          badgeCls = 'bg-rose-500/20 text-rose-300 border-rose-400/50';
          titleText = 'Immortal Legend';
          mottoText = '"Forged in molten stadium magma."';
          showStar = true;
        } else if (eqCard === 'card_diamond_vanguard' && inv.includes('card_diamond_vanguard')) {
          cardBorder = 'border-cyan-400 bg-gradient-to-br from-[#0e2329] via-[#141d22] to-[#121110] shadow-[0_0_25px_rgba(34,211,238,0.2)]';
          badgeHtml = '💎 DIAMOND VANGUARD';
          badgeCls = 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50';
          titleText = 'Diamond Prodigy';
          mottoText = '"Precision under high-pressure chases."';
        } else if (eqCard === 'card_gold_elite' && inv.includes('card_gold_elite')) {
          cardBorder = 'border-amber-400 bg-gradient-to-br from-[#2e2617] via-[#211d15] to-[#171614] shadow-[0_0_25px_rgba(245,158,11,0.2)]';
          badgeHtml = '🏆 GOLD ELITE';
          badgeCls = 'bg-amber-500/20 text-amber-300 border-amber-400/50';
          titleText = '24K Gold Contender';
          mottoText = '"Polished championship pedigree."';
        }
        if (eqBat === 'bat_solid_gold_willow' && inv.includes('bat_solid_gold_willow')) {
          titleText = '🏏 Cricket Deity • ' + titleText;
          showStar = true;
        }

        if (heroCard) heroCard.className = `rounded-2xl p-5 border-2 relative overflow-hidden flex flex-col justify-between transition-all duration-300 min-w-0 ${cardBorder}`;
        if (profFlag) profFlag.textContent = STATE.myCountryFlag || myRec.countryFlag || '🇮🇳';
        if (profUser) profUser.textContent = cleanMe || 'PLAYER';
        if (profStar) profStar.classList.toggle('hidden', !showStar);
        if (profDial) profDial.textContent = STATE.myCountryCode || myRec.countryCode || '+91';
        if (profTitle) profTitle.textContent = titleText;
        if (profMotto) profMotto.textContent = mottoText;
        if (profTierBadge) {
          profTierBadge.className = `px-2.5 py-1 rounded-lg text-[10px] font-brand font-black uppercase tracking-wider border shrink-0 ${badgeCls}`;
          profTierBadge.textContent = badgeHtml;
        }

        const elHeroElo = document.getElementById('hcProfHeroElo');
        const elHeroPeak = document.getElementById('hcProfHeroPeak');
        const elHeroRuns = document.getElementById('hcProfHeroRuns');
        const elHeroWickets = document.getElementById('hcProfHeroWickets');
        if (elHeroElo) elHeroElo.textContent = `${myRec.elo || STATE.eloRating || 1500}`;
        if (elHeroPeak) elHeroPeak.textContent = `${Math.max(myRec.peak || 1500, myRec.elo || 1500)}`;
        if (elHeroRuns) elHeroRuns.textContent = `${(myRec.totalRuns || 0).toLocaleString()}`;
        if (elHeroWickets) elHeroWickets.textContent = `${myRec.wicketsTaken || 0}`;

        // Account Info Box
        const elAccHandle = document.getElementById('hcProfAccHandle');
        const elAccCountry = document.getElementById('hcProfAccCountry');
        const elAccXp = document.getElementById('hcProfAccXp');
        const elAccAch = document.getElementById('hcProfAccAch');
        if (elAccHandle) elAccHandle.textContent = `@${cleanMe || 'PLAYER'}`;
        if (elAccCountry) elAccCountry.textContent = `${STATE.myCountryFlag || '🇮🇳'} ${STATE.myCountryName || 'India'} (${STATE.myCountryCode || '+91'})`;
        if (elAccXp) elAccXp.textContent = `${wallet.availableXp.toLocaleString()} XP Available`;
        if (elAccAch) elAccAch.textContent = `${wallet.unlockedAchCount}/${wallet.totalAchCount} Unlocked`;

        // AI Tier Stats & Total Matches
        let aiStats = {};
        try {
          if (cleanMe) {
            const rawAi = localStorage.getItem('oddandeven_ai_tier_stats_' + cleanMe);
            if (rawAi) aiStats = JSON.parse(rawAi) || {};
          }
        } catch (e) {}
        const botTiers = [
          { key: 'ROOKIE', name: 'Rookie Striker', icon: '🌱', elo: 1150, color: 'emerald' },
          { key: 'TACTICIAN', name: 'Tempo Tactician', icon: '🧠', elo: 1450, color: 'cyan' },
          { key: 'AGGRESSOR', name: 'Boundary Aggressor', icon: '🔥', elo: 1650, color: 'amber' },
          { key: 'WALL', name: 'The Wall (GM AI)', icon: '🧱', elo: 1850, color: 'purple' }
        ];
        let totalBotMatches = 0;
        let totalBotWins = 0;
        let totalBotLosses = 0;
        botTiers.forEach((t) => {
          const st = aiStats[t.key] || { matches: 0, wins: 0, losses: 0, draws: 0 };
          totalBotMatches += st.matches || 0;
          totalBotWins += st.wins || 0;
          totalBotLosses += st.losses || 0;
        });

        const combinedMatches = Math.max(myRec.matches || 0, (myRec.wins || 0) + (myRec.losses || 0), totalBotMatches);
        const combinedWins = Math.max(myRec.wins || 0, totalBotWins);
        const combinedLosses = Math.max(myRec.losses || 0, totalBotLosses);
        const rankedMatches = Math.max(0, combinedMatches - totalBotMatches);
        const wlRatio = combinedLosses > 0 ? (combinedWins / combinedLosses).toFixed(2) : (combinedWins > 0 ? `${combinedWins}.00` : '0.00');
        const winPct = combinedMatches > 0 ? Math.round((combinedWins / combinedMatches) * 100) : 0;

        const elKpiMatches = document.getElementById('hcProfKpiMatches');
        const elKpiMatchesSub = document.getElementById('hcProfKpiMatchesSub');
        const elKpiWinRatio = document.getElementById('hcProfKpiWinRatio');
        const elKpiWinSub = document.getElementById('hcProfKpiWinSub');
        const elKpiHigh = document.getElementById('hcProfKpiHighScore');
        const elKpiHighSub = document.getElementById('hcProfKpiHighSub');
        if (elKpiMatches) elKpiMatches.textContent = `${combinedMatches}`;
        if (elKpiMatchesSub) elKpiMatchesSub.textContent = `${rankedMatches} Ranked • ${totalBotMatches} vs Bots`;
        if (elKpiWinRatio) elKpiWinRatio.textContent = wlRatio;
        if (elKpiWinSub) elKpiWinSub.textContent = `${combinedWins}W – ${combinedLosses}L (${winPct}% Win)`;
        if (elKpiHigh) elKpiHigh.textContent = `${Math.max(myRec.highScore || 0, STATE.userScore || 0)}*`;
        if (elKpiHighSub) elKpiHighSub.textContent = `${myRec.centuriesCount || 0} Centuries • ${myRec.sr500Count || 0} SR 500+`;

        // Number Frequency Telemetry (1-10)
        let numFreq = {};
        try {
          if (cleanMe) {
            const rawFreq = localStorage.getItem('oddandeven_number_frequency_' + cleanMe);
            if (rawFreq) numFreq = JSON.parse(rawFreq) || {};
          }
        } catch (e) {}
        STATE.userNumHistory.forEach((n) => {
          if (numFreq[n] === undefined) numFreq[n] = (numFreq[n] || 0) + 1;
        });

        let totalPicks = 0;
        let favNum = 6;
        let maxCount = 0;
        for (let n = 1; n <= 10; n++) {
          const c = Number(numFreq[n]) || 0;
          totalPicks += c;
          if (c > maxCount) {
            maxCount = c;
            favNum = n;
          }
        }
        const favPct = totalPicks > 0 ? Math.round((maxCount / totalPicks) * 100) : 0;
        const elKpiFavNum = document.getElementById('hcProfKpiFavNum');
        const elKpiFavSub = document.getElementById('hcProfKpiFavSub');
        const elTotalPicksBadge = document.getElementById('hcProfTotalPicksBadge');
        if (elKpiFavNum) elKpiFavNum.textContent = totalPicks > 0 ? `#${favNum}` : '—';
        if (elKpiFavSub) elKpiFavSub.textContent = totalPicks > 0 ? `Picked ${maxCount}x (${favPct}% of balls)` : 'Play a match to log picks';
        if (elTotalPicksBadge) elTotalPicksBadge.textContent = `${totalPicks} Deliveries`;

        const numGrid = document.getElementById('hcProfNumTelemetryGrid');
        if (numGrid) {
          numGrid.innerHTML = Array.from({ length: 10 }, (_, idx) => {
            const n = idx + 1;
            const c = Number(numFreq[n]) || 0;
            const pct = totalPicks > 0 ? Math.round((c / totalPicks) * 100) : 0;
            const barH = maxCount > 0 ? Math.max(8, Math.round((c / maxCount) * 100)) : 8;
            const isFav = totalPicks > 0 && n === favNum;
            return `
              <div class="p-2 rounded-xl bg-black/35 border ${isFav ? 'border-amber-400/70 bg-amber-500/10' : 'border-white/5'} flex flex-col items-center justify-end gap-1">
                <span class="text-[9px] font-mono-num ${isFav ? 'text-amber-300 font-black' : 'text-slate-400'}">${pct}%</span>
                <div class="w-full h-14 bg-black/50 rounded-lg flex items-end p-0.5 overflow-hidden">
                  <div class="w-full rounded ${isFav ? 'bg-gradient-to-t from-amber-500 to-yellow-300' : 'bg-cyan-500/60'}" style="height:${barH}%"></div>
                </div>
                <span class="text-xs font-mono-num font-black ${isFav ? 'text-amber-300' : 'text-white'}">#${n}</span>
                <span class="text-[8px] font-mono-num text-slate-400">${c}x</span>
              </div>
            `;
          }).join('');
        }

        // AI Tiers Grid
        const aiGrid = document.getElementById('hcProfAiTiersGrid');
        if (aiGrid) {
          aiGrid.innerHTML = botTiers.map((t) => {
            const st = aiStats[t.key] || { matches: 0, wins: 0, losses: 0, draws: 0 };
            const m = st.matches || 0;
            const w = st.wins || 0;
            const l = st.losses || 0;
            const pct = m > 0 ? Math.round((w / m) * 100) : 0;
            return `
              <div class="p-3 rounded-xl bg-black/35 border border-white/10 flex flex-col justify-between gap-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-lg">${t.icon}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-black text-white truncate">${t.name}</div>
                      <div class="text-[10px] font-mono-num text-slate-400">${t.elo} Bot Elo • ${w}W–${l}L</div>
                    </div>
                  </div>
                  <span class="text-xs font-mono-num font-black text-[#a3d96c]">${pct}% Win</span>
                </div>
                <div class="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-[#81b64c] to-cyan-400" style="width:${pct}%"></div>
                </div>
              </div>
            `;
          }).join('');
        }

        // Unlocked Cards & Cosmetics Shelf
        const shelfEl = document.getElementById('hcProfCardsShelfList');
        const countBadge = document.getElementById('hcProfUnlockedCountBadge');
        const unlockedStoreCount = DESKTOP_STORE_CATALOG.filter((it) => inv.includes(it.id)).length;
        if (countBadge) countBadge.textContent = `${unlockedStoreCount}/${DESKTOP_STORE_CATALOG.length} Unlocked`;
        if (shelfEl) {
          shelfEl.innerHTML = DESKTOP_STORE_CATALOG.map((item) => {
            const isOwned = inv.includes(item.id);
            let isEquipped = false;
            if (item.type === 'card') isEquipped = isOwned && eqCard === item.id;
            else if (item.type === 'theme') isEquipped = isOwned && eqTheme === item.id;
            else if (item.type === 'vfx') isEquipped = isOwned && eqVfx === item.id;
            else if (item.type === 'bat') isEquipped = isOwned && eqBat === item.id;

            let btnHtml = '';
            if (isEquipped) {
              btnHtml = `<button type="button" data-prof-equip="${item.id}" data-prof-type="${item.type}" data-prof-action="unequip" class="px-2.5 py-1.5 rounded-xl text-[10px] font-brand font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">✓ Equipped</button>`;
            } else if (isOwned) {
              btnHtml = `<button type="button" data-prof-equip="${item.id}" data-prof-type="${item.type}" data-prof-action="equip" class="px-2.5 py-1.5 rounded-xl text-[10px] font-brand font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 shadow">⚡ Equip</button>`;
            } else {
              btnHtml = `<button type="button" data-prof-goto-store="${item.id}" class="px-2.5 py-1.5 rounded-xl text-[10px] font-mono-num font-bold bg-black/40 hover:bg-black/60 text-amber-300 border border-amber-500/30 shrink-0">🔒 ${item.price.toLocaleString()} XP</button>`;
            }

            return `
              <div class="p-3 rounded-xl bg-black/35 border ${isEquipped ? 'border-emerald-400/60 bg-emerald-500/5' : isOwned ? 'border-amber-400/40' : 'border-white/10'} flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="w-9 h-9 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-lg shrink-0">${item.icon}</span>
                  <div class="min-w-0">
                    <div class="text-xs font-black text-white truncate">${item.name}</div>
                    <div class="text-[10px] text-slate-400 truncate">${item.tagline}</div>
                  </div>
                </div>
                ${btnHtml}
              </div>
            `;
          }).join('');
        }
      }

      function renderStoreSection() {
        const scrStore = document.getElementById('screenStore');
        if (!scrStore) return;
        const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
        const myRec = ensureHumanPlayerRecord(STATE.myUsername, STATE.eloRating) || {};
        const wallet = computeDesktopStoreWallet(myRec);

        let inv = [];
        let eqCard = 'card_default';
        let eqTheme = '';
        let eqVfx = '';
        let eqBat = '';
        try {
          if (cleanMe) {
            const rawInv = localStorage.getItem('oddandeven_store_inventory_' + cleanMe);
            inv = rawInv ? JSON.parse(rawInv) : [];
            if (!Array.isArray(inv)) inv = [];
            eqCard = localStorage.getItem('oddandeven_equipped_card_' + cleanMe) || 'card_default';
            eqTheme = localStorage.getItem('oddandeven_equipped_theme_' + cleanMe) || '';
            eqVfx = localStorage.getItem('oddandeven_equipped_vfx_' + cleanMe) || '';
            eqBat = localStorage.getItem('oddandeven_equipped_bat_' + cleanMe) || '';
          }
        } catch (e) {}

        const elAvail = document.getElementById('hcStoreAvailXp');
        const elAch = document.getElementById('hcStoreAchXp');
        const elMatch = document.getElementById('hcStoreMatchXp');
        const elSpent = document.getElementById('hcStoreSpentXp');
        if (elAvail) elAvail.textContent = `${wallet.availableXp.toLocaleString()} XP`;
        if (elAch) elAch.textContent = `${wallet.achXp.toLocaleString()} / 6,625 XP`;
        if (elMatch) elMatch.textContent = `+${wallet.matchXp.toLocaleString()} XP`;
        const unlockedCount = DESKTOP_STORE_CATALOG.filter((it) => inv.includes(it.id)).length;
        if (elSpent) elSpent.textContent = `${wallet.spentXp.toLocaleString()} XP (${unlockedCount}/${DESKTOP_STORE_CATALOG.length})`;

        const studioBadge = document.getElementById('hcCustomStudioStatusBadge');
        const hasDivine = inv.includes('card_custom_divine');
        if (studioBadge) {
          studioBadge.textContent = hasDivine ? '✓ STUDIO UNLOCKED' : 'REQUIRES 75,000 XP DIVINE CARD';
          studioBadge.className = hasDivine
            ? 'px-2 py-0.5 rounded text-[9px] font-mono-num font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : 'px-2 py-0.5 rounded text-[9px] font-mono-num font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35';
        }

        const filter = STATE.storeFilter || 'ALL';
        const activeTabCls = 'py-2 px-3 rounded-lg bg-amber-500 text-slate-950 font-extrabold transition truncate';
        const idleTabCls = 'py-2 px-3 rounded-lg text-slate-300 hover:text-white transition truncate';
        const fAll = document.getElementById('btnStoreFilterAll');
        const fCards = document.getElementById('btnStoreFilterCards');
        const fCustom = document.getElementById('btnStoreFilterCustom');
        const fCosm = document.getElementById('btnStoreFilterCosmetics');
        if (fAll) fAll.className = filter === 'ALL' ? activeTabCls : idleTabCls;
        if (fCards) fCards.className = filter === 'CARDS' ? activeTabCls : idleTabCls;
        if (fCustom) fCustom.className = filter === 'CUSTOM' ? activeTabCls : idleTabCls;
        if (fCosm) fCosm.className = filter === 'COSMETICS' ? activeTabCls : idleTabCls;

        const gridEl = document.getElementById('hcStoreItemsGrid');
        if (!gridEl) return;
        const visible = filter === 'ALL' ? DESKTOP_STORE_CATALOG : DESKTOP_STORE_CATALOG.filter((it) => it.category === filter);
        gridEl.innerHTML = visible.map((item) => {
          const isOwned = inv.includes(item.id);
          let isEquipped = false;
          if (item.type === 'card') isEquipped = isOwned && eqCard === item.id;
          else if (item.type === 'theme') isEquipped = isOwned && eqTheme === item.id;
          else if (item.type === 'vfx') isEquipped = isOwned && eqVfx === item.id;
          else if (item.type === 'bat') isEquipped = isOwned && eqBat === item.id;
          const canAfford = wallet.availableXp >= item.price;
          const missing = Math.max(0, item.price - wallet.availableXp);

          let actionHtml = '';
          if (isEquipped) {
            actionHtml = `<button type="button" data-store-equip="${item.id}" data-store-type="${item.type}" data-store-action="unequip" class="w-full py-2 rounded-xl text-xs font-brand font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓ Active on Pitch (Click to Unequip)</button>`;
          } else if (isOwned) {
            actionHtml = `<button type="button" data-store-equip="${item.id}" data-store-type="${item.type}" data-store-action="equip" class="w-full py-2 rounded-xl text-xs font-brand font-black bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow">⚡ Equip to Arena</button>`;
          } else if (canAfford) {
            actionHtml = `<button type="button" data-store-buy="${item.id}" class="w-full py-2 rounded-xl text-xs font-brand font-black bg-gradient-to-r from-[#81b64c] to-emerald-400 hover:opacity-95 text-slate-950 shadow">🪙 Unlock for ${item.price.toLocaleString()} XP</button>`;
          } else {
            actionHtml = `<button type="button" data-store-buy="${item.id}" class="w-full py-2 px-3 rounded-xl text-xs font-mono-num font-bold bg-black/40 text-slate-400 border border-white/10 flex items-center justify-between"><span>🔒 ${item.price.toLocaleString()} XP</span><span class="text-[10px] text-amber-300">Need ${missing.toLocaleString()} XP</span></button>`;
          }

          return `
            <div class="p-4 rounded-2xl bg-[#1c1a17] border ${isEquipped ? 'border-emerald-400/60 bg-emerald-500/5' : isOwned ? 'border-amber-400/40' : 'border-[#36332e]'} flex flex-col justify-between gap-3">
              <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-xl shrink-0">${item.icon}</span>
                    <div class="min-w-0">
                      <div class="text-xs font-black text-white truncate">${item.name}</div>
                      <span class="inline-block px-1.5 py-0.5 rounded text-[8px] font-brand font-black uppercase ${item.badgeClass}">${item.rarity}</span>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="font-mono-num font-black text-xs text-amber-300">${item.price.toLocaleString()}</div>
                    <div class="text-[9px] text-slate-400 uppercase font-mono-num">XP</div>
                  </div>
                </div>
                <p class="text-[11px] text-slate-300 leading-snug bg-black/25 p-2 rounded-xl border border-white/5">${item.lore}</p>
                <div class="space-y-0.5 text-[10px] text-slate-300">
                  ${item.perks.map((p) => `<div class="flex items-center gap-1.5"><span class="text-emerald-400">✓</span><span>${p}</span></div>`).join('')}
                </div>
              </div>
              <div class="pt-2 border-t border-white/10">
                ${actionHtml}
              </div>
            </div>
          `;
        }).join('');
      }

      function bindEvents() {
        el.btnCallOdd.addEventListener('click', () => setTossCall('ODD'));
        el.btnCallEven.addEventListener('click', () => setTossCall('EVEN'));

        el.btnChooseBat.addEventListener('click', () => handleUserTossDecision('BAT'));
        el.btnChooseBowl.addEventListener('click', () => handleUserTossDecision('BOWL'));
        el.btnStartAfterAiToss.addEventListener('click', () => {
          SoundFX.click();
          startFirstInnings();
        });

        el.btnStartSecondInnings.addEventListener('click', () => startSecondInnings(false));
        el.btnPlayAgain.addEventListener('click', () => resetGame(false));
        el.btnQuickRestart.addEventListener('click', () => resetGame(false));

        // Sound Mute Toggle
        el.btnMute.addEventListener('click', () => {
          SoundFX.muted = !SoundFX.muted;
          el.muteIcon.textContent = SoundFX.muted ? '🔇' : '🔊';
          el.muteLabel.textContent = SoundFX.muted ? 'Muted' : 'Sound On';
          if (!SoundFX.muted) SoundFX.click();
        });

        // Rules Modal
        const openRules = () => {
          SoundFX.click();
          el.rulesModal.classList.remove('hidden');
          el.rulesModal.classList.add('flex');
        };
        const closeRules = () => {
          SoundFX.click();
          el.rulesModal.classList.add('hidden');
          el.rulesModal.classList.remove('flex');
        };

        // Multiplayer Modal & Mode Switching (Solo AI vs Online Room Code)
        function selectModalTab(mode) {
          SoundFX.click();
          STATE.selectedModalMode = mode === 'AI' ? 'AI' : 'ONLINE_2P';
          const activeCls = 'py-2 px-3 rounded-lg text-xs font-extrabold transition bg-emerald-500 text-slate-950 shadow';
          const inactiveCls = 'py-2 px-3 rounded-lg text-xs font-extrabold transition text-slate-300 hover:text-white';
          if (el.tabModeAi) el.tabModeAi.className = STATE.selectedModalMode === 'AI' ? activeCls : inactiveCls;
          if (el.tabModeOnline2P) el.tabModeOnline2P.className = STATE.selectedModalMode === 'ONLINE_2P' ? activeCls : inactiveCls;

          if (el.mpPanelAi) el.mpPanelAi.classList.toggle('hidden', STATE.selectedModalMode !== 'AI');
          if (el.mpPanelOnline) el.mpPanelOnline.classList.toggle('hidden', STATE.selectedModalMode !== 'ONLINE_2P');
          renderAll();
        }

        const openMpModal = () => {
          if (!requireAccountAndPassword()) return;
          SoundFX.click();
          selectModalTab('ONLINE_2P');
          el.mpModal.classList.remove('hidden');
          el.mpModal.classList.add('flex');
        };
        const closeMpModal = () => {
          SoundFX.click();
          el.mpModal.classList.add('hidden');
          el.mpModal.classList.remove('flex');
        };

        el.btnMultiplayer.addEventListener('click', openMpModal);
        el.btnOpenMpSettings.addEventListener('click', openMpModal);
        el.btnCloseMpModal.addEventListener('click', closeMpModal);
        el.btnCancelMpModal.addEventListener('click', closeMpModal);
        el.mpModal.addEventListener('click', (e) => {
          if (e.target === el.mpModal) closeMpModal();
        });

        if (el.tabModeAi) el.tabModeAi.addEventListener('click', () => selectModalTab('AI'));
        if (el.tabModeOnline2P) el.tabModeOnline2P.addEventListener('click', () => selectModalTab('ONLINE_2P'));

        const copyRoomCodeHelper = (btnEl) => {
          if (!STATE.roomCode) return;
          SoundFX.click();
          try {
            const ta = document.createElement('textarea');
            ta.value = STATE.roomCode;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            if (btnEl) {
              btnEl.textContent = 'Copied!';
              setTimeout(() => { btnEl.textContent = 'Copy'; }, 1500);
            }
          } catch (e) {}
        };

        if (el.btnCreateRoom) el.btnCreateRoom.addEventListener('click', createMultiplayerRoom);
        if (el.btnJoinRoom) el.btnJoinRoom.addEventListener('click', () => joinMultiplayerRoom(el.inputJoinRoomCode ? el.inputJoinRoomCode.value : null));
        if (el.btnCopyRoomCode) el.btnCopyRoomCode.addEventListener('click', () => copyRoomCodeHelper(el.btnCopyRoomCode));
        if (el.btnInlineCopyCode) el.btnInlineCopyCode.addEventListener('click', () => copyRoomCodeHelper(el.btnInlineCopyCode));

        if (el.btnApplyMpMode) {
          el.btnApplyMpMode.addEventListener('click', () => {
            if (STATE.selectedModalMode === 'AI') {
              STATE.mode = 'AI';
              STATE.p1Name = STATE.myUsername;
              closeMpModal();
              STATE.activeScreen = 'PITCH';
              resetGame(true);
              setTimeout(resizeCanvas, 20);
            } else {
              hostTriggerMultiplayerMatchStart();
            }
          });
        }

        // Sidebar & Inline Setup Screen Navigation
        function switchCenterScreen(screenName) {
          SoundFX.click();
          if (screenName === 'PITCH' && isMultiplayer() && !isMultiplayerReadyToPlay()) {
            // If user started multiplayer mode and friend hasn't joined yet, do not start the match on the pitch!
            stopTurnTimer();
            STATE.activeScreen = 'MP_SETUP';
            if (el.inlineLobbyWaitHint) {
              el.inlineLobbyWaitHint.textContent = `⚠️ Match cannot start until your friend joins Room ${STATE.roomCode || 'Lobby'}! Share your Room Code or switch to Bot Mode.`;
            }
            renderAll();
            return;
          }
          STATE.activeScreen = screenName;
          if (screenName === 'SHOWCASE') {
            STATE.showcaseCompact = false;
          }
          if (screenName === 'LEADERBOARD') {
            syncAuthAndPurgeFakeSeeds();
            broadcastGlobalLeaderboardSync(true, true);
          }
          if (screenName === 'PITCH') {
            startTurnTimer(true);
            setTimeout(resizeCanvas, 20);
          } else {
            stopTurnTimer();
          }
          renderAll();
        }
        try { window.switchCenterScreen = switchCenterScreen; } catch (e) {}

        function highlightBotCard(botKey) {
          SoundFX.click();
          STATE.botDifficulty = botKey;
          const map = {
            ROOKIE: el.btnBotRookie,
            TACTICIAN: el.btnBotTactician,
            AGGRESSOR: el.btnBotAggressor,
            WALL: el.btnBotWall
          };
          Object.keys(map).forEach((k) => {
            const btn = map[k];
            if (!btn) return;
            btn.className = k === botKey
              ? 'text-left p-3.5 rounded-xl bg-slate-900/95 border-2 border-cyan-400 shadow-lg shadow-cyan-500/15 transition space-y-1'
              : 'text-left p-3.5 rounded-xl bg-slate-900/90 border-2 border-slate-800 hover:border-slate-600 transition space-y-1';
          });
          renderAll();
        }

        if (el.sideNavPitch) {
          el.sideNavPitch.addEventListener('click', () => switchCenterScreen('PITCH'));
        }
        if (el.sideNavAchievements) {
          el.sideNavAchievements.addEventListener('click', () => switchCenterScreen('ACHIEVEMENTS'));
        }
        if (el.btnBackFromAchievements) {
          el.btnBackFromAchievements.addEventListener('click', () => switchCenterScreen('PITCH'));
        }
        const bindInlineScreenLink = (elem, screenTarget) => {
          if (!elem) return;
          elem.addEventListener('click', (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) return;
            e.preventDefault();
            switchCenterScreen(screenTarget);
          });
        };
        bindInlineScreenLink(el.sideNavProfile, 'PROFILE');
        bindInlineScreenLink(el.btnHeaderProfile, 'PROFILE');
        bindInlineScreenLink(el.sidebarPlayerCard, 'PROFILE');
        bindInlineScreenLink(el.sideNavStore, 'STORE');
        bindInlineScreenLink(el.btnHeaderStore, 'STORE');
        bindInlineScreenLink(document.getElementById('btnAchOpenStoreInline'), 'STORE');

        const btnBackFromProfile = document.getElementById('btnBackFromProfile');
        if (btnBackFromProfile) btnBackFromProfile.addEventListener('click', () => switchCenterScreen('PITCH'));
        const btnBackFromStore = document.getElementById('btnBackFromStore');
        if (btnBackFromStore) btnBackFromStore.addEventListener('click', () => switchCenterScreen('PITCH'));
        const btnProfileGoToStore = document.getElementById('btnProfileGoToStore');
        if (btnProfileGoToStore) btnProfileGoToStore.addEventListener('click', () => switchCenterScreen('STORE'));
        const btnProfOpenStoreBottom = document.getElementById('btnProfOpenStoreBottom');
        if (btnProfOpenStoreBottom) btnProfOpenStoreBottom.addEventListener('click', () => switchCenterScreen('STORE'));
        const btnStoreGoToProfile = document.getElementById('btnStoreGoToProfile');
        if (btnStoreGoToProfile) btnStoreGoToProfile.addEventListener('click', () => switchCenterScreen('PROFILE'));

        const btnProfileSignOut = document.getElementById('btnProfileSignOut');
        if (btnProfileSignOut && el.btnHeaderSignOut) {
          btnProfileSignOut.addEventListener('click', () => el.btnHeaderSignOut.click());
        }
        const btnProfileRemoveAccount = document.getElementById('btnProfileRemoveAccount');
        if (btnProfileRemoveAccount && el.btnHeaderRemoveAccount) {
          btnProfileRemoveAccount.addEventListener('click', () => el.btnHeaderRemoveAccount.click());
        }

        const setDesktopStoreFilter = (fKey) => {
          SoundFX.click();
          STATE.storeFilter = fKey;
          renderStoreSection();
        };
        const fAllBtn = document.getElementById('btnStoreFilterAll');
        const fCardsBtn = document.getElementById('btnStoreFilterCards');
        const fCustomBtn = document.getElementById('btnStoreFilterCustom');
        const fCosmBtn = document.getElementById('btnStoreFilterCosmetics');
        if (fAllBtn) fAllBtn.addEventListener('click', () => setDesktopStoreFilter('ALL'));
        if (fCardsBtn) fCardsBtn.addEventListener('click', () => setDesktopStoreFilter('CARDS'));
        if (fCustomBtn) fCustomBtn.addEventListener('click', () => setDesktopStoreFilter('CUSTOM'));
        if (fCosmBtn) fCosmBtn.addEventListener('click', () => setDesktopStoreFilter('COSMETICS'));

        const btnSaveCustom = document.getElementById('btnHcSaveCustomCard');
        if (btnSaveCustom) {
          btnSaveCustom.addEventListener('click', () => {
            const cleanMe = String(STATE.myUsername || '').trim().toUpperCase();
            if (!cleanMe || isPlaceholderUsername(cleanMe)) {
              requireAccountAndPassword();
              return;
            }
            let inv = [];
            try {
              const raw = localStorage.getItem('oddandeven_store_inventory_' + cleanMe);
              inv = raw ? JSON.parse(raw) : [];
            } catch (e) {}
            if (!Array.isArray(inv) || !inv.includes('card_custom_divine')) {
              SoundFX.wicket();
              alert('Unlock "The Divine Custom Player Card" (75,000 XP) in the Store first to save custom titles and mottos!');
              return;
            }
            const tInput = document.getElementById('hcCustomTitleInput');
            const mInput = document.getElementById('hcCustomMottoInput');
            const title = (tInput && tInput.value.trim()) || 'Divine Sovereign';
            const motto = (mInput && mInput.value.trim()) || 'Every number counts on the pitch.';
            try {
              localStorage.setItem('oddandeven_custom_card_' + cleanMe, JSON.stringify({ title, motto, aura: 'gold', palette: 'obsidian' }));
              localStorage.setItem('oddandeven_equipped_card_' + cleanMe, 'card_custom_divine');
            } catch (e) {}
            if (SoundFX.goldChime) SoundFX.goldChime();
            broadcastDesktopStoreSync(cleanMe);
            renderAll();
          });
        }

        const scrProfEl = document.getElementById('screenProfile');
        if (scrProfEl) {
          scrProfEl.addEventListener('click', (e) => {
            const eqBtn = e.target.closest('[data-prof-equip]');
            if (eqBtn) {
              handleDesktopEquipToggle(
                eqBtn.getAttribute('data-prof-equip'),
                eqBtn.getAttribute('data-prof-type'),
                eqBtn.getAttribute('data-prof-action')
              );
              return;
            }
            const storeJump = e.target.closest('[data-prof-goto-store]');
            if (storeJump) {
              switchCenterScreen('STORE');
            }
          });
        }

        const scrStoreEl = document.getElementById('screenStore');
        if (scrStoreEl) {
          scrStoreEl.addEventListener('click', (e) => {
            const buyBtn = e.target.closest('[data-store-buy]');
            if (buyBtn) {
              handleDesktopStorePurchase(buyBtn.getAttribute('data-store-buy'));
              return;
            }
            const eqBtn = e.target.closest('[data-store-equip]');
            if (eqBtn) {
              handleDesktopEquipToggle(
                eqBtn.getAttribute('data-store-equip'),
                eqBtn.getAttribute('data-store-type'),
                eqBtn.getAttribute('data-store-action')
              );
            }
          });
        }
        const setDesktopAchFilter = (filterKey) => {
          SoundFX.click();
          STATE.achievementFilter = filterKey;
          renderAchievementsSection();
        };
        if (el.btnAchFilterAll) el.btnAchFilterAll.addEventListener('click', () => setDesktopAchFilter('ALL'));
        if (el.btnAchFilterBatting) el.btnAchFilterBatting.addEventListener('click', () => setDesktopAchFilter('BATTING'));
        if (el.btnAchFilterBowling) el.btnAchFilterBowling.addEventListener('click', () => setDesktopAchFilter('BOWLING'));
        if (el.btnAchFilterRanked) el.btnAchFilterRanked.addEventListener('click', () => setDesktopAchFilter('RANKED'));

        if (el.sideNavEvents) {
          el.sideNavEvents.addEventListener('click', () => {
            renderEventsTabAndCountdowns();
            switchCenterScreen('EVENTS');
          });
        }
        if (el.btnBackFromEvents) {
          el.btnBackFromEvents.addEventListener('click', () => switchCenterScreen('PITCH'));
        }
        if (el.btnJoinEventSolo) {
          el.btnJoinEventSolo.addEventListener('click', () => toggleEventRegistration('solo'));
        }
        el.sideNavBot.addEventListener('click', () => switchCenterScreen('BOT_SETUP'));
        el.sideNavMultiplayer.addEventListener('click', () => switchCenterScreen('MP_SETUP'));
        if (el.sideNavFriends) {
          el.sideNavFriends.addEventListener('click', () => switchCenterScreen('FRIENDS'));
        }
        if (el.btnBackFromFriends) {
          el.btnBackFromFriends.addEventListener('click', () => switchCenterScreen('PITCH'));
        }
        if (el.inputFriendSearch) {
          el.inputFriendSearch.addEventListener('input', () => {
            STATE.friendSearchQuery = (el.inputFriendSearch.value || '').trim().toUpperCase();
            if (el.friendActionFeedback) el.friendActionFeedback.classList.add('hidden');
            renderAll();
          });
          el.inputFriendSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              STATE.friendSearchQuery = (el.inputFriendSearch.value || '').trim().toUpperCase();
              renderAll();
            }
          });
        }
        if (el.btnSearchFriendUsername) {
          el.btnSearchFriendUsername.addEventListener('click', () => {
            SoundFX.click();
            STATE.friendSearchQuery = ((el.inputFriendSearch && el.inputFriendSearch.value) || '').trim().toUpperCase();
            broadcastGlobalLeaderboardSync(true);
            renderAll();
          });
        }
        if (el.btnAddDirectFriendUsername) {
          el.btnAddDirectFriendUsername.addEventListener('click', () => {
            const val = ((el.inputFriendSearch && el.inputFriendSearch.value) || '').trim().toUpperCase();
            addFriendByUsername(val);
          });
        }
        const handleFriendsDelegatedClick = (e) => {
          const acceptReqBtn = e.target.closest('[data-friend-req-accept]');
          if (acceptReqBtn) {
            acceptFriendRequest(acceptReqBtn.getAttribute('data-friend-req-accept'));
            return;
          }
          const declineReqBtn = e.target.closest('[data-friend-req-decline]');
          if (declineReqBtn) {
            declineFriendRequest(declineReqBtn.getAttribute('data-friend-req-decline'));
            return;
          }
          const addBtn = e.target.closest('[data-friend-add]');
          if (addBtn) {
            addFriendByUsername(addBtn.getAttribute('data-friend-add'));
            return;
          }
          const playBtn = e.target.closest('[data-friend-play]');
          if (playBtn) {
            playWithFriend(playBtn.getAttribute('data-friend-play'));
            return;
          }
          const remBtn = e.target.closest('[data-friend-remove]');
          if (remBtn) {
            removeFriendByUsername(remBtn.getAttribute('data-friend-remove'));
          }
        };
        if (el.friendSearchResultsList) {
          el.friendSearchResultsList.addEventListener('click', handleFriendsDelegatedClick);
        }
        if (el.pendingFriendRequestsList) {
          el.pendingFriendRequestsList.addEventListener('click', handleFriendsDelegatedClick);
        }
        if (el.myFriendsListContainer) {
          el.myFriendsListContainer.addEventListener('click', handleFriendsDelegatedClick);
        }
        if (el.btnAcceptGlobalFriendInvite) {
          el.btnAcceptGlobalFriendInvite.addEventListener('click', () => {
            if (!STATE.incomingFriendInvite || !STATE.incomingFriendInvite.roomCode) return;
            if (!requireAccountAndPassword()) return;
            SoundFX.runScored(6);
            const inv = STATE.incomingFriendInvite;
            const code = String(inv.roomCode).trim().toUpperCase();
            const caller = String(inv.fromUser || 'HOST').trim().toUpperCase();
            const me = (STATE.myUsername || 'GUEST').trim().toUpperCase();
            STATE.incomingFriendInvite = null;
            if (el.globalFriendInviteToast) {
              el.globalFriendInviteToast.classList.add('hidden');
            }
            if (typeof window.__clearCloudFriendInvite === 'function' && me) {
              try { window.__clearCloudFriendInvite(me); } catch (e) {}
            }
            if (el.mpModal) {
              el.mpModal.classList.add('hidden');
              el.mpModal.classList.remove('flex');
            }
            if (el.rulesModal) {
              el.rulesModal.classList.add('hidden');
              el.rulesModal.classList.remove('flex');
            }
            STATE.mode = 'ONLINE_2P';
            STATE.onlineRole = 'GUEST';
            STATE.roomCode = code;
            STATE.p1Name = caller;
            STATE.p1CountryFlag = inv.fromFlag || '🇮🇳';
            STATE.p1CountryCode = inv.fromCode || '+91';
            STATE.p2Name = me === caller ? (me + ' (Guest)') : me;
            STATE.p2CountryFlag = STATE.myCountryFlag || '🇮🇳';
            STATE.p2CountryCode = STATE.myCountryCode || '+91';
            STATE.p2Joined = true;
            STATE.roomLocked = true;
            STATE.activeScreen = 'PITCH';
            joinMultiplayerRoom(code, true);
            resetGame(true);
            setTimeout(resizeCanvas, 25);
          });
        }
        if (el.btnDismissGlobalFriendInvite) {
          el.btnDismissGlobalFriendInvite.addEventListener('click', () => {
            SoundFX.click();
            const inv = STATE.incomingFriendInvite;
            const me = (STATE.myUsername || '').trim().toUpperCase();
            STATE.incomingFriendInvite = null;
            if (inv && inv.fromUser) {
              const declinePacket = {
                type: 'FRIEND_MATCH_DECLINE',
                fromUser: me,
                toUser: String(inv.fromUser).trim().toUpperCase(),
                roomCode: inv.roomCode,
                timestamp: Date.now()
              };
              broadcastFriendEventPacket(declinePacket);
              if (typeof window.__sendCloudMatchDecline === 'function') {
                try { window.__sendCloudMatchDecline(inv.fromUser, me, inv.roomCode); } catch (e) {}
              }
            }
            if (typeof window.__clearCloudFriendInvite === 'function' && me) {
              try { window.__clearCloudFriendInvite(me); } catch (e) {}
            }
            renderAll();
          });
        }
        if (el.btnAcceptGlobalFriendRequest) {
          el.btnAcceptGlobalFriendRequest.addEventListener('click', () => {
            const req = STATE.incomingFriendRequestPending;
            hideGlobalFriendRequestToast();
            if (req) {
              const fromUser = String(req.fromUser || req.from || '').trim().toUpperCase();
              if (fromUser) acceptFriendRequest(fromUser);
            }
          });
        }
        if (el.btnDismissGlobalFriendRequest) {
          el.btnDismissGlobalFriendRequest.addEventListener('click', () => {
            const req = STATE.incomingFriendRequestPending;
            hideGlobalFriendRequestToast();
            if (req) {
              const fromUser = String(req.fromUser || req.from || '').trim().toUpperCase();
              if (fromUser) declineFriendRequest(fromUser);
            }
          });
        }
        el.sideNavShowcase.addEventListener('click', () => switchCenterScreen('SHOWCASE'));

        if (el.botSetupPlayerName) el.botSetupPlayerName.value = STATE.myUsername;

        // Worldwide Leaderboard Sync Button
        if (el.btnSyncGlobalLb) {
          el.btnSyncGlobalLb.addEventListener('click', () => {
            SoundFX.click();
            syncAuthAndPurgeFakeSeeds();
            broadcastGlobalLeaderboardSync(true, true);
            if (el.lbWorldSyncText) {
              el.lbWorldSyncText.textContent = 'Syncing Worldwide...';
              setTimeout(() => renderAll(), 350);
            } else {
              renderAll();
            }
          });
        }

        // Encrypted Auth Modal Handlers (Mandatory Gate + Sign Out -> main.html + Remove Account)
        const setModalAuthTab = (m) => {
          SoundFX.click();
          STATE.modalAuthMode = m;
          el.modalTabLogin.className = m === 'LOGIN'
            ? 'py-2 px-3 rounded-lg text-xs font-extrabold bg-[#81b64c] text-white'
            : 'py-2 px-3 rounded-lg text-xs font-extrabold text-slate-300 hover:text-white';
          el.modalTabSignup.className = m === 'SIGNUP'
            ? 'py-2 px-3 rounded-lg text-xs font-extrabold bg-[#81b64c] text-white'
            : 'py-2 px-3 rounded-lg text-xs font-extrabold text-slate-300 hover:text-white';
          el.modalAuthAlert.classList.add('hidden');
        };

        const openAuthModal = (showRemoveConfirm = false) => {
          SoundFX.click();
          if (!el.authModal) return;
          const usersCount = Object.keys(loadEncryptedUsersMap()).length;
          if (!STATE.isAuthenticated && usersCount === 0) {
            setModalAuthTab('SIGNUP');
          }
          el.modalInputUsername.value = STATE.isAuthenticated ? STATE.myUsername : '';
          el.modalSelectCountry.value = STATE.myCountryCode || '+91';
          el.modalInputPin5.value = '';
          el.modalAuthAlert.classList.add('hidden');
          if (el.modalRemoveConfirmBox) {
            if (showRemoveConfirm && STATE.isAuthenticated) {
              el.modalRemoveConfirmBox.classList.remove('hidden');
              if (el.modalRemoveConfirmTitle) {
                el.modalRemoveConfirmTitle.textContent = `Permanently remove account "${STATE.myUsername}"?`;
              }
            } else {
              el.modalRemoveConfirmBox.classList.add('hidden');
            }
          }
          enforceMandatoryAuthGate();
          el.authModal.classList.remove('hidden');
          el.authModal.classList.add('flex');
        };

        const closeAuthModal = () => {
          // Do not allow closing the modal if the user is not authenticated!
          if (!STATE.isAuthenticated || isPlaceholderUsername(STATE.myUsername)) {
            enforceMandatoryAuthGate('🔒 You cannot play without logging in or creating an account with a 5-digit PIN.');
            return;
          }
          SoundFX.click();
          if (!el.authModal) return;
          if (el.modalRemoveConfirmBox) el.modalRemoveConfirmBox.classList.add('hidden');
          el.authModal.classList.add('hidden');
          el.authModal.classList.remove('flex');
        };

        const signOutCurrentAccount = () => {
          SoundFX.click();
          try {
            if (STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
              localStorage.setItem('oddandeven_last_user_v1', STATE.myUsername.trim().toUpperCase());
            }
            saveSessionStats();
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem('oddandeven_just_logged_in');
            localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
          } catch (e) {}

          if (STATE.roomCode) {
            leaveMultiplayerRoom();
          }
          stopTurnTimer();
          STATE.mode = 'AI';
          STATE.isAuthenticated = false;
          STATE.myUsername = 'GUEST';
          STATE.p1Name = 'GUEST';
          renderAll();

          // Redirect to index.html as requested
          if (!redirectToMainPage('?signedout=1')) {
            enforceMandatoryAuthGate('🚪 Signed out! Redirecting to index.html (on live site) — sign in with your account & password below to play.');
          }
        };

        const promptRemoveAccount = () => {
          if (!STATE.isAuthenticated || isPlaceholderUsername(STATE.myUsername)) {
            enforceMandatoryAuthGate('🔒 Please sign in to an account first.');
            return;
          }
          openAuthModal(true);
        };

        const executeRemoveCurrentAccount = async () => {
          SoundFX.click();
          const unameToRemove = (STATE.myUsername || '').trim().toUpperCase();
          if (!unameToRemove || isPlaceholderUsername(unameToRemove)) return;

          if (el.btnConfirmRemoveAccount) {
            el.btnConfirmRemoveAccount.disabled = true;
            el.btnConfirmRemoveAccount.textContent = '🗑️ Removing Account…';
          }

          const usersMap = loadEncryptedUsersMap();
          const activeSess = loadActiveAuthSession();
          const targetGoogleUid = (usersMap[unameToRemove] && usersMap[unameToRemove].googleUid) || (activeSess && activeSess.googleUid) || null;

          // Clear recent signup timestamp so cloud & local deletion is never skipped
          try {
            localStorage.removeItem('oddandeven_recent_signup_' + unameToRemove);
          } catch (e) {}

          // 1. Delete from Encrypted Users Vault & all website storage
          if (usersMap[unameToRemove]) {
            delete usersMap[unameToRemove];
            saveEncryptedUsersMap(usersMap);
          }
          if (window.__cloudAuthoritativeAccounts) {
            delete window.__cloudAuthoritativeAccounts[unameToRemove];
          }

          markAccountPurgedLocal(unameToRemove);
          if (typeof window.__scrubAccountCompletelyFromWebsite === 'function') {
            try { window.__scrubAccountCompletelyFromWebsite(unameToRemove, false); } catch (e) {}
          }
          delete STATE.humanPlayers[unameToRemove];
          STATE.eloHistory = STATE.eloHistory.filter((h) => h && h.p1Name !== unameToRemove && h.opponent !== unameToRemove);
          STATE.matchScorecards = STATE.matchScorecards.filter((m) => m && m.p1Name !== unameToRemove && m.p2Name !== unameToRemove);

          try {
            localStorage.setItem(WORLDWIDE_PLAYERS_KEY, JSON.stringify(STATE.humanPlayers));
            localStorage.setItem('hc_arena_elo_v2', JSON.stringify({
              eloRating: 1500,
              peakElo: 1500,
              friendEloRating: STATE.friendEloRating,
              humanPlayers: STATE.humanPlayers,
              eloHistory: STATE.eloHistory.slice(0, 30)
            }));
            localStorage.setItem(SCORECARD_HISTORY_KEY, JSON.stringify(STATE.matchScorecards.slice(0, 25)));
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem(SESSION_STORAGE_KEY);
            localStorage.removeItem('oddandeven_just_logged_in');
            localStorage.removeItem('oddandeven_last_user_v1');
            localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
          } catch (e) {}

          // 2. Broadcast removal across BroadcastChannel, storage bus, and PeerJS Hub
          const removalPacket = {
            type: 'GLOBAL_ACCOUNT_REMOVED',
            username: unameToRemove,
            purgedAccounts: loadPurgedAccountsList(),
            timestamp: Date.now()
          };
          try {
            localStorage.setItem('oddandeven_account_eradicated_bus', JSON.stringify(removalPacket));
          } catch (e) {}
          const gbc = getSharedGlobalBc();
          if (gbc) {
            try { gbc.postMessage(removalPacket); } catch (e) {}
          }
          const authBc = getSharedAuthBc();
          if (authBc) {
            try { authBc.postMessage(removalPacket); } catch (e) {}
          }
          if (STATE.globalHubConns && STATE.globalHubConns.length > 0) {
            STATE.globalHubConns.forEach((c) => {
              if (c && c.open) {
                try { c.send(removalPacket); } catch (e) {}
              }
            });
          }

          if (STATE.roomCode) {
            leaveMultiplayerRoom();
          }
          stopTurnTimer();
          STATE.mode = 'AI';
          STATE.isAuthenticated = false;
          STATE.myUsername = 'GUEST';
          STATE.p1Name = 'GUEST';
          STATE.eloRating = 1500;
          STATE.peakElo = 1500;
          STATE.lastEloDelta = null;

          // 3. Permanently delete from Firestore Database AND Firebase Authentication before redirecting
          if (typeof window.__purgeCloudAccount === 'function') {
            try {
              await Promise.race([
                window.__purgeCloudAccount(unameToRemove, targetGoogleUid),
                new Promise((resolve) => setTimeout(resolve, 4000))
              ]);
            } catch (e) {}
          }

          if (el.btnConfirmRemoveAccount) {
            el.btnConfirmRemoveAccount.disabled = false;
            el.btnConfirmRemoveAccount.textContent = '🗑️ Yes, Remove Account';
          }
          if (el.modalRemoveConfirmBox) el.modalRemoveConfirmBox.classList.add('hidden');
          setModalAuthTab('SIGNUP');
          renderAll();

          // Redirect to index.html after account removal
          if (!redirectToMainPage('?removed=1')) {
            enforceMandatoryAuthGate(`🗑️ Account "${unameToRemove}" permanently removed from website, Firestore & Authentication! You can create it again in the Sign Up option.`);
          }
        };

        if (el.btnOpenAuthModal) el.btnOpenAuthModal.addEventListener('click', () => openAuthModal(false));
        if (el.btnSidebarAuth) el.btnSidebarAuth.addEventListener('click', () => openAuthModal(false));
        if (el.btnCloseAuthModal) el.btnCloseAuthModal.addEventListener('click', closeAuthModal);
        if (el.btnHeaderSignOut) el.btnHeaderSignOut.addEventListener('click', signOutCurrentAccount);
        if (el.btnSidebarSignOut) el.btnSidebarSignOut.addEventListener('click', signOutCurrentAccount);
        if (el.btnModalSignOut) el.btnModalSignOut.addEventListener('click', signOutCurrentAccount);
        if (el.btnHeaderRemoveAccount) el.btnHeaderRemoveAccount.addEventListener('click', promptRemoveAccount);
        if (el.btnSidebarRemoveAccount) el.btnSidebarRemoveAccount.addEventListener('click', promptRemoveAccount);
        if (el.btnModalRemoveAccount) el.btnModalRemoveAccount.addEventListener('click', promptRemoveAccount);
        if (el.btnCancelRemoveAccount) {
          el.btnCancelRemoveAccount.addEventListener('click', () => {
            SoundFX.click();
            if (el.modalRemoveConfirmBox) el.modalRemoveConfirmBox.classList.add('hidden');
          });
        }
        if (el.btnConfirmRemoveAccount) {
          el.btnConfirmRemoveAccount.addEventListener('click', executeRemoveCurrentAccount);
        }
        if (el.btnInlineLeaveRoom) el.btnInlineLeaveRoom.addEventListener('click', leaveMultiplayerRoom);
        ['btnGoLoginPage1', 'btnGoLoginPage2'].forEach((id) => {
          const b = document.getElementById(id);
          if (b) {
            b.addEventListener('click', () => {
              redirectToMainPage('');
            });
          }
        });
        if (el.modalTabLogin) el.modalTabLogin.addEventListener('click', () => setModalAuthTab('LOGIN'));
        if (el.modalTabSignup) el.modalTabSignup.addEventListener('click', () => setModalAuthTab('SIGNUP'));
        if (el.modalInputPin5 && el.modalSelectCountry) {
          const updateModalKeyPreview = () => {
            el.modalInputPin5.value = el.modalInputPin5.value.replace(/\D/g, '').slice(0, 5);
            const dial = el.modalSelectCountry.value || '+91';
            const masked = el.modalInputPin5.value.padEnd(5, '•');
            if (el.modalConnectedKeyPreview) {
              el.modalConnectedKeyPreview.textContent = `Connected Key: ${dial}-${masked}`;
            }
          };
          el.modalInputPin5.addEventListener('input', updateModalKeyPreview);
          el.modalSelectCountry.addEventListener('change', updateModalKeyPreview);
        }
        if (el.btnModalSubmitAuth) {
          el.btnModalSubmitAuth.addEventListener('click', async () => {
            const uname = (el.modalInputUsername.value || '').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
            const pin5 = (el.modalInputPin5.value || '').trim();
            const opt = el.modalSelectCountry.options[el.modalSelectCountry.selectedIndex];
            const dial = opt ? opt.value : '+91';
            const cName = opt ? (opt.getAttribute('data-country') || 'India') : 'India';
            const cFlag = opt ? (opt.getAttribute('data-flag') || '🇮🇳') : '🇮🇳';

            const showModalMsg = (txt, ok) => {
              el.modalAuthAlert.classList.remove('hidden');
              el.modalAuthAlert.className = ok
                ? 'p-2.5 rounded-xl text-xs font-bold border bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : 'p-2.5 rounded-xl text-xs font-bold border bg-rose-500/15 border-rose-400/40 text-rose-200';
              el.modalAuthAlert.textContent = txt;
            };

            if (uname.length < 3) {
              showModalMsg('Username must be at least 3 alphanumeric characters.', false);
              return;
            }
            if (isPlaceholderUsername(uname)) {
              showModalMsg('Please choose a unique personal username.', false);
              return;
            }
            if (!/^\d{5}$/.test(pin5)) {
              showModalMsg(`Enter a valid 5-digit numeric password connected with ${dial}.`, false);
              return;
            }

            let usersMap = loadEncryptedUsersMap();
            // Verify with Firebase in real time if cloud bridge is ready
            if (typeof window.__verifyCloudAccount === 'function') {
              try {
                const cloudCheck = await window.__verifyCloudAccount(uname);
                if (cloudCheck && cloudCheck.checked) {
                  if (cloudCheck.exists && cloudCheck.data) {
                    usersMap[uname] = Object.assign({}, usersMap[uname] || {}, cloudCheck.data, { username: uname });
                    saveEncryptedUsersMap(usersMap);
                  } else if (cloudCheck.deleted) {
                    if (typeof window.__scrubAccountCompletelyFromWebsite === 'function') {
                      window.__scrubAccountCompletelyFromWebsite(uname, false);
                    }
                    usersMap = loadEncryptedUsersMap();
                    delete usersMap[uname];
                    saveEncryptedUsersMap(usersMap);
                  }
                }
              } catch (e) {}
            } else if (!isAccountAllowedByCloud(uname)) {
              if (typeof window.__scrubAccountCompletelyFromWebsite === 'function') {
                window.__scrubAccountCompletelyFromWebsite(uname, false);
              }
              usersMap = loadEncryptedUsersMap();
              delete usersMap[uname];
              saveEncryptedUsersMap(usersMap);
            }

            if (STATE.modalAuthMode === 'LOGIN') {
              if (!usersMap[uname]) {
                showModalMsg(`Username "${uname}" not found! You can create this account again in the Sign Up option.`, false);
                return;
              }
              if (!verifyUserCredentials(usersMap[uname], dial, pin5)) {
                showModalMsg(`Incorrect country code (${dial}) or 5-digit password for ${uname}!`, false);
                return;
              }
            } else {
              // SIGNUP MODE
              if (usersMap[uname]) {
                showModalMsg(`Username "${uname}" is already registered! Switch to Login to sign in.`, false);
                return;
              }
              stampRecentSignup(uname);
              unmarkAccountPurgedLocal(uname);
              if (typeof window.__unpurgeCloudAccount === 'function') {
                try { await window.__unpurgeCloudAccount(uname); } catch (e) {}
              }
              // Reset any old cached stats so re-created account starts fresh at 1500 ELO
              delete STATE.humanPlayers[uname];
              usersMap[uname] = {
                username: uname,
                countryCode: dial,
                countryName: cName,
                countryFlag: cFlag,
                encryptedAuth: derivePasswordVerifier(uname, dial, pin5),
                createdAt: new Date().toISOString()
              };
              saveEncryptedUsersMap(usersMap);
              if (window.__cloudAuthoritativeAccounts) {
                window.__cloudAuthoritativeAccounts[uname] = usersMap[uname];
              }
            }

            const activeProf = usersMap[uname];
            const sessObj = {
              username: activeProf.username,
              countryCode: activeProf.countryCode,
              countryName: activeProf.countryName,
              countryFlag: activeProf.countryFlag,
              loggedInAt: new Date().toISOString()
            };
            try {
              const encSess = encryptPayload(sessObj);
              sessionStorage.setItem(SESSION_STORAGE_KEY, encSess);
              localStorage.setItem(SESSION_STORAGE_KEY, encSess);
              localStorage.setItem('oddandeven_last_user_v1', activeProf.username);
              localStorage.removeItem(SIGNED_OUT_FLAG_KEY);
            } catch (e) {}

            STATE.myUsername = activeProf.username;
            STATE.myCountryCode = activeProf.countryCode;
            STATE.myCountryFlag = activeProf.countryFlag;
            STATE.myCountryName = activeProf.countryName;
            if (typeof window.__bindCloudInviteListener === 'function') {
              try { window.__bindCloudInviteListener(STATE.myUsername); } catch (e) {}
            }
            if (STATE.onlineRole !== 'GUEST') {
              STATE.p1Name = STATE.myUsername;
              STATE.p1CountryCode = STATE.myCountryCode;
              STATE.p1CountryFlag = STATE.myCountryFlag;
              STATE.p1CountryName = STATE.myCountryName;
            } else {
              STATE.p2Name = STATE.myUsername;
              STATE.p2CountryCode = STATE.myCountryCode;
              STATE.p2CountryFlag = STATE.myCountryFlag;
              STATE.p2CountryName = STATE.myCountryName;
            }
            STATE.isAuthenticated = true;

            if (el.botSetupPlayerName) el.botSetupPlayerName.value = STATE.myUsername;

            unmarkAccountPurgedLocal(STATE.myUsername);
            const myNewRec = ensureHumanPlayerRecord(STATE.myUsername, 1500, sessObj, true);
            if (!myNewRec.updatedAt) myNewRec.updatedAt = Date.now();
            STATE.eloRating = myNewRec.elo;
            STATE.peakElo = myNewRec.peak;
            reconcileAllNewPlayersIntoLeaderboard();
            saveLocalStatsOnly();
            broadcastGlobalLeaderboardSync(true, true);
            if (typeof window.__syncCloudLeaderboard === 'function') {
              try { window.__syncCloudLeaderboard(STATE.humanPlayers, usersMap, STATE.myUsername); } catch (e) {}
            }
            window.__v2ShownThisPageLoad = true;
            enforceMandatoryAuthGate();
            closeAuthModal();
            switchCenterScreen('PITCH');
            if (typeof window.openVersion2Showcase === 'function') {
              window.openVersion2Showcase();
            }
          });
        }

        // Listen for live login broadcasts from login.html
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const authBc = new BroadcastChannel('oddandeven_auth_sync');
            authBc.onmessage = (ev) => {
              if (ev && ev.data && ev.data.type === 'AUTH_LOGIN_SUCCESS' && ev.data.session) {
                const s = ev.data.session;
                STATE.myUsername = (s.username || '').trim().toUpperCase();
                STATE.myCountryCode = s.countryCode || '+91';
                STATE.myCountryFlag = s.countryFlag || '🇮🇳';
                STATE.myCountryName = s.countryName || 'India';
                STATE.p1Name = STATE.myUsername;
                STATE.p1CountryCode = STATE.myCountryCode;
                STATE.p1CountryFlag = STATE.myCountryFlag;
                STATE.p1CountryName = STATE.myCountryName;
                STATE.isAuthenticated = true;
                if (el.botSetupPlayerName) el.botSetupPlayerName.value = STATE.myUsername;
                reconcileAllNewPlayersIntoLeaderboard();
                syncAuthAndPurgeFakeSeeds();
                saveLocalStatsOnly();
                if (typeof window.__syncCloudLeaderboard === 'function') {
                  try { window.__syncCloudLeaderboard(STATE.humanPlayers, loadEncryptedUsersMap(), STATE.myUsername); } catch (e) {}
                }
                STATE.activeScreen = 'PITCH';
                renderAll();
                if (typeof window.openVersion2Showcase === 'function') {
                  window.openVersion2Showcase();
                }
              }
            };
          } catch (e) {}
        }

        if (el.sideNavLeaderboard) {
          el.sideNavLeaderboard.addEventListener('click', () => switchCenterScreen('LEADERBOARD'));
        }
        if (el.btnHeaderElo) {
          el.btnHeaderElo.addEventListener('click', () => switchCenterScreen('LEADERBOARD'));
        }
        if (el.btnBackFromLeaderboard) {
          el.btnBackFromLeaderboard.addEventListener('click', () => switchCenterScreen('PITCH'));
        }
        if (el.btnLbSwitchGlobal) {
          el.btnLbSwitchGlobal.addEventListener('click', () => {
            SoundFX.click();
            STATE.leaderboardTab = 'GLOBAL';
            renderAll();
          });
        }
        if (el.btnLbSwitchWeekly) {
          el.btnLbSwitchWeekly.addEventListener('click', () => {
            SoundFX.click();
            STATE.leaderboardTab = 'WEEKLY';
            renderAll();
          });
        }
        if (el.btnLbSwitchRuns) {
          el.btnLbSwitchRuns.addEventListener('click', () => {
            SoundFX.click();
            STATE.leaderboardTab = 'RUNS';
            renderAll();
          });
        }

        function setCommentaryModeDirect(styleKey) {
          SoundFX.click();
          STATE.commentaryStyle = styleKey;
          if (el.botSetupCommentaryStyle) el.botSetupCommentaryStyle.value = styleKey;
          STATE.liveBroadcastQuote = `"Commentary switched to ${styleKey} MODE! Live play-by-play updated in real time."`;
          STATE.liveExcitementLabel = styleKey + ' BROADCAST';
          renderAll();
        }
        if (el.btnCommOptHype) {
          el.btnCommOptHype.addEventListener('click', () => setCommentaryModeDirect('HYPE'));
        }
        if (el.btnCommOptTactical) {
          el.btnCommOptTactical.addEventListener('click', () => setCommentaryModeDirect('TACTICAL'));
        }
        if (el.btnCommOptClassic) {
          el.btnCommOptClassic.addEventListener('click', () => setCommentaryModeDirect('CLASSIC'));
        }
        if (el.btnCommOptRoast) {
          el.btnCommOptRoast.addEventListener('click', () => setCommentaryModeDirect('ROAST'));
        }

        el.cardQuickBot.addEventListener('click', () => switchCenterScreen('BOT_SETUP'));
        el.cardQuickMp.addEventListener('click', () => switchCenterScreen('MP_SETUP'));
        el.cardQuickCommentary.addEventListener('click', () => {
          SoundFX.click();
          const order = ['HYPE', 'TACTICAL', 'CLASSIC', 'ROAST'];
          const next = order[(order.indexOf(STATE.commentaryStyle) + 1) % order.length];
          STATE.commentaryStyle = next;
          el.botSetupCommentaryStyle.value = next;
          STATE.liveBroadcastQuote = `"Broadcast style switched to ${next} MODE! Every ball now carries fresh commentary flavor!"`;
          STATE.liveExcitementLabel = next + ' BROADCAST';
          renderAll();
        });

        el.btnToggleShowcaseCompact.addEventListener('click', () => {
          SoundFX.click();
          STATE.activeScreen = 'PITCH';
          renderAll();
          setTimeout(resizeCanvas, 20);
        });

        el.btnBackFromBotSetup.addEventListener('click', () => switchCenterScreen('PITCH'));
        el.btnBackFromMpSetup.addEventListener('click', () => switchCenterScreen('PITCH'));

        el.btnBotRookie.addEventListener('click', () => highlightBotCard('ROOKIE'));
        el.btnBotTactician.addEventListener('click', () => highlightBotCard('TACTICIAN'));
        el.btnBotAggressor.addEventListener('click', () => highlightBotCard('AGGRESSOR'));
        el.btnBotWall.addEventListener('click', () => highlightBotCard('WALL'));

        el.btnLaunchBotMatch.addEventListener('click', () => {
          if (!requireAccountAndPassword()) return;
          STATE.mode = 'AI';
          STATE.p1Name = STATE.myUsername;
          STATE.commentaryStyle = el.botSetupCommentaryStyle.value || 'HYPE';
          STATE.activeScreen = 'PITCH';
          resetGame(true);
          setTimeout(resizeCanvas, 20);
        });

        if (el.btnInlineCreateRoom) {
          el.btnInlineCreateRoom.addEventListener('click', () => {
            createMultiplayerRoom();
          });
        }

        if (el.btnInlineJoinRoom) {
          el.btnInlineJoinRoom.addEventListener('click', () => {
            joinMultiplayerRoom(el.inlineInputJoinCode ? el.inlineInputJoinCode.value : null);
          });
        }

        if (el.btnLaunchMpMatch) {
          el.btnLaunchMpMatch.addEventListener('click', () => {
            hostTriggerMultiplayerMatchStart();
          });
        }

        el.btnRules.addEventListener('click', openRules);
        el.btnCloseRules.addEventListener('click', closeRules);
        el.btnGotItRules.addEventListener('click', closeRules);
        el.rulesModal.addEventListener('click', (e) => {
          if (e.target === el.rulesModal) closeRules();
        });

        // Keyboard Support (1-9 => 1-9, 0 => 10, O/E for Odd/Even, Enter for advancing breaks)
        window.addEventListener('keydown', (e) => {
          if (el.authModal && !el.authModal.classList.contains('hidden')) {
            if (e.key === 'Enter' && el.btnModalSubmitAuth) {
              el.btnModalSubmitAuth.click();
            } else if (e.key === 'Escape' && STATE.isAuthenticated) {
              closeAuthModal();
            }
            return;
          }
          if (!STATE.isAuthenticated || isPlaceholderUsername(STATE.myUsername)) {
            enforceMandatoryAuthGate('🔒 Account & 5-Digit PIN Password required to play!');
            return;
          }
          if (!el.rulesModal.classList.contains('hidden')) {
            if (e.key === 'Escape' || e.key === 'Enter') closeRules();
            return;
          }
          if (!el.mpModal.classList.contains('hidden')) {
            if (e.key === 'Escape') closeMpModal();
            return;
          }
          if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            return;
          }

          let num = null;
          if (e.key >= '1' && e.key <= '9') {
            num = parseInt(e.key, 10);
          } else if (e.key === '0') {
            num = 10;
          }

          if (num !== null) {
            if (STATE.phase === 'TOSS') {
              handleTossNumberPick(num);
            } else if (STATE.phase === 'INNINGS_1' || STATE.phase === 'INNINGS_2') {
              handleGameplayTurn(num);
            }
            return;
          }

          if (STATE.phase === 'TOSS') {
            if (e.key.toLowerCase() === 'o') setTossCall('ODD');
            if (e.key.toLowerCase() === 'e') setTossCall('EVEN');
          } else if (STATE.phase === 'INNINGS_BREAK' && e.key === 'Enter') {
            startSecondInnings(false);
          } else if (STATE.phase === 'GAME_OVER' && e.key === 'Enter') {
            resetGame(false);
          }
        });

        window.addEventListener('resize', resizeCanvas);
      }

      // Initialize on window.onload per Core Rule 5
      window.onload = function () {
        syncAuthAndPurgeFakeSeeds();
        buildNumberButtons();
        bindEvents();
        initWorldwideLeaderboardHub();
        const topInviteBanner = document.getElementById('topInviteFriendsBanner');
        const topInviteBtn = document.getElementById('btnTopInviteFriendsCta');
        const goFriendsTab = (ev) => {
          if (ev) ev.stopPropagation();
          if (el.sideNavFriends) {
            el.sideNavFriends.click();
          } else {
            STATE.activeScreen = 'FRIENDS';
            renderAll();
          }
          setTimeout(() => {
            if (el.inputFriendSearch) el.inputFriendSearch.focus();
          }, 80);
        };
        if (topInviteBanner) topInviteBanner.addEventListener('click', goFriendsTab);
        if (topInviteBtn) topInviteBtn.addEventListener('click', goFriendsTab);
        broadcastGlobalLeaderboardSync(true, true);
        renderAll();
        enforceMandatoryAuthGate();
        resizeCanvas();
        startAnimationLoop();
        renderEventsTabAndCountdowns();
        renderAchievementsSection();
        setInterval(renderEventsTabAndCountdowns, 1000);
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const fromLogin = urlParams.get('from') === 'login';
          const reqScreen = (urlParams.get('screen') || '').trim().toUpperCase();
          if (fromLogin) {
            switchCenterScreen(reqScreen && reqScreen !== 'LEADERBOARD' ? reqScreen : 'PITCH');
          } else if (reqScreen === 'LEADERBOARD' || reqScreen === 'EVENTS' || reqScreen === 'ACHIEVEMENTS' || reqScreen === 'PROFILE' || reqScreen === 'STORE' || reqScreen === 'PITCH') {
            switchCenterScreen(reqScreen);
          } else {
            switchCenterScreen('PITCH');
          }
        } catch (e) {}
      };
    })();

// ==========================================
// 10. FIREBASE CLOUD SYNC BRIDGE (Full Real-Time Integration)
// ==========================================
(function initFirebaseCloudModule() {
  'use strict';
  const firebaseConfigRaw = typeof __firebase_config !== 'undefined' && __firebase_config ? __firebase_config : null;

  let firebaseConfig = null;
  if (firebaseConfigRaw) {
    try {
      firebaseConfig = typeof firebaseConfigRaw === 'string' ? JSON.parse(firebaseConfigRaw) : firebaseConfigRaw;
    } catch (e) {
      firebaseConfig = null;
    }
  }
  if (!firebaseConfig) {
    firebaseConfig = {
      apiKey: "AIzaSyDDeP-6rWqo0WFuMHv5jKtBVBuLnCz5Id0",
      authDomain: "oddeven-1c742.firebaseapp.com",
      projectId: "oddeven-1c742",
      storageBucket: "oddeven-1c742.firebasestorage.app",
      messagingSenderId: "266550623227",
      appId: "1:266550623227:web:3edc0b6a98d2e99fa8e95e",
      measurementId: "G-7M71J054G0"
    };
  }

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'oddandeven-arena-app';

  Promise.all([
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js')
  ])
    .then(async ([appMod, authMod, firestoreMod]) => {
      const { initializeApp, getApps, getApp } = appMod;
      const { getAuth, signInAnonymously, signInWithCustomToken, deleteUser, signOut } = authMod;
      const { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } = firestoreMod;

      const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const db = getFirestore(app);

      let currentUser = null;
      let artAccounts = {};
      let rootAccounts = {};
      let artPlayers = {};
      let rootPlayers = {};
      let artPurged = [];
      let rootPurged = [];

      let artAccLoaded = false;
      let rootAccLoaded = false;
      let artLbLoaded = false;
      let rootLbLoaded = false;

      let cloudPlayers = {};
      let cloudAccounts = {};
      let cloudPurged = [];

      const isRecentCloudSignup = (uname) => {
        const clean = String(uname || '').trim().toUpperCase();
        if (!clean) return false;
        try {
          const ts = Number(localStorage.getItem('oddandeven_recent_signup_' + clean)) || 0;
          return ts > 0 && (Date.now() - ts) < 120000;
        } catch (e) {
          return false;
        }
      };

      const loadCloudSyncedCols = () => {
        try {
          const raw = localStorage.getItem('oddandeven_cloud_synced_cols_v1');
          return raw ? (JSON.parse(raw) || {}) : {};
        } catch (e) {
          return {};
        }
      };

      const saveCloudSyncedCols = (map) => {
        try {
          localStorage.setItem('oddandeven_cloud_synced_cols_v1', JSON.stringify(map || {}));
        } catch (e) {}
      };

      const deleteAllCloudAccountMirrors = async (uname) => {
        const clean = String(uname || '').trim().toUpperCase();
        if (!db || !clean || isRecentCloudSignup(clean)) return;
        try {
          const colsMap = loadCloudSyncedCols();
          if (colsMap[clean]) {
            delete colsMap[clean];
            saveCloudSyncedCols(colsMap);
          }
        } catch (e) {}
        try {
          await Promise.allSettled([
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean)),
            deleteDoc(doc(db, 'accounts', clean)),
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean)),
            deleteDoc(doc(db, 'leaderboard', clean))
          ]);
        } catch (e) {}
      };

      const recomputeAuthoritativeCloudState = () => {
        if (!artAccLoaded && !rootAccLoaded) return;
        cloudPurged = Array.from(new Set([...artPurged, ...rootPurged])).filter((u) => !isRecentCloudSignup(u));

        const syncedColsMap = loadCloudSyncedCols();
        let localVault = {};
        try {
          if (typeof window.__loadLocalVaultForCloud === 'function') {
            localVault = window.__loadLocalVaultForCloud() || {};
          }
        } catch (e) {}

        FAKE_SEED_NAMES.forEach((fakeName) => {
          deleteAllCloudAccountMirrors(fakeName);
          delete artAccounts[fakeName];
          delete rootAccounts[fakeName];
          delete artPlayers[fakeName];
          delete rootPlayers[fakeName];
          delete localVault[fakeName];
        });

        const allSeen = new Set([
          ...Object.keys(artAccounts),
          ...Object.keys(rootAccounts),
          ...Object.keys(artPlayers),
          ...Object.keys(rootPlayers),
          ...Object.keys(localVault)
        ]);

        const nextAccounts = {};
        const nextPlayers = {};
        let needsReseedSync = false;

        allSeen.forEach((clean) => {
          if (!clean) return;
          if (cloudPurged.includes(clean) && !isRecentCloudSignup(clean)) {
            deleteAllCloudAccountMirrors(clean);
            return;
          }
          const inArtAcc = Boolean(artAccounts[clean]);
          const inRootAcc = Boolean(rootAccounts[clean]);
          const inArtLb = Boolean(artPlayers[clean]);
          const inRootLb = Boolean(rootPlayers[clean]);
          const hasAnyAcc = inArtAcc || inRootAcc || inArtLb || inRootLb || Boolean(localVault[clean]);

          if (hasAnyAcc) {
            nextAccounts[clean] = Object.assign({}, localVault[clean] || {}, rootAccounts[clean] || {}, artAccounts[clean] || {}, { username: clean });
            const rawBasePlayer = Object.assign({}, rootPlayers[clean] || {}, artPlayers[clean] || {});
            const basePlayer = typeof window.__sanitizeRecordForFreshEpoch === 'function'
              ? window.__sanitizeRecordForFreshEpoch(rawBasePlayer)
              : rawBasePlayer;
            const curWk = getMondaySundayWeekInfo().weekKey;
            const sanitizedBasePlayer = Object.assign({}, basePlayer);
            if (sanitizedBasePlayer.weekKey !== curWk) {
              sanitizedBasePlayer.weekKey = curWk;
              sanitizedBasePlayer.weeklyEloGain = 0;
              sanitizedBasePlayer.weeklyWins = 0;
              sanitizedBasePlayer.weeklyLosses = 0;
              sanitizedBasePlayer.weeklyMatches = 0;
              sanitizedBasePlayer.weeklyRuns = 0;
              sanitizedBasePlayer.weeklyWickets = 0;
            }
            nextPlayers[clean] = Object.assign({
              name: clean,
              countryCode: nextAccounts[clean].countryCode || '+91',
              countryFlag: nextAccounts[clean].countryFlag || '🇮🇳',
              countryName: nextAccounts[clean].countryName || 'India',
              isRealRegisteredUser: true,
              elo: 1500,
              peak: 1500,
              wins: 0,
              losses: 0,
              matches: 0,
              totalRuns: 0,
              totalBalls: 0,
              highScore: 0,
              wicketsTaken: 0,
              weekKey: curWk,
              weeklyEloGain: 0,
              weeklyWins: 0,
              weeklyLosses: 0,
              weeklyMatches: 0,
              weeklyRuns: 0,
              weeklyWickets: 0,
              updatedAt: Date.now()
            }, sanitizedBasePlayer);

            syncedColsMap[clean] = {
              artAcc: inArtAcc,
              rootAcc: inRootAcc,
              artLb: inArtLb,
              rootLb: inRootLb,
              updatedAt: Date.now()
            };

            // If account was missing from leaderboard collection in cloud, seed it!
            if (!inArtLb || !inRootLb) {
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean), nextPlayers[clean], { merge: true }).catch(() => {});
              setDoc(doc(db, 'leaderboard', clean), nextPlayers[clean], { merge: true }).catch(() => {});
            }
            if (localVault[clean] && (!inArtAcc || !inRootAcc)) {
              needsReseedSync = true;
            }
          }
        });

        saveCloudSyncedCols(syncedColsMap);

        cloudAccounts = nextAccounts;
        cloudPlayers = nextPlayers;
        window.__cloudAccountsLoaded = Boolean(artAccLoaded || rootAccLoaded);
        window.__cloudAuthoritativeAccounts = cloudAccounts;

        if (typeof window.__onCloudLeaderboardUpdate === 'function') {
          window.__onCloudLeaderboardUpdate(cloudPlayers, cloudAccounts, cloudPurged, window.__cloudAccountsLoaded);
        }

        if (needsReseedSync && typeof window.__syncCloudLeaderboard === 'function') {
          try {
            window.__syncCloudLeaderboard(null, localVault, null);
          } catch (e) {}
        }
      };

      const handleRemovedDocsInSnapshot = (snapshot, targetMap) => {
        if (!snapshot || typeof snapshot.docChanges !== 'function') return;
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            const d = change.doc;
            const data = d ? d.data() : null;
            const clean = String((data && (data.username || data.name)) || (d && d.id) || '').trim().toUpperCase();
            if (clean && !isRecentCloudSignup(clean)) {
              delete targetMap[clean];
              delete artAccounts[clean];
              delete rootAccounts[clean];
              delete artPlayers[clean];
              delete rootPlayers[clean];
              if (window.__cloudAuthoritativeAccounts) delete window.__cloudAuthoritativeAccounts[clean];
              deleteAllCloudAccountMirrors(clean);
              if (typeof window.__scrubAccountCompletelyFromWebsite === 'function') {
                window.__scrubAccountCompletelyFromWebsite(clean, true);
              }
            }
          }
        });
      };

      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          const cred = await signInWithCustomToken(auth, __initial_auth_token);
          currentUser = cred.user;
        } else {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        }
      } catch (e) {
        console.warn('Anonymous sign-in notice:', e);
      }

      // Live snapshot listeners for real-time multiplayer & deletion synchronization
      try {
        const accountsCol = collection(db, 'artifacts', appId, 'public', 'data', 'accounts');
        onSnapshot(accountsCol, (snapshot) => {
          handleRemovedDocsInSnapshot(snapshot, artAccounts);
          artAccounts = {};
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              const c = String((d && d.username) || docSnap.id).trim().toUpperCase();
              if (c) artAccounts[c] = d;
            }
          });
          artAccLoaded = true;
          recomputeAuthoritativeCloudState();
        }, (err) => console.warn('Cloud accounts snapshot notice:', err));

        const lbCol = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
        onSnapshot(lbCol, (snapshot) => {
          handleRemovedDocsInSnapshot(snapshot, artPlayers);
          artPlayers = {};
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              const c = String((d && (d.name || d.username)) || docSnap.id).trim().toUpperCase();
              if (c) artPlayers[c] = d;
            }
          });
          artLbLoaded = true;
          recomputeAuthoritativeCloudState();
        }, (err) => console.warn('Cloud leaderboard snapshot notice:', err));

        const purgedCol = collection(db, 'artifacts', appId, 'public', 'data', 'purged_accounts');
        onSnapshot(purgedCol, (snapshot) => {
          artPurged = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              artPurged.push(docSnap.id.toUpperCase());
            }
          });
          recomputeAuthoritativeCloudState();
        }, (err) => console.warn('Cloud purged snapshot notice:', err));
      } catch (e) {
        console.warn('Snapshot listeners setup notice:', e);
      }

      // Root collection listeners
      try {
        onSnapshot(collection(db, 'accounts'), (snapshot) => {
          handleRemovedDocsInSnapshot(snapshot, rootAccounts);
          rootAccounts = {};
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              const c = String((d && d.username) || docSnap.id).trim().toUpperCase();
              if (c) rootAccounts[c] = d;
            }
          });
          rootAccLoaded = true;
          recomputeAuthoritativeCloudState();
        }, () => {});

        onSnapshot(collection(db, 'leaderboard'), (snapshot) => {
          handleRemovedDocsInSnapshot(snapshot, rootPlayers);
          rootPlayers = {};
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              const d = docSnap.data();
              const c = String((d && (d.name || d.username)) || docSnap.id).trim().toUpperCase();
              if (c) rootPlayers[c] = d;
            }
          });
          rootLbLoaded = true;
          recomputeAuthoritativeCloudState();
        }, () => {});

        onSnapshot(collection(db, 'purged_accounts'), (snapshot) => {
          rootPurged = [];
          snapshot.forEach((docSnap) => {
            if (docSnap.exists()) {
              rootPurged.push(docSnap.id.toUpperCase());
            }
          });
          recomputeAuthoritativeCloudState();
        }, () => {});
      } catch (e) {}

      window.__verifyCloudAccount = async function (username) {
        const clean = String(username || '').trim().toUpperCase();
        if (!db || !clean) return { checked: false, exists: false, data: null };
        try {
          const [rArt, rRoot, rPArt, rPRoot] = await Promise.allSettled([
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean)),
            getDoc(doc(db, 'accounts', clean)),
            getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purged_accounts', clean)),
            getDoc(doc(db, 'purged_accounts', clean))
          ]);
          const sArt = rArt.status === 'fulfilled' ? rArt.value : null;
          const sRoot = rRoot.status === 'fulfilled' ? rRoot.value : null;
          const pArt = rPArt.status === 'fulfilled' ? rPArt.value : null;
          const pRoot = rPRoot.status === 'fulfilled' ? rPRoot.value : null;
          const inArt = Boolean(sArt && sArt.exists());
          const inRoot = Boolean(sRoot && sRoot.exists());
          const isPurged = ((pArt && pArt.exists()) || (pRoot && pRoot.exists())) && !isRecentCloudSignup(clean);
          const syncedCols = (loadCloudSyncedCols()[clean]) || {};
          const wasDeleted = !isRecentCloudSignup(clean) && (
            (syncedCols.artAcc && rArt.status === 'fulfilled' && !inArt) ||
            (syncedCols.rootAcc && rRoot.status === 'fulfilled' && !inRoot)
          );
          if (isPurged || wasDeleted) {
            await deleteAllCloudAccountMirrors(clean);
            return { checked: true, exists: false, deleted: true, data: null };
          }
          if (inArt || inRoot) {
            return { checked: true, exists: true, deleted: false, data: (inArt ? sArt.data() : null) || (inRoot ? sRoot.data() : null) };
          }
          return { checked: true, exists: false, deleted: false, data: null };
        } catch (e) {
          return { checked: false, exists: false, deleted: false, data: null };
        }
      };

      window.__unpurgeCloudAccount = async function (username) {
        if (!db || !username) return;
        const clean = String(username).trim().toUpperCase();
        artPurged = artPurged.filter((u) => u !== clean);
        rootPurged = rootPurged.filter((u) => u !== clean);
        cloudPurged = cloudPurged.filter((u) => u !== clean);
        try {
          await Promise.allSettled([
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purged_accounts', clean)),
            deleteDoc(doc(db, 'purged_accounts', clean))
          ]);
        } catch (e) {}
      };

      window.__syncCloudLeaderboard = async function (humanPlayersMap, usersVault, activeUsername) {
        if (!db) return;
        try {
          const canPushUser = (clean) => {
            if (!clean || clean.length < 3 || isPlaceholderUsername(clean)) return false;
            if (cloudPurged.includes(clean)) return false;
            return true;
          };

          if (usersVault && typeof usersVault === 'object') {
            for (const k of Object.keys(usersVault)) {
              const clean = (k || '').trim().toUpperCase();
              if (canPushUser(clean)) {
                const uPayload = usersVault[k];
                await Promise.allSettled([
                  setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean), uPayload, { merge: true }),
                  setDoc(doc(db, 'accounts', clean), uPayload, { merge: true })
                ]);
                artAccounts[clean] = uPayload;
                rootAccounts[clean] = uPayload;
                cloudAccounts[clean] = uPayload;

                if (!cloudPlayers[clean] && (!humanPlayersMap || !humanPlayersMap[clean])) {
                  const seedRec = {
                    name: clean,
                    countryCode: uPayload.countryCode || '+91',
                    countryFlag: uPayload.countryFlag || '🇮🇳',
                    countryName: uPayload.countryName || 'India',
                    isRealRegisteredUser: true,
                    elo: 1500,
                    peak: 1500,
                    wins: 0,
                    losses: 0,
                    matches: 0,
                    totalRuns: 0,
                    totalBalls: 0,
                    highScore: 0,
                    wicketsTaken: 0,
                    wicketsLost: 0,
                    ballsBowled: 0,
                    weeklyEloGain: 0,
                    weeklyWins: 0,
                    weeklyLosses: 0,
                    weeklyMatches: 0,
                    weeklyRuns: 0,
                    weeklyWickets: 0,
                    updatedAt: Date.now()
                  };
                  artPlayers[clean] = seedRec;
                  rootPlayers[clean] = seedRec;
                  cloudPlayers[clean] = seedRec;
                  await Promise.allSettled([
                    setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean), seedRec, { merge: true }),
                    setDoc(doc(db, 'leaderboard', clean), seedRec, { merge: true })
                  ]);
                }
              }
            }
          }
          if (humanPlayersMap && typeof humanPlayersMap === 'object') {
            for (const k of Object.keys(humanPlayersMap)) {
              const clean = (k || '').trim().toUpperCase();
              const localRec = humanPlayersMap[k];
              if (!localRec || !localRec.isRealRegisteredUser || !canPushUser(clean)) continue;
              const rawCloudDoc = Object.assign({}, rootPlayers[clean] || {}, artPlayers[clean] || {});
              const cloudFloor = Math.max(Number(rawCloudDoc.matches) || 0, Number(localRec.cloudMatchesFloor) || 0);
              const cloudRec = cloudPlayers[clean];
              const mergedRec = typeof window.__mergeSinglePlayerRecord === 'function' && cloudRec
                ? window.__mergeSinglePlayerRecord(cloudRec, localRec).record
                : localRec;
              mergedRec.statsEpoch = '{RESET_EPOCH}';
              mergedRec.v2Matches = mergedRec.matches || 0;
              mergedRec.cloudMatchesFloor = cloudFloor;
              artPlayers[clean] = mergedRec;
              rootPlayers[clean] = mergedRec;
              cloudPlayers[clean] = mergedRec;
              const firestorePayload = Object.assign({}, mergedRec, {
                v2Matches: mergedRec.matches || 0,
                matches: Math.max(mergedRec.matches || 0, cloudFloor + (mergedRec.matches || 0))
              });
              await Promise.allSettled([
                setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean), firestorePayload, { merge: true }),
                setDoc(doc(db, 'leaderboard', clean), firestorePayload, { merge: true })
              ]);
            }
          }
        } catch (e) {}
      };

      window.__purgeCloudAccount = async function (username, googleUid = null) {
        if (!username) return;
        const clean = username.trim().toUpperCase();
        try {
          localStorage.removeItem('oddandeven_recent_signup_' + clean);
        } catch (e) {}
        const uidToDelete = googleUid || (cloudAccounts[clean] && cloudAccounts[clean].googleUid) || (artAccounts[clean] && artAccounts[clean].googleUid) || (rootAccounts[clean] && rootAccounts[clean].googleUid) || (auth && auth.currentUser ? auth.currentUser.uid : null);

        delete artAccounts[clean];
        delete rootAccounts[clean];
        delete artPlayers[clean];
        delete rootPlayers[clean];
        delete cloudAccounts[clean];
        delete cloudPlayers[clean];
        if (window.__cloudAuthoritativeAccounts) {
          delete window.__cloudAuthoritativeAccounts[clean];
        }

        // 1. Permanently delete all account & player documents from Firestore Database
        if (db) {
          try {
            const purgeDoc = { username: clean, purgedAt: Date.now() };
            const tasks = [
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purged_accounts', clean), purgeDoc),
              setDoc(doc(db, 'purged_accounts', clean), purgeDoc),
              deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean)),
              deleteDoc(doc(db, 'leaderboard', clean)),
              deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean)),
              deleteDoc(doc(db, 'accounts', clean)),
              deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friends', clean)),
              deleteDoc(doc(db, 'friends', clean)),
              deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', clean)),
              deleteDoc(doc(db, 'friend_requests', clean)),
              deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', clean)),
              deleteDoc(doc(db, 'invites', clean))
            ];
            if (uidToDelete) {
              tasks.push(deleteDoc(doc(db, 'artifacts', appId, 'users', uidToDelete, 'profile', 'main')));
            }
            await Promise.allSettled(tasks);
          } catch (e) {}
        }

        // 2. Permanently delete user from Firebase Authentication
        if (auth && auth.currentUser) {
          try {
            if (typeof deleteUser === 'function') {
              await deleteUser(auth.currentUser);
            }
          } catch (e) {
            try {
              if (typeof signOut === 'function') {
                await signOut(auth);
              }
            } catch (err) {}
          }
          currentUser = null;
          try {
            const cred = await signInAnonymously(auth);
            currentUser = cred.user;
          } catch (e) {}
        }
      };

      // Real-time Cloud Room Signaling
      let boundRoomCode = null;
      let roomUnsub = null;
      let recentHostMsgs = [];
      let recentGuestMsgs = [];
      let pendingRoomOutboundQueue = [];

      window.__bindCloudRoom = function (roomCode) {
        const cleanCode = String(roomCode || '').trim().toUpperCase();
        if (!cleanCode) return;
        if (boundRoomCode !== cleanCode) {
          recentHostMsgs = [];
          recentGuestMsgs = [];
        }
        boundRoomCode = cleanCode;
        if (!db) return;
        if (typeof roomUnsub === 'function') {
          try { roomUnsub(); } catch (e) {}
          roomUnsub = null;
        }
        const handleRoomSnap = (docSnap) => {
          if (!docSnap || !docSnap.exists()) return;
          const data = docSnap.data();
          if (!data) return;
          const combinedMsgs = [];
          if (Array.isArray(data.hostMessages)) combinedMsgs.push(...data.hostMessages);
          if (Array.isArray(data.guestMessages)) combinedMsgs.push(...data.guestMessages);
          if (Array.isArray(data.messages)) combinedMsgs.push(...data.messages);
          if (data.lastHostMessage) combinedMsgs.push(data.lastHostMessage);
          if (data.lastGuestMessage) combinedMsgs.push(data.lastGuestMessage);
          if (data.lastMessage) combinedMsgs.push(data.lastMessage);
          combinedMsgs.sort((a, b) => ((a && a._ts) || 0) - ((b && b._ts) || 0));
          combinedMsgs.forEach((m) => {
            if (m && typeof window.__onCloudRoomMessage === 'function') {
              window.__onCloudRoomMessage(m);
            }
          });
        };
        const u1 = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanCode), handleRoomSnap, () => {});
        const u2 = onSnapshot(doc(db, 'rooms', cleanCode), handleRoomSnap, () => {});
        roomUnsub = () => {
          try { u1(); } catch (e) {}
          try { u2(); } catch (e) {}
        };
      };

      window.__sendCloudRoomMessage = async function (roomCode, msgObj) {
        if (!roomCode || !msgObj) return;
        const cleanCode = String(roomCode).trim().toUpperCase();
        const stamped = Object.assign({}, msgObj, { roomCode: cleanCode, _ts: Date.now() });
        if (!db) {
          pendingRoomOutboundQueue.push({ roomCode: cleanCode, msgObj: stamped });
          return;
        }
        const isGuestMsg = stamped.senderRole === 'GUEST' || stamped.type === 'JOIN_HELLO' || stamped.type === 'GUEST_JOINED';
        const roomPayload = {
          roomCode: cleanCode,
          lastMessage: stamped,
          updatedAt: Date.now()
        };
        if (isGuestMsg) {
          recentGuestMsgs = recentGuestMsgs.filter((m) => m && m.roomCode === cleanCode && (Date.now() - (m._ts || 0) < 45000)).slice(-12);
          recentGuestMsgs.push(stamped);
          roomPayload.lastGuestMessage = stamped;
          roomPayload.guestMessages = recentGuestMsgs;
        } else {
          recentHostMsgs = recentHostMsgs.filter((m) => m && m.roomCode === cleanCode && (Date.now() - (m._ts || 0) < 45000)).slice(-12);
          recentHostMsgs.push(stamped);
          roomPayload.lastHostMessage = stamped;
          roomPayload.hostMessages = recentHostMsgs;
        }
        try {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanCode), roomPayload, { merge: true }).catch(() => {});
          setDoc(doc(db, 'rooms', cleanCode), roomPayload, { merge: true }).catch(() => {});
        } catch (e) {}
      };

      window.__leaveCloudRoom = function () {
        if (typeof roomUnsub === 'function') {
          try { roomUnsub(); } catch (e) {}
          roomUnsub = null;
        }
        boundRoomCode = null;
        recentHostMsgs = [];
        recentGuestMsgs = [];
      };

      // Real-time Friend Match Invites (Firestore)
      let inviteUnsub = null;
      let boundInviteUser = null;

      window.__sendCloudFriendInvite = async function (toUser, fromUser, fromFlag, roomCode) {
        if (!db || !toUser || !roomCode) return;
        const cleanTarget = String(toUser).trim().toUpperCase();
        const cleanFrom = String(fromUser || '').trim().toUpperCase();
        const payload = {
          fromUser: cleanFrom,
          fromFlag: fromFlag || '🇮🇳',
          roomCode: String(roomCode).trim().toUpperCase(),
          timestamp: Date.now(),
          toUser: cleanTarget
        };
        try {
          await Promise.allSettled([
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', cleanTarget), payload),
            setDoc(doc(db, 'invites', cleanTarget), payload),
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', 'GLOBAL_LATEST'), payload),
            setDoc(doc(db, 'invites', 'GLOBAL_LATEST'), payload)
          ]);
        } catch (e) {}
      };

      window.__clearCloudFriendInvite = async function (username) {
        if (!db || !username) return;
        const clean = String(username).trim().toUpperCase();
        try {
          await Promise.allSettled([
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', clean)),
            deleteDoc(doc(db, 'invites', clean))
          ]);
        } catch (e) {}
      };

      window.__sendCloudMatchDecline = async function (toHostUser, fromGuestUser, roomCode) {
        if (!db || !toHostUser) return;
        const cleanHost = String(toHostUser).trim().toUpperCase();
        const payload = {
          type: 'FRIEND_MATCH_DECLINE',
          fromUser: String(fromGuestUser || '').trim().toUpperCase(),
          toUser: cleanHost,
          roomCode: String(roomCode || '').trim().toUpperCase(),
          timestamp: Date.now()
        };
        try {
          await Promise.allSettled([
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', cleanHost), payload),
            setDoc(doc(db, 'invites', cleanHost), payload)
          ]);
        } catch (e) {}
      };

            function getAuthoritativeLocalUsername() {
        try {
          if (typeof window.__getActiveUsername === 'function') {
            const u = window.__getActiveUsername();
            if (u && !isPlaceholder(u)) return u.trim().toUpperCase();
          }
          const lastU = localStorage.getItem('oddandeven_last_user_v1');
          if (lastU && !isPlaceholder(lastU)) return lastU.trim().toUpperCase();
          const rawSess = sessionStorage.getItem('oddandeven_active_session_v1')
            || localStorage.getItem('oddandeven_active_session_v1')
            || sessionStorage.getItem('oddandeven_active_session_v2')
            || localStorage.getItem('oddandeven_active_session_v2');
          if (rawSess && typeof window.__decryptPayload === 'function') {
            const dec = window.__decryptPayload(rawSess);
            if (dec && dec.username && !isPlaceholder(dec.username)) return dec.username.trim().toUpperCase();
          }
        } catch (e) {}
        return 'PLAYER';
      }

      window.__sendCloudFriendRequest = async function (targetUser, reqObj) {
        if (!db || !targetUser || !reqObj) return;
        const cleanTarget = String(targetUser).trim().toUpperCase();
        try {
          let currentList = [];
          try {
            const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', cleanTarget)).catch(() => null)
              || await getDoc(doc(db, 'friend_requests', cleanTarget)).catch(() => null);
            if (snap && snap.exists() && Array.isArray(snap.data().requests)) {
              currentList = snap.data().requests;
            }
          } catch (e) {}

          if (currentList.length === 0) {
            const rawR = localStorage.getItem('oddandeven_friend_requests_v1');
            const mapR = rawR ? JSON.parse(rawR) : {};
            if (Array.isArray(mapR[cleanTarget])) currentList = mapR[cleanTarget];
          }

          const fromU = String(reqObj.from || '').trim().toUpperCase();
          const idx = currentList.findIndex((r) => r && String(r.from || '').trim().toUpperCase() === fromU);
          if (idx >= 0) currentList[idx] = reqObj;
          else currentList.unshift(reqObj);

          const docPayload = {
            username: cleanTarget,
            requests: currentList,
            latestRequest: {
              from: reqObj.from,
              to: cleanTarget,
              fromFlag: reqObj.fromFlag || '🇮🇳',
              fromCode: reqObj.fromCode || '+91',
              fromElo: reqObj.fromElo || 1500,
              timestamp: reqObj.timestamp || Date.now()
            },
            updatedAt: Date.now()
          };

          await Promise.allSettled([
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', cleanTarget), docPayload, { merge: true }),
            setDoc(doc(db, 'friend_requests', cleanTarget), docPayload, { merge: true }),
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', 'GLOBAL_LATEST'), docPayload),
            setDoc(doc(db, 'friend_requests', 'GLOBAL_LATEST'), docPayload)
          ]);
        } catch (e) {}
      };

      window.__respondCloudFriendRequest = async function (responderUser, requesterUser, action, responderFriends, requesterFriends) {
        if (!db || !responderUser || !requesterUser) return;
        const cleanResp = String(responderUser).trim().toUpperCase();
        const cleanReq = String(requesterUser).trim().toUpperCase();
        try {
          const rawR = localStorage.getItem('oddandeven_friend_requests_v1');
          const mapR = rawR ? JSON.parse(rawR) : {};
          const nextReqs = Array.isArray(mapR[cleanResp]) ? mapR[cleanResp] : [];
          const reqDocPayload = {
            username: cleanResp,
            requests: nextReqs,
            latestResponse: {
              action: action,
              fromUser: cleanResp,
              toUser: cleanReq,
              timestamp: Date.now()
            },
            updatedAt: Date.now()
          };
          await Promise.allSettled([
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', cleanResp), reqDocPayload, { merge: true }),
            setDoc(doc(db, 'friend_requests', cleanResp), reqDocPayload, { merge: true }),
            setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', 'GLOBAL_LATEST'), reqDocPayload),
            setDoc(doc(db, 'friend_requests', 'GLOBAL_LATEST'), reqDocPayload)
          ]);

          if (action === 'ACCEPT') {
            const friendsPayloadResp = {
              username: cleanResp,
              friends: Array.isArray(responderFriends) ? responderFriends : [],
              updatedAt: Date.now()
            };
            const friendsPayloadReq = {
              username: cleanReq,
              friends: Array.isArray(requesterFriends) ? requesterFriends : [],
              updatedAt: Date.now()
            };
            const globalFriendsPayload = {
              type: 'FRIEND_REQUEST_RESPONSE',
              action: 'ACCEPT',
              fromUser: cleanResp,
              toUser: cleanReq,
              timestamp: Date.now()
            };
            await Promise.allSettled([
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friends', cleanResp), friendsPayloadResp, { merge: true }),
              setDoc(doc(db, 'friends', cleanResp), friendsPayloadResp, { merge: true }),
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friends', cleanReq), friendsPayloadReq, { merge: true }),
              setDoc(doc(db, 'friends', cleanReq), friendsPayloadReq, { merge: true }),
              setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'friends', 'GLOBAL_LATEST'), globalFriendsPayload),
              setDoc(doc(db, 'friends', 'GLOBAL_LATEST'), globalFriendsPayload)
            ]);
          }
        } catch (e) {}
      };

      window.__bindCloudInviteListener = function (username) {
        const clean = String(username || '').trim().toUpperCase();
        if (!clean || clean.length < 2) return;
        if (boundInviteUser === clean && inviteUnsub) return;
        boundInviteUser = clean;
        if (!db) return;
        if (typeof inviteUnsub === 'function') {
          try { inviteUnsub(); } catch (e) {}
          inviteUnsub = null;
        }

        const handleSnap = (docSnap) => {
          if (!docSnap || !docSnap.exists()) return;
          const data = docSnap.data();
          if (!data) return;
          if (data.type === 'FRIEND_MATCH_DECLINE' && Date.now() - (data.timestamp || 0) < 60000) {
            try {
              localStorage.setItem('oddandeven_friend_invite_bus', JSON.stringify(data));
              window.dispatchEvent(new StorageEvent('storage', { key: 'oddandeven_friend_invite_bus', newValue: JSON.stringify(data) }));
            } catch (e) {}
            deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'invites', clean)).catch(() => {});
            deleteDoc(doc(db, 'invites', clean)).catch(() => {});
            return;
          }
          if (typeof window.__onCloudFriendInvite === 'function') {
            try { window.__onCloudFriendInvite(data); } catch (e) {}
          }
        };

        const handleReqSnap = (docSnap) => {
          if (!docSnap || !docSnap.exists()) return;
          const data = docSnap.data();
          if (!data) return;

          let updated = false;
          let newReqForMe = null;
          try {
            const rawR = localStorage.getItem('oddandeven_friend_requests_v1');
            const mapR = rawR ? JSON.parse(rawR) : {};
            if (!Array.isArray(mapR[clean])) mapR[clean] = [];

            if (data.latestRequest && String(data.latestRequest.to || '').trim().toUpperCase() === clean) {
              const req = data.latestRequest;
              const exists = mapR[clean].some((r) => r && String(r.from || '').trim().toUpperCase() === String(req.from || '').trim().toUpperCase());
              if (!exists) {
                mapR[clean].unshift(req);
                updated = true;
                newReqForMe = req;
              }
            }
            if (Array.isArray(data.requests) && String(data.username || docSnap.id).trim().toUpperCase() === clean) {
              const existingSenders = new Set(mapR[clean].map((r) => String(r && r.from || '').trim().toUpperCase()));
              data.requests.forEach((r) => {
                const sName = String(r && r.from || '').trim().toUpperCase();
                if (sName && !existingSenders.has(sName)) {
                  mapR[clean].unshift(r);
                  existingSenders.add(sName);
                  updated = true;
                  if (!newReqForMe) newReqForMe = r;
                }
              });
            }

            if (updated) {
              localStorage.setItem('oddandeven_friend_requests_v1', JSON.stringify(mapR));
              window.dispatchEvent(new StorageEvent('storage', { key: 'oddandeven_friend_requests_v1', newValue: JSON.stringify(mapR) }));
            }
            if (newReqForMe && typeof window.__onCloudFriendRequest === 'function') {
              try { window.__onCloudFriendRequest(newReqForMe); } catch (e) {}
            }
          } catch (e) {}
        };

        const handleFriendsSnap = (docSnap) => {
          if (!docSnap || !docSnap.exists()) return;
          const data = docSnap.data();
          if (!data) return;
          try {
            const rawF = localStorage.getItem('oddandeven_friends_map_v1');
            const mapF = rawF ? JSON.parse(rawF) : {};
            let friendsChanged = false;
            if (Array.isArray(data.friends) && String(data.username || docSnap.id).trim().toUpperCase() === clean) {
              const combined = Array.from(new Set([...(mapF[clean] || []), ...data.friends]));
              if (combined.length !== (mapF[clean] || []).length) {
                mapF[clean] = combined;
                friendsChanged = true;
              }
            }
            if (data.type === 'FRIEND_REQUEST_RESPONSE' && data.action === 'ACCEPT' && String(data.toUser || '').trim().toUpperCase() === clean) {
              const newFriend = String(data.fromUser || '').trim().toUpperCase();
              if (newFriend) {
                const combined = Array.from(new Set([...(mapF[clean] || []), newFriend]));
                if (combined.length !== (mapF[clean] || []).length) {
                  mapF[clean] = combined;
                  friendsChanged = true;
                }
              }
            }
            if (friendsChanged) {
              localStorage.setItem('oddandeven_friends_map_v1', JSON.stringify(mapF));
              localStorage.setItem('oddandeven_friends_' + clean, JSON.stringify(mapF[clean]));
              window.dispatchEvent(new StorageEvent('storage', { key: 'oddandeven_friends_map_v1', newValue: JSON.stringify(mapF) }));
            }
          } catch (e) {}
        };

        const unsubs = [
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'invites', clean), handleSnap, () => {}),
          onSnapshot(doc(db, 'invites', clean), handleSnap, () => {}),
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'invites', 'GLOBAL_LATEST'), handleSnap, () => {}),
          onSnapshot(doc(db, 'invites', 'GLOBAL_LATEST'), handleSnap, () => {}),
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', clean), handleReqSnap, () => {}),
          onSnapshot(doc(db, 'friend_requests', clean), handleReqSnap, () => {}),
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'friend_requests', 'GLOBAL_LATEST'), handleReqSnap, () => {}),
          onSnapshot(doc(db, 'friend_requests', 'GLOBAL_LATEST'), handleReqSnap, () => {}),
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'friends', clean), handleFriendsSnap, () => {}),
          onSnapshot(doc(db, 'friends', clean), handleFriendsSnap, () => {}),
          onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'friends', 'GLOBAL_LATEST'), handleFriendsSnap, () => {}),
          onSnapshot(doc(db, 'friends', 'GLOBAL_LATEST'), handleFriendsSnap, () => {})
        ];
        inviteUnsub = () => {
          unsubs.forEach((u) => { try { u(); } catch (e) {} });
        };
      };

      // Auto-bind current authoritative user to listen for invites & friend requests immediately
      try {
        const u = getAuthoritativeLocalUsername();
        if (u && !isPlaceholder(u)) {
          window.__bindCloudInviteListener(u);
        }
      } catch (e) {}

      // Flush any pending room messages
      if (boundRoomCode) {
        window.__bindCloudRoom(boundRoomCode);
      }
      if (pendingRoomOutboundQueue.length > 0) {
        const q = pendingRoomOutboundQueue.slice();
        pendingRoomOutboundQueue = [];
        q.forEach((item) => window.__sendCloudRoomMessage(item.roomCode, item.msgObj));
      }
    })
    .catch((err) => {
        console.error('Firebase Cloud Module Load Error:', err);
    });
})();


/* ============================================================================
 * VERSION 2.0 INTERACTIVE SHOWCASE MODAL CONTROLLER (Close & Try Out Integration)
 * ============================================================================ */
(function initVersion2ShowcaseEngine() {
  if (typeof window === 'undefined') return;

  const V2_FEATURES = {
    roast: {
      index: 1,
      icon: '💀',
      badge: '💀 ROAST MODE',
      badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/40',
      caption: 'Savage stadium humiliation & Golden Duck roasts on every wicket!',
      title: 'New Roast Commentary Mode (Savage Wicket Humiliation)',
      tag: 'AUDIO + SCOREBOARD ROASTS',
      tagClass: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      desc: 'Switch your announcer to <strong class="text-rose-300">💀 Roast</strong> mode for zero-mercy commentary whenever a batter gets dismissed—complete with dedicated Golden Duck (0-run) humiliation lines and live voice synthesis!',
      tryHint: '💀 Roast Commentary Mode',
      tryBtn: '🔥 Try Out Roast Mode',
      tabActiveClass: 'bg-rose-500/15 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
    },
    security: {
      index: 2,
      icon: '🛡️',
      badge: '🛡️ SECURITY 2.0',
      badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40',
      caption: 'Upgraded Firebase API Key, OAE1 Vault & full account removal across Cloud + Auth.',
      title: 'Security Update & Complete Account Removal',
      tag: 'FIREBASE AUTH + FIRESTORE WIPE',
      tagClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      desc: 'Powered by the upgraded Firebase security configuration, salted OAE1 password protection, and 1-click <strong class="text-emerald-300">Remove Account</strong> that permanently purges your profile from the website, Firestore, and Firebase Authentication so your username can be freshly re-registered anytime.',
      tryHint: '🛡️ Account & Security Controls',
      tryBtn: '🛡️ Try Out Security Controls',
      tabActiveClass: 'bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
    },
    cloud: {
      index: 3,
      icon: '☁️',
      badge: '☁️ CLOUD SYNC 2.0',
      badgeClass: 'bg-cyan-500/25 text-cyan-200 border-cyan-400/40',
      caption: 'Instant real-time cross-device sync for Global Elo, Weekly Rankings & Friends.',
      title: 'Real-Time Cloud Sync Across Desktop & Mobile',
      tag: 'DUAL-COLLECTION FIRESTORE',
      tagClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
      desc: 'Every run, wicket, achievement, friend invite, and Elo rating change syncs automatically across <code class="text-cyan-300">handcricket_users</code> and <code class="text-cyan-300">profiles</code> in real time—with instant deleted-account detection.',
      tryHint: '☁️ Live Cloud Sync & Leaderboard',
      tryBtn: '☁️ Try Out Cloud Sync',
      tabActiveClass: 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
    },
    google: {
      index: 4,
      icon: '🔑',
      badge: '🔑 GOOGLE SIGN-IN',
      badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
      caption: '1-Tap Continue with Google authentication with smart username reservation.',
      title: '1-Tap Google Sign-In & Smart Player Portal',
      tag: 'OAUTH 2.0 INSTANT LOGIN',
      tagClass: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      desc: 'Skip passwords with one-tap <strong class="text-amber-300">Continue with Google</strong> sign-in, automatic account linking, custom player username reservation, and device-aware routing between Desktop and Mobile.',
      tryHint: '🔑 Google Sign-In & Account Portal',
      tryBtn: '🔑 Try Out Google Sign-In',
      tabActiveClass: 'bg-amber-500/15 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
    },
    gameplay: {
      index: 5,
      icon: '🤝',
      badge: '🤝 FAIR AI & DRAWS',
      badgeClass: 'bg-purple-500/25 text-purple-200 border-purple-400/40',
      caption: 'Official Match Drawn tie rules (0 Elo delta) & non-tracking Predictive Master Bot.',
      title: 'Match Drawn Rules & Fair Predictive Master Bot',
      tag: 'COMPETITIVE FAIR PLAY',
      tagClass: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
      desc: 'When 2nd-innings scores level (score === target - 1), the match officially finishes as <strong class="text-purple-300">MATCH DRAWN</strong> across Bot &amp; Multiplayer modes. Plus, Master Bot now uses fair predictive pattern psychology instead of reading your camera fingers!',
      tryHint: '🤝 Fair Master Bot & Match Drawn Engine',
      tryBtn: '🏏 Try Out In Arena',
      tabActiveClass: 'bg-purple-500/15 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
    }
  };

  window.openVersion2Showcase = function() {
    const modal = document.getElementById('version2ShowcaseModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  window.closeVersion2Showcase = function() {
    const modal = document.getElementById('version2ShowcaseModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  };

  window.selectVersion2Feature = function(key) {
    const feat = V2_FEATURES[key] || V2_FEATURES.roast;
    window.__currentV2Feature = key;

    const tabs = document.querySelectorAll('[data-v2-tab]');
    tabs.forEach((t) => {
      const k = t.getAttribute('data-v2-tab');
      t.className = 'v2-feature-tab ' + (k === 'gameplay' ? 'col-span-2 sm:col-span-1 ' : '') +
        'group text-left p-2.5 rounded-2xl border transition-all ' +
        (k === key ? feat.tabActiveClass : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]');
    });

    const imgBadge = document.getElementById('v2ImageLiveBadge');
    if (imgBadge) {
      imgBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono-num font-black uppercase border shrink-0 ' + feat.badgeClass;
      imgBadge.textContent = feat.badge;
    }
    const imgCap = document.getElementById('v2ImageLiveCaption');
    if (imgCap) imgCap.textContent = feat.caption;

    const counter = document.getElementById('v2FeatureCounter');
    if (counter) counter.textContent = feat.index + ' / 5 Selected';
    const icon = document.getElementById('v2DetailIcon');
    if (icon) icon.textContent = feat.icon;
    const title = document.getElementById('v2DetailTitle');
    if (title) title.textContent = feat.title;
    const tag = document.getElementById('v2DetailTag');
    if (tag) {
      tag.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-mono-num font-black border ' + feat.tagClass;
      tag.textContent = feat.tag;
    }
    const desc = document.getElementById('v2DetailDesc');
    if (desc) desc.innerHTML = feat.desc;

    const hint = document.getElementById('v2TryOutHint');
    if (hint) hint.innerHTML = 'Ready to activate: <strong class="text-white">' + feat.tryHint + '</strong>';
    const btnLbl = document.getElementById('btnTryOutV2Label');
    if (btnLbl) btnLbl.textContent = feat.tryBtn;

    const subWidget = document.getElementById('v2InteractiveSubWidget');
    if (subWidget) {
      if (key === 'roast') subWidget.classList.remove('hidden');
      else subWidget.classList.add('hidden');
    }
  };

  window.tryOutVersion2Feature = function() {
    const key = window.__currentV2Feature || 'roast';
    window.closeVersion2Showcase();

    if (key === 'roast') {
      try {
        if (typeof state !== 'undefined' && state) {
          state.commentaryStyle = 'roast';
        }
      } catch (e) {}
      const sel = document.getElementById('selectCommentaryStyle');
      if (sel) {
        sel.value = 'roast';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        try { sel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      }
      if (typeof setCommentary === 'function') {
        setCommentary('💀 ROAST MODE ARMED! Every wicket will now trigger savage stadium humiliation!', 'wicket');
      }
      if (typeof window.triggerVersion2Sample === 'function') {
        window.triggerVersion2Sample();
      }
      return;
    }

    if (key === 'security') {
      const sideAcct = document.getElementById('sideNavAccount') || document.getElementById('drawerNavAccount') || document.getElementById('btnOpenAuthModal');
      if (sideAcct) sideAcct.click();
      return;
    }

    if (key === 'cloud') {
      if (typeof syncUserProfileToCloud === 'function') {
        try { syncUserProfileToCloud(); } catch (e) {}
      }
      const sideLb = document.getElementById('sideNavLeaderboard') || document.getElementById('drawerNavLeaderboard');
      if (sideLb) sideLb.click();
      return;
    }

    if (key === 'google') {
      const googleBtn = document.getElementById('btnGoogleSignIn') || document.getElementById('btnOpenAuthModal') || document.getElementById('sideNavAccount');
      if (googleBtn) googleBtn.click();
      return;
    }

    const playBtn = document.getElementById('sideNavPlayBot') || document.getElementById('btnStartMatch') || document.getElementById('selectCommentaryStyle');
    if (playBtn) {
      try { playBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
    }
  };
})();
