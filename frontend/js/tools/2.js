(function () {
    "use strict";
    // DocumentExtractor - standalone module

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
                docPackBtn.disabled = !ready;
                if (ready) {
                    docPatchBtn.title = 'Patch siap dijalankan';
                    docPackBtn.title = 'Auto-patch XML lalu download ketiga file';
                } else {
                    const missing = [];
                    if (!docExtracted) missing.push(t('js.not_extracted'));
                    if (!docResCheckXML) missing.push('ResCheckConf.xml');
                    if (!docBinaryPatchXML) missing.push('BinaryPatchMD5.xml');
                    const msg = 'Butuh: ' + missing.join(', ');
                    docPatchBtn.title = msg;
                    docPackBtn.title = msg;
                }
            }

            function downloadBlob(data, filename, mime) {
                const blob = new Blob([data], { type: mime || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);
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
                        docStatStatus.style.color = '#4ade9b';
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

            resCheckInput.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) {
                    resCheckStatus.textContent = t('js.not_uploaded');
                    resCheckStatus.style.color = '#8b9cb3';
                    docResCheckXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docResCheckXML = new Uint8Array(ev.target.result);
                        resCheckStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        resCheckStatus.style.color = '#4ade9b';
                        docShowToast('✅ ResCheckConf.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docResCheckXML = null;
                        resCheckStatus.textContent = '❌ gagal baca';
                        resCheckStatus.style.color = '#f87171';
                        docShowToast('❌ Gagal baca ResCheckConf.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docResCheckXML = null;
                    resCheckStatus.textContent = '❌ error';
                    resCheckStatus.style.color = '#f87171';
                    docShowToast('❌ Error baca ResCheckConf.xml', 'error');
                    updatePatchButton();
                };
                reader.readAsArrayBuffer(file);
                this.value = '';
            });

            binaryPatchInput.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) {
                    binaryPatchStatus.textContent = t('js.not_uploaded');
                    binaryPatchStatus.style.color = '#8b9cb3';
                    docBinaryPatchXML = null;
                    updatePatchButton();
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(ev) {
                    try {
                        docBinaryPatchXML = new Uint8Array(ev.target.result);
                        binaryPatchStatus.textContent = '✅ ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
                        binaryPatchStatus.style.color = '#4ade9b';
                        docShowToast('✅ BinaryPatchMD5.xml dimuat', 'success');
                        updatePatchButton();
                    } catch (err) {
                        docBinaryPatchXML = null;
                        binaryPatchStatus.textContent = '❌ gagal baca';
                        binaryPatchStatus.style.color = '#f87171';
                        docShowToast('❌ Gagal baca BinaryPatchMD5.xml', 'error');
                        updatePatchButton();
                    }
                };
                reader.onerror = function() {
                    docBinaryPatchXML = null;
                    binaryPatchStatus.textContent = '❌ error';
                    binaryPatchStatus.style.color = '#f87171';
                    docShowToast('❌ Error baca BinaryPatchMD5.xml', 'error');
                    updatePatchButton();
                };
                reader.readAsArrayBuffer(file);
                this.value = '';
            });

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
                        docStatStatus.style.color = '#4ade9b';
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
                updatePatchButton();
                docRenderFileList();
            });

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
                    updatePatchButton();
                    docRenderFileList();
                };
                reader.readAsArrayBuffer(this.files[0]);
                this.value = '';
            });

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

            docPackBtn.addEventListener('click', async function() {
                if (!docExtracted || docEntries.length === 0) {
                    docShowToast('⚠️ belum ada data Document.unity3d', 'warning');
                    return;
                }
                if (!docResCheckXML || !docBinaryPatchXML) {
                    const missing = [];
                    if (!docResCheckXML) missing.push('ResCheckConf.xml');
                    if (!docBinaryPatchXML) missing.push('BinaryPatchMD5.xml');
                    docShowToast('⚠️ Upload lengkap dulu: ' + missing.join(', '), 'warning');
                    return;
                }

                const log = docPatchLog;
                log.classList.add('active');
                log.textContent = '⏳ Auto-patch + pack...\n';
                docPackBtn.disabled = true;

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
                    else log.textContent += `  ⚠️ BinaryPatchMD5: Document.unity3d target tidak ditemukan\n`;
                    if (bp2.patched) log.textContent += `  ✅ BinaryPatchMD5: ResCheckConf.xml patched\n`;
                    else log.textContent += `  ⚠️ BinaryPatchMD5: ResCheckConf.xml target tidak ditemukan\n`;

                    docBinaryPatchXML = bp2.data;

                    log.textContent += `\n✅ PATCH SELESAI — mengunduh 3 file...\n`;

                    downloadBlob(packed, 'Document_modified.unity3d', 'application/octet-stream');
                    await new Promise(r => setTimeout(r, 400));
                    downloadBlob(docResCheckXML, 'ResCheckConf_patched.xml', 'application/xml');
                    await new Promise(r => setTimeout(r, 400));
                    downloadBlob(docBinaryPatchXML, 'BinaryPatchMD5_patched.xml', 'application/xml');

                    log.textContent += `  ⬇️ Document_modified.unity3d\n  ⬇️ ResCheckConf_patched.xml\n  ⬇️ BinaryPatchMD5_patched.xml\n`;
                    docShowToast('⬇️ 3 file berhasil diunduh (Document + 2 XML patched)', 'success');
                } catch (e) {
                    log.textContent += `\n❌ ERROR: ${e.message}`;
                    docShowToast('❌ Gagal pack/patch: ' + e.message, 'error');
                } finally {
                    updatePatchButton();
                }
            });

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
                docStatStatus.style.color = '#8b9cb3';
                docPatchBtn.disabled = true;
                docPackBtn.disabled = true;
                docResetBtn.disabled = true;
                docExportBtn.disabled = true;
                updatePatchButton();
                docShowToast(t('js.reset_ok'), 'warning');
            });

            docStatStatus.textContent = t('js.wait_upload');
            docStatStatus.style.color = '#8b9cb3';
            docShowToast('📦 upload Document.unity3d untuk memulai', 'info');

})();
