(function () {
    "use strict";
    // Python Encrypted — client-side port of enc.py pipeline
    // (AES-256-CBC + multi-layer XOR/ROL + zlib-style deflate via CompressionStream)

    const pyFileInput = document.getElementById('pyFileInput');
    const pyDropZone = document.getElementById('pyDropZone');
    const pyFileName = document.getElementById('pyFileName');
    const pyFileSize = document.getElementById('pyFileSize');
    const pyLayers = document.getElementById('pyLayers');
    const pyEncryptBtn = document.getElementById('pyEncryptBtn');
    const pyResetBtn = document.getElementById('pyResetBtn');
    const pyProgressWrap = document.getElementById('pyProgressWrap');
    const pyProgressBar = document.getElementById('pyProgressBar');
    const pyProgressText = document.getElementById('pyProgressText');
    const pyStatFile = document.getElementById('pyStatFile');
    const pyStatSize = document.getElementById('pyStatSize');
    const pyStatLayers = document.getElementById('pyStatLayers');
    const pyStatStatus = document.getElementById('pyStatStatus');
    const pyResult = document.getElementById('pyResult');

    let pySource = null;
    let pyOrigName = '';
    let pyBusy = false;

    function t(key, vars) {
        if (window.MLBB_i18n && typeof MLBB_i18n.t === 'function') return MLBB_i18n.t(key, vars);
        return key;
    }
    function pyToast(msg, type) {
        if (typeof showToast === 'function') showToast(msg, type);
    }
    function setProgress(pct, label) {
        if (pyProgressWrap) pyProgressWrap.style.display = '';
        if (pyProgressBar) pyProgressBar.style.width = Math.max(0, Math.min(100, pct)) + '%';
        if (pyProgressText) pyProgressText.textContent = (label || '') + ' ' + Math.round(pct) + '%';
    }
    function hideProgress() {
        if (pyProgressWrap) pyProgressWrap.style.display = 'none';
    }
    function fmtSize(n) {
        if (n < 1024) return n + ' B';
        if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
        return (n / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function randBytes(n) {
        const a = new Uint8Array(n);
        crypto.getRandomValues(a);
        return a;
    }
    function randInt(min, max) {
        const r = new Uint32Array(1);
        crypto.getRandomValues(r);
        return min + (r[0] % (max - min + 1));
    }

    /** CJK-ish name for obfuscation (U+4E00..U+9FA5 range sample) */
    function cjkName(len) {
        let s = '';
        for (let i = 0; i < len; i++) s += String.fromCharCode(0x4e00 + randInt(0, 0x9fa5 - 0x4e00));
        return s;
    }

    function rolByte(b, shift) {
        shift &= 7;
        return ((b << shift) | (b >>> (8 - shift))) & 0xff;
    }
    function rorByte(b, shift) {
        shift &= 7;
        return ((b >>> shift) | (b << (8 - shift))) & 0xff;
    }

    async function deflateRaw(u8) {
        if (typeof CompressionStream !== 'undefined') {
            try {
                const cs = new CompressionStream('deflate');
                const writer = cs.writable.getWriter();
                writer.write(u8);
                writer.close();
                const reader = cs.readable.getReader();
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                let total = 0;
                chunks.forEach(function (c) { total += c.length; });
                const out = new Uint8Array(total);
                let off = 0;
                chunks.forEach(function (c) { out.set(c, off); off += c.length; });
                return out;
            } catch (e) { /* fall through */ }
        }
        // Fallback: no compression
        return u8;
    }

    async function aesEncryptCbc(keyU8, ivU8, plainU8) {
        const key = await crypto.subtle.importKey('raw', keyU8, { name: 'AES-CBC' }, false, ['encrypt']);
        // Web Crypto expects PKCS7 padding automatically for AES-CBC
        const ct = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: ivU8 }, key, plainU8);
        return new Uint8Array(ct);
    }

    function xorBytes(a, b) {
        const n = Math.min(a.length, b.length);
        const out = new Uint8Array(n);
        for (let i = 0; i < n; i++) out[i] = a[i] ^ b[i];
        return out;
    }

    function toPyBytesList(u8) {
        // Compact list for embedding in generated .py
        const parts = [];
        for (let i = 0; i < u8.length; i++) parts.push(String(u8[i]));
        return '[' + parts.join(',') + ']';
    }

    async function sha256Hex(u8) {
        const dig = await crypto.subtle.digest('SHA-256', u8);
        return Array.from(new Uint8Array(dig)).map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    async function buildEncryptedPy(sourceText, layers) {
        const encoder = new TextEncoder();
        const raw = encoder.encode(sourceText);
        const integrity = await sha256Hex(raw);

        setProgress(10, 'compress');
        let data = await deflateRaw(raw);
        const usedDeflate = data.length !== raw.length || layers > 0;

        setProgress(25, 'layers');
        const flatLayers = [];
        for (let i = 0; i < layers; i++) {
            const xorKey = randInt(15, 250);
            const shift = randInt(1, 7);
            flatLayers.push(xorKey, shift);
            const rolled = new Uint8Array(data.length);
            for (let j = 0; j < data.length; j++) rolled[j] = rolByte(data[j], shift);
            const xored = new Uint8Array(data.length);
            for (let j = 0; j < data.length; j++) xored[j] = rolled[j] ^ xorKey;
            data = xored;
        }

        setProgress(50, 'AES-256');
        const masterKey = randBytes(32);
        const aesIv = randBytes(16);
        const encrypted = await aesEncryptCbc(masterKey, aesIv, data);

        const maskKey = randBytes(32);
        const maskIv = randBytes(16);
        const maskedKey = xorBytes(masterKey, maskKey);
        const maskedIv = xorBytes(aesIv, maskIv);

        const chunk = Math.floor(encrypted.length / 4);
        const p1 = encrypted.subarray(0, chunk);
        const p2 = encrypted.subarray(chunk, chunk * 2);
        const p3 = encrypted.subarray(chunk * 2, chunk * 3);
        const p4 = encrypted.subarray(chunk * 3);

        const cjkRunner = cjkName(6);
        const cjkD1 = cjkName(7), cjkD2 = cjkName(7), cjkD3 = cjkName(7), cjkD4 = cjkName(7);
        const metaName = cjkName(5);
        const className = cjkName(5);
        const loopK = cjkName(4), loopS = cjkName(4), storeVar = cjkName(5);
        const hash1 = integrity.slice(0, Math.floor(integrity.length / 2));
        const hash2 = integrity.slice(Math.floor(integrity.length / 2));

        // Loader uses zlib.decompress for deflate-wrapped data when CompressionStream used.
        // CompressionStream('deflate') produces zlib-wrapped deflate in Chromium/Firefox.
        // Fallback path: if lengths equal and we still layered, data is still processed.

        setProgress(75, 'template');
        const template = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ABSOLUTE WATERPROOF ENCRYPTION — MLBB Unity Tools / Python Encrypted
# Requires: pip install pycryptodome

import sys, zlib, hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad

def _anti_debug():
    if sys.gettrace() is not None:
        sys.exit(1)

class ${metaName}(type):
    def __init__(cls, name, bases, attrs):
        super().__init__(name, bases, attrs)

class ${className}(metaclass=${metaName}):
    @staticmethod
    def _xor(d, m):
        return bytes(a ^ b for a, b in zip(d, m))

    @staticmethod
    def _layers():
        flat = ${JSON.stringify(flatLayers)}
        return [(flat[i], flat[i + 1]) for i in range(0, len(flat), 2)]

${cjkD1} = bytes(${toPyBytesList(p1)})
${cjkD2} = bytes(${toPyBytesList(p2)})
${cjkD3} = bytes(${toPyBytesList(p3)})
${cjkD4} = bytes(${toPyBytesList(p4)})

def ${cjkRunner}():
    _anti_debug()
    try:
        raw_enc = ${cjkD1} + ${cjkD2} + ${cjkD3} + ${cjkD4}
    except Exception:
        sys.exit(1)

    real_key = ${className}._xor(bytes(${toPyBytesList(maskedKey)}), bytes(${toPyBytesList(maskKey)}))
    real_iv = ${className}._xor(bytes(${toPyBytesList(maskedIv)}), bytes(${toPyBytesList(maskIv)}))

    try:
        dec = AES.new(real_key, AES.MODE_CBC, real_iv).decrypt(raw_enc)
        ${storeVar} = unpad(dec, AES.block_size)
    except Exception:
        sys.exit(1)

    for ${loopK}, ${loopS} in reversed(${className}._layers()):
        ${storeVar} = bytes(b ^ ${loopK} for b in ${storeVar})
        ${storeVar} = bytes(((b >> ${loopS}) | ((b << (8 - ${loopS})) & 0xFF)) & 0xFF for b in ${storeVar})

    try:
        _src = zlib.decompress(${storeVar})
    except Exception:
        _src = ${storeVar}

    _hp = [${JSON.stringify(hash1)}, ${JSON.stringify(hash2)}]
    if hashlib.sha256(_src).hexdigest() != "".join(_hp):
        sys.exit(1)

    return _src.decode("utf-8")

if __name__ == "__main__":
    try:
        _code = ${cjkRunner}()
        if _code:
            exec(compile(_code, "<encrypted>", "exec"), globals())
    except Exception:
        sys.exit(1)
`;

        setProgress(95, 'done');
        return {
            text: template,
            layers: layers,
            inSize: raw.length,
            outSize: template.length,
            integrity: integrity,
            usedDeflate: usedDeflate
        };
    }

    function pyHandleFile(file) {
        if (!file) return;
        const name = (file.name || '').toLowerCase();
        if (!name.endsWith('.py')) {
            pyToast('❌ File harus .py', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            pyToast('❌ Maksimal 2 MB', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function (ev) {
            try {
                pySource = String(ev.target.result || '');
                pyOrigName = file.name;
                if (pyFileName) pyFileName.textContent = '📄 ' + file.name;
                if (pyFileSize) pyFileSize.textContent = fmtSize(file.size);
                if (pyStatFile) pyStatFile.textContent = file.name;
                if (pyStatSize) pyStatSize.textContent = fmtSize(file.size);
                if (pyStatStatus) {
                    pyStatStatus.textContent = 'ready';
                    pyStatStatus.style.color = '#34d399';
                }
                if (pyEncryptBtn) pyEncryptBtn.disabled = false;
                if (pyResetBtn) pyResetBtn.disabled = false;
                if (pyResult) pyResult.textContent = '';
                pyToast('📂 File siap dienkripsi', 'info');
            } catch (e) {
                pyToast('❌ Gagal baca file: ' + e.message, 'error');
            }
        };
        reader.onerror = function () {
            pyToast('❌ Gagal membaca file', 'error');
        };
        reader.readAsText(file, 'utf-8');
    }

    function pyReset() {
        pySource = null;
        pyOrigName = '';
        pyBusy = false;
        if (pyFileInput) pyFileInput.value = '';
        if (pyFileName) pyFileName.textContent = t('py.upload_hint') || 'upload 1 file .py ke sini';
        if (pyFileSize) pyFileSize.textContent = '';
        if (pyStatFile) pyStatFile.textContent = '—';
        if (pyStatSize) pyStatSize.textContent = '—';
        if (pyStatLayers) pyStatLayers.textContent = '—';
        if (pyStatStatus) {
            pyStatStatus.textContent = '—';
            pyStatStatus.style.color = '';
        }
        if (pyEncryptBtn) pyEncryptBtn.disabled = true;
        if (pyResetBtn) pyResetBtn.disabled = true;
        if (pyResult) pyResult.textContent = '';
        hideProgress();
    }

    async function pyDoEncrypt() {
        if (!pySource || pyBusy) return;
        let layers = parseInt(pyLayers && pyLayers.value, 10);
        if (isNaN(layers) || layers < 1) layers = 16;
        if (layers > 99) layers = 99;

        pyBusy = true;
        if (pyEncryptBtn) {
            pyEncryptBtn.disabled = true;
            pyEncryptBtn.textContent = '⏳ encrypting...';
        }
        if (pyStatStatus) {
            pyStatStatus.textContent = 'encrypting...';
            pyStatStatus.style.color = '#ffd166';
        }
        if (pyStatLayers) pyStatLayers.textContent = String(layers);
        setProgress(5, 'start');

        try {
            const result = await buildEncryptedPy(pySource, layers);
            const outName = (pyOrigName || 'script.py').replace(/\.py$/i, '') + '_encrypted.py';
            const blob = new Blob([result.text], { type: 'text/x-python;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = outName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setProgress(100, 'done');
            if (pyStatStatus) {
                pyStatStatus.textContent = 'encrypted';
                pyStatStatus.style.color = '#34d399';
            }
            if (pyStatSize) pyStatSize.textContent = fmtSize(result.inSize) + ' → ' + fmtSize(result.outSize);
            if (pyResult) {
                pyResult.innerHTML =
                    '✅ <strong>' + outName + '</strong> siap dijalankan dengan Python 3 + <code>pycryptodome</code>.<br>' +
                    'SHA-256 source: <code style="font-size:11px;">' + result.integrity.slice(0, 16) + '…</code> · layers: ' + result.layers;
            }
            pyToast('⬇️ ' + outName + ' diunduh', 'success');
        } catch (e) {
            if (pyStatStatus) {
                pyStatStatus.textContent = 'error';
                pyStatStatus.style.color = '#ff6b7a';
            }
            pyToast('❌ Encrypt gagal: ' + (e && e.message ? e.message : e), 'error');
        } finally {
            pyBusy = false;
            if (pyEncryptBtn) {
                pyEncryptBtn.disabled = !pySource;
                pyEncryptBtn.textContent = t('py.encrypt') || '🔐 encrypt & download';
            }
            setTimeout(hideProgress, 800);
        }
    }

    if (pyFileInput) {
        pyFileInput.addEventListener('change', function () {
            if (pyFileInput.files && pyFileInput.files[0]) pyHandleFile(pyFileInput.files[0]);
        });
    }
    if (pyDropZone) {
        pyDropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            pyDropZone.classList.add('dragover');
        });
        pyDropZone.addEventListener('dragleave', function (e) {
            e.preventDefault();
            pyDropZone.classList.remove('dragover');
        });
        pyDropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            pyDropZone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) pyHandleFile(e.dataTransfer.files[0]);
        });
    }
    if (pyEncryptBtn) pyEncryptBtn.addEventListener('click', function () { pyDoEncrypt(); });
    if (pyResetBtn) pyResetBtn.addEventListener('click', function () {
        pyReset();
        pyToast('↺ reset', 'warning');
    });

    if (pyStatStatus) {
        pyStatStatus.textContent = t('js.wait_upload') || 'menunggu upload';
        pyStatStatus.style.color = '#8b9cb3';
    }
    pyToast('🔐 Upload .py untuk enkripsi', 'info');
})();
