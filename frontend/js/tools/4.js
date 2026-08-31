(function () {
    "use strict";
    // Encryption panel — Enc Py / Enc Shell / Obfus Javascript (client-side)

    const pyFileInput = document.getElementById('pyFileInput');
    const pyDropZone = document.getElementById('pyDropZone');
    const pyFileName = document.getElementById('pyFileName');
    const pyFileSize = document.getElementById('pyFileSize');
    const pyLayers = document.getElementById('pyLayers');
    const pyLayersBox = document.getElementById('pyLayersBox');
    const pyShellWmBox = document.getElementById('pyShellWmBox');
    const pyShellAuthor = document.getElementById('pyShellAuthor');
    const pyShellTelegram = document.getElementById('pyShellTelegram');
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
    const pyEncType = document.getElementById('pyEncType');
    const pyDescText = document.getElementById('pyDescText');
    const pyPickLabel = document.getElementById('pyPickLabel');

    let pySource = null;
    let pyOrigName = '';
    let pyBusy = false;

    const MODE_META = {
        py: {
            accept: '.py,text/x-python,text/plain',
            ext: ['.py'],
            pick: 'Choose .py file',
            hint: 'Drop one .py file here',
            desc: 'Wrap a <strong>.py</strong> file using the <code>en.py</code>-style multi-layer pipeline (XOR + zlib + Unicode). Processing stays in the browser — files are not uploaded.',
            showLayers: true,
            showShellWm: false,
            maxSize: 2 * 1024 * 1024
        },
        shell: {
            accept: '.sh,text/x-shellscript,text/plain',
            ext: ['.sh', '.bash'],
            pick: 'Choose .sh file',
            hint: 'Drop one .sh file here',
            desc: 'Obfuscate a <strong>.sh</strong> file using randomized variables and eval concatenation. Processing stays in the browser — files are not uploaded.',
            showLayers: false,
            showShellWm: true,
            maxSize: 2 * 1024 * 1024
        },
        js: {
            accept: '.js,.mjs,.cjs,text/javascript,application/javascript,text/plain',
            ext: ['.js', '.mjs', '.cjs'],
            pick: 'Choose .js file',
            hint: 'Drop one .js file here',
            desc: 'Obfuscate / minify a <strong>.js</strong> file with string extraction, identifier mangling, and light control-flow changes. Processing stays in the browser — files are not uploaded.',
            showLayers: false,
            showShellWm: false,
            maxSize: 3 * 1024 * 1024
        }
    };

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
    function currentMode() {
        return (pyEncType && pyEncType.value) || 'py';
    }

    function applyModeUI() {
        const mode = currentMode();
        const meta = MODE_META[mode] || MODE_META.py;
        if (pyFileInput) pyFileInput.accept = meta.accept;
        if (pyPickLabel) pyPickLabel.textContent = meta.pick;
        if (pyDescText) pyDescText.innerHTML = meta.desc;
        if (pyLayersBox) pyLayersBox.style.display = meta.showLayers ? '' : 'none';
        if (pyShellWmBox) pyShellWmBox.style.display = meta.showShellWm ? '' : 'none';
        if (!pySource) {
            if (pyFileName) pyFileName.textContent = meta.hint;
        }
        // reset file when switching type so wrong extension isn't kept
        pyReset(true);
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
        return u8;
    }

    async function aesEncryptCbc(keyU8, ivU8, plainU8) {
        const key = await crypto.subtle.importKey('raw', keyU8, { name: 'AES-CBC' }, false, ['encrypt']);
        // Web Crypto applies PKCS7 padding automatically for AES-CBC
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
        const parts = [];
        for (let i = 0; i < u8.length; i++) parts.push(u8[i]);
        return '[' + parts.join(',') + ']';
    }

    async function sha256Hex(u8) {
        const dig = await crypto.subtle.digest('SHA-256', u8);
        return Array.from(new Uint8Array(dig)).map(function (b) {
            return b.toString(16).padStart(2, '0');
        }).join('');
    }

    // ── Enc Py (existing pipeline) ──────────────────────────────────────────
    // ── Enc Py (en.py-style Chinese multi-layer pipeline) ────────────────
    // Browser-compatible port of en.py's layer structure:
    // source -> zlib -> XOR -> Chinese Unicode, repeated 2..10 times.
    // The reference en.py uses Python marshal before each layer; because this
    // tool runs entirely in the browser, the same wrapping/decryption
    // structure is retained while carrying UTF-8 Python source between layers.
    function randomChinese(length) {
        let s = '';
        for (let i = 0; i < length; i++) {
            s += String.fromCharCode(0x4e00 + randInt(0, 220));
        }
        return s;
    }

    function pyLoader(chinesePayload, key, base) {
        base = base || 19968;
        const varPayload = randomChinese(18);
        const varKey = randomChinese(9);
        const varBase = randomChinese(8);
        const funcName = randomChinese(13);
        const varBuf = randomChinese(7);
        const varI = randomChinese(4);
        const varC = randomChinese(5);
        const varTmp = randomChinese(8);

        const comments = [
            '# 内存优化处理', '# 系统资源监控', '# 加密算法初始化',
            '# 网络连接稳定', '# 系统初始化完成', '# 随机数种子生成',
            '# 哈希表构建完成', '# 异常处理机制就绪', '# 用户权限验证',
            '# 安全检查通过', '# 数据加密传输', '# 垃圾回收器启动',
            '# 缓存清理完成', '# 启动日志记录'
        ];
        function sample(n, indent) {
            const pool = comments.slice();
            const out = [];
            while (out.length < n && pool.length) {
                const idx = randInt(0, pool.length - 1);
                out.push((indent || '') + pool.splice(idx, 1)[0]);
            }
            return out.join('\n');
        }

        return `# Generated by Unity Dev Tools
# Python multi-layer wrapper

${sample(6)}
import zlib
${varPayload}=${JSON.stringify(chinesePayload)}
${varKey}=${key}
${varBase}=${base}
${sample(4)}
def ${funcName}(${varTmp},${varKey}):
${sample(5, '    ')}
    ${varBuf}=bytearray()
    for ${varI},${varC} in enumerate(${varTmp}):
        ${varBuf}.append(ord(${varC})-${varBase})
    ${varTmp}=zlib.decompress(bytes(${varBuf}))
    ${varBuf}=bytearray()
    for ${varI},${varC} in enumerate(${varTmp}):
        ${varBuf}.append(${varC}^((${varKey}+${varI})%256))
    return bytes(${varBuf}).decode('utf-8')
${sample(5)}
exec(${funcName}(${varPayload},${varKey}))
`;
    }

    async function buildEncryptedPy(sourceText, layers) {
        const encoder = new TextEncoder();
        const raw = encoder.encode(sourceText);
        let current = sourceText;
        const usedKeys = [];

        if (!Number.isInteger(layers) || layers < 2 || layers > 10) {
            throw new Error('Jumlah layer harus antara 2 sampai 10');
        }

        for (let i = 0; i < layers; i++) {
            setProgress(10 + Math.round((i / layers) * 75), 'layer ' + (i + 1) + '/' + layers);

            const key = randInt(10000, 30000);
            usedKeys.push(key);

            const layerBytes = encoder.encode(current);
            const xored = new Uint8Array(layerBytes.length);
            for (let j = 0; j < layerBytes.length; j++) {
                xored[j] = layerBytes[j] ^ ((key + j) % 256);
            }
            const compressed = await deflateRaw(xored);
            const chinese = Array.from(compressed, function (b) {
                return String.fromCharCode(b + 19968);
            }).join('');

            current = pyLoader(chinese, key, 19968);
        }

        setProgress(95, 'done');
        return {
            text: current,
            layers: layers,
            keys: usedKeys,
            inSize: raw.length,
            outSize: encoder.encode(current).length
        };
    }

    // ── Enc Shell — browser-side shell obfuscation ─────────────────────────
    function shellGenerateVarName(existing) {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const reserved = {
            ifz: 1, thenz: 1, elsez: 1, fiz: 1, doz: 1, donez: 1, forz: 1,
            whilez: 1, casez: 1, esacz: 1, inz: 1, selectz: 1, untilz: 1,
            functionz: 1, timez: 1, coprocz: 1, eqz: 1, nez: 1, trz: 1
        };
        for (;;) {
            const len = randInt(2, 5);
            let prefix = '';
            for (let i = 0; i < len; i++) prefix += letters[randInt(0, letters.length - 1)];
            const name = prefix + 'z';
            if (reserved[name.toLowerCase()]) continue;
            if (!existing[name] && !/^\d/.test(name)) {
                existing[name] = 1;
                return name;
            }
        }
    }

    function shellEscapeSingle(s) {
        return String(s).replace(/'/g, "'\\''");
    }

    function shellSplitChunks(text, minLen, maxLen) {
        const chunks = [];
        let i = 0;
        const n = text.length;
        while (i < n) {
            if (text[i] === '\n') {
                chunks.push('__NL__');
                i++;
                continue;
            }
            const remaining = n - i;
            let length = randInt(minLen, Math.min(maxLen, remaining));
            let chunk = text.slice(i, i + length);
            if (chunk.indexOf('\n') !== -1) {
                const pos = chunk.indexOf('\n');
                if (pos === 0) {
                    chunks.push('__NL__');
                    i++;
                    continue;
                }
                chunk = chunk.slice(0, pos);
                length = pos;
            }
            if (chunk) chunks.push(chunk);
            i += length;
        }
        return chunks;
    }

    function buildEncryptedShell(sourceText, author, telegram) {
        let content = sourceText;
        if (!content.endsWith('\n')) content += '\n';

        const wmAuthor = (author && String(author).trim()) || 'Unity Dev Tools';
        const wmTelegram = (telegram && String(telegram).trim()) || 'Unity Dev Tools';

        setProgress(15, 'chunk');
        const chunks = shellSplitChunks(content, 1, 6);
        const used = { z: 1 };
        const varMap = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (chunk === '__NL__') {
                varMap.push({ name: 'z', value: null });
            } else {
                varMap.push({ name: shellGenerateVarName(used), value: chunk });
            }
        }

        setProgress(50, 'vars');
        const lines = [];
        lines.push('# Encoded by ' + wmAuthor);
        lines.push('# Telegram- ' + wmTelegram);
        lines.push('');
        lines.push('z="');
        lines.push('";');

        const assignments = [];
        for (let i = 0; i < varMap.length; i++) {
            const v = varMap[i];
            if (v.value === null) continue;
            assignments.push(v.name + "='" + shellEscapeSingle(v.value) + "'");
        }

        const batchSize = 55;
        for (let i = 0; i < assignments.length; i += batchSize) {
            lines.push(assignments.slice(i, i + batchSize).join(';'));
        }

        setProgress(80, 'eval');
        const evalParts = [];
        for (let i = 0; i < varMap.length; i++) {
            evalParts.push('$' + varMap[i].name);
        }
        lines.push('eval "' + evalParts.join('') + '"');

        const text = lines.join('\n') + '\n';
        setProgress(95, 'done');
        return {
            text: text,
            layers: 0,
            inSize: sourceText.length,
            outSize: text.length,
            integrity: '',
            varCount: assignments.length
        };
    }

    // ── Obfus Javascript (client-side light/medium style) ────────────────────
    function jsSimpleMinify(source) {
        // strip block comments
        source = source.replace(/\/\*[\s\S]*?\*\//g, '');
        // strip line comments (avoid matching http://)
        source = source.replace(/(^|[^:])\/\/.*?$/gm, '$1');
        source = source.replace(/[ \t]+/g, ' ');
        source = source.replace(/\n\s*\n+/g, '\n');
        source = source.replace(/\n +|\n+/g, '\n');
        source = source.replace(/\s*([{};,=+\-*/<>!&|?:])\s*/g, '$1');
        const keywords = [
            'return', 'typeof', 'delete', 'throw', 'new', 'var', 'let', 'const',
            'function', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
            'break', 'continue', 'in', 'of', 'class', 'extends', 'import', 'export',
            'from', 'async', 'await', 'yield'
        ];
        for (let i = 0; i < keywords.length; i++) {
            const kw = keywords[i];
            const re = new RegExp('\\b' + kw + '\\b(?=\\S)', 'g');
            source = source.replace(re, kw + ' ');
        }
        return source.trim() + '\n';
    }

    function jsExtractStrings(source) {
        const strings = [];
        let out = '';
        let i = 0;
        const n = source.length;
        while (i < n) {
            const c = source[i];
            if (c === '"' || c === "'" || c === '`') {
                const quote = c;
                let j = i + 1;
                let escaped = false;
                let val = '';
                while (j < n) {
                    const ch = source[j];
                    if (escaped) {
                        val += ch;
                        escaped = false;
                        j++;
                        continue;
                    }
                    if (ch === '\\') {
                        val += ch;
                        escaped = true;
                        j++;
                        continue;
                    }
                    if (ch === quote) {
                        j++;
                        break;
                    }
                    // template ${ } — keep simple: treat whole as string body
                    val += ch;
                    j++;
                }
                const idx = strings.length;
                strings.push({ quote: quote, value: source.slice(i + 1, j - 1) });
                out += '__STR' + idx + '__';
                i = j;
                continue;
            }
            out += c;
            i++;
        }
        return { code: out, strings: strings };
    }

    function jsMangleIdentifiers(code) {
        // Collect local-ish identifiers (simple heuristic, avoid keywords)
        const reserved = {
            break: 1, case: 1, catch: 1, class: 1, const: 1, continue: 1, debugger: 1,
            default: 1, delete: 1, do: 1, else: 1, export: 1, extends: 1, false: 1,
            finally: 1, for: 1, function: 1, if: 1, import: 1, in: 1, instanceof: 1,
            new: 1, null: 1, return: 1, super: 1, switch: 1, this: 1, throw: 1, true: 1,
            try: 1, typeof: 1, var: 1, void: 1, while: 1, with: 1, yield: 1, let: 1,
            static: 1, enum: 1, await: 1, async: 1, of: 1, undefined: 1, NaN: 1,
            Infinity: 1, arguments: 1, eval: 1, window: 1, document: 1, console: 1,
            Array: 1, Object: 1, String: 1, Number: 1, Boolean: 1, Math: 1, Date: 1,
            JSON: 1, Promise: 1, Map: 1, Set: 1, Symbol: 1, Error: 1, RegExp: 1,
            parseInt: 1, parseFloat: 1, isNaN: 1, isFinite: 1, encodeURIComponent: 1,
            decodeURIComponent: 1, setTimeout: 1, setInterval: 1, clearTimeout: 1,
            clearInterval: 1, require: 1, module: 1, exports: 1, global: 1, process: 1,
            Buffer: 1, __dirname: 1, __filename: 1
        };
        const idRe = /\b([A-Za-z_$][\w$]*)\b/g;
        const counts = Object.create(null);
        let m;
        while ((m = idRe.exec(code)) !== null) {
            const id = m[1];
            if (reserved[id]) continue;
            if (/^__STR\d+__$/.test(id)) continue;
            counts[id] = (counts[id] || 0) + 1;
        }
        // Only mangle identifiers that appear >= 2 times and look local
        const map = Object.create(null);
        let counter = 0;
        function nextName() {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let n = counter++;
            let s = '_';
            do {
                s += chars[n % chars.length];
                n = Math.floor(n / chars.length);
            } while (n > 0);
            return s;
        }
        const ids = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            if (counts[id] < 2) continue;
            if (id.length <= 2) continue;
            map[id] = nextName();
        }
        // Replace whole-word
        return code.replace(/\b([A-Za-z_$][\w$]*)\b/g, function (full, id) {
            return map[id] || full;
        });
    }

    function buildObfuscatedJs(sourceText) {
        setProgress(10, 'minify');
        let code = jsSimpleMinify(sourceText);

        setProgress(35, 'strings');
        const extracted = jsExtractStrings(code);
        code = extracted.code;
        const strings = extracted.strings;

        setProgress(55, 'mangle');
        code = jsMangleIdentifiers(code);

        setProgress(75, 'string-array');
        // Build string array + decoder (base64-ish custom)
        const arrName = '_0x' + randInt(0x1000, 0xffff).toString(16);
        const fnName = '_0x' + randInt(0x1000, 0xffff).toString(16);
        const encoded = [];
        for (let i = 0; i < strings.length; i++) {
            // simple hex escape of UTF-16 code units for safety
            const v = strings[i].value;
            let hex = '';
            for (let j = 0; j < v.length; j++) {
                hex += v.charCodeAt(j).toString(16).padStart(4, '0');
            }
            encoded.push(hex);
        }

        // Restore string placeholders with decoder calls
        code = code.replace(/__STR(\d+)__/g, function (_, idx) {
            return fnName + '(' + idx + ')';
        });

        const header =
            'var ' + arrName + '=' + JSON.stringify(encoded) + ';' +
            'function ' + fnName + '(i){var s=' + arrName + '[i],o="";for(var k=0;k<s.length;k+=4)o+=String.fromCharCode(parseInt(s.substr(k,4),16));return o;}\n';

        const text = header + code;
        setProgress(95, 'done');
        return {
            text: text,
            layers: 0,
            inSize: sourceText.length,
            outSize: text.length,
            integrity: '',
            strCount: strings.length
        };
    }

    // ── File handling ───────────────────────────────────────────────────────
    function pyHandleFile(file) {
        if (!file) return;
        const mode = currentMode();
        const meta = MODE_META[mode] || MODE_META.py;
        const name = (file.name || '').toLowerCase();
        const okExt = meta.ext.some(function (e) { return name.endsWith(e); });
        if (!okExt) {
            pyToast('❌ File harus ' + meta.ext.join(' / '), 'error');
            return;
        }
        if (file.size > meta.maxSize) {
            pyToast('❌ Maksimal ' + fmtSize(meta.maxSize), 'error');
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
                pyToast('📂 File siap', 'info');
            } catch (e) {
                pyToast('❌ Gagal baca file: ' + e.message, 'error');
            }
        };
        reader.onerror = function () {
            pyToast('❌ Gagal membaca file', 'error');
        };
        reader.readAsText(file, 'utf-8');
    }

    function pyReset(silent) {
        pySource = null;
        pyOrigName = '';
        pyBusy = false;
        if (pyFileInput) pyFileInput.value = '';
        const meta = MODE_META[currentMode()] || MODE_META.py;
        if (pyFileName) pyFileName.textContent = meta.hint;
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
        if (!silent) { /* caller may toast */ }
    }

    async function pyDoEncrypt() {
        if (!pySource || pyBusy) return;
        const mode = currentMode();

        pyBusy = true;
        if (pyEncryptBtn) {
            pyEncryptBtn.disabled = true;
            pyEncryptBtn.textContent = '⏳ processing...';
        }
        if (pyStatStatus) {
            pyStatStatus.textContent = 'processing...';
            pyStatStatus.style.color = '#ffd166';
        }
        setProgress(5, 'start');

        try {
            let result;
            let outName;
            let mime = 'text/plain;charset=utf-8';
            let resultHtml = '';

            if (mode === 'py') {
                let layers = parseInt(pyLayers && pyLayers.value, 10);
                if (isNaN(layers) || layers < 2) layers = 3;
                if (layers > 10) layers = 10;
                if (pyStatLayers) pyStatLayers.textContent = String(layers);
                result = await buildEncryptedPy(pySource, layers);
                outName = (pyOrigName || 'script.py').replace(/\.py$/i, '') + '_encrypted.py';
                mime = 'text/x-python;charset=utf-8';
                resultHtml =
                    '✅ <strong>' + outName + '</strong> siap dijalankan dengan Python 3 (stdlib).<br>' +
                    'Pipeline: XOR + zlib + Chinese Unicode · layers: ' + result.layers;
            } else if (mode === 'shell') {
                if (pyStatLayers) pyStatLayers.textContent = '—';
                const author = pyShellAuthor ? pyShellAuthor.value : 'Unity Dev Tools';
                const telegram = pyShellTelegram ? pyShellTelegram.value : 'Unity Dev Tools';
                result = buildEncryptedShell(pySource, author, telegram);
                outName = (pyOrigName || 'script.sh').replace(/\.sh$/i, '') + '_enc.sh';
                mime = 'text/x-shellscript;charset=utf-8';
                resultHtml =
                    '✓ <strong>' + outName + '</strong> — shell obfuscation complete.<br>' +
                    'Variabel: ' + (result.varCount || 0);
            } else {
                if (pyStatLayers) pyStatLayers.textContent = '—';
                result = buildObfuscatedJs(pySource);
                const base = (pyOrigName || 'app.js').replace(/\.(js|mjs|cjs)$/i, '');
                outName = base + '.obf.js';
                mime = 'application/javascript;charset=utf-8';
                resultHtml =
                    '✅ <strong>' + outName + '</strong> — minify + string array + identifier mangle.<br>' +
                    'Strings encoded: ' + (result.strCount || 0);
            }

            const blob = new Blob([result.text], { type: mime });
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
                pyStatStatus.textContent = 'done';
                pyStatStatus.style.color = '#34d399';
            }
            if (pyStatSize) pyStatSize.textContent = fmtSize(result.inSize) + ' → ' + fmtSize(result.outSize);
            if (pyResult) pyResult.innerHTML = resultHtml;
            pyToast('⬇️ ' + outName + ' diunduh', 'success');
        } catch (e) {
            if (pyStatStatus) {
                pyStatStatus.textContent = 'error';
                pyStatStatus.style.color = '#ff6b7a';
            }
            pyToast('❌ Gagal: ' + (e && e.message ? e.message : e), 'error');
        } finally {
            pyBusy = false;
            if (pyEncryptBtn) {
                pyEncryptBtn.disabled = !pySource;
                pyEncryptBtn.textContent = t('py.encrypt') || '🔐 encrypt & download';
            }
            setTimeout(hideProgress, 800);
        }
    }

    // ── Events ──────────────────────────────────────────────────────────────
    if (pyEncType) {
        pyEncType.addEventListener('change', function () {
            applyModeUI();
            pyToast('Mode: ' + (MODE_META[currentMode()] ? currentMode() : 'py'), 'info');
        });
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

    // init mode UI (don't force reset toast)
    {
        const meta = MODE_META[currentMode()] || MODE_META.py;
        if (pyLayersBox) pyLayersBox.style.display = meta.showLayers ? '' : 'none';
        if (pyShellWmBox) pyShellWmBox.style.display = meta.showShellWm ? '' : 'none';
    }
    pyToast('🔐 Pilih jenis enkripsi & upload file', 'info');
})();
