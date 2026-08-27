(function () {
    "use strict";
    // GameObject Overrider - standalone module

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
                if (flags & 0x200) {
                    if (off % 16) off += 16 - (off % 16);
                } else if (off % 16) {
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

                let newFlags = (unpacked.flags & ~0x3f) | 0; // no compression on blocksInfo

                const biRaw = unpacked.blocksInfo;
                const biC = biRaw; // uncompressed

                const enc = new TextEncoder();
                const magic = enc.encode('UnityFS\0');
                const uverB = enc.encode(unpacked.uver + '\0');
                const gverB = enc.encode(unpacked.gver + '\0');

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

            const GO_ACTIVE_OFFSETS = [2, 20, 18, 22, 16, 24, 12, 28, 8, 4, 3];

            function tryPatchGameObjectAt(data, after, namePos) {
                const layer = (namePos >= 4) ? readI32LE(data, namePos - 4) : null;
                const layerOk = layer !== null && layer >= 0 && layer <= 31;

                for (let oi = 0; oi < GO_ACTIVE_OFFSETS.length; oi++) {
                    const off = GO_ACTIVE_OFFSETS[oi];
                    const activePos = after + off;
                    if (activePos >= data.length) continue;

                    const active = data[activePos];
                    if (active !== 0 && active !== 1) continue;

                    if (off === 2 || off === 3 || off === 4) {
                        const tag16 = readU16LE(data, after);
                        if (tag16 !== null && tag16 <= 10000 && layerOk) {
                            return { activePos: activePos, active: active, layout: 'tag16-short@' + off };
                        }
                        continue;
                    }

                    if (off === 20 || off === 16 || off === 24 || off === 28) {
                        const tag = readI32LE(data, after);
                        const nav = readI32LE(data, after + 12);
                        if (tag !== null && tag >= 0 && tag <= 65535 &&
                            nav !== null && nav >= -1 && nav <= 256) {
                            return { activePos: activePos, active: active, layout: 'tag32@' + off };
                        }
                    }

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
                        if (!hit) {
                            const forceOffs = [2, 20, 18, 4];
                            for (let fi = 0; fi < forceOffs.length; fi++) {
                                const fOff = forceOffs[fi];
                                const fPos = after + fOff;
                                if (fPos < data.length && (data[fPos] === 0 || data[fPos] === 1)) {
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
             * CAB replacement — same logic as cab.py:
             *   pattern CAB-[^\x00\r\n\s]{1,32}
             *   pad old match + new CAB to 36 bytes with \x00
             *   binary replace (UTF-8 safe, supports © etc.)
             */
            function replaceCabStrings(data, newCabBytes) {
                if (!newCabBytes || newCabBytes.length !== TARGET_CAB_LEN) {
                    return { replaced: false, count: 0, found: 0 };
                }

                // Collect unique CAB matches (bytes after "CAB-" until \0 / \r / \n / space, max 32)
                const unique = [];
                const seen = Object.create(null);
                for (let i = 0; i + 4 < data.length; i++) {
                    if (data[i] !== 0x43 || data[i + 1] !== 0x41 ||
                        data[i + 2] !== 0x42 || data[i + 3] !== 0x2D) continue;
                    let end = i + 4;
                    const maxEnd = Math.min(data.length, i + 4 + 32);
                    while (end < maxEnd) {
                        const b = data[end];
                        if (b === 0x00 || b === 0x0A || b === 0x0D || b === 0x20) break;
                        end++;
                    }
                    if (end === i + 4) continue;
                    const key = Array.prototype.join.call(data.subarray(i, end), ',');
                    if (seen[key]) continue;
                    seen[key] = true;
                    unique.push(data.slice(i, end));
                }

                if (!unique.length) {
                    return { replaced: false, count: 0, found: 0 };
                }

                let count = 0;
                for (let u = 0; u < unique.length; u++) {
                    const oldCab = unique[u];
                    // search_target = old_cab padded to 36 with \x00 (like cab.py)
                    const searchTarget = new Uint8Array(TARGET_CAB_LEN);
                    if (oldCab.length < TARGET_CAB_LEN) {
                        searchTarget.set(oldCab, 0);
                        // rest already 0
                    } else {
                        searchTarget.set(oldCab.subarray(0, TARGET_CAB_LEN), 0);
                    }

                    // Binary replace all occurrences of searchTarget with newCabBytes
                    const tLen = TARGET_CAB_LEN;
                    for (let i = 0; i <= data.length - tLen; i++) {
                        let match = true;
                        for (let j = 0; j < tLen; j++) {
                            if (data[i + j] !== searchTarget[j]) { match = false; break; }
                        }
                        if (!match) continue;
                        data.set(newCabBytes, i);
                        count++;
                        i += tLen - 1;
                    }
                }

                return { replaced: count > 0, count, found: unique.length };
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
                        goStatStatus.style.color = '#4ade9b';
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
                            goStatStatus.style.color = '#f87171';
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
                            goStatStatus.style.color = '#4ade9b';
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
                        goStatStatus.style.color = '#f87171';
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
                goStatStatus.style.color = '#8b9cb3';
                goProcessBtn.disabled = true;
                goDownloadBtn.disabled = true;
                goResetBtn.disabled = true;
                goLog.style.display = 'none';
                goLog.textContent = '';
                goProgressWrap.classList.remove('active');
                goShowToast(t('js.reset_ok'), 'warning');
            });

            goStatStatus.textContent = t('js.wait_upload');
            goStatStatus.style.color = '#8b9cb3';

})();
