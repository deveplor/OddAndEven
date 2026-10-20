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
        'PLAYER_1',
        'GUEST',
        'YOU',
        'FRIEND',
        'WAITING...',
        'LOGIN REQUIRED',
        'UNAUTHENTICATED'
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
          if (!clean || clean.length < 3 || FAKE_SEED_NAMES.includes(clean) || purged.includes(clean)) return;
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
        }
        return added;
      }

      const TURN_DURATION_SEC = 15;
      const WORLDWIDE_PLAYERS_KEY = 'oddandeven_worldwide_players_v1';
      const FRIENDS_STORAGE_KEY = 'oddandeven_friends_map_v1';
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
        activeScreen: 'PITCH', // 'SHOWCASE' | 'PITCH' | 'BOT_SETUP' | 'MP_SETUP' | 'LEADERBOARD' | 'EVENTS'
        eloRating: 1500,
        peakElo: 1500,
        friendEloRating: 1500,
        humanPlayers: {},
        friendsMap: {}, // { [myUsername]: ['FRIEND1', 'FRIEND2'] }
        friendSearchQuery: '',
        incomingFriendInvite: null, // { fromUser, fromFlag, roomCode, timestamp }
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

        if (!STATE.humanPlayers[clean]) {
          STATE.humanPlayers[clean] = {
            name: clean,
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
      function mergeSinglePlayerRecord(existing, inc) {
        const wk = getMondaySundayWeekInfo().weekKey;
        if (!existing) {
          const copy = Object.assign({}, inc, { isRealRegisteredUser: true });
          if (typeof copy.elo !== 'number' || isNaN(copy.elo)) copy.elo = 1500;
          if (typeof copy.peak !== 'number' || isNaN(copy.peak)) copy.peak = Math.max(1500, copy.elo);
          if (copy.weekKey !== wk) {
            copy.weekKey = wk;
            copy.weeklyEloGain = copy.weeklyEloGain || 0;
            copy.weeklyWins = copy.weeklyWins || 0;
            copy.weeklyLosses = copy.weeklyLosses || 0;
            copy.weeklyMatches = copy.weeklyMatches || 0;
            copy.weeklyRuns = copy.weeklyRuns || 0;
            copy.weeklyWickets = copy.weeklyWickets || 0;
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
          existing.elo !== nextElo ||
          existing.peak !== nextPeak ||
          existing.wins !== nextWins ||
          existing.losses !== nextLosses ||
          existing.matches !== nextMatches ||
          existing.totalRuns !== nextTotalRuns ||
          existing.totalBalls !== nextTotalBalls ||
          existing.highScore !== nextHighScore ||
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
          if (!clean || isPlaceholderUsername(clean) || purged.includes(clean)) return;
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
        // If user just signed up or logged in via index.html/login.html, ensure they are never blocked by a stale purge entry
        if (!signedOutExplicitly && sessUser && !isPlaceholderUsername(sessUser)) {
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

        if (!signedOutExplicitly && sessUser && !isPlaceholderUsername(sessUser) && !activePurged.includes(sessUser) && ((encryptedUsers[sessUser] && encryptedUsers[sessUser].encryptedAuth) || sess.loggedInAt)) {
          const verifiedAccount = encryptedUsers[sessUser];
          STATE.myUsername = sessUser;
          STATE.myCountryCode = verifiedAccount.countryCode || sess.countryCode || '+91';
          STATE.myCountryFlag = verifiedAccount.countryFlag || sess.countryFlag || '🇮🇳';
          STATE.myCountryName = verifiedAccount.countryName || sess.countryName || 'India';
          STATE.isAuthenticated = true;
        } else {
          STATE.myUsername = 'GUEST';
          STATE.myCountryCode = '+91';
          STATE.myCountryFlag = '🇮🇳';
          STATE.myCountryName = 'India';
          STATE.isAuthenticated = false;
        }
        STATE.sessionInitialized = true;

        // In AI mode or when not Guest in ONLINE_2P, P1 is myUsername; when Guest in ONLINE_2P, keep P2 as myUsername
        if (STATE.mode !== 'ONLINE_2P' || STATE.onlineRole !== 'GUEST') {
          STATE.p1Name = STATE.myUsername;
          STATE.p1CountryCode = STATE.myCountryCode;
          STATE.p1CountryFlag = STATE.myCountryFlag;
          STATE.p1CountryName = STATE.myCountryName;
        } else if (STATE.onlineRole === 'GUEST') {
          STATE.p2Name = STATE.myUsername;
          STATE.p2CountryCode = STATE.myCountryCode;
          STATE.p2CountryFlag = STATE.myCountryFlag;
          STATE.p2CountryName = STATE.myCountryName;
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
              if (!h || h.result === 'FORFEIT') return;
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
                if ((mc.winnerName || '').trim().toUpperCase() === cleanU) sb.wins += 1;
                else sb.losses += 1;
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
          if (!rec || isPlaceholderUsername(clean) || activePurged.includes(clean)) {
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
        if (justLogged === '1' || urlParams.get('from') === 'login') {
          localStorage.removeItem('oddandeven_just_logged_in');
          STATE.activeScreen = 'PITCH';
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
        phaseBadge: document.getElementById('phaseBadge'),
        btnHeaderSignOut: document.getElementById('btnHeaderSignOut'),
        headerSignOutLabel: document.getElementById('headerSignOutLabel'),
        btnHeaderRemoveAccount: document.getElementById('btnHeaderRemoveAccount'),
        btnSidebarSignOut: document.getElementById('btnSidebarSignOut'),
        btnSidebarRemoveAccount: document.getElementById('btnSidebarRemoveAccount'),
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
        myFriendsCountBadge: document.getElementById('myFriendsCountBadge'),
        myFriendsListContainer: document.getElementById('myFriendsListContainer'),
        globalFriendInviteToast: document.getElementById('globalFriendInviteToast'),
        globalFriendInviteTitle: document.getElementById('globalFriendInviteTitle'),
        globalFriendInviteSub: document.getElementById('globalFriendInviteSub'),
        btnAcceptGlobalFriendInvite: document.getElementById('btnAcceptGlobalFriendInvite'),
        btnDismissGlobalFriendInvite: document.getElementById('btnDismissGlobalFriendInvite'),
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
          name: 'Sunny (Basic Bot)',
          shortName: 'Sunny',
          elo: 450,
          bracket: '250–700 ELO',
          tier: 'Basic Tier',
          icon: '🌱',
          badge: 'SUNNY • 450 ELO'
        },
        TACTICIAN: {
          name: 'Rohan (Interm. Bot)',
          shortName: 'Rohan',
          elo: 1100,
          bracket: '700–1400 ELO',
          tier: 'Intermediate Tier',
          icon: '⚡',
          badge: 'ROHAN • 1100 ELO'
        },
        AGGRESSOR: {
          name: 'Vikram (Advanced AI)',
          shortName: 'Vikram',
          elo: 1850,
          bracket: '1400–2200 ELO',
          tier: 'Advanced Tier',
          icon: '🧠',
          badge: 'VIKRAM • 1850 ELO'
        },
        WALL: {
          name: 'Apex Oracle (Master)',
          shortName: 'Apex Oracle',
          elo: 2650,
          bracket: '2200–2800 ELO',
          tier: 'Master Tier',
          icon: '👑',
          badge: 'ORACLE • 2650 ELO'
        }
      };

      // Helper: Predict user's next number probabilities using Frequency + 1st-order Markov + 2nd-order N-gram + Delta shifts
      function analyzeUserPatterns(hist) {
        const scores = {};
        for (let n = 1; n <= 10; n++) scores[n] = 1.0;
        if (!hist || hist.length === 0) return scores;

        // 1. Overall & Recent Frequency weight
        hist.forEach((n, idx) => {
          const recencyBoost = idx >= hist.length - 6 ? 2.4 : 1.0;
          scores[n] = (scores[n] || 1) + recencyBoost;
        });

        // 2. 1st-Order Markov Transition (What user plays after hist[last])
        const last = hist[hist.length - 1];
        for (let i = 0; i < hist.length - 1; i++) {
          if (hist[i] === last) {
            const nextVal = hist[i + 1];
            scores[nextVal] += 3.8;
          }
        }

        // 3. 2nd-Order N-Gram (What user plays after [secondLast, last])
        if (hist.length >= 2) {
          const prev2 = hist[hist.length - 2];
          for (let i = 0; i < hist.length - 2; i++) {
            if (hist[i] === prev2 && hist[i + 1] === last) {
              const nextVal = hist[i + 2];
              scores[nextVal] += 6.5;
            }
          }
          // 4. Delta Shift Habit (e.g. user consistently increments/decrements by same delta)
          const lastDelta = last - prev2;
          const projected = last + lastDelta;
          if (projected >= 1 && projected <= 10) {
            scores[projected] += 2.2;
          }
        }

        return scores;
      }

      // Smart AI number selection across the 4 Elo Tiers (250-700, 700-1400, 1400-2200, 2200-2800)
      function generateBotNumber(isBotBatting) {
        const diff = STATE.botDifficulty || 'TACTICIAN';
        const hist = STATE.userNumHistory;

        // TIER 1: BASIC BOT (450 ELO, 250-700) — Very simple, lets user score runs!
        if (diff === 'ROOKIE') {
          if (!isBotBatting) {
            // User is batting: Basic bot deliberately avoids user's recent & common numbers 85% of the time so user can score freely!
            const recentUser = new Set(hist.slice(-4));
            const safeForUser = [1, 2, 3, 4, 5].filter((n) => !recentUser.has(n));
            if (safeForUser.length > 0 && Math.random() < 0.85) {
              return safeForUser[Math.floor(Math.random() * safeForUser.length)];
            }
            return Math.floor(Math.random() * 4) + 1;
          } else {
            // Basic bot is batting: plays simple low numbers (1-4) and often repeats so user can easily get its wicket
            if (STATE.lastAiNum && Math.random() < 0.45) return STATE.lastAiNum;
            return Math.floor(Math.random() * 4) + 1;
          }
        }

        // TIER 2: INTERMEDIATE BOT (1100 ELO, 700-1400) — Balanced challenge in scoring & defending
        if (diff === 'TACTICIAN') {
          const patternScores = analyzeUserPatterns(hist);
          const rankedUserNums = Object.keys(patternScores).map(Number).sort((a, b) => patternScores[b] - patternScores[a]);
          if (!isBotBatting) {
            // Bowling: 32% chance to target one of user's top 3 predicted numbers
            if (hist.length >= 2 && Math.random() < 0.32) {
              const top3 = rankedUserNums.slice(0, 3);
              return top3[Math.floor(Math.random() * top3.length)];
            }
            return randomInt1To10();
          } else {
            // Batting: prefers 4..9 while avoiding user's #1 most frequent number
            const pool = [4, 5, 6, 7, 8, 9].filter((n) => n !== rankedUserNums[0]);
            if (pool.length > 0 && Math.random() < 0.65) {
              return pool[Math.floor(Math.random() * pool.length)];
            }
            return randomInt1To10();
          }
        }

        // TIER 3: ADVANCED BOT (1850 ELO, 1400-2200) — Very difficult! Markov sequence hunter & smart batter
        if (diff === 'AGGRESSOR') {
          const patternScores = analyzeUserPatterns(hist);
          const rankedUserNums = Object.keys(patternScores).map(Number).sort((a, b) => patternScores[b] - patternScores[a]);

          if (!isBotBatting) {
            // Advanced Bot Bowling: 62% chance to snipe from top 2 Markov/frequency predictions, else high-value power trap (6-10)
            if (hist.length >= 1 && Math.random() < 0.62) {
              return Math.random() < 0.7 ? rankedUserNums[0] : rankedUserNums[1];
            }
            const highTraps = [6, 7, 8, 9, 10];
            return highTraps[Math.floor(Math.random() * highTraps.length)];
          } else {
            // Advanced Bot Batting: Evades user's top 3 predicted bowling numbers and hits high runs (6-10)
            const dangerSet = new Set(rankedUserNums.slice(0, 3));
            const safePower = [10, 9, 8, 7, 6, 5].filter((n) => !dangerSet.has(n));
            if (safePower.length > 0) {
              return safePower[Math.floor(Math.random() * Math.min(3, safePower.length))];
            }
            return rankedUserNums[rankedUserNums.length - 1];
          }
        }

        // TIER 4: MASTER BOT (2650 ELO, 2200-2800) — Toughest Oracle AI! N-Gram + Expected-Value (EV) Optimizer
        const patternScores = analyzeUserPatterns(hist);
        const totalWeight = Object.values(patternScores).reduce((acc, v) => acc + v, 0);
        const rankedUserNums = Object.keys(patternScores).map(Number).sort((a, b) => patternScores[b] - patternScores[a]);

        if (!isBotBatting) {
          // Master Bot Bowling: Ruthlessly targets user's #1 or #2 highest-probability next hand, plus psychological high-number traps
          if (hist.length === 0) {
            // On ball 1, humans overwhelmingly pick 6, 7, 10, or 4
            const openerTraps = [6, 10, 7, 4];
            return openerTraps[Math.floor(Math.random() * openerTraps.length)];
          }
          if (Math.random() < 0.78) {
            return Math.random() < 0.72 ? rankedUserNums[0] : rankedUserNums[1];
          }
          return rankedUserNums[2];
        } else {
          // Master Bot Batting: Maximizes Expected Runs EV(n) = n * (1 - P(user picks n))
          // If chasing in 2nd innings and only needing `need` runs, factors in safe clincher shots!
          const need = STATE.currentInnings === 2 && STATE.target ? Math.max(1, STATE.target - STATE.aiScore) : 999;
          let bestNums = [];
          for (let n = 1; n <= 10; n++) {
            const probUserMatches = patternScores[n] / totalWeight;
            const survivalProb = Math.max(0.05, 1 - probUserMatches * 2.2);
            const effectiveRuns = n >= need ? need + 4 : n;
            const ev = effectiveRuns * survivalProb;
            bestNums.push({ n, ev });
          }
          bestNums.sort((a, b) => b.ev - a.ev);
          // Pick from top 2 highest-EV un-trapped numbers
          return Math.random() < 0.75 ? bestNums[0].n : bestNums[1].n;
        }
      }

      // Rich Broadcast Commentary Generator
      function buildEngagingCommentary(eventType, ctx) {
        const style = STATE.commentaryStyle || 'HYPE';
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

        if (eventType === 'TOSS') {
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
        if ((!isMultiplayer() || STATE.onlineRole !== 'GUEST') && STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
          STATE.p1Name = STATE.myUsername.trim().toUpperCase();
          return STATE.p1Name;
        }
        if (STATE.p1Name && !isPlaceholderUsername(STATE.p1Name)) {
          return STATE.p1Name.trim().toUpperCase();
        }
        return (STATE.myUsername || STATE.p1Name || 'PLAYER_1').trim().toUpperCase();
      }

      function getP2Label() {
        if (isMultiplayer()) {
          if (STATE.onlineRole === 'GUEST' && STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
            STATE.p2Name = STATE.myUsername.trim().toUpperCase();
            return STATE.p2Name;
          }
          return (STATE.p2Name || 'PLAYER_2').trim().toUpperCase();
        }
        const prof = BOT_PROFILES[STATE.botDifficulty] || BOT_PROFILES.TACTICIAN;
        return prof.name;
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
            if (ev.data.type === 'FRIEND_MATCH_INVITE' && ev.data.toUser) {
              const myClean = (STATE.myUsername || '').trim().toUpperCase();
              if (ev.data.toUser.trim().toUpperCase() === myClean && ev.data.fromUser !== myClean) {
                STATE.incomingFriendInvite = ev.data;
                STATE.activeOpenRooms[ev.data.fromUser.trim().toUpperCase()] = {
                  roomCode: ev.data.roomCode,
                  hostUser: ev.data.fromUser.trim().toUpperCase(),
                  timestamp: ev.data.timestamp || Date.now()
                };
                SoundFX.runScored(6);
                renderAll();
              }
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

        window.addEventListener('storage', (ev) => {
          if (!ev || !ev.key) return;
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
              } else if (data && data.type === 'FRIEND_MATCH_INVITE' && data.toUser) {
                const myClean = (STATE.myUsername || '').trim().toUpperCase();
                if (data.toUser.trim().toUpperCase() === myClean && data.fromUser !== myClean) {
                  STATE.incomingFriendInvite = data;
                  STATE.activeOpenRooms[data.fromUser.trim().toUpperCase()] = {
                    roomCode: data.roomCode,
                    hostUser: data.fromUser.trim().toUpperCase(),
                    timestamp: data.timestamp || Date.now()
                  };
                  SoundFX.runScored(6);
                  renderAll();
                }
              }
            } catch (e) {}
            return;
          }
          if (ev.key === WORLDWIDE_PLAYERS_KEY || ev.key === 'hc_arena_elo_v2' || ev.key === AUTH_STORAGE_KEY || ev.key === FRIENDS_STORAGE_KEY) {
            syncAuthAndPurgeFakeSeeds();
            renderAll();
          } else if (STATE.roomCode && ev.key === 'oddandeven_room_bus_' + STATE.roomCode && ev.newValue) {
            try {
              const msg = JSON.parse(ev.newValue);
              handleNetMessage(msg);
            } catch (e) {}
          }
        });

        // Expose hook for Firebase Cloud Sync module so cloud updates merge seamlessly without lag
        window.__onCloudLeaderboardUpdate = function (cloudPlayersMap, cloudAccountsMap, cloudPurgedArr) {
          let changed = false;
          if (Array.isArray(cloudPurgedArr)) {
            cloudPurgedArr.forEach((pName) => {
              const clean = (pName || '').trim().toUpperCase();
              if (clean && clean !== STATE.myUsername && STATE.humanPlayers[clean]) {
                markAccountPurgedLocal(clean);
                delete STATE.humanPlayers[clean];
                changed = true;
              }
            });
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
            if (data.type === 'FRIEND_MATCH_INVITE' && data.toUser) {
              const myClean = (STATE.myUsername || '').trim().toUpperCase();
              if (data.toUser.trim().toUpperCase() === myClean && data.fromUser !== myClean) {
                STATE.incomingFriendInvite = data;
                STATE.activeOpenRooms[data.fromUser.trim().toUpperCase()] = {
                  roomCode: data.roomCode,
                  hostUser: data.fromUser.trim().toUpperCase(),
                  timestamp: data.timestamp || Date.now()
                };
                SoundFX.runScored(6);
                renderAll();
              }
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

      function sendNetMessage(payload) {
        if (!payload || typeof payload !== 'object') return;
        const msgWithId = Object.assign({}, payload, {
          msgId: payload.msgId || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          senderRole: STATE.onlineRole || 'HOST'
        });
        STATE.seenNetMsgIds.add(msgWithId.msgId);

        if (STATE.conn && STATE.conn.open) {
          try { STATE.conn.send(msgWithId); } catch (e) {}
        }
        if (STATE.bc) {
          try { STATE.bc.postMessage(msgWithId); } catch (e) {}
        }
        if (STATE.roomCode) {
          try {
            localStorage.setItem('oddandeven_room_bus_' + STATE.roomCode, JSON.stringify(msgWithId));
          } catch (e) {}
        }
      }

      function setupBroadcastFallback(code) {
        if (STATE.bc) {
          try { STATE.bc.close(); } catch (e) {}
        }
        if (typeof BroadcastChannel !== 'undefined') {
          STATE.bc = new BroadcastChannel('hc_arena_room_' + code);
          STATE.bc.onmessage = (ev) => {
            if (ev && ev.data) handleNetMessage(ev.data);
          };
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

        if (msg.type === 'JOIN_HELLO' || msg.type === 'GUEST_JOINED') {
          // Only Host processes JOIN_HELLO / GUEST_JOINED
          if (STATE.onlineRole !== 'HOST') return;
          let incomingP2 = (msg.p2Name || msg.guestName || 'PLAYER_2').trim().toUpperCase();
          if (incomingP2 === STATE.p1Name) {
            incomingP2 = `${incomingP2}_2`;
          }

          // If room is already locked with a different player, reject 3rd player!
          if (STATE.roomLocked && STATE.p2Joined && STATE.p2Name !== incomingP2) {
            sendNetMessage({
              type: 'ROOM_LOCKED_REJECT',
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

          // Merge P2's full record so Host has P2's true current Elo (fixes stale rating desync like 1596 vs 1620!)
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

          updateNetStatusUI(`🔒 Room Locked: ${STATE.p1Name} vs ${STATE.p2Name}`, true);
          sendNetMessage({
            type: 'HOST_WELCOME',
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
            allPlayers: STATE.humanPlayers
          });
          SoundFX.click();
          renderAll();
        } else if (msg.type === 'ROOM_LOCKED_REJECT') {
          if (STATE.onlineRole === 'GUEST' && (!msg.targetUser || msg.targetUser === STATE.myUsername || msg.targetUser === `${STATE.myUsername}_2`)) {
            if (STATE.joinRetryTimerId) {
              clearInterval(STATE.joinRetryTimerId);
              STATE.joinRetryTimerId = null;
            }
            STATE.onlineConnected = false;
            STATE.roomLocked = true;
            STATE.p2Joined = false;
            updateNetStatusUI(`🔒 Room Full & Locked (${msg.p1Name} vs ${msg.p2Name})`, false);
            renderAll();
          }
        } else if (msg.type === 'ROOM_LEAVE') {
          stopTurnTimer();
          STATE.onlineConnected = false;
          STATE.p2Joined = false;
          STATE.roomLocked = false;
          STATE.p2Name = 'WAITING...';
          if (STATE.onlineRole === 'HOST') {
            updateNetStatusUI(`⏳ Opponent left • Room ${STATE.roomCode} unlocked & waiting for P2...`, false);
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
          STATE.p2Name = (msg.p2Name || STATE.myUsername).trim().toUpperCase();
          STATE.p2CountryFlag = msg.p2CountryFlag || STATE.myCountryFlag || '🇮🇳';
          STATE.p2CountryCode = msg.p2CountryCode || STATE.myCountryCode || '+91';

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

          updateNetStatusUI(`🔒 Room Locked: ${STATE.p1Name} vs ${STATE.p2Name}`, true);
          SoundFX.click();
          renderAll();
        } else if (msg.type === 'HOST_START_MATCH') {
          // Host clicked Start Match -> start match on Guest's screen simultaneously!
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
          ? 'px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
          : 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30';
        if (el.mpNetStatusBadge) {
          el.mpNetStatusBadge.textContent = text;
          el.mpNetStatusBadge.className = cls;
        }
        if (el.inlineNetStatusBadge) {
          el.inlineNetStatusBadge.textContent = text;
          el.inlineNetStatusBadge.className = cls;
        }
      }

      function getMyFriendsList() {
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me || isPlaceholderUsername(me)) return [];
        const list = STATE.friendsMap[me];
        return Array.isArray(list) ? list : [];
      }

      function saveFriendsMap() {
        try {
          localStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(STATE.friendsMap));
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

      function addFriendByUsername(rawTargetUsername) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        const target = (rawTargetUsername || '').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (target.length < 3 || isPlaceholderUsername(target)) {
          showFriendFeedback('Please enter a valid username (at least 3 characters).', false);
          return;
        }
        if (target === me) {
          showFriendFeedback('You cannot add yourself as a friend!', false);
          return;
        }

        // Ensure player record exists in directory so they appear with stats
        ensureHumanPlayerRecord(target, 1500, {
          countryCode: '+91',
          countryFlag: '🇮🇳',
          countryName: 'India'
        }, true);

        if (!Array.isArray(STATE.friendsMap[me])) {
          STATE.friendsMap[me] = [];
        }
        if (!STATE.friendsMap[me].includes(target)) {
          STATE.friendsMap[me].unshift(target);
          saveFriendsMap();
          saveSessionStats(true);
          showFriendFeedback(`✓ Added @${target} to your Friends List! Click "Play Match" next to their name to play together.`, true);
        } else {
          showFriendFeedback(`@${target} is already in your Friends List!`, true);
        }

        // Request global sync so if target has played on another device we pull their latest rating
        broadcastGlobalLeaderboardSync(true, true);
        renderAll();
      }

      function removeFriendByUsername(rawTargetUsername) {
        SoundFX.click();
        const target = (rawTargetUsername || '').trim().toUpperCase();
        const me = (STATE.myUsername || '').trim().toUpperCase();
        if (!me || !Array.isArray(STATE.friendsMap[me])) return;
        STATE.friendsMap[me] = STATE.friendsMap[me].filter((u) => u !== target);
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

        // Automatically add to friends list if not already added
        if (!Array.isArray(STATE.friendsMap[me])) STATE.friendsMap[me] = [];
        if (!STATE.friendsMap[me].includes(target)) {
          STATE.friendsMap[me].unshift(target);
          saveFriendsMap();
        }

        // Check if this friend is already hosting an open room we can join immediately!
        const friendOpenRoom = STATE.activeOpenRooms && STATE.activeOpenRooms[target];
        if (friendOpenRoom && friendOpenRoom.roomCode && (Date.now() - (friendOpenRoom.timestamp || 0) < 600000)) {
          STATE.activeScreen = 'MP_SETUP';
          joinMultiplayerRoom(friendOpenRoom.roomCode);
          return;
        }

        // Otherwise, create a fresh Multiplayer Room as Host (P1) and broadcast a direct invite to `target`!
        createMultiplayerRoom();
        const code = STATE.roomCode;
        STATE.activeScreen = 'MP_SETUP';
        updateNetStatusUI(`📨 Invited @${target} to Room ${code} • Waiting for @${target} to join...`, false);
        if (el.inlineLobbyWaitHint) {
          el.inlineLobbyWaitHint.textContent = `📨 Live Match Invite sent to @${target} (Room Code: ${code})! They can click "Accept & Play" on their screen or enter ${code}.`;
        }

        broadcastFriendEventPacket({
          type: 'FRIEND_MATCH_INVITE',
          fromUser: me,
          fromFlag: STATE.myCountryFlag || '🇮🇳',
          fromCode: STATE.myCountryCode || '+91',
          fromElo: STATE.eloRating || 1500,
          toUser: target,
          roomCode: code,
          timestamp: Date.now()
        });

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
        STATE.p1Name = STATE.myUsername;
        STATE.p1CountryFlag = STATE.myCountryFlag;
        STATE.p1CountryCode = STATE.myCountryCode;
        STATE.p2Name = 'WAITING...';

        if (el.hostRoomCodeBox) el.hostRoomCodeBox.classList.remove('hidden');
        if (el.hostRoomCodeText) el.hostRoomCodeText.textContent = code;
        if (el.inlineHostCodeDisplay) el.inlineHostCodeDisplay.classList.remove('hidden');
        if (el.inlineHostCodeValue) el.inlineHostCodeValue.textContent = code;

        updateNetStatusUI(`⏳ Room ${code} Created • Waiting for Player 2...`, false);
        setupBroadcastFallback(code);
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

      function joinMultiplayerRoom(customCodeInput = null) {
        if (!requireAccountAndPassword()) return;
        SoundFX.click();
        syncAuthAndPurgeFakeSeeds();
        const raw = (customCodeInput || (el.inputJoinRoomCode && el.inputJoinRoomCode.value) || (el.inlineInputJoinCode && el.inlineInputJoinCode.value) || '').trim().toUpperCase();
        if (!raw) return;

        STATE.mode = 'ONLINE_2P';
        STATE.roomCode = raw;
        STATE.onlineRole = 'GUEST';
        STATE.onlineConnected = false;
        STATE.p2Joined = false;
        STATE.roomLocked = false;
        STATE.p2Name = STATE.myUsername;
        STATE.p2CountryFlag = STATE.myCountryFlag;
        STATE.p2CountryCode = STATE.myCountryCode;

        if (el.inputJoinRoomCode) el.inputJoinRoomCode.value = raw;
        if (el.inlineInputJoinCode) el.inlineInputJoinCode.value = raw;

        updateNetStatusUI(`Connecting to Room ${raw} as ${STATE.myUsername}...`, false);
        setupBroadcastFallback(raw);

        const myRec = ensureHumanPlayerRecord(STATE.myUsername, 1500, {
          countryCode: STATE.myCountryCode,
          countryFlag: STATE.myCountryFlag,
          countryName: STATE.myCountryName
        }, true);

        const joinPayload = {
          type: 'JOIN_HELLO',
          p2Name: STATE.myUsername,
          guestName: STATE.myUsername,
          p2CountryFlag: STATE.myCountryFlag,
          p2CountryCode: STATE.myCountryCode,
          p2Elo: myRec.elo,
          p2Record: myRec,
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
          if (STATE.roomLocked || STATE.p2Joined || joinAttempts > 6 || STATE.onlineRole !== 'GUEST') {
            clearInterval(STATE.joinRetryTimerId);
            STATE.joinRetryTimerId = null;
            return;
          }
          sendNetMessage(Object.assign({}, joinPayload, {
            msgId: `${Date.now()}_retry_${joinAttempts}`
          }));
        }, 1200);

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
                      msgId: `${Date.now()}_peer_open`
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
        if (STATE.roomCode) {
          sendNetMessage({ type: 'ROOM_LEAVE' });
        }
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
          return true;
        }

        // User is NOT authenticated: stop timer & lock screen with mandatory Login / Sign Up modal
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
        resolveTossNumbers(userNum, randomInt1To10());
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
          const aiChoosesBat = Math.random() < 0.5;
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

      function handleGameplayTurn(userNum) {
        if (!requireAccountAndPassword()) return;
        if (STATE.phase !== 'INNINGS_1' && STATE.phase !== 'INNINGS_2') return;
        if (isMultiplayer()) {
          submitPlayerInput(userNum);
          return;
        }
        const isBotBatting = STATE.currentBatter === 'AI';
        const botNum = generateBotNumber(isBotBatting);
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
          p1Rec.totalBalls += 1;
          if (p2Rec) p2Rec.ballsBowled += 1;
        } else {
          STATE.aiBalls += 1;
          p1Rec.ballsBowled += 1;
          if (p2Rec) p2Rec.totalBalls += 1;
        }

        const ballNumber = isUserBatting ? STATE.userBalls : STATE.aiBalls;
        const inningsTag = STATE.currentInnings === 1 ? 'INN 1' : 'INN 2';

        const batterName = isUserBatting ? p1 : p2;
        const bowlerName = isUserBatting ? p2 : p1;

        // CASE A: WICKET (Both numbers matched!)
        if (isOut) {
          SoundFX.wicket();
          STATE.currentStreak = 0;

          if (isUserBatting) {
            p1Rec.wicketsLost += 1;
            p1Rec.updatedAt = Date.now();
            if (p2Rec) {
              p2Rec.wicketsTaken += 1;
              p2Rec.weeklyWickets += 1;
              p2Rec.updatedAt = Date.now();
              STATE.aiMatchWickets += 1;
            }
          } else {
            p1Rec.wicketsTaken += 1;
            p1Rec.weeklyWickets += 1;
            p1Rec.updatedAt = Date.now();
            STATE.userMatchWickets += 1;
            if (p2Rec) {
              p2Rec.wicketsLost += 1;
              p2Rec.updatedAt = Date.now();
            }
          }
          // Save locally and schedule debounced global sync so runs & wickets persist immediately
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
            STATE.lastOutcomeText = `OUT! Both played ${userNum}! (${bowlerName} takes wicket) • Target: ${STATE.target}.`;
            triggerCanvasReveal(
              `OUT ON ${userNum}!`,
              `Wicket by ${bowlerName} • Target: ${STATE.target} Runs`,
              '#f43f5e',
              true
            );
          } else {
            const defendingWinner = isUserBatting ? 'AI' : 'USER';
            const runsShort = STATE.target - (isUserBatting ? STATE.userScore : STATE.aiScore) - 1;
            finishMatch(
              defendingWinner,
              runsShort === 0
                ? `What a thriller! Matched on ${userNum} with scores level — ${defendingWinner === 'USER' ? p1 : p2} defended the target of ${STATE.target} by 1 run!`
                : `OUT on ${userNum}! ${defendingWinner === 'USER' ? p1 : p2} took the winning wicket and won by ${runsShort} run${runsShort === 1 ? '' : 's'}!`
            );
          }

          renderAll();
          return;
        }

        // CASE B: RUNS SCORED
        if (isUserBatting) {
          STATE.userScore += batterNum;
          p1Rec.totalRuns += batterNum;
          p1Rec.weeklyRuns += batterNum;
          if (STATE.userScore > p1Rec.highScore) {
            p1Rec.highScore = STATE.userScore;
          }
          p1Rec.updatedAt = Date.now();
        } else {
          STATE.aiScore += batterNum;
          if (p2Rec) {
            p2Rec.totalRuns += batterNum;
            p2Rec.weeklyRuns += batterNum;
            if (STATE.aiScore > p2Rec.highScore) {
              p2Rec.highScore = STATE.aiScore;
            }
            p2Rec.updatedAt = Date.now();
          }
        }
        // Save locally and schedule debounced global sync so runs & wickets persist immediately
        saveLocalStatsOnly();
        scheduleDebouncedGlobalSync();

        const currentBatScore = isUserBatting ? STATE.userScore : STATE.aiScore;
        STATE.currentStreak += 1;
        SoundFX.runScored(batterNum);

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

        const p1Rec = ensureHumanPlayerRecord(p1, amIGuest ? STATE.friendEloRating : 1500, {
          countryCode: STATE.p1CountryCode,
          countryFlag: STATE.p1CountryFlag
        }, true);

        if (mpMatch) {
          const p2Rec = ensureHumanPlayerRecord(p2, amIGuest ? 1500 : STATE.friendEloRating, {
            countryCode: STATE.p2CountryCode,
            countryFlag: STATE.p2CountryFlag
          }, true);

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
          // Bot matches: RATING IS FROZEN! Never increase or decrease p1Rec.elo, peak, or weeklyEloGain,
          // bit ALWAYS record matches played, wins/losses, and runs scored on the player's account!
          const frozenElo = p1Rec.elo;
          const frozenPeak = p1Rec.peak;
          const frozenWeeklyElo = p1Rec.weeklyEloGain || 0;

          p1Rec.elo = frozenElo;
          p1Rec.peak = frozenPeak;
          p1Rec.weeklyEloGain = frozenWeeklyElo;
          const minBotP1TotalRuns = (typeof STATE.p1BaseRunsAtMatchStart === 'number' ? STATE.p1BaseRunsAtMatchStart : 0) + STATE.userScore;
          const minBotP1WeeklyRuns = (typeof STATE.p1BaseWeeklyRunsAtMatchStart === 'number' ? STATE.p1BaseWeeklyRunsAtMatchStart : 0) + STATE.userScore;
          if ((p1Rec.totalRuns || 0) < minBotP1TotalRuns) p1Rec.totalRuns = minBotP1TotalRuns;
          if ((p1Rec.weeklyRuns || 0) < minBotP1WeeklyRuns) p1Rec.weeklyRuns = minBotP1WeeklyRuns;
          if (STATE.userScore > (p1Rec.highScore || 0)) p1Rec.highScore = STATE.userScore;
          if (!STATE.isTossForfeit) {
            p1Rec.matches = Math.max((p1Rec.matches || 0) + 1, (p1Rec.wins || 0) + (p1Rec.losses || 0) + 1);
            p1Rec.weeklyMatches = (p1Rec.weeklyMatches || 0) + 1;
            if (winner === 'USER') {
              p1Rec.wins = (p1Rec.wins || 0) + 1;
              p1Rec.weeklyWins = (p1Rec.weeklyWins || 0) + 1;
            } else {
              p1Rec.losses = (p1Rec.losses || 0) + 1;
              p1Rec.weeklyLosses = (p1Rec.weeklyLosses || 0) + 1;
            }
          }
          p1Rec.updatedAt = Date.now();
          if (STATE.myUsername && !isPlaceholderUsername(STATE.myUsername)) {
            STATE.humanPlayers[STATE.myUsername.trim().toUpperCase()] = p1Rec;
          }

          STATE.eloRating = frozenElo;
          STATE.peakElo = frozenPeak;
          STATE.lastEloDelta = null;

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

        const didIWin = isMultiplayer() && STATE.onlineRole === 'GUEST' ? winner === 'AI' : winner === 'USER';
        STATE.sessionStats.matches += 1;
        if (didIWin) {
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
          winnerName: winner === 'USER' ? p1 : p2,
          didIWin,
          marginText: marginDescription
        });

        triggerCanvasReveal(
          winner === 'USER' ? `${p1} WINS! 🏆` : `${p2} WINS! 🏆`,
          STATE.winMarginText,
          winner === 'USER' ? '#81b64c' : '#38bdf8',
          true
        );
        broadcastGlobalLeaderboardSync(false, true);

        STATE.history.unshift({
          id: Date.now() + Math.random(),
          tag: isTimeoutForfeit ? 'TIMEOUT' : 'RESULT',
          title: winner === 'USER' ? `🏆 ${p1} WON THE MATCH!` : `🏆 ${p2} WON THE MATCH!`,
          detail: STATE.winMarginText,
          badge: 'FINAL',
          badgeColor: winner === 'USER' ? 'emerald' : 'rose'
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

        el.p1CardTitle.textContent = mpActive ? `${p1Flag} ${p1Name} (P1)` : `${myFlag} ${p1Name} (${myDial})`;
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
        const navActiveCls = 'w-full px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-center lg:text-left transition flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2.5 bg-gradient-to-r from-emerald-500/25 to-cyan-500/15 text-emerald-300 border border-emerald-400/40 shadow-sm';
        const navIdleCls = 'w-full px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-center lg:text-left transition flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2.5 bg-slate-900/75 hover:bg-slate-800/90 text-slate-300 border border-slate-800';
        el.sideNavBot.className = STATE.activeScreen === 'BOT_SETUP' ? navActiveCls : navIdleCls;
        el.sideNavMultiplayer.className = STATE.activeScreen === 'MP_SETUP' ? navActiveCls : navIdleCls;
        if (el.sideNavFriends) {
          el.sideNavFriends.className = (STATE.activeScreen === 'FRIENDS' ? navActiveCls : navIdleCls) + ' relative';
        }
        el.sideNavShowcase.className = STATE.activeScreen === 'SHOWCASE' ? navActiveCls : navIdleCls;
        if (el.sideNavEvents) {
          el.sideNavEvents.className = STATE.activeScreen === 'EVENTS' ? navActiveCls : navIdleCls;
        }
        if (el.sideNavLeaderboard) {
          el.sideNavLeaderboard.className = STATE.activeScreen === 'LEADERBOARD' ? navActiveCls : navIdleCls;
        }

        el.sideBotSubLabel.textContent = botProf.name;
        el.sidebarOpponentBadge.innerHTML = mpActive
          ? `<span>🌐</span><span>${p1Name} vs ${p2Name}</span>`
          : `<span>${botProf.icon}</span><span>${botProf.name}</span>`;

        const styleNames = { HYPE: '🎙️ Hype Broadcast', TACTICAL: '🧠 Tactical Analyst', CLASSIC: '📻 Classic Feed' };
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
          el.headerEloDelta.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Frozen while playing against Bots • Play Multiplayer to increase/decrease rating)`;
          }
        } else if (STATE.lastEloDelta !== null && STATE.lastEloDelta !== 0) {
          el.headerEloDelta.classList.remove('hidden');
          const dStr = STATE.lastEloDelta > 0 ? `+${STATE.lastEloDelta}` : `${STATE.lastEloDelta}`;
          el.headerEloDelta.textContent = dStr;
          el.headerEloDelta.className = STATE.lastEloDelta > 0
            ? 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
            : 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-rose-500/20 text-rose-300 border border-rose-400/30';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Ranked Multiplayer: +8 Win / -8 Loss)`;
          }
        } else {
          el.headerEloDelta.classList.remove('hidden');
          el.headerEloDelta.textContent = '±8 RANKED';
          el.headerEloDelta.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono-num font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40';
          if (el.btnHeaderElo) {
            el.btnHeaderElo.title = `Current Rating: ${STATE.eloRating} ELO (Ranked Multiplayer: +8 Win / -8 Loss)`;
          }
        }

        // Show/Hide Center Screens cleanly
        el.centerShowcasePanel.classList.toggle('hidden', STATE.activeScreen !== 'SHOWCASE');
        el.screenBotSetup.classList.toggle('hidden', STATE.activeScreen !== 'BOT_SETUP');
        el.screenMpSetup.classList.toggle('hidden', STATE.activeScreen !== 'MP_SETUP');
        if (el.screenFriends) {
          el.screenFriends.classList.toggle('hidden', STATE.activeScreen !== 'FRIENDS');
        }
        if (el.screenEvents) {
          el.screenEvents.classList.toggle('hidden', STATE.activeScreen !== 'EVENTS');
        }
        if (el.screenLeaderboard) {
          el.screenLeaderboard.classList.toggle('hidden', STATE.activeScreen !== 'LEADERBOARD');
        }

        // Render Global Incoming Friend Invite Toast & Sidebar Badge
        const myFriends = getMyFriendsList();
        if (el.sideNavFriendsSub) {
          el.sideNavFriendsSub.textContent = myFriends.length > 0 ? `${myFriends.length} Friend${myFriends.length === 1 ? '' : 's'}` : 'Search & Play';
        }
        if (STATE.incomingFriendInvite && STATE.incomingFriendInvite.roomCode) {
          if (el.sideNavFriendsInviteDot) el.sideNavFriendsInviteDot.classList.remove('hidden');
          if (el.globalFriendInviteToast) {
            el.globalFriendInviteToast.classList.remove('hidden');
            const inv = STATE.incomingFriendInvite;
            if (el.globalFriendInviteTitle) {
              el.globalFriendInviteTitle.textContent = `🏏 ${inv.fromFlag || '🇮🇳'} ${inv.fromUser} invited you to play a 1v1 Match!`;
            }
            if (el.globalFriendInviteSub) {
              el.globalFriendInviteSub.textContent = `Live Room Code: ${inv.roomCode} • Click Accept & Play to join instantly!`;
            }
          }
        } else {
          if (el.sideNavFriendsInviteDot) el.sideNavFriendsInviteDot.classList.add('hidden');
          if (el.globalFriendInviteToast) el.globalFriendInviteToast.classList.add('hidden');
        }

        // Render Friends Hub (Search Results + My Friends List) only when Friends screen is active
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
              el.friendSearchResultsList.innerHTML = `
                <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/35 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div class="text-xs font-extrabold text-white">@${rawQuery} not in local cache yet</div>
                    <div class="text-[11px] text-slate-400">You can add @${rawQuery} directly and invite them to play!</div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <button type="button" data-friend-add="${rawQuery}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">
                      ➕ Add @${rawQuery}
                    </button>
                    <button type="button" data-friend-play="${rawQuery}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-purple-500 hover:bg-purple-400 text-white transition">
                      🏏 Play Match
                    </button>
                  </div>
                </div>
              `;
            } else {
              el.friendSearchResultsList.innerHTML = `
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                  Type a friend's username in the search bar above (e.g. <strong>VIRAT_18</strong>) and click <strong>Add Username</strong> or <strong>Search</strong> to add &amp; play with them!
                </div>
              `;
            }
          } else {
            el.friendSearchResultsList.innerHTML = filteredPlayers.map((p) => {
              const isAdded = myFriends.includes(p.name);
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
                        ${hasOpenRoom ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono-num bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">🟢 Room ${openRm.roomCode}</span>` : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate">
                        ${p.totalRuns || 0} Runs • ${p.wicketsTaken || 0} Wickets • ${p.wins || 0}W–${p.losses || 0}L
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${isAdded
                      ? `<span class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">✓ Friend</span>`
                      : `<button type="button" data-friend-add="${p.name}" class="px-2.5 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">➕ Add Friend</button>`
                    }
                    <button type="button" data-friend-play="${p.name}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow transition">
                      ${hasOpenRoom ? `⚡ Join ${openRm.roomCode}` : '🏏 Play Match'}
                    </button>
                  </div>
                </div>
              `;
            }).join('');
          }

          if (el.myFriendsCountBadge) {
            el.myFriendsCountBadge.textContent = `${myFriends.length} Friend${myFriends.length === 1 ? '' : 's'}`;
          }
          if (myFriends.length === 0) {
            el.myFriendsListContainer.innerHTML = `
              <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                You haven't added any friends yet. Search their username above and click <strong>➕ Add Friend</strong>!
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
                        ${hasOpenRoom ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono-num bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 animate-pulse">🟢 Hosting ${openRm.roomCode}</span>` : ''}
                      </div>
                      <div class="text-[11px] text-slate-400 truncate">
                        ${p.totalRuns || 0} Runs • ${p.wicketsTaken || 0} Wkts • ${p.wins || 0}W–${p.losses || 0}L
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" data-friend-play="${fName}" class="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 shadow transition">
                      ${hasOpenRoom ? `⚡ Join Room ${openRm.roomCode}` : '🏏 Play Together'}
                    </button>
                    <button type="button" data-friend-remove="${fName}" class="px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-500/25 text-slate-400 hover:text-rose-300 border border-slate-700 transition" title="Remove Friend">
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
          const commActiveCls = 'py-2 px-2 rounded-lg text-[11px] font-extrabold transition bg-[#81b64c] text-white shadow';
          const commIdleCls = 'py-2 px-2 rounded-lg text-[11px] font-bold transition text-slate-300 hover:text-white bg-transparent';
          el.btnCommOptHype.className = STATE.commentaryStyle === 'HYPE' ? commActiveCls : commIdleCls;
          el.btnCommOptTactical.className = STATE.commentaryStyle === 'TACTICAL' ? commActiveCls : commIdleCls;
          el.btnCommOptClassic.className = STATE.commentaryStyle === 'CLASSIC' ? commActiveCls : commIdleCls;
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
            if (isPlaceholderUsername(cleanN)) return false;
            p.name = cleanN;
            p.elo = typeof p.elo === 'number' && !isNaN(p.elo) ? p.elo : (Number(p.elo) || 1500);
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
              el.leaderboardStandingsList.innerHTML = sortedGlobal.map((ent, idx) => {
              const isMe = ent.name === myCleanName;
              const cFlag = ent.countryFlag || '🇮🇳';
              const cDial = ent.countryCode || '+91';
              const entMatches = Math.max(ent.matches || 0, (ent.wins || 0) + (ent.losses || 0));
              const wlText = `Matches: ${entMatches} (${ent.wins || 0}W – ${ent.losses || 0}L) • Total Runs: ${ent.totalRuns || 0} • Wickets: ${ent.wicketsTaken || 0}`;
              return `
                <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-7 h-7 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${idx === 0 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${idx + 1}</span>
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
            }).join('');
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
              el.leaderboardStandingsList.innerHTML = sortedWeekly.map((ent, idx) => {
              const isMe = ent.name === myCleanName;
              const cFlag = ent.countryFlag || '🇮🇳';
              const cDial = ent.countryCode || '+91';
              const wkGain = ent.weeklyEloGain || 0;
              const wkSign = wkGain >= 0 ? `+${wkGain}` : `${wkGain}`;
              const wkMatches = Math.max(ent.weeklyMatches || 0, (ent.weeklyWins || 0) + (ent.weeklyLosses || 0));
              const subText = `Mon–Sun: ${wkMatches} Matches (${ent.weeklyWins || 0}W – ${ent.weeklyLosses || 0}L) • ${ent.weeklyRuns || 0} Runs • ${ent.weeklyWickets || 0} Wkts`;
              return `
                <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-7 h-7 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${idx === 0 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${idx + 1}</span>
                    <span class="text-lg">${cFlag}</span>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-extrabold ${isMe ? 'text-[#a3d96c]' : 'text-white'} truncate flex items-center gap-1.5">
                        <span>${ent.name}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-900 text-amber-300 border border-slate-700">${cDial}</span>
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
            }).join('');
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
              el.leaderboardStandingsList.innerHTML = sortedRuns.map((ent, idx) => {
              const isMe = ent.name === myCleanName;
              const cFlag = ent.countryFlag || '🇮🇳';
              const cDial = ent.countryCode || '+91';
              const sr = formatSR(ent.totalRuns || 0, ent.totalBalls || 0);
              const entMatches = Math.max(ent.matches || 0, (ent.wins || 0) + (ent.losses || 0));
              const subText = `Matches: ${entMatches} (${ent.wins || 0}W–${ent.losses || 0}L) • Wickets: ${ent.wicketsTaken || 0} • High Score: ${ent.highScore || 0} • Balls: ${ent.totalBalls || 0} (SR ${sr})`;
              return `
                <div class="p-3.5 rounded-xl flex items-center justify-between gap-2 border ${isMe ? 'bg-[#81b64c]/15 border-[#81b64c] shadow-md' : 'bg-[#262421] border-[#45423e]'}">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="w-7 h-7 rounded-lg bg-[#1b1a17] flex items-center justify-center font-mono-num text-xs font-black ${idx === 0 ? 'text-amber-300 border border-amber-400/40' : 'text-slate-300'}">#${idx + 1}</span>
                    <span class="text-lg">${cFlag}</span>
                    <div class="min-w-0">
                      <div class="text-xs sm:text-sm font-extrabold ${isMe ? 'text-[#a3d96c]' : 'text-white'} truncate flex items-center gap-1.5">
                        <span>${ent.name}</span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono-num bg-slate-900 text-amber-300 border border-slate-700">${cDial}</span>
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
            }).join('');
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
              const rightColor = isBotOrFrozen
                ? 'text-cyan-300'
                : (h.result === 'WIN' ? 'text-[#81b64c]' : 'text-rose-400');
              const titleText = h.result === 'FORFEIT'
                ? `🏳️ Match Forfeited vs ${h.opponent}`
                : (h.result === 'WIN' ? `🏆 ${h.p1Name || myCleanName} defeated ${h.opponent}` : `❌ ${h.opponent} defeated ${h.p1Name || myCleanName}`);
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
          TOSS: { text: 'Toss Phase (15s Clock)', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
          TOSS_DECISION: { text: 'Toss Result', cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30' },
          INNINGS_1: { text: '1st Innings', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
          INNINGS_BREAK: { text: 'Innings Break', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' },
          INNINGS_2: { text: '2nd Innings • The Chase', cls: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
          GAME_OVER: { text: 'Match Finished', cls: 'bg-rose-500/20 text-rose-300 border-rose-400/30' }
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
            ? 'px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
            : 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';

          el.aiRoleBadge.textContent = !p1Batting ? '🏏 BATTING' : '⚾ BOWLING';
          el.aiRoleBadge.className = !p1Batting
            ? 'px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
            : 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';

          el.userScoreCard.className = p1Batting
            ? 'glass-card-active rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all'
            : 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
          el.aiScoreCard.className = !p1Batting
            ? 'glass-card-active rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all'
            : 'glass-card rounded-xl sm:rounded-2xl p-2.5 sm:p-4 relative overflow-hidden transition-all';
        } else {
          el.userRoleBadge.textContent = STATE.phase === 'GAME_OVER' ? (STATE.winner === 'USER' ? '🏆 WINNER' : 'FINISHED') : 'READY';
          el.userRoleBadge.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
          el.aiRoleBadge.textContent = STATE.phase === 'GAME_OVER' ? (STATE.winner === 'AI' ? '🏆 WINNER' : 'FINISHED') : 'READY';
          el.aiRoleBadge.className = 'px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700';
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
          el.equationStatusText.textContent = `🏏 ${batterLabel} setting target • ⚾ ${bowlerLabel} bowling`;
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
            el.equationStatusText.textContent = STATE.winner === 'USER' ? `🏆 ${p1Name} won the match!` : `🏆 ${p2Name} won the match!`;
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
              ? 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              : 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
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
              el.tossWinnerTag.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
              el.tossResultHeadline.textContent = `${p1Name} called ${STATE.tossCall} and the sum is ${STATE.tossSum} (${sumParity})!`;
              el.tossDecisionSubtext.textContent = 'Would you like to Bat first and set a target, or Bowl first and chase?';
              el.userTossChoiceButtons.classList.remove('hidden');
              el.aiTossChoiceContinue.classList.add('hidden');
            } else {
              const aiRole = STATE.firstBatter === 'AI' ? 'BAT FIRST' : 'BOWL FIRST';
              el.tossWinnerTag.textContent = `🤖 ${p2Name.toUpperCase()} WON THE TOSS`;
              el.tossWinnerTag.className = 'px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30';
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
          const p1Won = STATE.winner === 'USER';
          const didIWin = isMultiplayer() && STATE.onlineRole === 'GUEST' ? !p1Won : p1Won;
          const winnerName = p1Won ? p1Name : p2Name;
          const loserName = p1Won ? p2Name : p1Name;
          if (STATE.isTossForfeit) {
            el.gameOverBadge.textContent = '🏳️ TOSS FORFEIT';
            el.gameOverBadge.className = 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/40';
            el.gameOverTitle.textContent = `🏳️ MATCH FORFEITED (${winnerName} WINS BY FORFEIT)`;
          } else {
            el.gameOverBadge.textContent = didIWin ? 'VICTORY' : 'LOSS';
            el.gameOverBadge.className = didIWin
              ? 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              : 'inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-400/30';
            el.gameOverTitle.textContent = didIWin
              ? `🏆 ${winnerName} WON THE MATCH!`
              : `❌ ${loserName} LOST — ${winnerName} WON!`;
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
            el.cardInn1StatusPill.className = 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300';
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
              ? 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300'
              : 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300';
          }

          el.cardInn2Team.textContent = inn2TeamLabel;
          if (STATE.currentInnings === 2 || (STATE.phase === 'GAME_OVER' && STATE.target !== null)) {
            const inn2Out = STATE.phase === 'GAME_OVER' && inn2Runs < STATE.target;
            const needMore = Math.max(0, (STATE.target || 0) - inn2Runs);
            el.cardInn2Score.textContent = `${inn2Runs}/${inn2Out ? '1' : '0'} (${inn2Balls}b • ${STATE.phase === 'GAME_OVER' ? 'T:' + STATE.target : 'Need ' + needMore})`;
            if (el.cardInn2StatusPill) {
              el.cardInn2StatusPill.textContent = inn2Active ? `🎯 T:${STATE.target}` : (inn2Runs >= STATE.target ? '🏆 CHASED' : 'OUT');
              el.cardInn2StatusPill.className = inn2Active
                ? 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-cyan-500/25 text-cyan-300'
                : 'text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300';
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
              const winName = STATE.winner === 'USER' ? p1Name : p2Name;
              el.scorecardLiveVerdictBar.textContent = `🏆 Match #${activeMatchNum} Final: ${winName} Won! (${inn1TeamLabel.split(' ')[0]} ${inn1Runs} vs ${inn2TeamLabel.split(' ')[0]} ${inn2Runs})`;
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
            el.scorecardMatchHistoryList.innerHTML = STATE.matchScorecards.slice(0, 12).map((mc) => `
              <div class="p-2 rounded-lg bg-[#22201d] border border-[#3d3a36] flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-extrabold text-white truncate">
                    <span class="text-amber-300 font-mono-num">#${mc.matchNumber}</span>
                    <span> • 🏆 ${mc.winnerName}</span>
                  </div>
                  <div class="text-[10px] text-slate-300 font-mono-num truncate">
                    1st: ${mc.inn1Team} ${mc.inn1Summary} | 2nd: ${mc.inn2Team} ${mc.inn2Summary}
                  </div>
                </div>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-mono-num font-black shrink-0 ${mc.didIWin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                  ${mc.didIWin ? 'WIN' : 'LOSS'}
                </span>
              </div>
            `).join('');
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
            emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
            amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
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

        // 1. Stadium Night Sky & Turf Gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#06101e');
        bgGrad.addColorStop(0.62, '#0b1e33');
        bgGrad.addColorStop(1, '#092e26');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Subtle turf perspective ellipses
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(w / 2, h * 0.88, w * 0.42, h * 0.22, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Center pitch strip
        const pitchW = Math.min(180, w * 0.3);
        const pitchH = h * 0.36;
        ctx.fillStyle = 'rgba(217, 183, 122, 0.10)';
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

        ctx.fillStyle = isMatchedOut ? 'rgba(244, 63, 94, 0.18)' : 'rgba(16, 185, 129, 0.13)';
        ctx.strokeStyle = isMatchedOut ? 'rgba(244, 63, 94, 0.7)' : 'rgba(16, 185, 129, 0.55)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, leftX, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isMultiplayer() ? getP1Label().toUpperCase() + ' HAND' : 'YOUR HAND', leftX + cardW / 2, cardY + 20);

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
          if (screenName !== 'LEADERBOARD' && !requireAccountAndPassword()) return;
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
        if (el.sideNavEvents) {
          el.sideNavEvents.addEventListener('click', () => switchCenterScreen('EVENTS'));
        }
        if (el.btnBackFromEvents) {
          el.btnBackFromEvents.addEventListener('click', () => switchCenterScreen('PITCH'));
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
        if (el.myFriendsListContainer) {
          el.myFriendsListContainer.addEventListener('click', handleFriendsDelegatedClick);
        }
        if (el.btnAcceptGlobalFriendInvite) {
          el.btnAcceptGlobalFriendInvite.addEventListener('click', () => {
            if (!STATE.incomingFriendInvite || !STATE.incomingFriendInvite.roomCode) return;
            const code = STATE.incomingFriendInvite.roomCode;
            STATE.incomingFriendInvite = null;
            STATE.activeScreen = 'MP_SETUP';
            joinMultiplayerRoom(code);
          });
        }
        if (el.btnDismissGlobalFriendInvite) {
          el.btnDismissGlobalFriendInvite.addEventListener('click', () => {
            SoundFX.click();
            STATE.incomingFriendInvite = null;
            renderAll();
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

        const executeRemoveCurrentAccount = () => {
          SoundFX.click();
          const unameToRemove = (STATE.myUsername || '').trim().toUpperCase();
          if (!unameToRemove || isPlaceholderUsername(unameToRemove)) return;

          // 1. Delete from Encrypted Users Vault
          const usersMap = loadEncryptedUsersMap();
          if (usersMap[unameToRemove]) {
            delete usersMap[unameToRemove];
            saveEncryptedUsersMap(usersMap);
          }

          // 2. Delete from Leaderboard & Worldwide Players Registry
          markAccountPurgedLocal(unameToRemove);
          delete STATE.humanPlayers[unameToRemove];
          if (typeof window.__purgeCloudAccount === 'function') {
            try { window.__purgeCloudAccount(unameToRemove); } catch (e) {}
          }
          STATE.eloHistory = STATE.eloHistory.filter((h) => h.p1Name !== unameToRemove && h.opponent !== unameToRemove);
          STATE.matchScorecards = STATE.matchScorecards.filter((m) => m.p1Name !== unameToRemove && m.p2Name !== unameToRemove);

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
            localStorage.setItem(SIGNED_OUT_FLAG_KEY, '1');
          } catch (e) {}

          // 3. Broadcast removal across BroadcastChannel and PeerJS Hub
          const removalPacket = {
            type: 'GLOBAL_ACCOUNT_REMOVED',
            username: unameToRemove,
            timestamp: Date.now()
          };
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
          if (el.modalRemoveConfirmBox) el.modalRemoveConfirmBox.classList.add('hidden');
          setModalAuthTab('SIGNUP');
          renderAll();

          // Redirect to index.html after account removal
          if (!redirectToMainPage('?removed=1')) {
            enforceMandatoryAuthGate(`🗑️ Account "${unameToRemove}" removed! Redirecting to index.html (on live site) — create a new account below to play.`);
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
          el.btnModalSubmitAuth.addEventListener('click', () => {
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

            const usersMap = loadEncryptedUsersMap();
            if (STATE.modalAuthMode === 'SIGNUP' || !usersMap[uname]) {
              if (usersMap[uname] && STATE.modalAuthMode === 'SIGNUP') {
                if (!verifyUserCredentials(usersMap[uname], dial, pin5)) {
                  showModalMsg(`Username ${uname} already exists! Enter its matching country code & 5-digit password.`, false);
                  return;
                }
              } else {
                usersMap[uname] = {
                  username: uname,
                  countryCode: dial,
                  countryName: cName,
                  countryFlag: cFlag,
                  encryptedAuth: derivePasswordVerifier(uname, dial, pin5),
                  createdAt: new Date().toISOString()
                };
                saveEncryptedUsersMap(usersMap);
              }
            } else {
              if (!verifyUserCredentials(usersMap[uname], dial, pin5)) {
                showModalMsg(`Incorrect country code (${dial}) or 5-digit password for ${uname}!`, false);
                return;
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
            broadcastGlobalLeaderboardSync(true, true);
            enforceMandatoryAuthGate();
            closeAuthModal();
            switchCenterScreen('PITCH');
          });
        }

        // Listen for live login broadcasts from login.html
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const authBc = new BroadcastChannel('oddandeven_auth_sync');
            authBc.onmessage = (ev) => {
              if (ev && ev.data && ev.data.type === 'AUTH_LOGIN_SUCCESS' && ev.data.session) {
                const s = ev.data.session;
                STATE.myUsername = s.username;
                STATE.myCountryCode = s.countryCode || '+91';
                STATE.myCountryFlag = s.countryFlag || '🇮🇳';
                STATE.myCountryName = s.countryName || 'India';
                STATE.isAuthenticated = true;
                if (el.botSetupPlayerName) el.botSetupPlayerName.value = STATE.myUsername;
                syncAuthAndPurgeFakeSeeds();
                STATE.activeScreen = 'PITCH';
                renderAll();
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

        el.cardQuickBot.addEventListener('click', () => switchCenterScreen('BOT_SETUP'));
        el.cardQuickMp.addEventListener('click', () => switchCenterScreen('MP_SETUP'));
        el.cardQuickCommentary.addEventListener('click', () => {
          SoundFX.click();
          const order = ['HYPE', 'TACTICAL', 'CLASSIC'];
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
      };
    })();

// ==========================================
// 10. FIREBASE CLOUD SYNC BRIDGE (Dynamic Module Loader)
// ==========================================
(function initFirebaseCloudModule() {
  'use strict';
  const firebaseConfigRaw = typeof __firebase_config !== 'undefined' && __firebase_config ? __firebase_config : null;
  if (!firebaseConfigRaw) return;

  let firebaseConfig = null;
  try {
    firebaseConfig = typeof firebaseConfigRaw === 'string' ? JSON.parse(firebaseConfigRaw) : firebaseConfigRaw;
  } catch (e) {
    return;
  }
  if (!firebaseConfig) return;

  const appId = typeof __app_id !== 'undefined' ? __app_id : 'oddandeven-arena-app';

  Promise.all([
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js')
  ])
    .then(async ([appMod, authMod, firestoreMod]) => {
      const { initializeApp } = appMod;
      const { getAuth, signInAnonymously, signInWithCustomToken } = authMod;
      const { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } = firestoreMod;

      let db = null;
      let currentUser = null;
      let cloudPlayers = {};
      let cloudAccounts = {};
      let cloudPurged = [];

      window.__syncCloudLeaderboard = async function (humanPlayersMap, usersVault, activeUsername) {
        if (!db || !currentUser) return;
        try {
          if (usersVault && typeof usersVault === 'object') {
            for (const k of Object.keys(usersVault)) {
              const clean = (k || '').trim().toUpperCase();
              if (clean && clean.length >= 3 && clean !== 'GUEST' && clean !== 'PLAYER_1' && !cloudAccounts[clean]) {
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean), usersVault[k]);
              }
            }
          }
          if (humanPlayersMap && typeof humanPlayersMap === 'object') {
            for (const k of Object.keys(humanPlayersMap)) {
              const clean = (k || '').trim().toUpperCase();
              const localRec = humanPlayersMap[k];
              if (!clean || !localRec || !localRec.isRealRegisteredUser || clean === 'GUEST' || clean === 'PLAYER_1') continue;
              const cloudRec = cloudPlayers[clean];
              const mergedRec = typeof window.__mergeSinglePlayerRecord === 'function' && cloudRec
                ? window.__mergeSinglePlayerRecord(cloudRec, localRec).record
                : localRec;
              const isActiveUser = activeUsername && clean === activeUsername.trim().toUpperCase();
              const hasNewerStats = !cloudRec ||
                (mergedRec.matches || 0) > (cloudRec.matches || 0) ||
                (mergedRec.totalRuns || 0) > (cloudRec.totalRuns || 0) ||
                (mergedRec.wicketsTaken || 0) > (cloudRec.wicketsTaken || 0) ||
                mergedRec.elo !== cloudRec.elo;
              if (isActiveUser || hasNewerStats) {
                cloudPlayers[clean] = mergedRec;
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean), mergedRec);
              }
            }
          }
        } catch (e) {}
      };

      window.__purgeCloudAccount = async function (username) {
        if (!db || !currentUser || !username) return;
        const clean = username.trim().toUpperCase();
        try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purged_accounts', clean), {
            username: clean,
            purgedAt: Date.now()
          });
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', clean));
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'accounts', clean));
        } catch (e) {}
      };

      try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        db = getFirestore(app);
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          const cred = await signInWithCustomToken(auth, __initial_auth_token);
          currentUser = cred.user;
        } else {
          const cred = await signInAnonymously(auth);
          currentUser = cred.user;
        }
        if (!currentUser) return;

        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'accounts'), (snap) => {
          cloudAccounts = {};
          snap.forEach((d) => { if (d.exists()) cloudAccounts[d.id] = d.data(); });
          if (typeof window.__onCloudLeaderboardUpdate === 'function') {
            window.__onCloudLeaderboardUpdate(cloudPlayers, cloudAccounts, cloudPurged);
          }
        }, () => {});

        let initialPushDone = false;
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard'), (snap) => {
          cloudPlayers = {};
          snap.forEach((d) => { if (d.exists()) cloudPlayers[d.id] = d.data(); });
          if (typeof window.__onCloudLeaderboardUpdate === 'function') {
            window.__onCloudLeaderboardUpdate(cloudPlayers, cloudAccounts, cloudPurged);
          }
          if (!initialPushDone && typeof window.__syncCloudLeaderboard === 'function') {
            initialPushDone = true;
            try {
              const worldRaw = localStorage.getItem('oddandeven_worldwide_players_v1');
              const worldMap = worldRaw ? JSON.parse(worldRaw) : {};
              window.__syncCloudLeaderboard(worldMap, null, null);
            } catch (e) {}
          }
        }, () => {});

        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'purged_accounts'), (snap) => {
          cloudPurged = [];
          snap.forEach((d) => { if (d.exists()) cloudPurged.push(d.id.toUpperCase()); });
          if (typeof window.__onCloudLeaderboardUpdate === 'function') {
            window.__onCloudLeaderboardUpdate(cloudPlayers, cloudAccounts, cloudPurged);
          }
        }, () => {});
      } catch (e) {}
    })
    .catch(() => {});
})();