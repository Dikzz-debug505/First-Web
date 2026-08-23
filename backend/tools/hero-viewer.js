(function () {
    "use strict";
    // Hero.bytes Viewer - standalone module

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
                        heroStatStatus.style.color = '#4ade9b';
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
                    heroStatStatus.style.color = '#8b9cb3';
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
                        heroStatStatus.style.color = '#4ade9b';
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
                    // Samakan dengan dump.py: next hero_ atau start+1500
                    const end = (heroIndex + 1 < totalHeroes) ? heroStarts[heroIndex + 1] : Math.min(data.length, start + 1500);

                    let nameEnd = start + pattern.length;
                    while (nameEnd < data.length && (
                            (data[nameEnd] >= 48 && data[nameEnd] <= 57) ||
                            (data[nameEnd] >= 65 && data[nameEnd] <= 90) ||
                            (data[nameEnd] >= 97 && data[nameEnd] <= 122) ||
                            data[nameEnd] === 95
                        )) { nameEnd++; }
                    const heroName = new TextDecoder('utf-8').decode(data.slice(start, nameEnd));

                    // Dump kandidat stat: step 2, Int32 + Float32 LE, rentang 10–3500 (sama dump.py)
                    const values = [];
                    for (let off = start; off < end - 3; off += 2) {
                        const chunk = data.slice(off, off + 4);
                        if (chunk.length !== 4) continue;
                        // Signed Int32 little-endian (struct.unpack '<i')
                        let intVal = chunk[0] | (chunk[1] << 8) | (chunk[2] << 16) | (chunk[3] << 24);
                        if (intVal > 0x7FFFFFFF) intVal -= 0x100000000;
                        // Float32 little-endian (struct.unpack '<f')
                        const floatVal = new DataView(chunk.buffer, chunk.byteOffset).getFloat32(0, true);
                        const isValidInt = (intVal >= MIN_VAL && intVal <= MAX_VAL);
                        const isValidFloat = (floatVal >= MIN_VAL && floatVal <= MAX_VAL && floatVal === floatVal);
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
                heroStatStatus.style.color = '#8b9cb3';
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
            heroStatStatus.style.color = '#8b9cb3';
            heroShowToast('📂 upload Hero.bytes untuk memulai', 'info');


})();
