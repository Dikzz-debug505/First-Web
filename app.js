
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
        if (!file) throw new Error('file tidak dipilih');
        if (file.size > SECURITY.MAX_BYTES_FILE) {
            throw new Error('file terlalu besar (maks. 512 MB)');
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
            // TUTORIAL POPUP
            // ============================================================
            (function initTutorial() {
                const overlay = document.getElementById('tutorialOverlay');
                const closeBtn = document.getElementById('tutorialCloseBtn');
                const dontShow = document.getElementById('tutorialDontShow');
                if (!overlay || !closeBtn) return;

                const STORAGE_KEY = 'mlbb_tutorial_hide';

                function hideTutorial() {
                    if (dontShow && dontShow.checked) {
                        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
                    }
                    overlay.classList.remove('show');
                    setTimeout(() => {
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
                    // slight delay so animation plays after paint
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => overlay.classList.add('show'));
                    });
                } else {
                    overlay.style.display = 'none';
                }
            })();

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
            const heroGlobalToggle = document.getElementById('heroGlobalToggle');
            const heroGlobalOpen = document.getElementById('heroGlobalOpen');
            const heroGlobalClose = document.getElementById('heroGlobalClose');

            let heroBytes = null;
            let heroOrig = null;
            let heroData = [];
            let heroScanning = false;

            function heroShowToast(msg, type) { showToast(msg, type); }

            function heroHandleFile(file) {
                try { validateLocalFile(file, ['.bytes']); } catch (e) { heroShowToast('❌ ' + e.message, 'error'); return; }
                if (!file || !file.name.toLowerCase().endsWith('.bytes')) {
                    heroShowToast('file harus .bytes', 'error');
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
                        heroStatStatus.style.color = '#5a7a6a';
                        heroData = [];
                        heroResult.innerHTML = '';
                        heroStatHero.textContent = '0';
                        heroStatValues.textContent = '0';
                        heroDownloadBtn.disabled = true;
                        heroResetBtn.disabled = true;
                        heroGlobalToggle.style.display = 'none';
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
                heroGlobalToggle.style.display = 'none';
                heroStatStatus.textContent = 'scanning...';
                heroStatStatus.style.color = '#b8a87a';
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
                    heroStatStatus.style.color = '#7a6e64';
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
                        heroStatStatus.style.color = '#5a7a6a';
                        heroScanning = false;
                        heroScanBtn.disabled = false;
                        heroScanBtn.textContent = '🔍 scan semua hero';
                        heroDownloadBtn.disabled = (heroData.length === 0);
                        heroResetBtn.disabled = false;
                        if (heroData.length > 0) {
                            heroGlobalToggle.style.display = 'flex';
                            heroRenderResult(heroData);
                            heroShowToast('✅ scan selesai, ' + heroData.length + ' hero ditemukan', 'success');
                        } else {
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

            function heroRenderResult(heroes) {
                if (!heroes || heroes.length === 0) {
                    heroResult.innerHTML = '<div class="no-data">tidak ada data</div>';
                    return;
                }
                let html = '';
                heroes.forEach((hero, idx) => {
                    const total = hero.values.length;
                    html += `
                            <div class="hero-card">
                                <div class="hero-header">
                                    <span class="hero-name">${escapeHTML(hero.name)}</span>
                                    <span class="badge">${total} nilai</span>
                                    <div class="toggle-group">
                                        <button class="btn btn-toggle btn-sm hero-open-btn" data-target="hbody_${idx}">📖 buka</button>
                                        <button class="btn btn-toggle btn-sm hero-close-btn" data-target="hbody_${idx}">📕 tutup</button>
                                    </div>
                                </div>
                                <div class="hero-body" id="hbody_${idx}">
                        `;
                    if (total === 0) {
                        html += `<div class="no-data">tidak ada nilai</div>`;
                    } else {
                        html += `
                                <table>
                                    <thead><tr><th>offset</th><th>int32</th><th>float32</th><th>raw</th><th>edit int</th><th>edit float</th><th></th></tr></thead>
                                    <tbody>
                            `;
                        hero.values.forEach((v, vi) => {
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
                        html += `</tbody></table>`;
                    }
                    html += `</div></div>`;
                });
                heroResult.innerHTML = html;
            }

            heroResult.addEventListener('click', function(e) {
                const openBtn = e.target.closest('.hero-open-btn');
                if (openBtn) {
                    e.stopPropagation();
                    const body = document.getElementById(openBtn.dataset.target);
                    if (body) body.classList.add('open');
                    return;
                }
                const closeBtn = e.target.closest('.hero-close-btn');
                if (closeBtn) {
                    e.stopPropagation();
                    const body = document.getElementById(closeBtn.dataset.target);
                    if (body) body.classList.remove('open');
                    return;
                }
                const applyBtn = e.target.closest('.hero-apply-btn');
                if (applyBtn) {
                    const heroIdx = parseInt(applyBtn.dataset.hero, 10);
                    const valIdx = parseInt(applyBtn.dataset.val, 10);
                    heroApplyEdit(heroIdx, valIdx);
                }
            });

            heroGlobalOpen.addEventListener('click', function() {
                document.querySelectorAll('#panel-hero .hero-body').forEach(el => el.classList.add('open'));
                heroShowToast('📖 semua hero dibuka', 'info');
            });
            heroGlobalClose.addEventListener('click', function() {
                document.querySelectorAll('#panel-hero .hero-body').forEach(el => el.classList.remove('open'));
                heroShowToast('📕 semua hero ditutup', 'info');
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
                    heroRenderResult(heroData);
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
                heroResult.innerHTML = '';
                heroStatHero.textContent = '0';
                heroStatValues.textContent = '0';
                heroDownloadBtn.disabled = true;
                heroResetBtn.disabled = true;
                heroGlobalToggle.style.display = 'none';
                heroShowToast('↺ reset berhasil, scan ulang', 'warning');
                heroStatStatus.textContent = 'reset';
                heroStatStatus.style.color = '#7a6e64';
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

            heroStatStatus.textContent = 'tunggu upload';
            heroStatStatus.style.color = '#7a6e64';
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
                    if (!docExtracted) missing.push('Document belum diekstrak');
                    if (!docResCheckXML) missing.push('ResCheckConf.xml');
                    if (!docBinaryPatchXML) missing.push('BinaryPatchMD5.xml');
                    docPatchBtn.title = 'Butuh: ' + missing.join(', ');
                }
            }

            function docHandleFile(file) {
                try { validateLocalFile(file, ['.unity3d']); } catch (e) { docShowToast('❌ ' + e.message, 'error'); return; }
                if (!file || !file.name.toLowerCase().endsWith('.unity3d')) {
                    docShowToast('file harus .unity3d', 'error');
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
                        docStatStatus.style.color = '#5a7a6a';
                        docExtractBtn.disabled = false;
                        docEntries = [];
                        docModified = {};
                        docExtracted = false;
                        docFileList.innerHTML = '<div class="no-data" style="padding:12px;">belum ada file, ekstrak dulu</div>';
                        docFileSelect.innerHTML = '<option value="">— pilih file —</option>';
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
                    resCheckStatus.textContent = 'belum diupload';
                    resCheckStatus.style.color = '#7a6e64';
                    docResCheckXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docResCheckXML = new Uint8Array(ev.target.result);
                        resCheckStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        resCheckStatus.style.color = '#5a7a6a';
                        docShowToast('✅ ResCheckConf.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docResCheckXML = null;
                        resCheckStatus.textContent = '❌ gagal baca';
                        resCheckStatus.style.color = '#c48a7a';
                        docShowToast('❌ Gagal baca ResCheckConf.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docResCheckXML = null;
                    resCheckStatus.textContent = '❌ error';
                    resCheckStatus.style.color = '#c48a7a';
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
                    binaryPatchStatus.textContent = 'belum diupload';
                    binaryPatchStatus.style.color = '#7a6e64';
                    docBinaryPatchXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docBinaryPatchXML = new Uint8Array(ev.target.result);
                        binaryPatchStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        binaryPatchStatus.style.color = '#5a7a6a';
                        docShowToast('✅ BinaryPatchMD5.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docBinaryPatchXML = null;
                        binaryPatchStatus.textContent = '❌ gagal baca';
                        binaryPatchStatus.style.color = '#c48a7a';
                        docShowToast('❌ Gagal baca BinaryPatchMD5.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docBinaryPatchXML = null;
                    binaryPatchStatus.textContent = '❌ error';
                    binaryPatchStatus.style.color = '#c48a7a';
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
                        if (data.length < 8) { throw new Error('file terlalu kecil'); }
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
                        docStatStatus.style.color = '#5a7a6a';
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
                let opts = '<option value="">— pilih file —</option>';
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
            function md5FromBytes(data) {
                if (window.crypto && window.crypto.subtle) {
                    return crypto.subtle.digest('MD5', data).then(hash => {
                        const arr = new Uint8Array(hash);
                        return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
                    });
                } else {
                    let hash = 0;
                    for (let i = 0; i < data.length; i++) {
                        hash = ((hash << 5) - hash) + data[i];
                        hash = hash & hash;
                    }
                    return Promise.resolve(hash.toString(16).padStart(32, '0').slice(0, 32));
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
                docFileSelect.innerHTML = '<option value="">— pilih file —</option>';
                docEditArea.style.display = 'none';
                docApplyEditBtn.style.display = 'none';
                docPatchLog.classList.remove('active');
                docPatchLog.textContent = '';
                docStatEntries.textContent = '0';
                docStatFile.textContent = '-';
                docStatStatus.textContent = 'reset';
                docStatStatus.style.color = '#7a6e64';
                docPatchBtn.disabled = true;
                docPackBtn.disabled = true;
                docResetBtn.disabled = true;
                docExportBtn.disabled = true;
                updatePatchButton();
                docShowToast('↺ reset berhasil', 'warning');
            });

            // INIT
            docStatStatus.textContent = 'tunggu upload';
            docStatStatus.style.color = '#7a6e64';
            docShowToast('📦 upload Document.unity3d untuk memulai', 'info');

        })();
