(function () {
    "use strict";
    // Patch File (XXH) - standalone module. Logic mirrors xxh.py (XXH64 + 6-digit LE + MD5).
    // Does not touch any other tool logic or global UI.

    const xxhFileInput = document.getElementById('xxhFileInput');
    const xxhDropZone = document.getElementById('xxhDropZone');
    const xxhFileName = document.getElementById('xxhFileName');
    const xxhFileSize = document.getElementById('xxhFileSize');
    const xxhStatFile = document.getElementById('xxhStatFile');
    const xxhStatSize = document.getElementById('xxhStatSize');
    const xxhStat16 = document.getElementById('xxhStat16');
    const xxhStat6 = document.getElementById('xxhStat6');
    const xxhStatMD5 = document.getElementById('xxhStatMD5');
    const xxhResetBtn = document.getElementById('xxhResetBtn');

    if (!xxhFileInput || !xxhDropZone) return;

    /** Pure-JS MD5 (RFC 1321) — same approach as other tools; SubtleCrypto has no MD5. */
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
        let msg = data instanceof Uint8Array ? data : new Uint8Array(data);
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
                M[j] = (padded[o]) | (padded[o + 1] << 8) | (padded[o + 2] << 16) | (padded[o + 3] << 24);
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

    /** XXH64 (seed 0) — matches system xxhsum / xxh.py get_xxhash_from_file */
    function xxh64Hex(data) {
        const PRIME64_1 = 0x9E3779B185EBCA87n;
        const PRIME64_2 = 0xC2B2AE3D27D4EB4Fn;
        const PRIME64_3 = 0x165667B19E3779F9n;
        const PRIME64_4 = 0x85EBCA77C2B2AE63n;
        const PRIME64_5 = 0x27D4EB2F165667C5n;
        const MASK = 0xFFFFFFFFFFFFFFFFn;
        const seed = 0n;

        function rotl64(x, r) {
            x &= MASK;
            return ((x << BigInt(r)) | (x >> BigInt(64 - r))) & MASK;
        }
        function readU64(buf, off) {
            let n = 0n;
            for (let i = 7; i >= 0; i--) n = (n << 8n) | BigInt(buf[off + i]);
            return n;
        }
        function readU32(buf, off) {
            return BigInt(buf[off]) | (BigInt(buf[off + 1]) << 8n) | (BigInt(buf[off + 2]) << 16n) | (BigInt(buf[off + 3]) << 24n);
        }

        const len = data.length;
        let h64;
        let i = 0;

        if (len >= 32) {
            let v1 = (seed + PRIME64_1 + PRIME64_2) & MASK;
            let v2 = (seed + PRIME64_2) & MASK;
            let v3 = seed & MASK;
            let v4 = (seed - PRIME64_1) & MASK;
            const limit = len - 32;
            do {
                v1 = (rotl64((v1 + (readU64(data, i) * PRIME64_2) & MASK) & MASK, 31) * PRIME64_1) & MASK;
                i += 8;
                v2 = (rotl64((v2 + (readU64(data, i) * PRIME64_2) & MASK) & MASK, 31) * PRIME64_1) & MASK;
                i += 8;
                v3 = (rotl64((v3 + (readU64(data, i) * PRIME64_2) & MASK) & MASK, 31) * PRIME64_1) & MASK;
                i += 8;
                v4 = (rotl64((v4 + (readU64(data, i) * PRIME64_2) & MASK) & MASK, 31) * PRIME64_1) & MASK;
                i += 8;
            } while (i <= limit);
            h64 = (rotl64(v1, 1) + rotl64(v2, 7) + rotl64(v3, 12) + rotl64(v4, 18)) & MASK;
            const round = (acc, lane) => {
                lane = (rotl64((lane * PRIME64_2) & MASK, 31) * PRIME64_1) & MASK;
                acc = (acc ^ lane) & MASK;
                return ((acc * PRIME64_1) + PRIME64_4) & MASK;
            };
            h64 = round(h64, v1);
            h64 = round(h64, v2);
            h64 = round(h64, v3);
            h64 = round(h64, v4);
        } else {
            h64 = (seed + PRIME64_5) & MASK;
        }

        h64 = (h64 + BigInt(len)) & MASK;

        while (i + 8 <= len) {
            let k1 = readU64(data, i);
            k1 = (rotl64((k1 * PRIME64_2) & MASK, 31) * PRIME64_1) & MASK;
            h64 = (rotl64((h64 ^ k1) & MASK, 27) * PRIME64_1 + PRIME64_4) & MASK;
            i += 8;
        }
        if (i + 4 <= len) {
            h64 = (rotl64((h64 ^ ((readU32(data, i) * PRIME64_1) & MASK)) & MASK, 23) * PRIME64_2 + PRIME64_3) & MASK;
            i += 4;
        }
        while (i < len) {
            h64 = (rotl64((h64 ^ ((BigInt(data[i]) * PRIME64_5) & MASK)) & MASK, 11) * PRIME64_1) & MASK;
            i++;
        }

        h64 = (h64 ^ (h64 >> 33n)) & MASK;
        h64 = (h64 * PRIME64_2) & MASK;
        h64 = (h64 ^ (h64 >> 29n)) & MASK;
        h64 = (h64 * PRIME64_3) & MASK;
        h64 = (h64 ^ (h64 >> 32n)) & MASK;
        return h64.toString(16).padStart(16, '0');
    }

    /** convert_16_to_6digit from xxh.py: last 6 hex → reverse byte pairs (LE 3-byte) */
    function convert16To6Digit(xxhHash) {
        const clean = String(xxhHash).trim().toLowerCase();
        if (clean.length < 6) return 'Hash tidak valid';
        const last6 = clean.slice(-6);
        const pairs = [last6.slice(0, 2), last6.slice(2, 4), last6.slice(4, 6)];
        return pairs.reverse().join('');
    }

    function formatSize(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function resetUI() {
        xxhFileInput.value = '';
        xxhFileName.textContent = 'upload file ke sini, atau pilih secara manual';
        xxhFileSize.textContent = '';
        xxhStatFile.textContent = '—';
        if (xxhStatSize) xxhStatSize.textContent = '—';
        xxhStat16.textContent = '—';
        xxhStat6.textContent = '—';
        xxhStatMD5.textContent = '—';
        xxhResetBtn.disabled = true;
    }

    function processFile(file) {
        if (!file) return;
        xxhFileName.textContent = file.name;
        xxhFileSize.textContent = formatSize(file.size);
        xxhStatFile.textContent = file.name;
        if (xxhStatSize) xxhStatSize.textContent = String(file.size);
        xxhStat16.textContent = 'menghitung...';
        xxhStat6.textContent = '…';
        xxhStatMD5.textContent = 'menghitung...';
        xxhResetBtn.disabled = false;

        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                const bytes = new Uint8Array(ev.target.result);
                const hash16 = xxh64Hex(bytes);
                const hash6 = convert16To6Digit(hash16);
                const md5 = md5ToHex(bytes);
                if (xxhStatSize) xxhStatSize.textContent = String(bytes.length);
                xxhStat16.textContent = hash16;
                xxhStat6.textContent = hash6;
                xxhStatMD5.textContent = md5;
            } catch (e) {
                xxhStat16.textContent = 'error';
                xxhStat6.textContent = 'error';
                xxhStatMD5.textContent = 'error';
                console.error('xxh tool', e);
            }
        };
        reader.onerror = function () {
            xxhStat16.textContent = 'gagal baca';
            xxhStat6.textContent = '—';
            xxhStatMD5.textContent = 'gagal baca';
        };
        reader.readAsArrayBuffer(file);
    }

    xxhFileInput.addEventListener('change', function () {
        const f = xxhFileInput.files && xxhFileInput.files[0];
        if (f) processFile(f);
    });

    xxhDropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        xxhDropZone.classList.add('drag-over');
    });
    xxhDropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        xxhDropZone.classList.remove('drag-over');
    });
    xxhDropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        xxhDropZone.classList.remove('drag-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) {
            try {
                const dt = new DataTransfer();
                dt.items.add(f);
                xxhFileInput.files = dt.files;
            } catch (_) {}
            processFile(f);
        }
    });

    xxhResetBtn.addEventListener('click', resetUI);
})();
