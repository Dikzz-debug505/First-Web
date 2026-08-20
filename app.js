
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

            // ============================================================
            // TOAST
            // ============================================================
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

            // ============================================================
            // BACKGROUND MUSIC — floating FAB + long-press track picker
            // ============================================================
            const MUSIC_PREF_KEY = 'mlbb_bgm_enabled';
            const MUSIC_TRACK_KEY = 'mlbb_bgm_track';
            const LONG_PRESS_MS = 520;

            // Lagu 1 = bgm.mp3 | Lagu 2 = bgm2.mp3 (fallback ke bgm.mp3 jika belum ada)
            const BGM_TRACKS = {
                '1': { name: 'Lagu 1', src: 'bgm.mp3', icon: '🎵' },
                '2': { name: 'Lagu 2', src: 'bgm2.mp3', icon: '🎶', fallback: 'bgm.mp3' }
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
                // Resolve relative path against page
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
                // Ensure src matches current track
                const track = BGM_TRACKS[bgmCurrentTrack] || BGM_TRACKS['1'];
                if (!audio.src || (audio.getAttribute('src') !== track.src && !audio.src.endsWith(track.src))) {
                    // may already be absolute URL
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
                        // If track 2 missing, try fallback once
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

            // Expose for login/logout
            window.MLBB_showMusicFloat = showMusicFloat;
            window.MLBB_hideMusicFloat = hideMusicFloat;

            (function initBgm() {
                const btn = document.getElementById('musicToggleBtn');
                if (!btn) return;

                // Restore last track
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
                        // haptic if available
                        try { if (navigator.vibrate) navigator.vibrate(18); } catch (err) {}
                        showMusicMenu();
                    }, LONG_PRESS_MS);
                }

                function onPointerUp(e) {
                    const wasLong = longPressFired;
                    clearLongPress();
                    if (wasLong) {
                        // Long press already opened menu — ignore click
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    // Short tap: if menu open, close it; else toggle play
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
                // Prevent native context menu / text selection on long press
                btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
                btn.addEventListener('click', function (e) {
                    // click is secondary; pointerup already handled
                    e.preventDefault();
                });

                // Track selection
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
                                // fallback for missing bgm2
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

                // Close menu when tapping outside
                document.addEventListener('pointerdown', function (e) {
                    if (!menuOpen) return;
                    const wrap = document.getElementById('musicFloat');
                    if (wrap && !wrap.contains(e.target)) {
                        hideMusicMenu();
                    }
                }, true);

                // Default: musik ON (kecuali user pernah matikan)
                if (localStorage.getItem(MUSIC_PREF_KEY) !== '0') {
                    localStorage.setItem(MUSIC_PREF_KEY, '1');
                }

                bgmUpdateBtn();

                // Coba autoplay segera (sering diblok sebelum interaksi)
                bgmPlay(true);

                // Fallback: putar setelah interaksi pertama di halaman
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

            // ============================================================
            // LOGIN GATE (client-side access control + hardening)
            // + Admin Panel + Device Limit per user
            // ============================================================
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
                // Fallback (very weak, only if subtle unavailable) – still better than nothing
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
                    // No WebCrypto available — fall back to legacy hashing rather than failing closed.
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
                    // Legacy plain SHA-256 hex hash (e.g. hashes already in credentials.js)
                    const h = await hashPassword(p);
                    return timingSafeEqual(stored, h);
                }
                // Legacy plaintext support (managed users that have not been re-saved)
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

            // ---------- Device ID ----------
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
                    // unlimited
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

            // ---------- Managed users (localStorage) ----------
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
                        // Prefer hash; keep legacy password only if no hash
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
                    // unique
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
                    // Admin tidak pernah di-block; user biasa ikut blocklist
                    if (r.isAdmin) return true;
                    return !deleted[r.username.toLowerCase()];
                });
                const hardNames = {};
                hard.forEach(function (r) { hardNames[r.username.toLowerCase()] = true; });
                // Juga skip hardcoded yang di-delete agar managed tidak "menggantikan" nama yang sama tanpa sengaja
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
                    // 404 / 405 = API belum ada → biarkan fallback lokal
                    if (res.status === 404 || res.status === 405) {
                        return { ok: false, _fallback: true };
                    }
                    let data = null;
                    try { data = await res.json(); } catch (e) { data = null; }
                    if (!data || typeof data !== 'object') {
                        // Server error / HTML response → fallback
                        if (res.status >= 500) return { ok: false, _fallback: true };
                        return { ok: false };
                    }
                    // Server misconfigured → fallback biar tidak lock semua user
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
                        current: data.current,
                        max: data.max,
                        message: data.message || null,
                        _source: 'supabase'
                    };
                } catch (err) {
                    if (timer) clearTimeout(timer);
                    // Network / abort → fallback lokal
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

                    // Device limit (skip for admin)
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
                // Fallback: credentials.js + localStorage (dev / API belum siap)
                return validateCredentialsLocal(username, password);
            }

            function secureRandomToken() {
                if (window.crypto && window.crypto.getRandomValues) {
                    const arr = window.crypto.getRandomValues(new Uint8Array(16));
                    return bufToHex(arr);
                }
                return Math.random().toString(36).slice(2) + Date.now().toString(36);
            }

            function setSession(username, isAdmin, token) {
                try {
                    const nonce = secureRandomToken();
                    sessionStorage.setItem(LOGIN_SESSION_KEY, JSON.stringify({
                        u: username,
                        a: !!isAdmin,
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
            }

            function readSession() {
                try {
                    const raw = sessionStorage.getItem(LOGIN_SESSION_KEY);
                    if (!raw) return null;
                    const obj = JSON.parse(raw);
                    if (!obj || !obj.u || typeof obj.u !== 'string') return null;
                    if (obj.d && obj.d !== getOrCreateDeviceId()) {
                        // Session token doesn't belong to this device — reject rather than trust it.
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
                // Autoplay musik setelah login (klik login = user gesture → biasanya diizinkan browser)
                bgmPlay(true);
            }

            function showAdminApp(username, skipOverlayHide) {
                currentSessionUser = username;
                currentIsAdmin = true;
                if (mainApp) mainApp.style.display = 'none';
                if (adminApp) adminApp.style.display = '';
                if (adminUserBadge) adminUserBadge.textContent = '🛡️ ' + username + ' (Admin)';
                if (!skipOverlayHide && loginOverlay) {
                    loginOverlay.classList.add('hidden');
                    loginOverlay.classList.remove('fade-out');
                }
                if (typeof window.MLBB_showMusicFloat === 'function') window.MLBB_showMusicFloat();
                renderAdminUserTable();
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
                if (loginPass) loginPass.value = '';
                if (loginUser) {
                    loginUser.value = '';
                    setTimeout(function () { loginUser.focus(); }, 60);
                }
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
                        const failState = registerFailedAttempt();
                        const delay = FAIL_DELAY_BASE_MS + Math.min(failState.count, 5) * 250;

                        setTimeout(function () {
                            hideSpinner();
                            setFormDisabled(false);
                            loginInProgress = false;

                            if (loginError) {
                                const _t = window.MLBB_i18n && MLBB_i18n.t;
                                if (result.expired) {
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

                    // === SUCCESS PATH ===
                    clearFailState();
                    setTimeout(function () {
                        showSpinnerSuccess((window.MLBB_i18n && MLBB_i18n.t('login.success')) || 'Berhasil! Mengalihkan...');
                        setTimeout(function () {
                            setSession(result.username, result.isAdmin, result.token || null);
                            hideLoginOverlaySmooth(function () {
                                const _t = window.MLBB_i18n && MLBB_i18n.t;
                                if (result.isAdmin) {
                                    showAdminApp(result.username, true);
                                    showToast(_t ? _t('toast.welcome_admin', { name: result.username }) : ('🛡️ Selamat datang Admin, ' + result.username), 'success');
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
                    // Sesi dari Supabase (punya token) atau lokal
                    if (sess.a) {
                        showAdminApp(sess.u);
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
                    // User Supabase non-admin: tetap izinkan sesi (expiry sudah dicek saat login)
                    if (user || sess.token) {
                        showMainApp(sess.u);
                        return;
                    }
                    clearSession();
                }
                const users = getUsers();
                if (users.length === 0 && !sess) {
                    // Tidak ada user lokal & tidak ada sesi — tetap tampilkan login
                    // (Supabase bisa punya user meski credentials.js kosong)
                }
                showLoginScreen();
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
                // tutup side menu jika terbuka
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

            // ============================================================
            // SIDE MENU (strip tiga pojok kiri atas)
            // ============================================================
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
                    // force reflow then show
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

            // ============================================================
            // ADMIN PANEL LOGIC
            // ============================================================
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

            // Cache daftar user dari Supabase untuk edit form
            let adminUsersCache = [];

            function renderAdminUserTable() {
                if (!adminUserTableBody) return;
                adminUserTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a8d93;">' +
                    ((window.MLBB_i18n && MLBB_i18n.t('admin.loading')) || 'Memuat dari Supabase…') + '</td></tr>';

                adminApi('/api/admin/users').then(function (data) {
                    if (data.unauthorized) {
                        adminUserTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ff6b7a;">Sesi berakhir — login ulang sebagai admin</td></tr>';
                        showToast(data.message || 'Login ulang sebagai admin', 'error');
                        return;
                    }
                    if (!data.ok || !Array.isArray(data.users)) {
                        // Fallback lokal jika API belum ada
                        renderAdminUserTableLocal();
                        if (data.message) showToast(data.message, 'warning');
                        return;
                    }
                    adminUsersCache = data.users;
                    const rows = [];
                    data.users.forEach(function (u) {
                        if (u.isActive === false) return; // sembunyikan soft-deleted
                        const isAdminAcc = !!u.isAdmin;
                        const maxDev = u.maxDevices == null ? '∞' : String(u.maxDevices);
                        const srcBadge = isAdminAcc
                            ? '<span class="admin-badge admin">ADMIN</span>'
                            : '<span class="admin-badge managed">supabase</span>';
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
                        rows.push(
                            '<tr>' +
                            '<td><strong>' + escapeHtml(u.username) + '</strong></td>' +
                            '<td class="pwd-mask" title="Password hash">' + escapeHtml(maskPassword(u)) + '</td>' +
                            '<td>' + escapeHtml(maxDev) + '</td>' +
                            '<td>' + devCount + (u.maxDevices != null ? ' / ' + u.maxDevices : '') + '</td>' +
                            '<td>' + expiryStr + '</td>' +
                            '<td>' + srcBadge + '</td>' +
                            '<td>' + actions + '</td>' +
                            '</tr>'
                        );
                    });
                    adminUserTableBody.innerHTML = rows.length
                        ? rows.join('')
                        : '<tr><td colspan="7" style="text-align:center;color:#8a8d93;">' +
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
                        '<td>' + expiryStr + '</td>' +
                        '<td>' + srcBadge + '</td>' +
                        '<td>' + actions + '</td>' +
                        '</tr>'
                    );
                });
                adminUserTableBody.innerHTML = rows.length ? rows.join('') : '<tr><td colspan="7" style="text-align:center;color:#8a8d93;">Belum ada user</td></tr>';
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

                    adminApi('/api/admin/users', {
                        method: 'POST',
                        body: {
                            username: uname,
                            password: pass || undefined,
                            maxDevices: maxDev,
                            expiryDate: exp,
                            isEdit: isEdit
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
                        showToast(
                            (window.MLBB_i18n && MLBB_i18n.t(isEdit ? 'toast.user_updated' : 'toast.user_saved'))
                            || (isEdit ? '✅ User diperbarui di Supabase' : '✅ User baru ditambahkan ke Supabase'),
                            'success'
                        );
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

            // Bersihkan form Username & Password
            const adminClearFormBtn = document.getElementById('adminClearFormBtn');
            if (adminClearFormBtn) {
                adminClearFormBtn.addEventListener('click', function () {
                    resetAdminForm();
                    showToast((window.MLBB_i18n && MLBB_i18n.t('toast.form_cleared')) || 'Form Username & Password dikosongkan', 'info');
                });
            }

            // Hapus semua akun non-admin di Supabase
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


            // Re-apply translations when language changes
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

            // ============================================================
            // TUTORIAL POPUP (setelah login)
            // ============================================================
            function initTutorialAfterLogin() {
                const overlay = document.getElementById('tutorialOverlay');
                const closeBtn = document.getElementById('tutorialCloseBtn');
                const dontShow = document.getElementById('tutorialDontShow');
                if (!overlay || !closeBtn) return;
                if (overlay.dataset.inited === '1') return;
                overlay.dataset.inited = '1';

                const STORAGE_KEY = 'mlbb_tutorial_hide';

                function hideTutorial() {
                    if (dontShow && dontShow.checked) {
                        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
                    }
                    overlay.classList.remove('show');
                    setTimeout(function () {
                        overlay.style.display = 'none';
                    }, 350);
                }

                closeBtn.addEventListener('click', hideTutorial);
                overlay.addEventListener('click', function (e) {
                    if (e.target === overlay) hideTutorial();
                });
                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape' && overlay.classList.contains('show')) hideTutorial();
                });

                let shouldShow = true;
                try {
                    if (localStorage.getItem(STORAGE_KEY) === '1') shouldShow = false;
                } catch (e) {}

                if (shouldShow) {
                    overlay.style.display = 'flex';
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () { overlay.classList.add('show'); });
                    });
                } else {
                    overlay.style.display = 'none';
                }
            }

            // ============================================================
            // MENU TABS
            // ============================================================
            document.querySelectorAll('.menu-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    document.querySelectorAll('.menu-tab').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    const panelId = this.dataset.panel;
                    document.querySelectorAll('.menu-panel').forEach(p => p.classList.remove('active'));
                    document.getElementById(panelId).classList.add('active');
                });
            });

            // ============================================================
            // PANEL 1: HERO.BYTES VIEWER
            // ============================================================
            const heroFileInput = document.getElementById('heroFileInput');
            const heroDropZone = document.getElementById('heroDropZone');
            const heroFileName = document.getElementById('heroFileName');
            const heroFileSize = document.getElementById('heroFileSize');
            const heroProgressWrap = document.getElementById('heroProgressWrap');
            const heroProgressBar = document.getElementById('heroProgressBar');
            const heroProgressText = document.getElementById('heroProgressText');
            const heroStatHero = document.getElementById('heroStatHero');
            const heroStatValues = document.getElementById('heroStatValues');
            const heroStatSize = document.getElementById('heroStatSize');
            const heroStatStatus = document.getElementById('heroStatStatus');
            const heroResult = document.getElementById('heroResult');
            const heroScanBtn = document.getElementById('heroScanBtn');
            const heroResetBtn = document.getElementById('heroResetBtn');
            const heroDownloadBtn = document.getElementById('heroDownloadBtn');
            const heroPickerWrap = document.getElementById('heroPickerWrap');
            const heroSelect = document.getElementById('heroSelect');
            const heroSearch = document.getElementById('heroSearch');
            const heroPickerMeta = document.getElementById('heroPickerMeta');

            let heroBytes = null;
            let heroOrig = null;
            let heroData = [];
            let heroScanning = false;
            let heroSelectedIdx = -1;

            function heroShowToast(msg, type) { showToast(msg, type); }

            function heroHandleFile(file) {
                try { validateLocalFile(file, ['.bytes']); } catch (e) { heroShowToast('❌ ' + e.message, 'error'); return; }
                if (!file || !file.name.toLowerCase().endsWith('.bytes')) {
                    heroShowToast(t('js.file_must_bytes'), 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        const buf = ev.target.result;
                        heroOrig = new Uint8Array(buf);
                        heroBytes = new Uint8Array(heroOrig);
                        heroFileName.textContent = '📄 ' + file.name;
                        heroFileName.classList.add('has-file');
                        heroFileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
                        heroStatSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
                        heroStatStatus.textContent = 'loaded';
                        heroStatStatus.style.color = '#5ee6a8';
                        heroData = [];
                        heroSelectedIdx = -1;
                        heroResult.innerHTML = '';
                        heroStatHero.textContent = '0';
                        heroStatValues.textContent = '0';
                        heroDownloadBtn.disabled = true;
                        heroResetBtn.disabled = true;
                        if (heroPickerWrap) heroPickerWrap.style.display = 'none';
                        if (heroSelect) heroSelect.innerHTML = '<option value="">' + t('js.choose_hero') + '</option>';
                        if (heroSearch) heroSearch.value = '';
                        if (heroPickerMeta) heroPickerMeta.textContent = '';
                        heroScanBtn.disabled = false;
                        heroShowToast('✅ file ' + file.name + ' siap', 'success');
                    } catch (e) {
                        heroShowToast('❌ gagal baca: ' + e.message, 'error');
                    }
                };
                reader.onerror = function() { heroShowToast('❌ gagal baca file', 'error'); };
                reader.readAsArrayBuffer(file);
            }

            heroFileInput.addEventListener('change', function(e) {
                if (this.files.length) heroHandleFile(this.files[0]);
                this.value = '';
            });
            heroDropZone.addEventListener('dragover', function(e) { e.preventDefault();
                this.classList.add('dragover'); });
            heroDropZone.addEventListener('dragleave', function(e) { e.preventDefault();
                this.classList.remove('dragover'); });
            heroDropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                if (e.dataTransfer.files.length) heroHandleFile(e.dataTransfer.files[0]);
            });

            function heroStartScan() {
                if (!heroBytes || heroScanning) return;
                heroScanning = true;
                heroScanBtn.disabled = true;
                heroScanBtn.textContent = '⏳ scanning...';
                heroDownloadBtn.disabled = true;
                heroResetBtn.disabled = true;
                if (heroPickerWrap) heroPickerWrap.style.display = 'none';
                if (heroSelect) heroSelect.innerHTML = '<option value="">' + t('js.choose_hero') + '</option>';
                if (heroSearch) heroSearch.value = '';
                if (heroPickerMeta) heroPickerMeta.textContent = '';
                heroSelectedIdx = -1;
                heroStatStatus.textContent = 'scanning...';
                heroStatStatus.style.color = '#ffd166';
                heroResult.innerHTML = '';
                heroData = [];
                heroProgressWrap.classList.add('active');
                heroProgressBar.style.width = '0%';
                heroProgressText.textContent = '0%';

                const data = heroBytes;
                const pattern = 'hero_';
                const pBytes = new Uint8Array(pattern.length);
                for (let i = 0; i < pattern.length; i++) pBytes[i] = pattern.charCodeAt(i);

                function findNextHero(start) {
                    for (let i = start; i <= data.length - pBytes.length; i++) {
                        let match = true;
                        for (let j = 0; j < pBytes.length; j++) {
                            if (data[i + j] !== pBytes[j]) { match = false; break; }
                        }
                        if (match) return i;
                    }
                    return -1;
                }

                let heroStarts = [];
                let cursor = 0;
                while (cursor < data.length) {
                    const idx = findNextHero(cursor);
                    if (idx === -1) break;
                    heroStarts.push(idx);
                    cursor = idx + 1;
                }

                if (heroStarts.length === 0) {
                    heroProgressWrap.classList.remove('active');
                    heroShowToast('⚠️ tidak ditemukan hero', 'warning');
                    heroStatStatus.textContent = 'selesai (0 hero)';
                    heroStatStatus.style.color = '#8290a0';
                    heroScanning = false;
                    heroScanBtn.disabled = false;
                    heroScanBtn.textContent = '🔍 scan semua hero';
                    return;
                }

                const totalHeroes = heroStarts.length;
                let heroIndex = 0;
                const MIN_VAL = 10;
                const MAX_VAL = 3500;

                function processNextHero() {
                    if (heroIndex >= totalHeroes) {
                        heroProgressWrap.classList.remove('active');
                        heroStatHero.textContent = heroData.length;
                        let totalVals = 0;
                        heroData.forEach(h => totalVals += h.values.length);
                        heroStatValues.textContent = totalVals;
                        heroStatStatus.textContent = 'selesai (' + heroData.length + ' hero)';
                        heroStatStatus.style.color = '#5ee6a8';
                        heroScanning = false;
                        heroScanBtn.disabled = false;
                        heroScanBtn.textContent = '🔍 scan semua hero';
                        heroDownloadBtn.disabled = (heroData.length === 0);
                        heroResetBtn.disabled = false;
                        if (heroData.length > 0) {
                            heroPopulateSelect(heroData);
                            if (heroPickerWrap) heroPickerWrap.style.display = 'block';
                            heroResult.innerHTML = '<div class="hero-empty-hint">👆 pilih satu hero di atas untuk melihat nilai stat</div>';
                            heroShowToast('✅ scan selesai, ' + heroData.length + ' hero — pilih satu untuk lihat nilai', 'success');
                        } else {
                            if (heroPickerWrap) heroPickerWrap.style.display = 'none';
                            heroResult.innerHTML = '<div class="no-data">tidak ada data stat dalam rentang 10–3500</div>';
                            heroShowToast('⚠️ tidak ada nilai stat yang valid', 'warning');
                        }
                        return;
                    }

                    const start = heroStarts[heroIndex];
                    const end = (heroIndex + 1 < totalHeroes) ? heroStarts[heroIndex + 1] : Math.min(data.length, start +
                        2048);

                    let nameEnd = start + pattern.length;
                    while (nameEnd < data.length && (
                            (data[nameEnd] >= 48 && data[nameEnd] <= 57) ||
                            (data[nameEnd] >= 65 && data[nameEnd] <= 90) ||
                            (data[nameEnd] >= 97 && data[nameEnd] <= 122) ||
                            data[nameEnd] === 95
                        )) { nameEnd++; }
                    const heroName = new TextDecoder('utf-8').decode(data.slice(start, nameEnd));

                    const values = [];
                    for (let off = start; off < end - 3; off += 1) {
                        const chunk = data.slice(off, off + 4);
                        if (chunk.length !== 4) continue;
                        const intVal = chunk[0] | (chunk[1] << 8) | (chunk[2] << 16) | (chunk[3] << 24);
                        const floatVal = new DataView(chunk.buffer, chunk.byteOffset).getFloat32(0, true);
                        const isValidInt = (intVal >= MIN_VAL && intVal <= MAX_VAL);
                        const isValidFloat = (floatVal >= MIN_VAL && floatVal <= MAX_VAL && !isNaN(floatVal));
                        if (isValidInt || isValidFloat) {
                            values.push({
                                offset: off,
                                offsetHex: '0x' + off.toString(16).toUpperCase().padStart(6, '0'),
                                intVal: isValidInt ? intVal : null,
                                floatVal: isValidFloat ? Math.round(floatVal * 10000) / 10000 : null,
                                rawHex: Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('')
                            });
                        }
                    }

                    if (values.length > 0) {
                        heroData.push({ name: heroName, start, end, values });
                    }

                    heroIndex++;
                    const pct = Math.min(100, Math.round((heroIndex / totalHeroes) * 100));
                    heroProgressBar.style.width = pct + '%';
                    heroProgressText.textContent = pct + '% (' + heroIndex + '/' + totalHeroes + ')';
                    setTimeout(processNextHero, 8);
                }
                setTimeout(processNextHero, 40);
            }

            heroScanBtn.addEventListener('click', heroStartScan);

            function heroPopulateSelect(heroes, filterText) {
                if (!heroSelect) return;
                const q = (filterText || '').trim().toLowerCase();
                const prev = heroSelect.value;
                let html = '<option value="">' + t('js.choose_hero') + '</option>';
                let shown = 0;
                for (let i = 0; i < heroes.length; i++) {
                    const n = heroes[i].name || '';
                    if (q && n.toLowerCase().indexOf(q) === -1) continue;
                    html += '<option value="' + i + '">' + escapeHTML(n) +
                        ' (' + heroes[i].values.length + ' nilai)</option>';
                    shown++;
                }
                heroSelect.innerHTML = html;
                // restore selection if still visible
                if (prev !== '' && heroSelect.querySelector('option[value="' + prev + '"]')) {
                    heroSelect.value = prev;
                } else {
                    heroSelect.value = '';
                    heroSelectedIdx = -1;
                }
                if (heroPickerMeta) {
                    heroPickerMeta.textContent = q
                        ? (shown + ' / ' + heroes.length + ' hero cocok dengan filter')
                        : (heroes.length + ' hero tersedia — pilih satu untuk melihat nilai');
                }
            }

            function heroRenderSelected() {
                const idx = heroSelectedIdx;
                if (idx < 0 || !heroData[idx]) {
                    heroResult.innerHTML = '<div class="hero-empty-hint">👆 pilih satu hero di atas untuk melihat nilai stat</div>';
                    return;
                }
                const hero = heroData[idx];
                const total = hero.values.length;
                let html = `
                    <div class="hero-card">
                        <div class="hero-header">
                            <span class="hero-name">${escapeHTML(hero.name)}</span>
                            <span class="badge">${total} nilai</span>
                        </div>
                        <div class="hero-body open" id="hbody_${idx}">
                `;
                if (total === 0) {
                    html += '<div class="no-data">tidak ada nilai</div>';
                } else {
                    html += `
                        <table>
                            <thead><tr><th>offset</th><th>int32</th><th>float32</th><th>raw</th><th>edit int</th><th>edit float</th><th></th></tr></thead>
                            <tbody>
                    `;
                    hero.values.forEach(function (v, vi) {
                        const intStr = v.intVal !== null ? v.intVal : '-';
                        const floatStr = v.floatVal !== null ? v.floatVal.toFixed(4) : '-';
                        html += `
                            <tr>
                                <td>${v.offsetHex}</td>
                                <td class="type-int">${intStr}</td>
                                <td class="type-float">${floatStr}</td>
                                <td>${v.rawHex}</td>
                                <td><input class="edit-input" type="number" id="heditInt_${idx}_${vi}" value="${v.intVal !== null ? v.intVal : ''}" /></td>
                                <td><input class="edit-input" type="number" step="any" id="heditFloat_${idx}_${vi}" value="${v.floatVal !== null ? v.floatVal.toFixed(4) : ''}" /></td>
                                <td><button class="btn-apply hero-apply-btn" data-hero="${idx}" data-val="${vi}">terapkan</button></td>
                            </tr>
                        `;
                    });
                    html += '</tbody></table>';
                }
                html += '</div></div>';
                heroResult.innerHTML = html;
            }

            // keep alias used by apply-edit refresh
            function heroRenderResult() {
                heroRenderSelected();
            }

            if (heroSelect) {
                heroSelect.addEventListener('change', function () {
                    const v = this.value;
                    heroSelectedIdx = v === '' ? -1 : parseInt(v, 10);
                    if (isNaN(heroSelectedIdx)) heroSelectedIdx = -1;
                    heroRenderSelected();
                    if (heroSelectedIdx >= 0 && heroData[heroSelectedIdx]) {
                        heroShowToast('🧬 ' + heroData[heroSelectedIdx].name, 'info');
                    }
                });
            }
            if (heroSearch) {
                heroSearch.addEventListener('input', function () {
                    heroPopulateSelect(heroData, this.value);
                    // if current selection filtered out, clear detail
                    if (heroSelectedIdx >= 0) {
                        const still = heroSelect && heroSelect.querySelector('option[value="' + heroSelectedIdx + '"]');
                        if (!still) {
                            heroSelectedIdx = -1;
                            heroRenderSelected();
                        }
                    }
                });
            }

            heroResult.addEventListener('click', function(e) {
                const applyBtn = e.target.closest('.hero-apply-btn');
                if (applyBtn) {
                    const heroIdx = parseInt(applyBtn.dataset.hero, 10);
                    const valIdx = parseInt(applyBtn.dataset.val, 10);
                    heroApplyEdit(heroIdx, valIdx);
                }
            });

            let heroApplying = false;

            function heroApplyEdit(heroIdx, valIdx) {
                if (heroScanning) { heroShowToast('⏳ tunggu scan selesai', 'warning'); return; }
                if (heroApplying) return;
                heroApplying = true;
                if (!heroBytes || !heroData[heroIdx] || !heroData[heroIdx].values[valIdx]) {
                    heroShowToast('❌ data tidak valid', 'error');
                    heroApplying = false;
                    return;
                }
                const val = heroData[heroIdx].values[valIdx];
                const intInput = document.getElementById(`heditInt_${heroIdx}_${valIdx}`);
                const floatInput = document.getElementById(`heditFloat_${heroIdx}_${valIdx}`);
                const intRaw = intInput ? intInput.value.trim() : '';
                const floatRaw = floatInput ? floatInput.value.trim() : '';
                const intValid = /^-?\d+$/.test(intRaw) ? intRaw : '';
                const floatValid = /^-?\d*\.?\d+$/.test(floatRaw) ? floatRaw : '';

                let newVal = null;
                let type = 'Int32';
                if (intValid !== '') {
                    const parsed = parseInt(intValid, 10);
                    if (isNaN(parsed)) { heroShowToast('❌ int32 tidak valid', 'error');
                        heroApplying = false; return; }
                    newVal = parsed;
                    type = 'Int32';
                } else if (floatValid !== '') {
                    const parsed = parseFloat(floatValid);
                    if (isNaN(parsed)) { heroShowToast('❌ float32 tidak valid', 'error');
                        heroApplying = false; return; }
                    newVal = parsed;
                    type = 'Float32';
                } else {
                    heroShowToast('⚠️ masukkan nilai baru', 'warning');
                    heroApplying = false;
                    return;
                }

                const offset = val.offset;
                try {
                    if (type === 'Int32') {
                        const arr = new Uint8Array(4);
                        new DataView(arr.buffer).setInt32(0, newVal, true);
                        heroBytes.set(arr, offset);
                        val.intVal = newVal;
                        val.floatVal = null;
                    } else {
                        const arr = new Uint8Array(4);
                        new DataView(arr.buffer).setFloat32(0, newVal, true);
                        heroBytes.set(arr, offset);
                        val.floatVal = newVal;
                        val.intVal = null;
                    }
                    const chunk = heroBytes.slice(offset, offset + 4);
                    val.rawHex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
                    heroRenderSelected();
                    heroShowToast('✅ ' + val.offsetHex + ' → ' + newVal, 'success');
                    heroDownloadBtn.disabled = false;
                    heroResetBtn.disabled = false;
                } catch (e) {
                    heroShowToast('❌ gagal menulis: ' + e.message, 'error');
                } finally {
                    heroApplying = false;
                }
            }

            heroResetBtn.addEventListener('click', function() {
                if (!heroOrig) return;
                if (!confirm('reset semua perubahan?')) return;
                heroBytes = new Uint8Array(heroOrig);
                heroData = [];
                heroSelectedIdx = -1;
                heroResult.innerHTML = '';
                heroStatHero.textContent = '0';
                heroStatValues.textContent = '0';
                heroDownloadBtn.disabled = true;
                heroResetBtn.disabled = true;
                if (heroPickerWrap) heroPickerWrap.style.display = 'none';
                if (heroSelect) heroSelect.innerHTML = '<option value="">' + t('js.choose_hero') + '</option>';
                if (heroSearch) heroSearch.value = '';
                if (heroPickerMeta) heroPickerMeta.textContent = '';
                heroShowToast('↺ reset berhasil, scan ulang', 'warning');
                heroStatStatus.textContent = 'reset';
                heroStatStatus.style.color = '#8290a0';
            });

            heroDownloadBtn.addEventListener('click', function() {
                if (!heroBytes) return;
                try {
                    const blob = new Blob([heroBytes], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Hero_modified.bytes';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    heroShowToast('⬇️ file berhasil diunduh', 'success');
                } catch (e) {
                    heroShowToast('❌ gagal download: ' + e.message, 'error');
                }
            });

            heroStatStatus.textContent = t('js.wait_upload');
            heroStatStatus.style.color = '#8290a0';
            heroShowToast('📂 upload Hero.bytes untuk memulai', 'info');

            // ============================================================
            // PANEL 2: DOCUMENTEXTRACTOR
            // ============================================================
            const docFileInput = document.getElementById('docFileInput');
            const docDropZone = document.getElementById('docDropZone');
            const docFileName = document.getElementById('docFileName');
            const docFileSize = document.getElementById('docFileSize');
            const docProgressWrap = document.getElementById('docProgressWrap');
            const docProgressBar = document.getElementById('docProgressBar');
            const docProgressText = document.getElementById('docProgressText');
            const docStatFile = document.getElementById('docStatFile');
            const docStatEntries = document.getElementById('docStatEntries');
            const docStatSize = document.getElementById('docStatSize');
            const docStatStatus = document.getElementById('docStatStatus');
            const docFileList = document.getElementById('docFileList');
            const docFileSelect = document.getElementById('docFileSelect');
            const docLoadEditBtn = document.getElementById('docLoadEditBtn');
            const docEditArea = document.getElementById('docEditArea');
            const docApplyEditBtn = document.getElementById('docApplyEditBtn');
            const docExportBtn = document.getElementById('docExportBtn');
            const docImportInput = document.getElementById('docImportInput');
            const docPatchBtn = document.getElementById('docPatchBtn');
            const docPatchLog = document.getElementById('docPatchLog');
            const docPackBtn = document.getElementById('docPackBtn');
            const docResetBtn = document.getElementById('docResetBtn');
            const docExtractBtn = document.getElementById('docExtractBtn');
            const resCheckInput = document.getElementById('resCheckInput');
            const resCheckStatus = document.getElementById('resCheckStatus');
            const binaryPatchInput = document.getElementById('binaryPatchInput');
            const binaryPatchStatus = document.getElementById('binaryPatchStatus');

            let docRaw = null;
            let docEntries = [];
            let docModified = {};
            let docExtracted = false;
            let docResCheckXML = null;
            let docBinaryPatchXML = null;

            function docShowToast(msg, type) { showToast(msg, type); }

            function updatePatchButton() {
                const ready = docExtracted && docResCheckXML !== null && docBinaryPatchXML !== null;
                docPatchBtn.disabled = !ready;
                if (ready) {
                    docPatchBtn.title = 'Patch siap dijalankan';
                } else {
                    const missing = [];
                    if (!docExtracted) missing.push(t('js.not_extracted'));
                    if (!docResCheckXML) missing.push('ResCheckConf.xml');
                    if (!docBinaryPatchXML) missing.push('BinaryPatchMD5.xml');
                    docPatchBtn.title = 'Butuh: ' + missing.join(', ');
                }
            }

            function docHandleFile(file) {
                try { validateLocalFile(file, ['.unity3d']); } catch (e) { docShowToast('❌ ' + e.message, 'error'); return; }
                if (!file || !file.name.toLowerCase().endsWith('.unity3d')) {
                    docShowToast(t('js.file_must_unity3d'), 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docRaw = new Uint8Array(ev.target.result);
                        docFileName.textContent = '📦 ' + file.name;
                        docFileName.classList.add('has-file');
                        docFileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
                        docStatSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
                        docStatStatus.textContent = 'loaded';
                        docStatStatus.style.color = '#5ee6a8';
                        docExtractBtn.disabled = false;
                        docEntries = [];
                        docModified = {};
                        docExtracted = false;
                        docFileList.innerHTML = '<div class="no-data" style="padding:12px;">belum ada file, ekstrak dulu</div>';
                        docFileSelect.innerHTML = '<option value="">' + t('js.choose_file') + '</option>';
                        docEditArea.style.display = 'none';
                        docApplyEditBtn.style.display = 'none';
                        docExportBtn.disabled = true;
                        docPackBtn.disabled = true;
                        docResetBtn.disabled = true;
                        updatePatchButton();
                        docShowToast('✅ file ' + file.name + ' siap', 'success');
                    } catch (e) {
                        docShowToast('❌ gagal baca: ' + e.message, 'error');
                    }
                };
                reader.onerror = function() { docShowToast('❌ gagal baca file', 'error'); };
                reader.readAsArrayBuffer(file);
            }

            docFileInput.addEventListener('change', function(e) {
                if (this.files.length) docHandleFile(this.files[0]);
                this.value = '';
            });
            docDropZone.addEventListener('dragover', function(e) { e.preventDefault();
                this.classList.add('dragover'); });
            docDropZone.addEventListener('dragleave', function(e) { e.preventDefault();
                this.classList.remove('dragover'); });
            docDropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                if (e.dataTransfer.files.length) docHandleFile(e.dataTransfer.files[0]);
            });

            // Upload ResCheckConf.xml (FIX)
            resCheckInput.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) {
                    resCheckStatus.textContent = t('js.not_uploaded');
                    resCheckStatus.style.color = '#8290a0';
                    docResCheckXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docResCheckXML = new Uint8Array(ev.target.result);
                        resCheckStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        resCheckStatus.style.color = '#5ee6a8';
                        docShowToast('✅ ResCheckConf.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docResCheckXML = null;
                        resCheckStatus.textContent = '❌ gagal baca';
                        resCheckStatus.style.color = '#ff647c';
                        docShowToast('❌ Gagal baca ResCheckConf.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docResCheckXML = null;
                    resCheckStatus.textContent = '❌ error';
                    resCheckStatus.style.color = '#ff647c';
                    docShowToast('❌ Error baca ResCheckConf.xml', 'error');
                    updatePatchButton();
                };
                reader.readAsArrayBuffer(file);
                this.value = '';
            });

            // Upload BinaryPatchMD5.xml (FIX)
            binaryPatchInput.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) {
                    binaryPatchStatus.textContent = t('js.not_uploaded');
                    binaryPatchStatus.style.color = '#8290a0';
                    docBinaryPatchXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docBinaryPatchXML = new Uint8Array(ev.target.result);
                        binaryPatchStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        binaryPatchStatus.style.color = '#5ee6a8';
                        docShowToast('✅ BinaryPatchMD5.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docBinaryPatchXML = null;
                        binaryPatchStatus.textContent = '❌ gagal baca';
                        binaryPatchStatus.style.color = '#ff647c';
                        docShowToast('❌ Gagal baca BinaryPatchMD5.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docBinaryPatchXML = null;
                    binaryPatchStatus.textContent = '❌ error';
                    binaryPatchStatus.style.color = '#ff647c';
                    docShowToast('❌ Error baca BinaryPatchMD5.xml', 'error');
                    updatePatchButton();
                };
                reader.readAsArrayBuffer(file);
                this.value = '';
            });

            // EXTRACT
            docExtractBtn.addEventListener('click', function() {
                if (!docRaw) return;
                docExtractBtn.disabled = true;
                docExtractBtn.textContent = '⏳ extracting...';
                docProgressWrap.classList.add('active');
                docProgressBar.style.width = '0%';
                docProgressText.textContent = '0%';

                setTimeout(() => {
                    try {
                        const data = docRaw;
                        if (data.length < 8) { throw new Error(t('js.file_too_small')); }
                        const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
                        if (magic !== 'MLBB') { throw new Error('bukan MLBB bundle'); }
                        const count = data[4] | (data[5] << 8) | (data[6] << 16) | (data[7] << 24);
                        let pos = 8;
                        const entries = [];
                        for (let i = 0; i < count; i++) {
                            if (pos + 4 > data.length) break;
                            const nl = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24);
                            pos += 4;
                            if (pos + nl > data.length) break;
                            const nameBytes = data.slice(pos, pos + nl);
                            const name = new TextDecoder('utf-8').decode(nameBytes);
                            pos += nl;
                            if (pos + 8 > data.length) break;
                            const size = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24);
                            pos += 4;
                            const offset = data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16) | (data[pos + 3] << 24);
                            pos += 4;
                            entries.push({ name, size, offset });
                        }

                        const dataStart = pos;
                        for (let e of entries) {
                            const start = dataStart + e.offset;
                            const end = start + e.size;
                            if (end > data.length) {
                                e.data = new Uint8Array(0);
                            } else {
                                e.data = data.slice(start, end);
                            }
                        }

                        docEntries = entries;
                        docExtracted = true;
                        docModified = {};
                        docStatEntries.textContent = entries.length;
                        docStatFile.textContent = 'Document.unity3d';
                        docStatStatus.textContent = 'extracted (' + entries.length + ' files)';
                        docStatStatus.style.color = '#5ee6a8';
                        docPackBtn.disabled = false;
                        docResetBtn.disabled = false;
                        docExportBtn.disabled = false;

                        docRenderFileList();
                        docPopulateSelect();
                        updatePatchButton();

                        docShowToast('✅ ekstrak selesai, ' + entries.length + ' file', 'success');
                    } catch (e) {
                        docShowToast('❌ gagal ekstrak: ' + e.message, 'error');
                    } finally {
                        docProgressWrap.classList.remove('active');
                        docExtractBtn.disabled = false;
                        docExtractBtn.textContent = '📂 ekstrak & tampilkan';
                    }
                }, 50);
            });

            function docRenderFileList() {
                let html = '';
                docEntries.forEach((e, idx) => {
                    const data = docModified[e.name] || e.data;
                    const sizeStr = (data.length / 1024).toFixed(1) + ' KB';
                    const isModified = docModified[e.name] ? ' ✏️' : '';
                    html += `
                            <div class="file-item">
                                <span class="fname">${e.name}${isModified}</span>
                                <span class="fsize">${sizeStr}</span>
                                <div class="fedit">
                                    <button class="btn btn-sm doc-view-btn" data-idx="${idx}">👁 lihat</button>
                                    <button class="btn btn-sm btn-success doc-export-btn" data-idx="${idx}">⬇ export</button>
                                </div>
                            </div>
                        `;
                });
                docFileList.innerHTML = html;
            }

            function docPopulateSelect() {
                let opts = '<option value="">' + t('js.choose_file') + '</option>';
                docEntries.forEach((e, idx) => {
                    opts += `<option value="${idx}">${e.name}</option>`;
                });
                docFileSelect.innerHTML = opts;
                docLoadEditBtn.disabled = false;
            }

            // View / Edit
            docFileList.addEventListener('click', function(e) {
                const viewBtn = e.target.closest('.doc-view-btn');
                if (viewBtn) {
                    const idx = parseInt(viewBtn.dataset.idx, 10);
                    docFileSelect.value = idx;
                    docLoadEditBtn.click();
                    return;
                }
                const exportBtn = e.target.closest('.doc-export-btn');
                if (exportBtn) {
                    const idx = parseInt(exportBtn.dataset.idx, 10);
                    docExportFile(idx);
                }
            });

            docLoadEditBtn.addEventListener('click', function() {
                const idx = parseInt(docFileSelect.value, 10);
                if (isNaN(idx) || !docEntries[idx]) {
                    docEditArea.style.display = 'none';
                    docApplyEditBtn.style.display = 'none';
                    return;
                }
                const entry = docEntries[idx];
                const data = docModified[entry.name] || entry.data;
                let text = '';
                try {
                    text = new TextDecoder('utf-8').decode(data);
                } catch (e) {
                    text = '[binary data, tidak bisa ditampilkan sebagai teks]';
                }
                docEditArea.value = text;
                docEditArea.style.display = 'block';
                docApplyEditBtn.style.display = 'inline-block';
                docApplyEditBtn.disabled = false;
                docApplyEditBtn.dataset.idx = idx;
            });

            docApplyEditBtn.addEventListener('click', function() {
                const idx = parseInt(this.dataset.idx, 10);
                if (isNaN(idx) || !docEntries[idx]) return;
                const entry = docEntries[idx];
                const newText = docEditArea.value;
                const newBytes = new TextEncoder().encode(newText);
                docModified[entry.name] = newBytes;
                docShowToast('✅ ' + entry.name + ' diperbarui (' + newBytes.length + ' bytes)', 'success');
                docPackBtn.disabled = false;
                docRenderFileList();
            });

            // EXPORT per file
            function docExportFile(idx) {
                const entry = docEntries[idx];
                if (!entry) return;
                const data = docModified[entry.name] || entry.data;
                try {
                    const blob = new Blob([data], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = entry.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    docShowToast('⬇️ ' + entry.name + ' berhasil diexport', 'success');
                } catch (e) {
                    docShowToast('❌ gagal export: ' + e.message, 'error');
                }
            }

            docExportBtn.addEventListener('click', function() {
                const idx = parseInt(docFileSelect.value, 10);
                if (isNaN(idx) || !docEntries[idx]) {
                    docShowToast('⚠️ pilih file dulu', 'warning');
                    return;
                }
                docExportFile(idx);
            });

            // IMPORT per file
            docImportInput.addEventListener('change', function(e) {
                if (!this.files.length) return;
                const idx = parseInt(docFileSelect.value, 10);
                if (isNaN(idx) || !docEntries[idx]) {
                    docShowToast('⚠️ pilih file tujuan dulu', 'warning');
                    this.value = '';
                    return;
                }
                const entry = docEntries[idx];
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const newData = new Uint8Array(ev.target.result);
                    docModified[entry.name] = newData;
                    docShowToast('✅ ' + entry.name + ' diimport (' + newData.length + ' bytes)', 'success');
                    docPackBtn.disabled = false;
                    docRenderFileList();
                };
                reader.readAsArrayBuffer(this.files[0]);
                this.value = '';
            });

            // MD5 & xxHash
            /** Pure-JS MD5 (RFC 1321). window.crypto.subtle never supports 'MD5' (browsers only expose
             *  SHA-1/256/384/512 via SubtleCrypto), so relying on crypto.subtle.digest('MD5', ...) always
             *  throws NotSupportedError — that was the root cause of Patch XML failing immediately.
             *  This implementation computes real MD5 bytes locally so ResCheckConf.xml gets a valid MD5. */
            function md5ToHex(data) {
                function rotl(x, c) { return (x << c) | (x >>> (32 - c)); }
                function toLE32(n) {
                    return new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);
                }
                const S = [
                    7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
                    5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
                    4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
                    6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
                ];
                const K = new Int32Array([
                    -680876936,-389564586,606105819,-1044525330,-176418897,1200080426,-1473231341,-45705983,
                    1770035416,-1958414417,-42063,-1990404162,1804603682,-40341101,-1502002290,1236535329,
                    -165796510,-1069501632,643717713,-373897302,-701558691,38016083,-660478335,-405537848,
                    568446438,-1019803690,-187363961,1163531501,-1444681467,-51403784,1735328473,-1926607734,
                    -378558,-2022574463,1839030562,-35309556,-1530992060,1272893353,-155497632,-1094730640,
                    681279174,-358537222,-722521979,76029189,-640364487,-421815835,530742520,-995338651,
                    -198630844,1126891415,-1416354905,-57434055,1700485571,-1894986606,-1051523,-2054922799,
                    1873313359,-30611744,-1560198380,1309151649,-145523070,-1120210379,718787259,-343485551
                ]);
                let msg = new Uint8Array(data);
                const origLenBits = msg.length * 8;
                const padLen = ((msg.length % 64) < 56) ? (56 - (msg.length % 64)) : (120 - (msg.length % 64));
                const padded = new Uint8Array(msg.length + padLen + 8);
                padded.set(msg, 0);
                padded[msg.length] = 0x80;
                // length in bits, little-endian 64-bit (we only use the low 32 bits realistically)
                const lenLow = origLenBits >>> 0;
                const lenHigh = Math.floor(origLenBits / 0x100000000) >>> 0;
                padded.set(toLE32(lenLow), padded.length - 8);
                padded.set(toLE32(lenHigh), padded.length - 4);

                let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

                for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
                    const M = new Int32Array(16);
                    for (let j = 0; j < 16; j++) {
                        const o = chunkStart + j * 4;
                        M[j] = (padded[o]) | (padded[o+1] << 8) | (padded[o+2] << 16) | (padded[o+3] << 24);
                    }
                    let A = a0, B = b0, C = c0, D = d0;
                    for (let i = 0; i < 64; i++) {
                        let F, g;
                        if (i < 16) { F = (B & C) | (~B & D); g = i; }
                        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
                        F = (F + A + K[i] + M[g]) | 0;
                        A = D; D = C; C = B;
                        B = (B + rotl(F, S[i])) | 0;
                    }
                    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
                }

                const out = new Uint8Array(16);
                out.set(toLE32(a0), 0);
                out.set(toLE32(b0), 4);
                out.set(toLE32(c0), 8);
                out.set(toLE32(d0), 12);
                return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
            }

            function md5FromBytes(data) {
                try {
                    return Promise.resolve(md5ToHex(data));
                } catch (e) {
                    return Promise.reject(e);
                }
            }

            function xxhash6(data) {
                let h = 0;
                for (let i = 0; i < data.length; i++) {
                    h = ((h << 5) - h) + data[i];
                    h = h & 0xFFFFFFFF;
                }
                const hex = h.toString(16).padStart(8, '0');
                const last6 = hex.slice(-6);
                const pairs = [last6.slice(0, 2), last6.slice(2, 4), last6.slice(4, 6)];
                return pairs.reverse().join('');
            }

            function patchXML(xmlBytes, targetName, newMD5, newXXHash, newSize) {
                let text = new TextDecoder('utf-8').decode(xmlBytes);
                const pattern = new RegExp(`(<item[^>]*name="${targetName}"[^>]*>)`, 'g');
                let patched = false;
                text = text.replace(pattern, (match) => {
                    let m = match;
                    m = m.replace(/md5="[a-fA-F0-9]{32}"/, `md5="${newMD5}"`);
                    m = m.replace(/xxhash="[a-fA-F0-9]{6}"/, `xxhash="${newXXHash}"`);
                    if (newSize !== undefined && newSize !== null) {
                        m = m.replace(/size="\d+"/, `size="${newSize}"`);
                    }
                    patched = true;
                    return m;
                });
                return { patched, data: new TextEncoder().encode(text) };
            }

            // PATCH NYATA
            docPatchBtn.addEventListener('click', async function() {
                if (!docResCheckXML || !docBinaryPatchXML || !docExtracted) {
                    docShowToast('⚠️ upload semua file XML dan extract Document dulu', 'warning');
                    return;
                }

                const log = docPatchLog;
                log.classList.add('active');
                log.textContent = '⏳ Memproses patch nyata...\n';

                try {
                    const packed = docPackBytes();
                    const docMD5 = await md5FromBytes(packed);
                    const docXXHash = xxhash6(packed);
                    const docSize = packed.length;

                    log.textContent += `  Document.unity3d: MD5=${docMD5}, xxHash=${docXXHash}, size=${docSize}\n`;

                    const resPatch = patchXML(docResCheckXML, 'Document', docMD5, docXXHash, docSize);
                    if (resPatch.patched) {
                        docResCheckXML = resPatch.data;
                        log.textContent += `  ✅ ResCheckConf.xml patched\n`;
                    } else {
                        log.textContent += `  ⚠️ ResCheckConf.xml: target 'Document' tidak ditemukan\n`;
                    }

                    const resMD5 = await md5FromBytes(docResCheckXML);
                    const resXXHash = xxhash6(docResCheckXML);
                    const resSize = docResCheckXML.length;
                    log.textContent += `  ResCheckConf.xml: MD5=${resMD5}, xxHash=${resXXHash}, size=${resSize}\n`;

                    let bp1 = patchXML(docBinaryPatchXML, 'Document/android/Document.unity3d', docMD5, docXXHash, null);
                    let bp2 = patchXML(bp1.data, 'Document/android/ResCheckConf.xml', resMD5, resXXHash, null);
                    if (bp1.patched) log.textContent += `  ✅ BinaryPatchMD5: Document.unity3d patched\n`;
                    else log.textContent +=
                    `  ⚠️ BinaryPatchMD5: Document.unity3d target tidak ditemukan\n`;
                    if (bp2.patched) log.textContent += `  ✅ BinaryPatchMD5: ResCheckConf.xml patched\n`;
                    else log.textContent +=
                    `  ⚠️ BinaryPatchMD5: ResCheckConf.xml target tidak ditemukan\n`;

                    docBinaryPatchXML = bp2.data;

                    log.textContent += `\n✅ SEMUA PATCH SELESAI (nyata)!`;
                    docShowToast('✅ Patch nyata berhasil!', 'success');

                    const downloadRes = confirm('Download ResCheckConf.xml hasil patch?');
                    if (downloadRes) {
                        const blob = new Blob([docResCheckXML], { type: 'application/xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'ResCheckConf_patched.xml';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                    const downloadBp = confirm('Download BinaryPatchMD5.xml hasil patch?');
                    if (downloadBp) {
                        const blob = new Blob([docBinaryPatchXML], { type: 'application/xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'BinaryPatchMD5_patched.xml';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }

                } catch (e) {
                    log.textContent += `\n❌ ERROR: ${e.message}`;
                    docShowToast('❌ Gagal patch: ' + e.message, 'error');
                }
            });

            // PACK
            function docPackBytes() {
                const entries = docEntries;
                const toc = new Uint8Array(8);
                toc[0] = 77;
                toc[1] = 76;
                toc[2] = 66;
                toc[3] = 66;
                const cnt = entries.length;
                toc[4] = cnt & 0xff;
                toc[5] = (cnt >> 8) & 0xff;
                toc[6] = (cnt >> 16) & 0xff;
                toc[7] = (cnt >> 24) & 0xff;

                const tocParts = [toc];
                let dataBlocks = [];
                let currentOffset = 0;

                for (let e of entries) {
                    const data = docModified[e.name] || e.data;
                    const nb = new TextEncoder().encode(e.name);
                    const nameLen = nb.length;
                    const size = data.length;
                    const offset = currentOffset;

                    const header = new Uint8Array(4 + nameLen + 4 + 4);
                    let p = 0;
                    header[p++] = nameLen & 0xff;
                    header[p++] = (nameLen >> 8) & 0xff;
                    header[p++] = (nameLen >> 16) & 0xff;
                    header[p++] = (nameLen >> 24) & 0xff;
                    header.set(nb, p);
                    p += nameLen;
                    header[p++] = size & 0xff;
                    header[p++] = (size >> 8) & 0xff;
                    header[p++] = (size >> 16) & 0xff;
                    header[p++] = (size >> 24) & 0xff;
                    header[p++] = offset & 0xff;
                    header[p++] = (offset >> 8) & 0xff;
                    header[p++] = (offset >> 16) & 0xff;
                    header[p++] = (offset >> 24) & 0xff;

                    tocParts.push(header);
                    dataBlocks.push(data);
                    currentOffset += size;
                }

                const tocTotal = tocParts.reduce((acc, arr) => acc + arr.length, 0);
                const dataTotal = dataBlocks.reduce((acc, arr) => acc + arr.length, 0);
                const result = new Uint8Array(tocTotal + dataTotal);
                let pos2 = 0;
                for (let part of tocParts) {
                    result.set(part, pos2);
                    pos2 += part.length;
                }
                for (let block of dataBlocks) {
                    result.set(block, pos2);
                    pos2 += block.length;
                }
                return result;
            }

            docPackBtn.addEventListener('click', function() {
                if (!docExtracted || docEntries.length === 0) {
                    docShowToast('⚠️ belum ada data', 'warning');
                    return;
                }
                try {
                    const result = docPackBytes();
                    const blob = new Blob([result], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Document_modified.unity3d';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    docShowToast('⬇️ Document_modified.unity3d berhasil diunduh', 'success');
                } catch (e) {
                    docShowToast('❌ gagal pack: ' + e.message, 'error');
                }
            });

            // RESET
            docResetBtn.addEventListener('click', function() {
                if (!docRaw) return;
                if (!confirm('reset semua perubahan?')) return;
                docModified = {};
                docExtracted = false;
                docEntries = [];
                docFileList.innerHTML = '<div class="no-data" style="padding:12px;">belum ada file, ekstrak dulu</div>';
                docFileSelect.innerHTML = '<option value="">' + t('js.choose_file') + '</option>';
                docEditArea.style.display = 'none';
                docApplyEditBtn.style.display = 'none';
                docPatchLog.classList.remove('active');
                docPatchLog.textContent = '';
                docStatEntries.textContent = '0';
                docStatFile.textContent = '-';
                docStatStatus.textContent = 'reset';
                docStatStatus.style.color = '#8290a0';
                docPatchBtn.disabled = true;
                docPackBtn.disabled = true;
                docResetBtn.disabled = true;
                docExportBtn.disabled = true;
                updatePatchButton();
                docShowToast(t('js.reset_ok'), 'warning');
            });

            // INIT
            docStatStatus.textContent = t('js.wait_upload');
            docStatStatus.style.color = '#8290a0';
            docShowToast('📦 upload Document.unity3d untuk memulai', 'info');

            // ============================================================
            // PANEL 3: GAMEOBJECT OVERRIDER & CAB REPLACER (1 file)
            // ============================================================
            const goFileInput = document.getElementById('goFileInput');
            const goDropZone = document.getElementById('goDropZone');
            const goFileName = document.getElementById('goFileName');
            const goFileSize = document.getElementById('goFileSize');
            const goCabInput = document.getElementById('goCabInput');
            const goTargetInput = document.getElementById('goTargetInput');
            const goProcessBtn = document.getElementById('goProcessBtn');
            const goProgressWrap = document.getElementById('goProgressWrap');
            const goProgressBar = document.getElementById('goProgressBar');
            const goProgressText = document.getElementById('goProgressText');
            const goStatFile = document.getElementById('goStatFile');
            const goStatGO = document.getElementById('goStatGO');
            const goStatCAB = document.getElementById('goStatCAB');
            const goStatStatus = document.getElementById('goStatStatus');
            const goLog = document.getElementById('goLog');
            const goDownloadBtn = document.getElementById('goDownloadBtn');
            const goResetBtn = document.getElementById('goResetBtn');

            const TARGET_CAB_LEN = 36;
            const CAB_RE = /CAB-[^\x00\r\n\s]{1,32}/g;

            let goRaw = null;
            let goFileBaseName = '';
            let goOriginalName = '';
            let goResultBytes = null;

            function goShowToast(msg, type) { showToast(msg, type); }

            function prepareCabBytes(customCabStr) {
                if (!customCabStr || !String(customCabStr).trim()) return null;
                let s = String(customCabStr).trim();
                if (!s.startsWith('CAB-')) s = 'CAB-' + s;
                const enc = new TextEncoder().encode(s);
                const out = new Uint8Array(TARGET_CAB_LEN);
                if (enc.length < TARGET_CAB_LEN) {
                    out.set(enc, 0);
                    // rest already 0
                } else {
                    out.set(enc.subarray(0, TARGET_CAB_LEN), 0);
                }
                return out;
            }

            /**
             * Minimal LZ4 block decompressor (Unity AssetBundle compatible).
             */
            function lz4DecompressBlock(src, uncompressedSize) {
                const dst = new Uint8Array(uncompressedSize);
                let s = 0, d = 0;
                const sLen = src.length;
                while (s < sLen && d < uncompressedSize) {
                    const token = src[s++];
                    let litLen = token >>> 4;
                    if (litLen === 15) {
                        let b;
                        do { if (s >= sLen) break; b = src[s++]; litLen += b; } while (b === 255);
                    }
                    for (let i = 0; i < litLen && s < sLen && d < uncompressedSize; i++) dst[d++] = src[s++];
                    if (s >= sLen || d >= uncompressedSize) break;
                    if (s + 2 > sLen) break;
                    const offset = src[s++] | (src[s++] << 8);
                    if (offset === 0 || offset > d) throw new Error('LZ4 bad offset ' + offset);
                    let matchLen = (token & 0xf) + 4;
                    if ((token & 0xf) === 15) {
                        let b;
                        do { if (s >= sLen) break; b = src[s++]; matchLen += b; } while (b === 255);
                    }
                    let mPos = d - offset;
                    for (let i = 0; i < matchLen && d < uncompressedSize; i++) dst[d++] = dst[mPos++];
                }
                return dst;
            }

            function readCString(data, off) {
                let end = off;
                while (end < data.length && data[end] !== 0) end++;
                return { str: new TextDecoder().decode(data.subarray(off, end)), next: end + 1 };
            }

            function readU32BE(data, p) {
                return ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3]) >>> 0;
            }
            function readU64BE(data, p) {
                // JS safe for sizes we care about (< 2^53)
                const hi = readU32BE(data, p);
                const lo = readU32BE(data, p + 4);
                return hi * 0x100000000 + lo;
            }
            function writeU32BE(arr, p, v) {
                arr[p] = (v >>> 24) & 0xff;
                arr[p + 1] = (v >>> 16) & 0xff;
                arr[p + 2] = (v >>> 8) & 0xff;
                arr[p + 3] = v & 0xff;
            }
            function writeU64BE(arr, p, v) {
                const hi = Math.floor(v / 0x100000000);
                const lo = v >>> 0;
                writeU32BE(arr, p, hi);
                writeU32BE(arr, p + 4, lo);
            }

            /**
             * Parse & decompress UnityFS AssetBundle → raw block bytes.
             * Returns null if not UnityFS / unsupported.
             */
            function unityFsUnpack(fileData) {
                if (fileData.length < 20) return null;
                const magic = new TextDecoder().decode(fileData.subarray(0, 7));
                if (magic !== 'UnityFS') return null;

                let off = 8;
                const format = readU32BE(fileData, off); off += 4;
                const uver = readCString(fileData, off); off = uver.next;
                const gver = readCString(fileData, off); off = gver.next;
                const fileSize = readU64BE(fileData, off); off += 8;
                const cBlocksInfoSize = readU32BE(fileData, off); off += 4;
                const uBlocksInfoSize = readU32BE(fileData, off); off += 4;
                const flags = readU32BE(fileData, off); off += 4;

                const compression = flags & 0x3f;
                // Align to 16 if needed (BlockInfoNeedPaddingAtStart = 0x200)
                if (flags & 0x200) {
                    if (off % 16) off += 16 - (off % 16);
                } else if (off % 16) {
                    // Many Unity 2019 bundles still align blocks info to 16
                    off += 16 - (off % 16);
                }

                if (off + cBlocksInfoSize > fileData.length) return null;
                const blocksInfoC = fileData.subarray(off, off + cBlocksInfoSize);
                let blocksInfo;
                if (compression === 0) {
                    blocksInfo = blocksInfoC;
                } else if (compression === 2 || compression === 3) {
                    blocksInfo = lz4DecompressBlock(blocksInfoC, uBlocksInfoSize);
                } else {
                    throw new Error('UnityFS: unsupported blocksInfo compression ' + compression);
                }

                let bio = 16; // skip GUID
                const numBlocks = readU32BE(blocksInfo, bio); bio += 4;
                const blocks = [];
                for (let i = 0; i < numBlocks; i++) {
                    const uSize = readU32BE(blocksInfo, bio);
                    const cSize = readU32BE(blocksInfo, bio + 4);
                    const bFlags = (blocksInfo[bio + 8] << 8) | blocksInfo[bio + 9];
                    bio += 10;
                    blocks.push({ uSize: uSize, cSize: cSize, flags: bFlags, entryOff: 16 + 4 + i * 10 });
                }

                const dataStart = off + cBlocksInfoSize;
                let pos = dataStart;
                const rawParts = [];
                const origChunks = [];
                for (let i = 0; i < blocks.length; i++) {
                    const b = blocks[i];
                    const chunk = fileData.subarray(pos, pos + b.cSize);
                    pos += b.cSize;
                    origChunks.push(chunk);
                    const bComp = b.flags & 0x3f;
                    let part;
                    if (bComp === 0) {
                        part = new Uint8Array(chunk);
                    } else if (bComp === 2 || bComp === 3) {
                        part = lz4DecompressBlock(chunk, b.uSize);
                    } else {
                        throw new Error('UnityFS: unsupported block compression ' + bComp);
                    }
                    rawParts.push(part);
                }

                return {
                    format: format,
                    uver: uver.str,
                    gver: gver.str,
                    flags: flags,
                    blocksInfo: new Uint8Array(blocksInfo),
                    blocks: blocks,
                    rawParts: rawParts,
                    origChunks: origChunks
                };
            }

            /**
             * Rebuild UnityFS. Modified blocks stored uncompressed (flags=0)
             * so we don't need an LZ4 compressor. Unmodified blocks keep original bytes.
             */
            function unityFsRepack(unpacked, modifiedBlockFlags) {
                const blocks = unpacked.blocks;
                const newBlockDataParts = [];
                let totalBlockBytes = 0;
                for (let i = 0; i < blocks.length; i++) {
                    if (modifiedBlockFlags[i]) {
                        const part = unpacked.rawParts[i];
                        blocks[i].uSize = part.length;
                        blocks[i].cSize = part.length;
                        blocks[i].flags = 0; // uncompressed
                        newBlockDataParts.push(part);
                        totalBlockBytes += part.length;
                        // update blocksInfo entry
                        const eo = blocks[i].entryOff;
                        writeU32BE(unpacked.blocksInfo, eo, part.length);
                        writeU32BE(unpacked.blocksInfo, eo + 4, part.length);
                        unpacked.blocksInfo[eo + 8] = 0;
                        unpacked.blocksInfo[eo + 9] = 0;
                    } else {
                        const chunk = unpacked.origChunks[i];
                        newBlockDataParts.push(chunk);
                        totalBlockBytes += chunk.length;
                    }
                }

                // Recompress blocksInfo with... keep as uncompressed if we can't LZ4 compress.
                // For simplicity store blocksInfo uncompressed and clear compression bits.
                // flags low 6 bits = compression of blocksInfo.
                let newFlags = (unpacked.flags & ~0x3f) | 0; // no compression on blocksInfo
                // Keep BlocksAndDirectoryInfoCombined etc.

                const biRaw = unpacked.blocksInfo;
                const biC = biRaw; // uncompressed

                // Build header
                const enc = new TextEncoder();
                const magic = enc.encode('UnityFS\0');
                const uverB = enc.encode(unpacked.uver + '\0');
                const gverB = enc.encode(unpacked.gver + '\0');

                // Compute size: magic(8) + format(4) + uver + gver + size(8)+cbi(4)+ubi(4)+flags(4) + pad + bi + blocks
                let headerLen = 8 + 4 + uverB.length + gverB.length + 8 + 4 + 4 + 4;
                let pad = (16 - (headerLen % 16)) % 16;
                const totalSize = headerLen + pad + biC.length + totalBlockBytes;

                const out = new Uint8Array(totalSize);
                let o = 0;
                out.set(magic, o); o = 8;
                writeU32BE(out, o, unpacked.format); o += 4;
                out.set(uverB, o); o += uverB.length;
                out.set(gverB, o); o += gverB.length;
                writeU64BE(out, o, totalSize); o += 8;
                writeU32BE(out, o, biC.length); o += 4;
                writeU32BE(out, o, biRaw.length); o += 4;
                writeU32BE(out, o, newFlags); o += 4;
                o += pad; // zeros already
                out.set(biC, o); o += biC.length;
                for (let i = 0; i < newBlockDataParts.length; i++) {
                    out.set(newBlockDataParts[i], o);
                    o += newBlockDataParts[i].length;
                }
                return out;
            }

            /**
             * Unity GameObject patcher (multi-layout + name variants + UnityFS).
             *
             * Layouts after aligned m_Name:
             *   A) tag uint16 + m_IsActive          → active @ +2   (common 2019+ stripped)
             *   B) tag int32 + icon(8) + nav + flags + active → @ +20
             *   C) other offsets +18/+16/+22…
             */
            function readI32LE(data, p) {
                if (p < 0 || p + 4 > data.length) return null;
                return (data[p] | (data[p + 1] << 8) | (data[p + 2] << 16) | (data[p + 3] << 24));
            }

            function readU32LE(data, p) {
                if (p < 0 || p + 4 > data.length) return null;
                return ((data[p] >>> 0) | ((data[p + 1] << 8) >>> 0) |
                    ((data[p + 2] << 16) >>> 0) | ((data[p + 3] << 24) >>> 0)) >>> 0;
            }

            function readU16LE(data, p) {
                if (p < 0 || p + 2 > data.length) return null;
                return (data[p] | (data[p + 1] << 8)) >>> 0;
            }

            function bytesEqualAt(data, pos, bytes) {
                if (pos < 0 || pos + bytes.length > data.length) return false;
                for (let i = 0; i < bytes.length; i++) if (data[pos + i] !== bytes[i]) return false;
                return true;
            }

            // +2 first: tag uint16 + active (Unity 2019 GameObject stripped type tree)
            const GO_ACTIVE_OFFSETS = [2, 20, 18, 22, 16, 24, 12, 28, 8, 4, 3];

            function tryPatchGameObjectAt(data, after, namePos) {
                // m_Layer sits just before the name length field for real GameObjects
                const layer = (namePos >= 4) ? readI32LE(data, namePos - 4) : null;
                const layerOk = layer !== null && layer >= 0 && layer <= 31;

                for (let oi = 0; oi < GO_ACTIVE_OFFSETS.length; oi++) {
                    const off = GO_ACTIVE_OFFSETS[oi];
                    const activePos = after + off;
                    if (activePos >= data.length) continue;

                    const active = data[activePos];
                    if (active !== 0 && active !== 1) continue;

                    // Layout stripped: tag uint16 @0, active @2 — require valid m_Layer
                    if (off === 2 || off === 3 || off === 4) {
                        const tag16 = readU16LE(data, after);
                        if (tag16 !== null && tag16 <= 10000 && layerOk) {
                            return { activePos: activePos, active: active, layout: 'tag16-short@' + off };
                        }
                        continue;
                    }

                    // Layout A: tag int32 @0, nav @12 (active usually @20)
                    if (off === 20 || off === 16 || off === 24 || off === 28) {
                        const tag = readI32LE(data, after);
                        const nav = readI32LE(data, after + 12);
                        if (tag !== null && tag >= 0 && tag <= 65535 &&
                            nav !== null && nav >= -1 && nav <= 256) {
                            return { activePos: activePos, active: active, layout: 'tag32@' + off };
                        }
                    }

                    // Layout B: tag uint16 @0, nav around @10/@12
                    if (off === 18 || off === 20 || off === 22) {
                        const tag16 = readU16LE(data, after);
                        const navA = readI32LE(data, after + 10);
                        const navB = readI32LE(data, after + 12);
                        if (tag16 !== null && tag16 <= 65535) {
                            if ((navA !== null && navA >= -1 && navA <= 256) ||
                                (navB !== null && navB >= -1 && navB <= 256)) {
                                return { activePos: activePos, active: active, layout: 'tag16@' + off };
                            }
                        }
                    }

                    // Layout C (relaxed primary offsets only)
                    if (off === 20 || off === 18) {
                        const before = readU32LE(data, activePos - 4);
                        if (before !== null && before <= 0x00ffffff) {
                            return { activePos: activePos, active: active, layout: 'relaxed@' + off };
                        }
                    }
                }
                return null;
            }

            function disableGameObjectByName(data, targetName) {
                const rawName = String(targetName || '').trim();
                const nameBytes = new TextEncoder().encode(rawName);
                const nameLen = nameBytes.length;
                if (!nameLen || nameLen > 512) {
                    return { disabled: false, count: 0, candidates: 0, alreadyOff: 0, reason: 'invalid-name', details: [] };
                }

                // Filename often differs from m_Name (underscore / spacing).
                const variants = [rawName];
                const noUnderscore = rawName.replace(/_/g, '');
                if (noUnderscore !== rawName) variants.push(noUnderscore);
                const withSpace = rawName.replace(/_/g, ' ');
                if (withSpace !== rawName) variants.push(withSpace);

                let foundCandidates = 0;
                let patched = 0;
                let alreadyOff = 0;
                const details = [];
                const patchedPositions = {};

                for (let vi = 0; vi < variants.length; vi++) {
                    const vName = variants[vi];
                    const vBytes = new TextEncoder().encode(vName);
                    const vLen = vBytes.length;
                    let pos = 0;

                    while (pos + 4 + vLen <= data.length) {
                        const len = readU32LE(data, pos);
                        if (len !== vLen || !bytesEqualAt(data, pos + 4, vBytes)) {
                            pos++;
                            continue;
                        }

                        let after = pos + 4 + vLen;
                        while (after % 4 !== 0) after++;

                        let hit = tryPatchGameObjectAt(data, after, pos);
                        // Force fallback for common offsets including short tag16 layout (+2)
                        if (!hit) {
                            const forceOffs = [2, 20, 18, 4];
                            for (let fi = 0; fi < forceOffs.length; fi++) {
                                const fOff = forceOffs[fi];
                                const fPos = after + fOff;
                                if (fPos < data.length && (data[fPos] === 0 || data[fPos] === 1)) {
                                    // For +2 require m_Layer-like value before name
                                    if (fOff <= 4) {
                                        const layer = pos >= 4 ? readI32LE(data, pos - 4) : null;
                                        if (layer === null || layer < 0 || layer > 31) continue;
                                    }
                                    hit = { activePos: fPos, active: data[fPos], layout: 'force@' + fOff };
                                    break;
                                }
                            }
                        }
                        if (hit) {
                            foundCandidates++;
                            if (hit.active === 1 && !patchedPositions[hit.activePos]) {
                                data[hit.activePos] = 0;
                                patchedPositions[hit.activePos] = true;
                                patched++;
                                details.push('PATCH "' + vName + '" @' + hit.activePos + ' (' + hit.layout + ')');
                            } else if (hit.active === 0) {
                                alreadyOff++;
                                details.push('ALREADY_OFF "' + vName + '" @' + hit.activePos + ' (' + hit.layout + ')');
                            }
                        } else {
                            details.push('STRING_ONLY "' + vName + '" @' + pos + ' (bukan layout GameObject)');
                        }

                        pos += 4 + vLen;
                    }
                }

                return {
                    disabled: patched > 0,
                    count: patched,
                    candidates: foundCandidates,
                    alreadyOff: alreadyOff,
                    reason: patched > 0 ? 'patched' : (foundCandidates ? 'matched' : 'not-found'),
                    details: details
                };
            }

            /**
             * Binary-safe CAB replacement. Avoids building a multi-megabyte JS string.
             * CAB identifiers are ASCII and are normally stored in a fixed 36-byte field.
             */
            function replaceCabStrings(data, newCabBytes) {
                if (!newCabBytes || newCabBytes.length !== TARGET_CAB_LEN) {
                    return { replaced: false, count: 0, found: 0 };
                }

                const cabPrefix = [67, 65, 66, 45]; // CAB-
                let found = 0;
                let count = 0;

                for (let i = 0; i <= data.length - TARGET_CAB_LEN; i++) {
                    if (data[i] !== cabPrefix[0] || data[i + 1] !== cabPrefix[1] ||
                        data[i + 2] !== cabPrefix[2] || data[i + 3] !== cabPrefix[3]) continue;

                    // Validate a CAB field: ASCII token followed by NUL/padding,
                    // with a maximum of 36 bytes. Do not touch arbitrary binary data.
                    let end = i + 4;
                    let valid = true;
                    while (end < i + TARGET_CAB_LEN) {
                        const b = data[end];
                        if (b === 0) break;
                        const ascii = (b >= 0x21 && b <= 0x7e);
                        if (!ascii || b === 0x0a || b === 0x0d || b === 0x20) {
                            valid = false;
                            break;
                        }
                        end++;
                    }
                    if (!valid) continue;

                    // A real CAB field is padded to the fixed field size.
                    // If there is no NUL in the remaining bytes, still allow an
                    // exactly 36-byte ASCII CAB identifier.
                    found++;
                    data.set(newCabBytes, i);
                    count++;
                    i += TARGET_CAB_LEN - 1;
                }

                return { replaced: count > 0, count, found };
            }

            function goHandleFile(file) {
                try { validateLocalFile(file, ['.unity3d']); } catch (e) { goShowToast('❌ ' + e.message, 'error'); return; }
                if (!file || !file.name.toLowerCase().endsWith('.unity3d')) {
                    goShowToast(t('js.file_must_unity3d'), 'error');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        goRaw = new Uint8Array(ev.target.result);
                        goOriginalName = file.name;
                        goFileBaseName = file.name.replace(/\.unity3d$/i, '');
                        goTargetInput.value = goFileBaseName;
                        goFileName.textContent = '⚡ ' + file.name;
                        goFileName.classList.add('has-file');
                        goFileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
                        goStatFile.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name;
                        goStatGO.textContent = '-';
                        goStatCAB.textContent = '0';
                        goStatStatus.textContent = 'loaded';
                        goStatStatus.style.color = '#5ee6a8';
                        goProcessBtn.disabled = false;
                        goDownloadBtn.disabled = true;
                        goResetBtn.disabled = false;
                        goResultBytes = null;
                        goLog.style.display = 'none';
                        goLog.textContent = '';
                        goShowToast('✅ ' + file.name + ' siap diproses', 'success');
                    } catch (e) {
                        goShowToast('❌ gagal baca: ' + e.message, 'error');
                    }
                };
                reader.onerror = function () { goShowToast('❌ gagal baca file', 'error'); };
                reader.readAsArrayBuffer(file);
            }

            goFileInput.addEventListener('change', function () {
                if (this.files.length) goHandleFile(this.files[0]);
                this.value = '';
            });
            goDropZone.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('dragover'); });
            goDropZone.addEventListener('dragleave', function (e) { e.preventDefault(); this.classList.remove('dragover'); });
            goDropZone.addEventListener('drop', function (e) {
                e.preventDefault();
                this.classList.remove('dragover');
                if (e.dataTransfer.files.length) goHandleFile(e.dataTransfer.files[0]);
            });

            goProcessBtn.addEventListener('click', function () {
                if (!goRaw) return;
                goProcessBtn.disabled = true;
                goProcessBtn.textContent = '⏳ processing...';
                goProgressWrap.classList.add('active');
                goProgressBar.style.width = '10%';
                goProgressText.textContent = '10%';
                goStatStatus.textContent = 'processing';
                goStatStatus.style.color = '#ffd166';

                setTimeout(function () {
                    try {
                        const targetName = (goTargetInput.value || goFileBaseName).trim();
                        const cabBytes = prepareCabBytes(goCabInput.value);
                        let goResult = { disabled: false, count: 0, candidates: 0, details: [] };
                        let cabResult = { replaced: false, count: 0 };
                        let resultBytes = null;
                        let unityFsNote = '';

                        // Detect UnityFS AssetBundle (compressed)
                        let unpacked = null;
                        try {
                            unpacked = unityFsUnpack(goRaw);
                        } catch (ufsErr) {
                            console.warn('UnityFS unpack:', ufsErr);
                            unpacked = null;
                        }

                        goProgressBar.style.width = '30%';
                        goProgressText.textContent = '30%';

                        if (unpacked) {
                            unityFsNote = 'UnityFS ' + unpacked.uver + ' / ' + unpacked.gver +
                                ' (' + unpacked.rawParts.length + ' blocks decompressed)';
                            const modifiedBlocks = [];
                            for (let bi = 0; bi < unpacked.rawParts.length; bi++) {
                                modifiedBlocks[bi] = false;
                            }

                            // Patch each decompressed block for GameObject + CAB
                            for (let bi = 0; bi < unpacked.rawParts.length; bi++) {
                                const part = unpacked.rawParts[bi];
                                const partGo = disableGameObjectByName(part, targetName);
                                if (partGo.disabled || (partGo.details && partGo.details.length)) {
                                    goResult.disabled = goResult.disabled || partGo.disabled;
                                    goResult.count += partGo.count;
                                    goResult.candidates += partGo.candidates;
                                    if (partGo.details) {
                                        for (let di = 0; di < partGo.details.length; di++) {
                                            goResult.details.push('[block' + bi + '] ' + partGo.details[di]);
                                        }
                                    }
                                    if (partGo.disabled) modifiedBlocks[bi] = true;
                                }
                                if (cabBytes) {
                                    const partCab = replaceCabStrings(part, cabBytes);
                                    if (partCab.replaced) {
                                        cabResult.replaced = true;
                                        cabResult.count += partCab.count;
                                        modifiedBlocks[bi] = true;
                                    }
                                }
                            }

                            goProgressBar.style.width = '70%';
                            goProgressText.textContent = '70%';

                            if (goResult.disabled || cabResult.replaced) {
                                resultBytes = unityFsRepack(unpacked, modifiedBlocks);
                            }
                        } else {
                            // Raw / uncompressed serialized asset
                            const data = new Uint8Array(goRaw);
                            goResult = disableGameObjectByName(data, targetName);
                            if (cabBytes) cabResult = replaceCabStrings(data, cabBytes);
                            if (goResult.disabled || cabResult.replaced || goResult.candidates > 0) {
                                resultBytes = data;
                            }
                        }

                        goProgressBar.style.width = '90%';
                        goProgressText.textContent = '90%';

                        const goOk = goResult.disabled || goResult.candidates > 0;
                        if (!goOk && !cabResult.replaced) {
                            goStatGO.textContent = 'tidak ketemu';
                            goStatCAB.textContent = '0';
                            goStatStatus.textContent = 'gagal';
                            goStatStatus.style.color = '#ff647c';
                            goLog.style.display = 'block';
                            const failLines = [
                                'GameObject "' + targetName + '" maupun String CAB tidak ditemukan.',
                                'Coba isi Nama GameObject Target secara manual.',
                                'Tool juga mencoba varian: tanpa underscore / spasi.'
                            ];
                            if (unityFsNote) failLines.push('[INFO] ' + unityFsNote);
                            if (goResult.details && goResult.details.length) {
                                failLines.push('--- detail scan ---');
                                for (let di = 0; di < goResult.details.length && di < 20; di++) {
                                    failLines.push(goResult.details[di]);
                                }
                            }
                            goLog.textContent = failLines.join('\n');
                            goResultBytes = null;
                            goDownloadBtn.disabled = true;
                            goShowToast('❌ tidak ada yang diubah', 'error');
                        } else {
                            goResultBytes = resultBytes || new Uint8Array(goRaw);
                            if (goResult.disabled) {
                                goStatGO.textContent = 'OFF ×' + goResult.count;
                            } else if (goResult.candidates > 0) {
                                goStatGO.textContent = 'MATCH ×' + goResult.candidates;
                            } else {
                                goStatGO.textContent = 'skip';
                            }
                            goStatCAB.textContent = String(cabResult.count);
                            goStatStatus.textContent = 'siap unduh';
                            goStatStatus.style.color = '#5ee6a8';
                            goDownloadBtn.disabled = false;

                            const lines = [];
                            if (unityFsNote) lines.push('[INFO] ' + unityFsNote);
                            if (goResult.disabled) {
                                lines.push('[INJECT] GameObject m_IsActive → FALSE (' + goResult.count + 'x)');
                            } else if (goResult.candidates > 0) {
                                lines.push('[MATCH] GameObject ditemukan: ' + goResult.candidates + 'x; m_IsActive sudah FALSE / tidak perlu diubah');
                            } else {
                                lines.push('[SKIP] GameObject "' + targetName + '" tidak ditemukan');
                            }
                            if (goResult.details && goResult.details.length) {
                                for (let di = 0; di < goResult.details.length && di < 15; di++) {
                                    lines.push('  · ' + goResult.details[di]);
                                }
                            }
                            if (cabResult.replaced) {
                                lines.push('[CAB PATCH] ' + cabResult.count + ' string CAB diganti');
                            } else if (cabBytes) {
                                lines.push('[SKIP] String CAB tidak ditemukan di file');
                            } else {
                                lines.push('[SKIP] CAB tidak diubah (input kosong)');
                            }
                            lines.push('[OK] File siap diunduh sebagai ' + goFileBaseName + '_modified.unity3d');
                            goLog.style.display = 'block';
                            goLog.textContent = lines.join('\n');
                            goShowToast(goResult.disabled ? '✅ override selesai' : '✅ GameObject sudah nonaktif / match', 'success');
                        }
                    } catch (e) {
                        goStatStatus.textContent = 'error';
                        goStatStatus.style.color = '#ff647c';
                        goLog.style.display = 'block';
                        goLog.textContent = 'ERROR: ' + e.message;
                        goShowToast('❌ gagal process: ' + e.message, 'error');
                    } finally {
                        goProgressBar.style.width = '100%';
                        goProgressText.textContent = '100%';
                        setTimeout(function () {
                            goProgressWrap.classList.remove('active');
                            goProcessBtn.disabled = false;
                            goProcessBtn.textContent = '⚡ process override';
                        }, 400);
                    }
                }, 40);
            });

            goDownloadBtn.addEventListener('click', function () {
                if (!goResultBytes) return;
                try {
                    const blob = new Blob([goResultBytes], { type: 'application/octet-stream' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = safeFileName(goFileBaseName + '_modified.unity3d', 'modified.unity3d');
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    goShowToast('⬇️ ' + goFileBaseName + '_modified.unity3d berhasil diunduh', 'success');
                } catch (e) {
                    goShowToast('❌ gagal download: ' + e.message, 'error');
                }
            });

            goResetBtn.addEventListener('click', function () {
                if (!goRaw && !goResultBytes) return;
                if (!confirm('reset panel GameObject Overrider?')) return;
                goRaw = null;
                goResultBytes = null;
                goFileBaseName = '';
                goOriginalName = '';
                goFileName.textContent = t('go.upload_hint');
                goFileName.classList.remove('has-file');
                goFileSize.textContent = '';
                goCabInput.value = '';
                goTargetInput.value = goFileBaseName || '';
                goStatFile.textContent = '-';
                goStatGO.textContent = '-';
                goStatCAB.textContent = '0';
                goStatStatus.textContent = t('js.ready');
                goStatStatus.style.color = '#8290a0';
                goProcessBtn.disabled = true;
                goDownloadBtn.disabled = true;
                goResetBtn.disabled = true;
                goLog.style.display = 'none';
                goLog.textContent = '';
                goProgressWrap.classList.remove('active');
                goShowToast(t('js.reset_ok'), 'warning');
            });

            goStatStatus.textContent = t('js.wait_upload');
            goStatStatus.style.color = '#8290a0';

        })();
