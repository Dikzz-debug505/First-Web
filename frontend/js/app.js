
/* ===== SECURITY HARDENING ===== */
(function () {
    'use strict';

    const SECURITY = Object.freeze({
        MAX_BYTES_FILE: 512 * 1024 * 1024,       // 512 MB
        MAX_UNITY_ENTRIES: 100000,
        MAX_ENTRY_NAME: 4096,
        MAX_HERO_RESULTS: 10000
    });

    window.MLBB_SECURITY = SECURITY;

    window.escapeHTML = function (value) {
        const s = String(value ?? '');
        return s.replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    };

    window.validateLocalFile = function (file, extensions) {
        if (!file) throw new Error(t('js.file_not_chosen'));
        if (file.size > SECURITY.MAX_BYTES_FILE) {
            throw new Error(t('js.file_too_big'));
        }
        const name = String(file.name || '');
        const lower = name.toLowerCase();
        if (!extensions.some(ext => lower.endsWith(ext))) {
            throw new Error('jenis file tidak didukung');
        }
        return true;
    };

    window.safeFileName = function (name, fallback) {
        const base = String(name || fallback || 'output')
            .replace(/[\/\\:*?"<>|]/g, '_')
            .replace(/[\x00-\x1F\x7F]/g, '_')
            .slice(0, 180);
        return base || fallback || 'output';
    };
})();

(function() {
            'use strict';

            const toast = document.getElementById('toast');
            let toastTimer = null;

            function showToast(msg, type = 'info') {
                if (toastTimer) clearTimeout(toastTimer);
                toast.textContent = msg;
                toast.className = 'toast ' + type;
                void toast.offsetWidth;
                toast.classList.add('show');
                toastTimer = setTimeout(() => {
                    toast.classList.remove('show');
                }, 4500);
            }

            const MUSIC_PREF_KEY = 'mlbb_bgm_enabled';
            const MUSIC_TRACK_KEY = 'mlbb_bgm_track';
            const LONG_PRESS_MS = 520;

            const BGM_TRACKS = {
                '1': { name: 'Lagu 1', src: 'assets/bgm.mp3', icon: '🎵' },
                '2': { name: 'Lagu 2', src: 'assets/bgm2.mp3', icon: '🎶', fallback: 'assets/bgm.mp3' }
            };

            let bgmIsPlaying = false;
            let bgmCurrentTrack = '1';
            let longPressTimer = null;
            let longPressFired = false;
            let menuOpen = false;

            function getBgmAudio() {
                return document.getElementById('bgmAudio');
            }

            function bgmUpdateBtn() {
                const btn = document.getElementById('musicToggleBtn');
                const icon = document.getElementById('musicFabIcon');
                if (!btn) return;
                if (bgmIsPlaying) {
                    if (icon) icon.textContent = '🔊';
                    btn.classList.add('playing');
                    btn.title = 'Ketuk: matikan · Tahan: pilih lagu';
                } else {
                    if (icon) icon.textContent = '🔇';
                    btn.classList.remove('playing');
                    btn.title = 'Ketuk: putar · Tahan: pilih lagu';
                }
            }

            function bgmUpdateTrackUI() {
                ['1', '2'].forEach(function (id) {
                    const el = document.getElementById('musicTrack' + id);
                    if (!el) return;
                    const check = el.querySelector('.music-track-check');
                    if (id === bgmCurrentTrack) {
                        el.classList.add('active');
                        if (check) check.hidden = false;
                    } else {
                        el.classList.remove('active');
                        if (check) check.hidden = true;
                    }
                });
            }

            function bgmSetSrc(trackId, andPlay) {
                const track = BGM_TRACKS[trackId] || BGM_TRACKS['1'];
                const audio = getBgmAudio();
                if (!audio) return;
                const wasPlaying = bgmIsPlaying || andPlay;
                const nextSrc = track.src;
                const abs = new URL(nextSrc, window.location.href).href;
                const currentAbs = audio.src ? audio.src : '';
                if (currentAbs !== abs && !currentAbs.endsWith('/' + nextSrc) && currentAbs.indexOf(nextSrc) === -1) {
                    audio.pause();
                    audio.src = nextSrc;
                    audio.load();
                }
                bgmCurrentTrack = trackId;
                try { localStorage.setItem(MUSIC_TRACK_KEY, trackId); } catch (e) {}
                bgmUpdateTrackUI();
                if (wasPlaying) {
                    localStorage.setItem(MUSIC_PREF_KEY, '1');
                    bgmPlay(true);
                }
            }

            function bgmPlay(silent) {
                const audio = getBgmAudio();
                if (!audio) return;
                if (localStorage.getItem(MUSIC_PREF_KEY) === '0') return;
                audio.volume = 0.35;
                const track = BGM_TRACKS[bgmCurrentTrack] || BGM_TRACKS['1'];
                if (!audio.src || (audio.getAttribute('src') !== track.src && !audio.src.endsWith(track.src))) {
                    if (!(audio.src && audio.src.indexOf(track.src) !== -1)) {
                        audio.src = track.src;
                    }
                }
                const p = audio.play();
                if (p && typeof p.then === 'function') {
                    p.then(function () {
                        bgmIsPlaying = true;
                        localStorage.setItem(MUSIC_PREF_KEY, '1');
                        bgmUpdateBtn();
                    }).catch(function () {
                        bgmIsPlaying = false;
                        bgmUpdateBtn();
                        if (bgmCurrentTrack === '2' && track.fallback) {
                            audio.src = track.fallback;
                            audio.load();
                            audio.play().then(function () {
                                bgmIsPlaying = true;
                                bgmUpdateBtn();
                                if (!silent && typeof showToast === 'function') {
                                    showToast('🎶 Lagu 2 memakai fallback (tambahkan bgm2.mp3 untuk file terpisah)', 'info');
                                }
                            }).catch(function () {});
                        }
                    });
                } else {
                    bgmIsPlaying = true;
                    localStorage.setItem(MUSIC_PREF_KEY, '1');
                    bgmUpdateBtn();
                }
            }

            function bgmStop() {
                const audio = getBgmAudio();
                if (!audio) return;
                audio.pause();
                audio.currentTime = 0;
                bgmIsPlaying = false;
                localStorage.setItem(MUSIC_PREF_KEY, '0');
                bgmUpdateBtn();
            }

            function showMusicMenu() {
                const menu = document.getElementById('musicTrackMenu');
                if (!menu) return;
                menu.hidden = false;
                menuOpen = true;
                bgmUpdateTrackUI();
            }

            function hideMusicMenu() {
                const menu = document.getElementById('musicTrackMenu');
                if (!menu) return;
                menu.hidden = true;
                menuOpen = false;
            }

            function toggleMusicMenu() {
                if (menuOpen) hideMusicMenu();
                else showMusicMenu();
            }

            function showMusicFloat() {
                const wrap = document.getElementById('musicFloat');
                if (wrap) {
                    wrap.style.display = 'flex';
                    wrap.setAttribute('aria-hidden', 'false');
                }
            }

            function hideMusicFloat() {
                const wrap = document.getElementById('musicFloat');
                if (wrap) {
                    wrap.style.display = 'none';
                    wrap.setAttribute('aria-hidden', 'true');
                }
                hideMusicMenu();
            }

            window.MLBB_showMusicFloat = showMusicFloat;
            window.MLBB_hideMusicFloat = hideMusicFloat;

            (function initBgm() {
                const btn = document.getElementById('musicToggleBtn');
                if (!btn) return;

                try {
                    const saved = localStorage.getItem(MUSIC_TRACK_KEY);
                    if (saved && BGM_TRACKS[saved]) bgmCurrentTrack = saved;
                } catch (e) {}
                const audio = getBgmAudio();
                if (audio) {
                    const t = BGM_TRACKS[bgmCurrentTrack] || BGM_TRACKS['1'];
                    audio.src = t.src;
                    audio.loop = true;
                }
                bgmUpdateTrackUI();

                function clearLongPress() {
                    if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                    }
                    btn.classList.remove('long-pressing');
                }

                function onPointerDown(e) {
                    if (e.button != null && e.button !== 0) return;
                    longPressFired = false;
                    clearLongPress();
                    btn.classList.add('long-pressing');
                    longPressTimer = setTimeout(function () {
                        longPressFired = true;
                        btn.classList.remove('long-pressing');
                        try { if (navigator.vibrate) navigator.vibrate(18); } catch (err) {}
                        showMusicMenu();
                    }, LONG_PRESS_MS);
                }

                function onPointerUp(e) {
                    const wasLong = longPressFired;
                    clearLongPress();
                    if (wasLong) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    if (menuOpen) {
                        hideMusicMenu();
                        return;
                    }
                    if (bgmIsPlaying) {
                        bgmStop();
                        if (typeof showToast === 'function') showToast(t('js.music_off'), 'info');
                    } else {
                        localStorage.setItem(MUSIC_PREF_KEY, '1');
                        bgmPlay();
                        if (typeof showToast === 'function') showToast(t('js.song_play', { name: (BGM_TRACKS[bgmCurrentTrack] || {}).name || '' }), 'success');
                    }
                }

                function onPointerCancel() {
                    clearLongPress();
                }

                btn.addEventListener('pointerdown', onPointerDown);
                btn.addEventListener('pointerup', onPointerUp);
                btn.addEventListener('pointerleave', onPointerCancel);
                btn.addEventListener('pointercancel', onPointerCancel);
                btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                });

                ['1', '2'].forEach(function (id) {
                    const el = document.getElementById('musicTrack' + id);
                    if (!el) return;
                    el.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const track = BGM_TRACKS[id];
                        const prev = bgmCurrentTrack;
                        bgmCurrentTrack = id;
                        try { localStorage.setItem(MUSIC_TRACK_KEY, id); } catch (err) {}
                        bgmUpdateTrackUI();
                        hideMusicMenu();
                        localStorage.setItem(MUSIC_PREF_KEY, '1');
                        const audio = getBgmAudio();
                        if (audio) {
                            audio.pause();
                            audio.src = track.src;
                            audio.load();
                            audio.volume = 0.35;
                            audio.play().then(function () {
                                bgmIsPlaying = true;
                                bgmUpdateBtn();
                                if (typeof showToast === 'function') {
                                    showToast(track.icon + ' ' + track.name + ' diputar', 'success');
                                }
                            }).catch(function () {
                                if (track.fallback) {
                                    audio.src = track.fallback;
                                    audio.load();
                                    audio.play().then(function () {
                                        bgmIsPlaying = true;
                                        bgmUpdateBtn();
                                        if (typeof showToast === 'function') {
                                            showToast('🎶 Lagu 2 (fallback) — tambahkan file bgm2.mp3 untuk track terpisah', 'info');
                                        }
                                    }).catch(function () {
                                        bgmIsPlaying = false;
                                        bgmUpdateBtn();
                                        if (typeof showToast === 'function') showToast(t('js.song_fail'), 'error');
                                    });
                                } else {
                                    bgmIsPlaying = false;
                                    bgmUpdateBtn();
                                    if (typeof showToast === 'function') showToast(t('js.song_fail'), 'error');
                                }
                            });
                        }
                    });
                });

                document.addEventListener('pointerdown', function (e) {
                    if (!menuOpen) return;
                    const wrap = document.getElementById('musicFloat');
                    if (wrap && !wrap.contains(e.target)) {
                        hideMusicMenu();
                    }
                }, true);

                if (localStorage.getItem(MUSIC_PREF_KEY) !== '0') {
                    localStorage.setItem(MUSIC_PREF_KEY, '1');
                }

                bgmUpdateBtn();

                bgmPlay(true);

                const resumeOnce = function () {
                    document.removeEventListener('click', resumeOnce, true);
                    document.removeEventListener('keydown', resumeOnce, true);
                    if (!bgmIsPlaying && localStorage.getItem(MUSIC_PREF_KEY) !== '0') {
                        bgmPlay(true);
                    }
                };
                document.addEventListener('click', resumeOnce, true);
                document.addEventListener('keydown', resumeOnce, true);
            })();

            const LOGIN_SESSION_KEY = 'mlbb_auth_session_v2';
            function t(key, vars) {
                try {
                    if (window.MLBB_i18n && typeof MLBB_i18n.t === 'function') return MLBB_i18n.t(key, vars);
                } catch (e) {}
                return key;
            }
            /** Translate known Indonesian UI literals when English is active */
            function tr(idText, enText) {
                try {
                    if (window.MLBB_i18n && MLBB_i18n.getLang() === 'en') return enText;
                } catch (e) {}
                return idText;
            }

            const LOGIN_FAIL_KEY = 'mlbb_login_fail_v1';
            const MANAGED_USERS_KEY = 'mlbb_managed_users_v1';
            const DELETED_USERS_KEY = 'mlbb_deleted_users_v1'; // blocklist username (case-insensitive)
            const DEVICE_ID_KEY = 'mlbb_device_id_v1';
            const DEVICE_REGISTRY_KEY = 'mlbb_device_registry_v1';
            const MAX_FAIL_ATTEMPTS = 5;
            const LOCKOUT_MS = 90 * 1000;          // 90 detik lock setelah 5 gagal (diperkuat)
            const FAIL_DELAY_BASE_MS = 400;        // delay dasar saat gagal
            const SUCCESS_SPIN_MS = 900;           // waktu spinner sebelum success state
            const SUCCESS_HOLD_MS = 650;           // waktu tampil checkmark sebelum fade-out
            const FADE_OUT_MS = 550;

            /** SHA-256 hex (Web Crypto). Returns Promise<string>. Legacy format — kept for backward compatibility
             *  with hashes already stored in credentials.js / localStorage (so old accounts keep working). */
            function hashPassword(plain) {
                const data = new TextEncoder().encode(String(plain || ""));
                if (window.crypto && window.crypto.subtle) {
                    return window.crypto.subtle.digest("SHA-256", data).then(function (buf) {
                        const arr = new Uint8Array(buf);
                        let hex = "";
                        for (let i = 0; i < arr.length; i++) {
                            hex += arr[i].toString(16).padStart(2, "0");
                        }
                        return hex;
                    });
                }
                let h = 0;
                const s = String(plain || "");
                for (let i = 0; i < s.length; i++) {
                    h = ((h << 5) - h) + s.charCodeAt(i);
                    h = h & h;
                }
                return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8).padStart(64, "0"));
            }

            const PBKDF2_ITERATIONS = 150000; // OWASP-recommended floor for PBKDF2-HMAC-SHA256 (2023+)
            const PBKDF2_SALT_BYTES = 16;

            function bufToHex(buf) {
                const arr = new Uint8Array(buf);
                let hex = "";
                for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, "0");
                return hex;
            }

            function hexToBuf(hex) {
                const clean = String(hex || "").trim();
                const arr = new Uint8Array(clean.length / 2);
                for (let i = 0; i < arr.length; i++) arr[i] = parseInt(clean.substr(i * 2, 2), 16);
                return arr;
            }

            /** New, much stronger hash: PBKDF2-HMAC-SHA256, 150k iterations, random 16-byte salt per password.
             *  Output format: "pbkdf2$<iterations>$<saltHex>$<hashHex>" — self-describing, so it can never be
             *  confused with a legacy plain SHA-256 hex hash (which is always exactly 64 hex chars, no "$"). */
            async function hashPasswordStrong(plain, existingSaltHex) {
                if (!(window.crypto && window.crypto.subtle)) {
                    return hashPassword(plain);
                }
                const saltHex = existingSaltHex || bufToHex(window.crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES)));
                const salt = hexToBuf(saltHex);
                const keyMaterial = await window.crypto.subtle.importKey(
                    "raw",
                    new TextEncoder().encode(String(plain || "")),
                    { name: "PBKDF2" },
                    false,
                    ["deriveBits"]
                );
                const bits = await window.crypto.subtle.deriveBits(
                    { name: "PBKDF2", salt: salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
                    keyMaterial,
                    256
                );
                return "pbkdf2$" + PBKDF2_ITERATIONS + "$" + saltHex + "$" + bufToHex(bits);
            }

            function isPbkdf2Hash(h) {
                return typeof h === "string" && h.indexOf("pbkdf2$") === 0;
            }

            /** Sync-ish helper: compare stored hash/plaintext safely after hashing input.
             *  Supports (in order of preference): new PBKDF2 hashes, legacy plain SHA-256 hex hashes,
             *  and legacy plaintext (managed users not yet re-saved). Nothing here removes a previously
             *  working login path — it only adds a stronger option on top. */
            async function credentialsMatch(row, plainPassword) {
                const p = String(plainPassword || "");
                if (row.passwordHash) {
                    const stored = String(row.passwordHash);
                    if (isPbkdf2Hash(stored)) {
                        const parts = stored.split("$"); // pbkdf2 | iterations | salt | hash
                        if (parts.length !== 4) return false;
                        const saltHex = parts[2];
                        const candidate = await hashPasswordStrong(p, saltHex);
                        return timingSafeEqual(stored, candidate);
                    }
                    const h = await hashPassword(p);
                    return timingSafeEqual(stored, h);
                }
                if (row.password != null && row.password !== "") {
                    return timingSafeEqual(String(row.password), p);
                }
                return false;
            }

            const loginOverlay = document.getElementById('loginOverlay');
            const mainApp = document.getElementById('mainApp');
            const adminApp = document.getElementById('adminApp');
            const loginForm = document.getElementById('loginForm');
            const loginUser = document.getElementById('loginUser');
            const loginPass = document.getElementById('loginPass');
            const loginError = document.getElementById('loginError');
            const loginUserBadge = document.getElementById('loginUserBadge');
            const adminUserBadge = document.getElementById('adminUserBadge');
            const logoutBtn = document.getElementById('logoutBtn');
            const adminLogoutBtn = document.getElementById('adminLogoutBtn');
            const loginSpinner = document.getElementById('loginSpinner');
            const loginSpinnerText = document.getElementById('loginSpinnerText');
            const loginSubmitBtn = document.getElementById('loginSubmitBtn');

            let loginInProgress = false;
            let currentSessionUser = null;
            let currentIsAdmin = false;
            let currentIsSuper = false;

            function getOrCreateDeviceId() {
                try {
                    let id = localStorage.getItem(DEVICE_ID_KEY);
                    if (id && typeof id === 'string' && id.length >= 8) return id;
                    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
                    localStorage.setItem(DEVICE_ID_KEY, id);
                    return id;
                } catch (e) {
                    return 'dev_fallback_' + Date.now();
                }
            }

            function readDeviceRegistry() {
                try {
                    const raw = localStorage.getItem(DEVICE_REGISTRY_KEY);
                    if (!raw) return {};
                    const obj = JSON.parse(raw);
                    return (obj && typeof obj === 'object') ? obj : {};
                } catch (e) {
                    return {};
                }
            }

            function writeDeviceRegistry(reg) {
                try {
                    localStorage.setItem(DEVICE_REGISTRY_KEY, JSON.stringify(reg || {}));
                } catch (e) {}
            }

            function getDevicesForUser(username) {
                const reg = readDeviceRegistry();
                const list = reg[String(username || '').trim()] || [];
                return Array.isArray(list) ? list.filter(Boolean) : [];
            }

            function setDevicesForUser(username, list) {
                const reg = readDeviceRegistry();
                const u = String(username || '').trim();
                if (!u) return;
                reg[u] = Array.isArray(list) ? list.filter(Boolean) : [];
                writeDeviceRegistry(reg);
            }

            function resetDevicesForUser(username) {
                setDevicesForUser(username, []);
            }

            /**
             * Check / register device for user.
             * Returns { ok: true } or { ok: false, reason: 'max_devices' }
             */
            function checkAndRegisterDevice(username, maxDevices) {
                if (maxDevices == null || maxDevices === '' || Number(maxDevices) <= 0) {
                    return { ok: true };
                }
                const max = Math.max(1, Math.min(99, Number(maxDevices) || 1));
                const deviceId = getOrCreateDeviceId();
                let list = getDevicesForUser(username);
                if (list.includes(deviceId)) {
                    return { ok: true };
                }
                if (list.length >= max) {
                    return { ok: false, reason: 'max_devices', current: list.length, max: max };
                }
                list = list.concat([deviceId]);
                setDevicesForUser(username, list);
                return { ok: true };
            }

            function readManagedUsers() {
                try {
                    const raw = localStorage.getItem(MANAGED_USERS_KEY);
                    if (!raw) return [];
                    const arr = JSON.parse(raw);
                    if (!Array.isArray(arr)) return [];
                    return arr.filter(function (r) {
                        return r && typeof r.username === 'string' && r.username.trim();
                    }).map(function (r) {
                        return {
                            username: String(r.username || '').trim(),
                            password: String(r.password || ''),           // legacy
                            passwordHash: r.passwordHash ? String(r.passwordHash) : null,
                            maxDevices: r.maxDevices == null || r.maxDevices === '' ? null : Number(r.maxDevices),
                            expiryDate: r.expiryDate || null,
                            isAdmin: false,
                            _source: 'managed'
                        };
                    });
                } catch (e) {
                    return [];
                }
            }

            function writeManagedUsers(list) {
                try {
                    const clean = (list || []).map(function (r) {
                        const o = {
                            username: String(r.username || '').trim(),
                            maxDevices: r.maxDevices == null || r.maxDevices === '' ? null : Number(r.maxDevices),
                            expiryDate: r.expiryDate || null
                        };
                        if (r.passwordHash) o.passwordHash = String(r.passwordHash);
                        else if (r.password) o.password = String(r.password);
                        return o;
                    });
                    localStorage.setItem(MANAGED_USERS_KEY, JSON.stringify(clean));
                } catch (e) {}
            }

            function readDeletedUsers() {
                try {
                    const raw = localStorage.getItem(DELETED_USERS_KEY);
                    if (!raw) return [];
                    const arr = JSON.parse(raw);
                    if (!Array.isArray(arr)) return [];
                    return arr.map(function (s) { return String(s || '').trim().toLowerCase(); })
                        .filter(Boolean);
                } catch (e) {
                    return [];
                }
            }

            function writeDeletedUsers(list) {
                try {
                    const clean = (list || []).map(function (s) {
                        return String(s || '').trim().toLowerCase();
                    }).filter(Boolean);
                    const seen = {};
                    const out = [];
                    clean.forEach(function (u) {
                        if (!seen[u]) { seen[u] = true; out.push(u); }
                    });
                    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(out));
                } catch (e) {}
            }

            function isUserDeleted(username) {
                const u = String(username || '').trim().toLowerCase();
                if (!u) return false;
                return readDeletedUsers().indexOf(u) !== -1;
            }

            function markUserDeleted(username) {
                const u = String(username || '').trim().toLowerCase();
                if (!u) return;
                const list = readDeletedUsers();
                if (list.indexOf(u) === -1) {
                    list.push(u);
                    writeDeletedUsers(list);
                }
            }

            function unmarkUserDeleted(username) {
                const u = String(username || '').trim().toLowerCase();
                writeDeletedUsers(readDeletedUsers().filter(function (x) { return x !== u; }));
            }

            function getHardcodedUsers() {
                const list = window.MLBB_USERS;
                if (!Array.isArray(list) || list.length === 0) return [];
                return list.map(function (r) {
                    return {
                        username: String(r.username || '').trim(),
                        password: String(r.password || ''),           // legacy plaintext (optional)
                        passwordHash: r.passwordHash ? String(r.passwordHash) : null,
                        maxDevices: r.maxDevices == null || r.maxDevices === '' ? null : Number(r.maxDevices),
                        expiryDate: r.expiryDate || null,
                        isAdmin: !!r.isAdmin,
                        _source: 'hardcoded'
                    };
                }).filter(function (r) { return r.username; });
            }

            /**
             * Gabungan: hardcoded dulu, lalu managed (skip jika username sudah ada di hardcoded).
             * Admin hanya dari hardcoded.
             * User yang di-Hapus dari panel (blocklist) tidak ikut.
             */
            function getUsers() {
                const deleted = {};
                readDeletedUsers().forEach(function (u) { deleted[u] = true; });
                const hard = getHardcodedUsers().filter(function (r) {
                    if (r.isAdmin) return true;
                    return !deleted[r.username.toLowerCase()];
                });
                const hardNames = {};
                hard.forEach(function (r) { hardNames[r.username.toLowerCase()] = true; });
                getHardcodedUsers().forEach(function (r) {
                    hardNames[r.username.toLowerCase()] = true;
                });
                const managed = readManagedUsers().filter(function (r) {
                    const key = r.username.toLowerCase();
                    return !hardNames[key] && !deleted[key];
                });
                return hard.concat(managed);
            }

            function getUserByUsername(username) {
                const u = String(username || '').trim().toLowerCase();
                const users = getUsers();
                for (let i = 0; i < users.length; i++) {
                    if (users[i].username.toLowerCase() === u) return users[i];
                }
                return null;
            }

            /** Constant-time string compare (anti timing side-channel) */
            function timingSafeEqual(a, b) {
                const sa = String(a ?? '');
                const sb = String(b ?? '');
                const max = Math.max(sa.length, sb.length);
                let diff = sa.length ^ sb.length;
                for (let i = 0; i < max; i++) {
                    const ca = i < sa.length ? sa.charCodeAt(i) : 0;
                    const cb = i < sb.length ? sb.charCodeAt(i) : 0;
                    diff |= ca ^ cb;
                }
                return diff === 0;
            }

            function readFailState() {
                try {
                    const raw = localStorage.getItem(LOGIN_FAIL_KEY);
                    if (!raw) return { count: 0, lockUntil: 0, cycles: 0 };
                    const obj = JSON.parse(raw);
                    return {
                        count: Math.max(0, Number(obj.count) || 0),
                        lockUntil: Number(obj.lockUntil) || 0,
                        cycles: Math.max(0, Number(obj.cycles) || 0)
                    };
                } catch (e) {
                    return { count: 0, lockUntil: 0, cycles: 0 };
                }
            }

            function writeFailState(state) {
                try {
                    localStorage.setItem(LOGIN_FAIL_KEY, JSON.stringify({
                        count: state.count,
                        lockUntil: state.lockUntil,
                        cycles: state.cycles || 0
                    }));
                } catch (e) {}
            }

            function clearFailState() {
                try { localStorage.removeItem(LOGIN_FAIL_KEY); } catch (e) {}
            }

            function isLockedOut() {
                const st = readFailState();
                return Date.now() < st.lockUntil;
            }

            function remainingLockSeconds() {
                const st = readFailState();
                return Math.max(0, Math.ceil((st.lockUntil - Date.now()) / 1000));
            }

            /** Progressive lockout: each additional lockout cycle (without a successful login in between)
             *  multiplies the lock duration, up to a 30-minute ceiling — makes retry-after-wait attacks
             *  increasingly costly instead of a fixed 90s wall every time. */
            function registerFailedAttempt() {
                const st = readFailState();
                st.count += 1;
                if (st.count >= MAX_FAIL_ATTEMPTS) {
                    st.cycles = (st.cycles || 0) + 1;
                    const multiplier = Math.min(st.cycles, 20); // cap growth
                    const duration = Math.min(LOCKOUT_MS * multiplier, 30 * 60 * 1000); // 30 min ceiling
                    st.lockUntil = Date.now() + duration;
                    st.count = 0;
                }
                writeFailState(st);
                return st;
            }

            /**
             * Login via Supabase (Vercel /api/login). Fallback ke local credentials
             * jika API tidak tersedia (dev lokal / env belum diset).
             */
            async function validateCredentialsRemote(username, password) {
                const u = String(username || '').trim();
                const p = String(password || '');
                if (u.length < 1 || u.length > 64 || p.length < 1 || p.length > 128) {
                    return { ok: false };
                }
                const deviceId = getOrCreateDeviceId();
                const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                const timer = controller ? setTimeout(function () { controller.abort(); }, 12000) : null;
                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: u, password: p, deviceId: deviceId }),
                        signal: controller ? controller.signal : undefined,
                        credentials: 'same-origin'
                    });
                    if (timer) clearTimeout(timer);
                    if (res.status === 404 || res.status === 405) {
                        return { ok: false, _fallback: true };
                    }
                    let data = null;
                    try { data = await res.json(); } catch (e) { data = null; }
                    if (!data || typeof data !== 'object') {
                        if (res.status >= 500) return { ok: false, _fallback: true };
                        return { ok: false };
                    }
                    if (res.status >= 500 && data.message && /misconfigured|SUPABASE/i.test(String(data.message))) {
                        return { ok: false, _fallback: true };
                    }
                    if (data.ok) {
                        return {
                            ok: true,
                            username: String(data.username || u).trim(),
                            isAdmin: !!data.isAdmin,
                            token: data.token || null,
                            _source: 'supabase'
                        };
                    }
                    return {
                        ok: false,
                        expired: !!data.expired,
                        maxDevices: !!data.maxDevices,
                        maintenance: !!data.maintenance,
                        current: data.current,
                        max: data.max,
                        message: data.message || null,
                        _source: 'supabase'
                    };
                } catch (err) {
                    if (timer) clearTimeout(timer);
                    return { ok: false, _fallback: true };
                }
            }

            async function validateCredentialsLocal(username, password) {
                const users = getUsers();
                const u = String(username || '').trim();
                const p = String(password || '');
                if (u.length < 1 || u.length > 64 || p.length < 1 || p.length > 128) {
                    return { ok: false };
                }
                for (let i = 0; i < users.length; i++) {
                    const row = users[i];
                    if (!row) continue;
                    if (!timingSafeEqual(String(row.username || '').trim(), u)) continue;
                    const match = await credentialsMatch(row, p);
                    if (!match) continue;

                    if (row.expiryDate) {
                        const expDate = new Date(String(row.expiryDate));
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (isNaN(expDate.getTime()) || today > expDate) {
                            return { ok: false, expired: true };
                        }
                    }

                    if (!row.isAdmin) {
                        const devCheck = checkAndRegisterDevice(row.username, row.maxDevices);
                        if (!devCheck.ok) {
                            return {
                                ok: false,
                                maxDevices: true,
                                current: devCheck.current,
                                max: devCheck.max
                            };
                        }
                    }

                    return {
                        ok: true,
                        username: String(row.username || '').trim(),
                        isAdmin: !!row.isAdmin,
                        _source: 'local'
                    };
                }
                return { ok: false };
            }

            async function validateCredentials(username, password) {
                const remote = await validateCredentialsRemote(username, password);
                if (remote && !remote._fallback) {
                    return remote;
                }
                return validateCredentialsLocal(username, password);
            }

            function secureRandomToken() {
                if (window.crypto && window.crypto.getRandomValues) {
                    const arr = window.crypto.getRandomValues(new Uint8Array(16));
                    return bufToHex(arr);
                }
                return Math.random().toString(36).slice(2) + Date.now().toString(36);
            }

            function setSession(username, isAdmin, token, isSuper) {
                try {
                    const nonce = secureRandomToken();
                    sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({
                        u: username,
                        a: !!isAdmin,
                        s: !!isSuper,
                        t: Date.now(),
                        n: nonce,
                        d: getOrCreateDeviceId(),
                        token: token || null
                    }));
                } catch (e) {}
            }

            function clearSession() {
                try { sessionStorage.removeItem(LOGIN_SESSION_KEY); } catch (e) {}
                currentSessionUser = null;
                currentIsAdmin = false;
                currentIsSuper = false;
            }

            function readSession() {
                try {
                    const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
                    if (!raw) return null;
                    const obj = JSON.parse(raw);
                    if (!obj || !obj.u || typeof obj.u !== 'string') return null;
                    if (obj.d && obj.d !== getOrCreateDeviceId()) {
                        clearSession();
                        return null;
                    }
                    if (obj.t && (Date.now() - obj.t > 12 * 60 * 60 * 1000)) {
                        clearSession();
                        return null;
                    }
                    return obj;
                } catch (e) {
                    return null;
                }
            }

            function getAdminToken() {
                const sess = readSession();
                return (sess && sess.token) ? String(sess.token) : '';
            }

            async function adminApi(path, options) {
                const opts = options || {};
                const headers = Object.assign({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getAdminToken()
                }, opts.headers || {});
                const res = await fetch(path, {
                    method: opts.method || 'GET',
                    headers: headers,
                    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
                    credentials: 'same-origin'
                });
                let data = null;
                try { data = await res.json(); } catch (e) { data = null; }
                if (res.status === 401) {
                    return { ok: false, unauthorized: true, message: (data && data.message) || 'Sesi admin berakhir. Login ulang.' };
                }
                if (!data || typeof data !== 'object') {
                    return { ok: false, message: 'Respons server tidak valid' };
                }
                return data;
            }

            let currentMaintenanceMode = false;

            function updateMaintenanceBanner(on) {
                currentMaintenanceMode = !!on;
                const banner = document.getElementById('maintenanceBanner');
                if (banner) banner.style.display = on ? 'flex' : 'none';
            }

            async function fetchMaintenanceStatus() {
                try {
                    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
                    const timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;
                    const res = await fetch('/api/maintenance', {
                        method: 'GET',
                        credentials: 'same-origin',
                        signal: controller ? controller.signal : undefined
                    });
                    if (timer) clearTimeout(timer);
                    if (!res.ok) return false;
                    const data = await res.json();
                    return !!(data && data.ok && data.maintenance);
                } catch (e) {
                    return false;
                }
            }

            function setAdminMaintUI(on) {
                currentMaintenanceMode = !!on;
                const statusEl = document.getElementById('adminMaintStatus');
                const onBtn = document.getElementById('adminMaintOnBtn');
                const offBtn = document.getElementById('adminMaintOffBtn');
                const _t = window.MLBB_i18n && MLBB_i18n.t;
                if (statusEl) {
                    statusEl.textContent = on
                        ? (_t ? _t('admin.maint.on') : 'ON')
                        : (_t ? _t('admin.maint.off') : 'OFF');
                    statusEl.classList.toggle('is-on', !!on);
                }
                if (onBtn) onBtn.classList.toggle('is-active', !!on);
                if (offBtn) offBtn.classList.toggle('is-active', !on);
            }

            async function loadAdminMaintenanceStatus() {
                const data = await adminApi('/api/admin/maintenance');
                if (data && data.ok) {
                    setAdminMaintUI(!!data.maintenance);
                    return !!data.maintenance;
                }
                return false;
            }

            async function setMaintenanceMode(enabled) {
                const errEl = document.getElementById('adminMaintError');
                if (errEl) {
                    errEl.style.display = 'none';
                    errEl.textContent = '';
                }
                const onBtn = document.getElementById('adminMaintOnBtn');
                const offBtn = document.getElementById('adminMaintOffBtn');
                if (onBtn) onBtn.disabled = true;
                if (offBtn) offBtn.disabled = true;

                const data = await adminApi('/api/admin/maintenance', {
                    method: 'POST',
                    body: { enabled: !!enabled }
                });

                if (onBtn) onBtn.disabled = false;
                if (offBtn) offBtn.disabled = false;

                if (data && data.unauthorized) {
                    showToast(data.message || 'Sesi admin berakhir', 'error');
                    doLogout();
                    return;
                }
                if (!data || !data.ok) {
                    if (errEl) {
                        errEl.textContent = (data && data.message) || 'Gagal mengubah mode update';
                        errEl.style.display = 'block';
                    }
                    return;
                }

                setAdminMaintUI(!!data.maintenance);
                updateMaintenanceBanner(!!data.maintenance);
                const _t = window.MLBB_i18n && MLBB_i18n.t;
                showToast(
                    data.maintenance
                        ? (_t ? _t('admin.maint.toast_on') : 'Mode update website AKTIF')
                        : (_t ? _t('admin.maint.toast_off') : 'Mode update website NONAKTIF'),
                    data.maintenance ? 'warning' : 'success'
                );
            }

            function setFormDisabled(disabled) {
                if (loginUser) loginUser.disabled = disabled;
                if (loginPass) loginPass.disabled = disabled;
                if (loginSubmitBtn) loginSubmitBtn.disabled = disabled;
            }

            function showSpinner(text) {
                if (!loginSpinner) return;
                loginSpinner.classList.remove('success');
                loginSpinner.classList.add('active');
                loginSpinner.setAttribute('aria-busy', 'true');
                if (loginSpinnerText) loginSpinnerText.textContent = text || 'Memproses login...';
                if (loginSubmitBtn) loginSubmitBtn.style.display = 'none';
            }

            function showSpinnerSuccess(text) {
                if (!loginSpinner) return;
                loginSpinner.classList.add('success');
                loginSpinner.setAttribute('aria-busy', 'false');
                if (loginSpinnerText) loginSpinnerText.textContent = text || 'Berhasil! Mengalihkan...';
            }

            function hideSpinner() {
                if (!loginSpinner) return;
                loginSpinner.classList.remove('active', 'success');
                loginSpinner.setAttribute('aria-busy', 'false');
                if (loginSubmitBtn) loginSubmitBtn.style.display = '';
            }


            let toolsLoaded = false;
            async function loadProtectedTools() {
                if (toolsLoaded) return;
                const token = getAdminToken();
                if (!token) return;
                // Obscure endpoints — no descriptive filenames exposed
                const endpoints = ['/api/x/1', '/api/x/2', '/api/x/3'];
                try {
                    const blobs = await Promise.all(endpoints.map(async function (url) {
                        const res = await fetch(url, {
                            method: 'GET',
                            headers: { 'Authorization': 'Bearer ' + token },
                            cache: 'no-store'
                        });
                        if (!res.ok) throw new Error('tool load ' + res.status);
                        return res.blob();
                    }));
                    blobs.forEach(function (blob) {
                        const u = URL.createObjectURL(blob);
                        const s = document.createElement('script');
                        s.src = u;
                        s.async = false;
                        document.head.appendChild(s);
                        // revoke after load to reduce residual traces
                        s.onload = function () { try { URL.revokeObjectURL(u); } catch (e) {} };
                    });
                    toolsLoaded = true;
                } catch (err) {
                    console.warn('tools unavailable');
                }
            }

            function showMainApp(username, skipOverlayHide) {
                currentSessionUser = username;
                currentIsAdmin = false;
                if (mainApp) mainApp.style.display = '';
                if (adminApp) adminApp.style.display = 'none';
                if (loginUserBadge) loginUserBadge.textContent = '👤 ' + username;
                if (!skipOverlayHide && loginOverlay) {
                    loginOverlay.classList.add('hidden');
                    loginOverlay.classList.remove('fade-out');
                }
                if (typeof window.MLBB_showMusicFloat === 'function') window.MLBB_showMusicFloat();
                initTutorialAfterLogin();
                bgmPlay(true);
                loadProtectedTools();
            }

            function applyAdminPanelMode() {
                const maintCard = document.querySelector('.admin-maintenance-card');
                const roleField = document.getElementById('adminRoleField');
                const deleteAllBtn = document.getElementById('adminDeleteAllManagedBtn');
                const subtitle = adminApp && adminApp.querySelector('.header-left-text p');
                if (currentIsSuper) {
                    if (maintCard) maintCard.style.display = '';
                    if (roleField) roleField.style.display = '';
                    if (deleteAllBtn) deleteAllBtn.style.display = '';
                    if (adminUserBadge) adminUserBadge.textContent = '🛡️ ' + currentSessionUser + ' (Super Admin)';
                    if (subtitle) subtitle.setAttribute('data-i18n', 'admin.subtitle');
                } else {
                    if (maintCard) maintCard.style.display = 'none';
                    if (roleField) roleField.style.display = 'none';
                    if (deleteAllBtn) deleteAllBtn.style.display = '';
                    if (adminUserBadge) adminUserBadge.textContent = '🛡️ ' + currentSessionUser + ' (Admin)';
                    if (subtitle) {
                        subtitle.removeAttribute('data-i18n');
                        subtitle.textContent = 'Panel Admin — kelola user biasa saja';
                    }
                }
            }

            function showAdminApp(username, skipOverlayHide, isSuper) {
                currentSessionUser = username;
                currentIsAdmin = true;
                currentIsSuper = !!isSuper;
                if (mainApp) mainApp.style.display = 'none';
                if (adminApp) adminApp.style.display = '';
                applyAdminPanelMode();
                if (!skipOverlayHide && loginOverlay) {
                    loginOverlay.classList.add('hidden');
                    loginOverlay.classList.remove('fade-out');
                }
                if (typeof window.MLBB_showMusicFloat === 'function') window.MLBB_showMusicFloat();
                renderAdminUserTable();
                if (currentIsSuper) {
                    loadAdminMaintenanceStatus();
                }
            }

            function hideLoginOverlaySmooth(callback) {
                if (!loginOverlay) {
                    if (callback) callback();
                    return;
                }
                loginOverlay.classList.add('fade-out');
                setTimeout(function () {
                    loginOverlay.classList.add('hidden');
                    loginOverlay.classList.remove('fade-out');
                    hideSpinner();
                    setFormDisabled(false);
                    if (callback) callback();
                }, FADE_OUT_MS);
            }

            function showLoginScreen() {
                if (loginOverlay) {
                    loginOverlay.classList.remove('hidden', 'fade-out');
                }
                if (mainApp) mainApp.style.display = 'none';
                if (adminApp) adminApp.style.display = 'none';
                if (typeof window.MLBB_hideMusicFloat === 'function') window.MLBB_hideMusicFloat();
                if (loginError) {
                    loginError.style.display = 'none';
                    loginError.textContent = '';
                }
                hideSpinner();
                setFormDisabled(false);
                loginInProgress = false;
                currentSessionUser = null;
                currentIsAdmin = false;
                currentIsSuper = false;
                if (loginPass) loginPass.value = '';
                if (loginUser) loginUser.value = '';
                if (window.MLBB_loginLamp && typeof window.MLBB_loginLamp.reset === 'function') {
                    window.MLBB_loginLamp.reset();
                }
                fetchMaintenanceStatus().then(function (on) {
                    updateMaintenanceBanner(on);
                });
            }

            function attemptLogin(username, password) {
                if (loginInProgress) return false;
                if (isLockedOut()) {
                    const sec = remainingLockSeconds();
                    if (loginError) {
                        const _t = window.MLBB_i18n && MLBB_i18n.t;
                        loginError.textContent = _t
                            ? _t('login.err.lock_retry', { sec: sec })
                            : ('🔒 Terlalu banyak percobaan. Coba lagi dalam ' + sec + ' detik.');
                        loginError.style.display = 'block';
                    }
                    return false;
                }

                loginInProgress = true;
                setFormDisabled(true);
                if (loginError) {
                    loginError.style.display = 'none';
                    loginError.textContent = '';
                }
                showSpinner((window.MLBB_i18n && MLBB_i18n.t('login.processing')) || 'Memproses login...');

                validateCredentials(username, password).then(function (result) {
                    if (!result.ok) {
                        const isMaint = !!result.maintenance;
                        if (!isMaint) registerFailedAttempt();
                        const failState = readFailState();
                        const delay = isMaint
                            ? 400
                            : (FAIL_DELAY_BASE_MS + Math.min(failState.count, 5) * 250);

                        setTimeout(function () {
                            hideSpinner();
                            setFormDisabled(false);
                            loginInProgress = false;

                            if (loginError) {
                                const _t = window.MLBB_i18n && MLBB_i18n.t;
                                if (result.maintenance) {
                                    loginError.textContent = _t
                                        ? _t('login.err.maintenance')
                                        : '🔧 Website sedang diupdate. User biasa tidak bisa login. Coba lagi nanti.';
                                    updateMaintenanceBanner(true);
                                } else if (result.expired) {
                                    loginError.textContent = _t ? _t('login.err.expired') : '❌ Akun sudah kedaluarsa.';
                                } else if (result.maxDevices) {
                                    loginError.textContent = _t
                                        ? _t('login.err.devices', { cur: result.current, max: result.max })
                                        : ('📱 Batas device tercapai (' + result.current + '/' + result.max + '). Hubungi admin untuk reset.');
                                } else if (isLockedOut()) {
                                    loginError.textContent = _t
                                        ? _t('login.err.lock', { sec: Math.ceil(LOCKOUT_MS / 1000) })
                                        : ('🔒 Terlalu banyak percobaan gagal. Akun terkunci sementara ' + Math.ceil(LOCKOUT_MS / 1000) + ' detik.');
                                } else {
                                    const left = MAX_FAIL_ATTEMPTS - readFailState().count;
                                    let msg = _t ? _t('login.err.wrong') : 'Username atau password salah.';
                                    if (left > 0 && left < MAX_FAIL_ATTEMPTS) {
                                        msg += _t ? _t('login.err.left', { n: left }) : (' (sisa ' + left + ' percobaan)');
                                    }
                                    loginError.textContent = msg;
                                }
                                loginError.style.display = 'block';
                            }
                            if (loginPass) {
                                loginPass.value = '';
                                loginPass.focus();
                            }
                        }, delay);
                        return;
                    }

                    clearFailState();
                    setTimeout(function () {
                        showSpinnerSuccess((window.MLBB_i18n && MLBB_i18n.t('login.success')) || 'Berhasil! Mengalihkan...');
                        setTimeout(function () {
                            setSession(result.username, result.isAdmin, result.token || null, result.isSuper);
                            hideLoginOverlaySmooth(function () {
                                const _t = window.MLBB_i18n && MLBB_i18n.t;
                                if (result.isAdmin) {
                                    showAdminApp(result.username, true, !!result.isSuper);
                                    const welcome = result.isSuper
                                        ? ('🛡️ Selamat datang Super Admin, ' + result.username)
                                        : ('🛡️ Selamat datang Admin, ' + result.username);
                                    showToast(_t ? _t('toast.welcome_admin', { name: result.username }) : welcome, 'success');
                                } else {
                                    showMainApp(result.username, true);
                                    showToast(_t ? _t('toast.welcome', { name: result.username }) : ('✅ Selamat datang, ' + result.username), 'success');
                                }
                                loginInProgress = false;
                            });
                        }, SUCCESS_HOLD_MS);
                    }, SUCCESS_SPIN_MS);
                }).catch(function () {
                    hideSpinner();
                    setFormDisabled(false);
                    loginInProgress = false;
                    if (loginError) {
                        loginError.textContent = 'Terjadi kesalahan saat memverifikasi. Coba lagi.';
                        loginError.style.display = 'block';
                    }
                });

                return true;
            }

            (function initAuth() {
                if (!loginOverlay) return;
                const sess = readSession();
                if (sess && sess.u) {
                    if (sess.a) {
                        showAdminApp(sess.u, false, !!sess.s);
                        return;
                    }
                    fetchMaintenanceStatus().then(function (on) {
                        if (on) {
                            clearSession();
                            showLoginScreen();
                            updateMaintenanceBanner(true);
                            return;
                        }
                        const user = getUserByUsername(sess.u);
                        if (user && user.expiryDate) {
                            const expDate = new Date(String(user.expiryDate));
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            if (!isNaN(expDate.getTime()) && today > expDate) {
                                clearSession();
                                showLoginScreen();
                                return;
                            }
                        }
                        if (user || sess.token) {
                            showMainApp(sess.u);
                            return;
                        }
                        clearSession();
                        showLoginScreen();
                    });
                    return;
                }
                const users = getUsers();
                if (users.length === 0 && !sess) {
                }
                showLoginScreen();
            })();

            (function initMaintenanceButtons() {
                const onBtn = document.getElementById('adminMaintOnBtn');
                const offBtn = document.getElementById('adminMaintOffBtn');
                if (onBtn) {
                    onBtn.addEventListener('click', function () {
                        if (!currentIsAdmin) return;
                        setMaintenanceMode(true);
                    });
                }
                if (offBtn) {
                    offBtn.addEventListener('click', function () {
                        if (!currentIsAdmin) return;
                        setMaintenanceMode(false);
                    });
                }
            })();

            if (loginForm) {
                loginForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    if (loginInProgress) return;
                    const u = loginUser ? loginUser.value : '';
                    const p = loginPass ? loginPass.value : '';
                    attemptLogin(u, p);
                });
            }

            function doLogout() {
                clearSession();
                try {
                    const panel = document.getElementById('sideMenuPanel');
                    const backdrop = document.getElementById('sideMenuBackdrop');
                    if (panel) {
                        panel.classList.remove('is-open');
                        panel.setAttribute('aria-hidden', 'true');
                    }
                    if (backdrop) {
                        backdrop.classList.remove('is-visible');
                        backdrop.hidden = true;
                    }
                    document.body.classList.remove('side-menu-open');
                    const btnMain = document.getElementById('sideMenuToggle');
                    const btnAdmin = document.getElementById('sideMenuToggleAdmin');
                    if (btnMain) btnMain.classList.remove('is-open');
                    if (btnAdmin) btnAdmin.classList.remove('is-open');
                } catch (e) {}
                showLoginScreen();
                showToast((window.MLBB_i18n && MLBB_i18n.t('toast.logout')) || 'Anda telah keluar', 'info');
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', doLogout);
            }
            if (adminLogoutBtn) {
                adminLogoutBtn.addEventListener('click', doLogout);
            }

            (function initSideMenu() {
                const panel = document.getElementById('sideMenuPanel');
                const backdrop = document.getElementById('sideMenuBackdrop');
                const btnMain = document.getElementById('sideMenuToggle');
                const btnAdmin = document.getElementById('sideMenuToggleAdmin');
                const btnClose = document.getElementById('sideMenuClose');
                if (!panel || !backdrop) return;

                function formatDeviceId(id) {
                    if (!id) return '—';
                    const s = String(id);
                    if (s.length <= 12) return s;
                    return s.slice(0, 6) + '…' + s.slice(-4);
                }

                function refreshAccountInfo() {
                    const unameEl = document.getElementById('sideMenuUsername');
                    const expEl = document.getElementById('sideMenuExpiry');
                    const devEl = document.getElementById('sideMenuDevices');
                    const didEl = document.getElementById('sideMenuDeviceId');
                    const username = currentSessionUser || '—';
                    if (unameEl) unameEl.textContent = username;

                    const user = (username && username !== '—') ? getUserByUsername(username) : null;
                    const _t = window.MLBB_i18n && MLBB_i18n.t;
                    if (expEl) {
                        expEl.classList.remove('is-expired', 'is-ok');
                        if (!user || !user.expiryDate) {
                            expEl.textContent = _t ? _t('menu.expiry.none') : 'Tidak ada (unlimited)';
                            expEl.classList.add('is-ok');
                        } else {
                            const expDate = new Date(String(user.expiryDate));
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const label = String(user.expiryDate);
                            if (isNaN(expDate.getTime()) || today > expDate) {
                                expEl.textContent = label + (_t ? _t('menu.expiry.expired') : ' (kadaluarsa)');
                                expEl.classList.add('is-expired');
                            } else {
                                expEl.textContent = label;
                                expEl.classList.add('is-ok');
                            }
                        }
                    }
                    if (devEl) {
                        if (!user) {
                            devEl.textContent = '—';
                        } else if (user.isAdmin) {
                            devEl.textContent = _t ? _t('menu.dev.admin') : 'Admin (tanpa batas)';
                            devEl.classList.add('is-ok');
                        } else {
                            const list = getDevicesForUser(user.username);
                            const max = user.maxDevices == null ? null : Number(user.maxDevices);
                            const cur = list.length;
                            if (max == null || max <= 0) {
                                devEl.textContent = _t ? _t('menu.dev.unlimited', { n: cur }) : (cur + ' device (unlimited)');
                            } else {
                                devEl.textContent = _t ? _t('menu.dev.count', { cur: cur, max: max }) : (cur + ' / ' + max + ' device');
                            }
                        }
                    }
                    if (didEl) {
                        try {
                            didEl.textContent = formatDeviceId(getOrCreateDeviceId());
                        } catch (e) {
                            didEl.textContent = '—';
                        }
                    }
                }

                function openMenu() {
                    refreshAccountInfo();
                    panel.classList.add('is-open');
                    panel.setAttribute('aria-hidden', 'false');
                    backdrop.hidden = false;
                    void backdrop.offsetWidth;
                    backdrop.classList.add('is-visible');
                    document.body.classList.add('side-menu-open');
                    if (btnMain) btnMain.classList.add('is-open');
                    if (btnAdmin) btnAdmin.classList.add('is-open');
                }

                function closeMenu() {
                    panel.classList.remove('is-open');
                    panel.setAttribute('aria-hidden', 'true');
                    backdrop.classList.remove('is-visible');
                    document.body.classList.remove('side-menu-open');
                    if (btnMain) btnMain.classList.remove('is-open');
                    if (btnAdmin) btnAdmin.classList.remove('is-open');
                    setTimeout(function () {
                        if (!panel.classList.contains('is-open')) backdrop.hidden = true;
                    }, 280);
                }

                function toggleMenu() {
                    if (panel.classList.contains('is-open')) closeMenu();
                    else openMenu();
                }

                if (btnMain) btnMain.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleMenu();
                });
                if (btnAdmin) btnAdmin.addEventListener('click', function (e) {
                    e.stopPropagation();
                    toggleMenu();
                });
                if (btnClose) btnClose.addEventListener('click', closeMenu);
                backdrop.addEventListener('click', closeMenu);
                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape' && panel.classList.contains('is-open')) closeMenu();
                });
            })();

            const adminUserForm = document.getElementById('adminUserForm');
            const adminUsername = document.getElementById('adminUsername');
            const adminPassword = document.getElementById('adminPassword');
            const adminMaxDevices = document.getElementById('adminMaxDevices');
            const adminExpiry = document.getElementById('adminExpiry');
            const adminEditIndex = document.getElementById('adminEditIndex');
            const adminSaveBtn = document.getElementById('adminSaveBtn');
            const adminCancelEditBtn = document.getElementById('adminCancelEditBtn');
            const adminFormError = document.getElementById('adminFormError');
            const adminUserTableBody = document.getElementById('adminUserTableBody');

            function maskPassword(u) {
                if (u && (u.hasPassword || u.passwordHash || (u.password && u.password.length > 0))) {
                    return '•••••••• (hash)';
                }
                return '—';
            }

            function escapeHtml(s) {
                return window.escapeHTML ? window.escapeHTML(s) : String(s ?? '')
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            }

            let adminUsersCache = [];

            function renderAdminUserTable() {
                if (!adminUserTableBody) return;
                adminUserTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8a8d93;">' +
                    ((window.MLBB_i18n && MLBB_i18n.t('admin.loading')) || 'Memuat dari Supabase…') + '</td></tr>';

                adminApi('/api/admin/users').then(function (data) {
                    if (data.unauthorized) {
                        adminUserTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#ff6b7a;">Sesi berakhir — login ulang sebagai admin</td></tr>';
                        showToast(data.message || 'Login ulang sebagai admin', 'error');
                        return;
                    }
                    if (!data.ok || !Array.isArray(data.users)) {
                        renderAdminUserTableLocal();
                        if (data.message) showToast(data.message, 'warning');
                        return;
                    }
                    adminUsersCache = data.users;
                    if (typeof data.isSuper === 'boolean') {
                        currentIsSuper = data.isSuper;
                        applyAdminPanelMode();
                    }
                    const rows = [];
                    data.users.forEach(function (u) {
                        if (u.isActive === false) return; // sembunyikan soft-deleted
                        const isAdminAcc = !!u.isAdmin;
                        const isSuperAcc = !!u.isSuper;
                        const maxDev = u.maxDevices == null ? '∞' : String(u.maxDevices);
                        let srcBadge;
                        if (isSuperAcc) {
                            srcBadge = '<span class="admin-badge admin">SUPER</span>';
                        } else if (isAdminAcc) {
                            srcBadge = '<span class="admin-badge admin">ADMIN</span>';
                        } else {
                            srcBadge = '<span class="admin-badge managed">user</span>';
                        }
                        const expiryStr = u.expiryDate ? escapeHtml(String(u.expiryDate)) : '—';
                        const devCount = Number(u.deviceCount) || 0;
                        let actions = '';
                        if (isAdminAcc) {
                            actions = '<span style="color:#8a8d93;font-size:12px;">—</span>';
                        } else {
                            const _t = window.MLBB_i18n && MLBB_i18n.t;
                            actions = '<div class="admin-actions">' +
                                '<button type="button" class="btn btn-sm" data-action="edit" data-user="' + escapeHtml(u.username) + '">' + (_t ? _t('admin.edit') : 'Edit') + '</button>' +
                                '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-user="' + escapeHtml(u.username) + '">' + (_t ? _t('admin.delete') : 'Hapus') + '</button>' +
                                '<button type="button" class="btn btn-sm" data-action="reset-device" data-user="' + escapeHtml(u.username) + '">' + (_t ? _t('admin.reset_device') : 'Reset Device') + '</button>' +
                                '</div>';
                        }
                        const ipStr = u.lastIp
                            ? '<code class="admin-ip" title="IP terakhir saat login">' + escapeHtml(String(u.lastIp)) + '</code>'
                            : '<span style="color:#8a8d93;">—</span>';
                        rows.push(
                            '<tr>' +
                            '<td><strong>' + escapeHtml(u.username) + '</strong></td>' +
                            '<td class="pwd-mask" title="Password hash">' + escapeHtml(maskPassword(u)) + '</td>' +
                            '<td>' + escapeHtml(maxDev) + '</td>' +
                            '<td>' + devCount + (u.maxDevices != null ? ' / ' + u.maxDevices : '') + '</td>' +
                            '<td>' + ipStr + '</td>' +
                            '<td>' + expiryStr + '</td>' +
                            '<td>' + srcBadge + '</td>' +
                            '<td>' + actions + '</td>' +
                            '</tr>'
                        );
                    });
                    adminUserTableBody.innerHTML = rows.length
                        ? rows.join('')
                        : '<tr><td colspan="8" style="text-align:center;color:#8a8d93;">' +
                          ((window.MLBB_i18n && MLBB_i18n.t('admin.empty')) || 'Belum ada user di Supabase') + '</td></tr>';
                }).catch(function () {
                    renderAdminUserTableLocal();
                    showToast('Gagal memuat user dari server — tampil lokal', 'warning');
                });
            }

            function renderAdminUserTableLocal() {
                if (!adminUserTableBody) return;
                const users = getUsers();
                adminUsersCache = users.map(function (u) {
                    return {
                        username: u.username,
                        hasPassword: !!(u.passwordHash || u.password),
                        isAdmin: !!u.isAdmin,
                        maxDevices: u.maxDevices,
                        expiryDate: u.expiryDate || null,
                        isActive: true,
                        deviceCount: getDevicesForUser(u.username).length,
                        source: u._source || 'local'
                    };
                });
                const rows = [];
                users.forEach(function (u) {
                    const isAdminAcc = !!u.isAdmin;
                    const devices = getDevicesForUser(u.username);
                    const maxDev = u.maxDevices == null ? '∞' : String(u.maxDevices);
                    const srcBadge = isAdminAcc
                        ? '<span class="admin-badge admin">ADMIN</span>'
                        : '<span class="admin-badge managed">local</span>';
                    const expiryStr = u.expiryDate ? escapeHtml(String(u.expiryDate)) : '—';
                    let actions = '';
                    if (isAdminAcc) {
                        actions = '<span style="color:#8a8d93;font-size:12px;">—</span>';
                    } else {
                        actions = '<div class="admin-actions">' +
                            '<button type="button" class="btn btn-sm" data-action="edit" data-user="' + escapeHtml(u.username) + '">Edit</button>' +
                            '<button type="button" class="btn btn-sm btn-danger" data-action="delete" data-user="' + escapeHtml(u.username) + '">Hapus</button>' +
                            '<button type="button" class="btn btn-sm" data-action="reset-device" data-user="' + escapeHtml(u.username) + '">Reset Device</button>' +
                            '</div>';
                    }
                    rows.push(
                        '<tr>' +
                        '<td><strong>' + escapeHtml(u.username) + '</strong></td>' +
                        '<td class="pwd-mask">' + escapeHtml(maskPassword(u)) + '</td>' +
                        '<td>' + escapeHtml(maxDev) + '</td>' +
                        '<td>' + devices.length + (u.maxDevices != null ? ' / ' + u.maxDevices : '') + '</td>' +
                        '<td><span style="color:#8a8d93;">—</span></td>' +
                            '<td>' + expiryStr + '</td>' +
                        '<td>' + srcBadge + '</td>' +
                        '<td>' + actions + '</td>' +
                        '</tr>'
                    );
                });
                adminUserTableBody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="8" style="text-align:center;color:#8a8d93;">Belum ada user</td></tr>';
            }

            function showAdminFormError(msg) {
                if (!adminFormError) return;
                if (!msg) {
                    adminFormError.style.display = 'none';
                    adminFormError.textContent = '';
                    return;
                }
                adminFormError.textContent = msg;
                adminFormError.style.display = 'block';
            }

            function resetAdminForm() {
                if (adminUserForm) adminUserForm.reset();
                if (adminEditIndex) adminEditIndex.value = '-1';
                if (adminSaveBtn) adminSaveBtn.textContent = 'Simpan User';
                if (adminCancelEditBtn) adminCancelEditBtn.style.display = 'none';
                if (adminUsername) adminUsername.disabled = false;
                if (adminPassword) adminPassword.placeholder = 'Masukkan password';
                showAdminFormError('');
            }

            function fillAdminFormForEdit(username) {
                const u = (adminUsersCache || []).find(function (r) {
                    return String(r.username || '').toLowerCase() === String(username || '').toLowerCase();
                }) || getUserByUsername(username);
                if (!u || u.isAdmin) return;
                if (adminUsername) {
                    adminUsername.value = u.username;
                    adminUsername.disabled = true;
                }
                if (adminPassword) {
                    adminPassword.value = '';
                    adminPassword.placeholder = 'Kosongkan jika tidak ingin mengubah password';
                }
                if (adminMaxDevices) adminMaxDevices.value = u.maxDevices == null ? '' : u.maxDevices;
                if (adminExpiry) adminExpiry.value = u.expiryDate || '';
                if (adminEditIndex) adminEditIndex.value = u.username;
                if (adminSaveBtn) adminSaveBtn.textContent = 'Update User';
                if (adminCancelEditBtn) adminCancelEditBtn.style.display = '';
                showAdminFormError('');
                if (adminUsername) adminUsername.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            if (adminCancelEditBtn) {
                adminCancelEditBtn.addEventListener('click', function () {
                    resetAdminForm();
                });
            }

            if (adminUserForm) {
                adminUserForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    showAdminFormError('');
                    const uname = adminUsername ? String(adminUsername.value || '').trim() : '';
                    const pass = adminPassword ? String(adminPassword.value || '') : '';
                    const maxDevRaw = adminMaxDevices ? adminMaxDevices.value : '';
                    const maxDev = maxDevRaw === '' || maxDevRaw == null ? null : Math.max(1, Math.min(99, parseInt(maxDevRaw, 10) || 1));
                    const exp = adminExpiry && adminExpiry.value ? adminExpiry.value : null;
                    const editKey = adminEditIndex ? String(adminEditIndex.value || '') : '-1';
                    const isEdit = editKey && editKey !== '-1';

                    if (!uname || uname.length < 1 || uname.length > 64) {
                        showAdminFormError(t('js.user_required'));
                        return;
                    }
                    if (!isEdit && (!pass || pass.length < 1 || pass.length > 128)) {
                        showAdminFormError(t('js.pass_required'));
                        return;
                    }
                    if (pass && pass.length > 128) {
                        showAdminFormError('Password 1–128 karakter.');
                        return;
                    }

                    if (adminSaveBtn) adminSaveBtn.disabled = true;

                    const roleRadio = document.querySelector('input[name="adminAccountRole"]:checked');
                    const createAsAdmin = !isEdit && currentIsSuper && roleRadio && roleRadio.value === 'admin';

                    adminApi('/api/admin/users', {
                        method: 'POST',
                        body: {
                            username: uname,
                            password: pass || undefined,
                            maxDevices: maxDev,
                            expiryDate: exp,
                            isEdit: isEdit,
                            createAsAdmin: !!createAsAdmin
                        }
                    }).then(function (data) {
                        if (adminSaveBtn) adminSaveBtn.disabled = false;
                        if (data.unauthorized) {
                            showAdminFormError(data.message || 'Sesi berakhir. Login ulang.');
                            return;
                        }
                        if (!data.ok) {
                            showAdminFormError(data.message || t('js.save_fail'));
                            return;
                        }
                        let toastMsg;
                        if (isEdit) {
                            toastMsg = (window.MLBB_i18n && MLBB_i18n.t('toast.user_updated')) || '✅ User diperbarui di Supabase';
                        } else if (data.isAdmin) {
                            toastMsg = '✅ Akun admin baru dibuat (punya panel sendiri)';
                        } else {
                            toastMsg = (window.MLBB_i18n && MLBB_i18n.t('toast.user_saved')) || '✅ User baru ditambahkan ke Supabase';
                        }
                        showToast(toastMsg, 'success');
                        resetAdminForm();
                        if (adminPassword) adminPassword.placeholder = 'Masukkan password';
                        renderAdminUserTable();
                    }).catch(function () {
                        if (adminSaveBtn) adminSaveBtn.disabled = false;
                        showAdminFormError(t('js.server_fail'));
                    });
                });
            }

            if (adminUserTableBody) {
                adminUserTableBody.addEventListener('click', function (e) {
                    const btn = e.target.closest('button[data-action]');
                    if (!btn) return;
                    const action = btn.getAttribute('data-action');
                    const uname = btn.getAttribute('data-user');
                    if (!uname) return;

                    if (action === 'edit') {
                        fillAdminFormForEdit(uname);
                    } else if (action === 'reset-device') {
                        if (!confirm(t('js.confirm_reset_dev', { name: uname }))) return;
                        btn.disabled = true;
                        adminApi('/api/admin/reset-device', {
                            method: 'POST',
                            body: { username: uname }
                        }).then(function (data) {
                            btn.disabled = false;
                            if (data.unauthorized) {
                                showToast(data.message || 'Login ulang sebagai admin', 'error');
                                return;
                            }
                            if (!data.ok) {
                                showToast(data.message || 'Gagal reset device', 'error');
                                return;
                            }
                            showToast(
                                (window.MLBB_i18n && MLBB_i18n.t('toast.device_reset', { name: uname }))
                                || ('Device di-reset untuk ' + uname),
                                'success'
                            );
                            renderAdminUserTable();
                        }).catch(function () {
                            btn.disabled = false;
                            showToast('Gagal menghubungi server', 'error');
                        });
                    } else if (action === 'delete') {
                        if (!confirm(t('js.confirm_delete', { name: uname }))) return;
                        btn.disabled = true;
                        adminApi('/api/admin/delete-user', {
                            method: 'POST',
                            body: { username: uname }
                        }).then(function (data) {
                            btn.disabled = false;
                            if (data.unauthorized) {
                                showToast(data.message || 'Login ulang sebagai admin', 'error');
                                return;
                            }
                            if (!data.ok) {
                                showToast(data.message || 'Gagal menghapus user', 'error');
                                return;
                            }
                            showToast('🗑️ Akun "' + uname + '" dihapus dari Supabase', 'info');
                            if (adminEditIndex && String(adminEditIndex.value).toLowerCase() === uname.toLowerCase()) {
                                resetAdminForm();
                            }
                            renderAdminUserTable();
                        }).catch(function () {
                            btn.disabled = false;
                            showToast('Gagal menghubungi server', 'error');
                        });
                    }
                });
            }

            const adminClearFormBtn = document.getElementById('adminClearFormBtn');
            if (adminClearFormBtn) {
                adminClearFormBtn.addEventListener('click', function () {
                    resetAdminForm();
                    showToast((window.MLBB_i18n && MLBB_i18n.t('toast.form_cleared')) || 'Form Username & Password dikosongkan', 'info');
                });
            }

            const adminDeleteAllManagedBtn = document.getElementById('adminDeleteAllManagedBtn');
            if (adminDeleteAllManagedBtn) {
                adminDeleteAllManagedBtn.addEventListener('click', function () {
                    const all = (adminUsersCache || []).filter(function (u) {
                        return !u.isAdmin && u.isActive !== false;
                    });
                    if (!all.length) {
                        showToast('Tidak ada akun non-admin untuk dihapus', 'warning');
                        return;
                    }
                    if (!confirm(t('js.confirm_delete_all', { n: all.length }))) return;

                    adminDeleteAllManagedBtn.disabled = true;
                    let done = 0;
                    let failed = 0;

                    function next(i) {
                        if (i >= all.length) {
                            adminDeleteAllManagedBtn.disabled = false;
                            resetAdminForm();
                            renderAdminUserTable();
                            showToast('🗑️ Selesai: ' + done + ' dihapus' + (failed ? ', ' + failed + ' gagal' : ''), failed ? 'warning' : 'info');
                            return;
                        }
                        adminApi('/api/admin/delete-user', {
                            method: 'POST',
                            body: { username: all[i].username }
                        }).then(function (data) {
                            if (data && data.ok) done++;
                            else failed++;
                            next(i + 1);
                        }).catch(function () {
                            failed++;
                            next(i + 1);
                        });
                    }
                    next(0);
                });
            }


            window.addEventListener('mlbb:lang', function () {
                try {
                    if (window.MLBB_i18n) {
                        MLBB_i18n.applyI18n();
                        MLBB_i18n.initLangSwitchers();
                    }
                    if (typeof renderAdminUserTable === 'function' && currentIsAdmin) {
                        renderAdminUserTable();
                    }
                } catch (e) {}
            });

            function initTutorialAfterLogin() {
                const overlay = document.getElementById('tutorialOverlay');
                const closeBtn = document.getElementById('tutorialCloseBtn');
                const dontShow = document.getElementById('tutorialDontShow');
                if (!overlay || !closeBtn) return;

                const STORAGE_KEY = 'mlbb_tutorial_hide';

                function hideTutorial(e) {
                    if (e) {
                        try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
                    }
                    if (dontShow && dontShow.checked) {
                        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (err) {}
                    }
                    overlay.classList.remove('show');
                    overlay.style.opacity = '0';
                    overlay.style.visibility = 'hidden';
                    setTimeout(function () {
                        overlay.style.display = 'none';
                        overlay.style.pointerEvents = 'none';
                    }, 280);
                }

                if (overlay.dataset.inited !== '1') {
                    overlay.dataset.inited = '1';
                    closeBtn.addEventListener('click', hideTutorial);
                    closeBtn.addEventListener('touchend', function (e) {
                        e.preventDefault();
                        hideTutorial(e);
                    }, { passive: false });
                    overlay.addEventListener('click', function (e) {
                        if (e.target === overlay) hideTutorial(e);
                    });
                    document.addEventListener('keydown', function (e) {
                        if (e.key === 'Escape' && overlay.classList.contains('show')) hideTutorial(e);
                    });
                }

                let shouldShow = true;
                try {
                    if (localStorage.getItem(STORAGE_KEY) === '1') shouldShow = false;
                } catch (err) {}

                if (shouldShow) {
                    overlay.style.pointerEvents = 'auto';
                    overlay.style.display = 'flex';
                    overlay.style.opacity = '';
                    overlay.style.visibility = '';
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () { overlay.classList.add('show'); });
                    });
                } else {
                    overlay.style.display = 'none';
                    overlay.style.pointerEvents = 'none';
                }
            }

            document.querySelectorAll('.menu-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    const panelId = this.dataset.panel;
                    document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
                    document.getElementById(panelId).classList.add('active');
                });
            });


            // Tools loaded dynamically after login via /api/x/* (auth required)

        })();

