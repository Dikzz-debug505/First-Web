/**
 * MLBB Unity Tools — i18n (id / en)
 */
(function (global) {
  const LANG_KEY = 'mlbb_lang_v1';
  const dict = {
    id: {
      // Login
      'login.subtitle': 'Masuk untuk mengakses tools',
      'login.username': 'Username',
      'login.password': 'Password',
      'login.user.placeholder': 'Masukkan username',
      'login.pass.placeholder': 'Masukkan password',
      'login.submit': 'Masuk',
      'login.processing': 'Memproses login...',
      'login.success': 'Berhasil! Mengalihkan...',
      'login.note': 'Kredensial dan Security diatur sedemikian rupa agar terhindar dari kejahatan Cyber. Salam hangat dari Dev',
      'login.err.wrong': 'Username atau password salah.',
      'login.err.left': ' (sisa {n} percobaan)',
      'login.err.expired': '❌ Akun sudah kedaluarsa.',
      'login.err.devices': '📱 Batas device tercapai ({cur}/{max}). Hubungi admin untuk reset.',
      'login.err.lock': '🔒 Terlalu banyak percobaan gagal. Akun terkunci sementara {sec} detik.',
      'login.err.lock_retry': '🔒 Terlalu banyak percobaan. Coba lagi dalam {sec} detik.',
      'login.err.generic': 'Terjadi kesalahan saat memverifikasi. Coba lagi.',

      // Header / nav
      'header.subtitle': 'Hero.bytes Viewer, Document Extractor & GameObject Overrider — Export/Import & Patch',
      'header.logout': 'Keluar',
      'header.online': 'Online',
      'tab.hero': '🧬 Hero.bytes Viewer',
      'tab.doc': '📦 DocumentExtractor',
      'tab.go': '⚡ GameObject Overrider',
      'lang.label': 'Bahasa',
      'lang.id': 'Indonesia',
      'lang.en': 'English',

      // Side menu
      'menu.title': 'Menu',
      'menu.dev': '1. Profil Developer Website',
      'menu.account': '2. Info Username & Password',
      'menu.name': 'Nama',
      'menu.school': 'Sekolah',
      'menu.motto': 'Moto',
      'menu.project': 'Project',
      'menu.username': 'Username',
      'menu.password': 'Password',
      'menu.expiry': 'Expired Date',
      'menu.devices': 'Device Login',
      'menu.device_id': 'Device ID',
      'menu.expiry.none': 'Tidak ada (unlimited)',
      'menu.expiry.expired': ' (kadaluarsa)',
      'menu.dev.admin': 'Admin (tanpa batas)',
      'menu.dev.unlimited': '{n} device (unlimited)',
      'menu.dev.count': '{cur} / {max} device',
      'dev.role': 'Developer — MLBB Unity Tools',

      // Common actions
      'btn.choose': 'pilih file',
      'btn.scan': '🔍 scan semua hero',
      'btn.export': '⬇ export file',
      'btn.import': '📥 import file',
      'btn.load': 'muat',
      'btn.apply': 'terapkan perubahan',
      'btn.reset': 'reset',
      'btn.download': 'unduh',
      'upload.hint': 'upload file ke sini, atau pilih secara manual',
      'footer': 'semua proses di sini, tidak ada data yang dikirim ke mana pun',

      // Admin
      'admin.title': '⚙️ Admin Panel',
      'admin.subtitle': 'Kelola Username, Password, Expiry & Batas Device',
      'admin.add': '➕ Tambah / Edit User',
      'admin.username': 'Username',
      'admin.password': 'Password',
      'admin.password.ph': 'password (kosongkan jika tidak diubah)',
      'admin.max_devices': 'Max Device (kosong = unlimited)',
      'admin.max_devices.ph': 'contoh: 2',
      'admin.expiry': 'Tanggal Kedaluarsa (opsional)',
      'admin.save': 'Simpan User',
      'admin.update': 'Update User',
      'admin.cancel': 'Batal Edit',
      'admin.clear': 'Bersihkan Form',
      'admin.list': '👥 Daftar User',
      'admin.delete_all': 'Hapus Semua',
      'admin.hint': 'Data user & device disimpan di Supabase. Setiap akun non-admin punya tombol Edit / Hapus / Reset Device.',
      'admin.th.user': 'Username',
      'admin.th.pass': 'Password',
      'admin.th.max': 'Max Device',
      'admin.th.active': 'Device Aktif',
      'admin.th.expiry': 'Expiry',
      'admin.th.source': 'Sumber',
      'admin.th.actions': 'Aksi',
      'admin.edit': 'Edit',
      'admin.delete': 'Hapus',
      'admin.reset_device': 'Reset Device',
      'admin.loading': 'Memuat dari Supabase…',
      'admin.empty': 'Belum ada user di Supabase',
      'admin.session_end': 'Sesi berakhir — login ulang sebagai admin',
      'admin.note.title': 'Catatan penting:',
      'admin.note.1': 'Akun admin khusus tidak bisa dihapus/diubah lewat panel ini.',
      'admin.note.2': 'User baru dari panel ini langsung masuk ke Supabase dan bisa login dari device mana pun.',
      'admin.note.3': 'Hapus menonaktifkan akun di database + menghapus device registry.',
      'admin.note.4': 'Hapus Semua menonaktifkan semua akun non-admin di Supabase.',
      'admin.note.5': 'Batas device disimpan di Supabase (global, sinkron antar device).',
      'admin.note.6': 'Untuk reset device suatu user, klik tombol "Reset Device" di tabel.',
      'admin.note.7': 'Password disimpan sebagai SHA-256 hash di server (tidak pernah ditampilkan).',

      // Toasts / messages
      'toast.logout': 'Anda telah keluar',
      'toast.welcome': '✅ Selamat datang, {name}',
      'toast.welcome_admin': '🛡️ Selamat datang Admin, {name}',
      'toast.user_saved': '✅ User baru ditambahkan ke Supabase',
      'toast.user_updated': '✅ User diperbarui di Supabase',
      'toast.user_deleted': '🗑️ Akun "{name}" dihapus dari Supabase',
      'toast.device_reset': 'Device di-reset untuk {name}',
      'toast.form_cleared': 'Form Username & Password dikosongkan',
      'toast.music_on': '🔊 Musik diputar',
      'toast.music_off': '🔇 Musik dimatikan',

      // Tutorial
      'tutorial.title': 'Cara Pakai',
      'tutorial.sub': 'Panduan singkat DocumentExtractor',
      'tutorial.close': 'Mengerti',
      'tutorial.dont': 'Jangan tampilkan lagi',

      // Hero panel extras
      'hero.pick': 'pilih Hero.bytes',
      'doc.pick': 'pilih Document.unity3d',
      'go.pick': 'pilih file .unity3d'
    },
    en: {
      'login.subtitle': 'Sign in to access the tools',
      'login.username': 'Username',
      'login.password': 'Password',
      'login.user.placeholder': 'Enter username',
      'login.pass.placeholder': 'Enter password',
      'login.submit': 'Sign in',
      'login.processing': 'Signing in...',
      'login.success': 'Success! Redirecting...',
      'login.note': 'Credentials and security are configured to help prevent cyber threats. Warm regards from the Dev',
      'login.err.wrong': 'Incorrect username or password.',
      'login.err.left': ' ({n} attempts left)',
      'login.err.expired': '❌ Account has expired.',
      'login.err.devices': '📱 Device limit reached ({cur}/{max}). Contact admin to reset.',
      'login.err.lock': '🔒 Too many failed attempts. Account locked for {sec} seconds.',
      'login.err.lock_retry': '🔒 Too many attempts. Try again in {sec} seconds.',
      'login.err.generic': 'Verification error. Please try again.',

      'header.subtitle': 'Hero.bytes Viewer, Document Extractor & GameObject Overrider — Export/Import & Patch',
      'header.logout': 'Log out',
      'header.online': 'Online',
      'tab.hero': '🧬 Hero.bytes Viewer',
      'tab.doc': '📦 DocumentExtractor',
      'tab.go': '⚡ GameObject Overrider',
      'lang.label': 'Language',
      'lang.id': 'Indonesia',
      'lang.en': 'English',

      'menu.title': 'Menu',
      'menu.dev': '1. Website Developer Profile',
      'menu.account': '2. Username & Password Info',
      'menu.name': 'Name',
      'menu.school': 'School',
      'menu.motto': 'Motto',
      'menu.project': 'Project',
      'menu.username': 'Username',
      'menu.password': 'Password',
      'menu.expiry': 'Expiry Date',
      'menu.devices': 'Device Login',
      'menu.device_id': 'Device ID',
      'menu.expiry.none': 'None (unlimited)',
      'menu.expiry.expired': ' (expired)',
      'menu.dev.admin': 'Admin (unlimited)',
      'menu.dev.unlimited': '{n} device(s) (unlimited)',
      'menu.dev.count': '{cur} / {max} device(s)',
      'dev.role': 'Developer — MLBB Unity Tools',

      'btn.choose': 'choose file',
      'btn.scan': '🔍 scan all heroes',
      'btn.export': '⬇ export file',
      'btn.import': '📥 import file',
      'btn.load': 'load',
      'btn.apply': 'apply changes',
      'btn.reset': 'reset',
      'btn.download': 'download',
      'upload.hint': 'drop a file here, or choose manually',
      'footer': 'all processing stays here — no data is sent anywhere',

      'admin.title': '⚙️ Admin Panel',
      'admin.subtitle': 'Manage Username, Password, Expiry & Device Limits',
      'admin.add': '➕ Add / Edit User',
      'admin.username': 'Username',
      'admin.password': 'Password',
      'admin.password.ph': 'password (leave blank to keep current)',
      'admin.max_devices': 'Max Devices (empty = unlimited)',
      'admin.max_devices.ph': 'e.g. 2',
      'admin.expiry': 'Expiry date (optional)',
      'admin.save': 'Save User',
      'admin.update': 'Update User',
      'admin.cancel': 'Cancel Edit',
      'admin.clear': 'Clear Form',
      'admin.list': '👥 User List',
      'admin.delete_all': 'Delete All',
      'admin.hint': 'Users & devices are stored in Supabase. Each non-admin account has Edit / Delete / Reset Device.',
      'admin.th.user': 'Username',
      'admin.th.pass': 'Password',
      'admin.th.max': 'Max Devices',
      'admin.th.active': 'Active Devices',
      'admin.th.expiry': 'Expiry',
      'admin.th.source': 'Source',
      'admin.th.actions': 'Actions',
      'admin.edit': 'Edit',
      'admin.delete': 'Delete',
      'admin.reset_device': 'Reset Device',
      'admin.loading': 'Loading from Supabase…',
      'admin.empty': 'No users in Supabase yet',
      'admin.session_end': 'Session expired — sign in again as admin',
      'admin.note.title': 'Important notes:',
      'admin.note.1': 'Special admin accounts cannot be deleted or edited from this panel.',
      'admin.note.2': 'New users from this panel go straight to Supabase and can sign in from any device.',
      'admin.note.3': 'Delete deactivates the account in the database and clears its device registry.',
      'admin.note.4': 'Delete All deactivates every non-admin account in Supabase.',
      'admin.note.5': 'Device limits are stored in Supabase (global, synced across devices).',
      'admin.note.6': 'To reset a user’s devices, click “Reset Device” in the table.',
      'admin.note.7': 'Passwords are stored as SHA-256 hashes on the server (never shown).',

      'toast.logout': 'You have signed out',
      'toast.welcome': '✅ Welcome, {name}',
      'toast.welcome_admin': '🛡️ Welcome Admin, {name}',
      'toast.user_saved': '✅ New user added to Supabase',
      'toast.user_updated': '✅ User updated in Supabase',
      'toast.user_deleted': '🗑️ Account "{name}" removed from Supabase',
      'toast.device_reset': 'Devices reset for {name}',
      'toast.form_cleared': 'Username & password fields cleared',
      'toast.music_on': '🔊 Music playing',
      'toast.music_off': '🔇 Music muted',

      'tutorial.title': 'How to Use',
      'tutorial.sub': 'Quick guide for DocumentExtractor',
      'tutorial.close': 'Got it',
      'tutorial.dont': 'Don’t show again',

      'hero.pick': 'choose Hero.bytes',
      'doc.pick': 'choose Document.unity3d',
      'go.pick': 'choose .unity3d file'
    }
  };

  function getLang() {
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === 'en' || v === 'id') return v;
    } catch (e) {}
    return 'id';
  }

  function setLang(lang) {
    const L = lang === 'en' ? 'en' : 'id';
    try { localStorage.setItem(LANG_KEY, L); } catch (e) {}
    applyI18n(L);
    try {
      document.documentElement.lang = L === 'en' ? 'en' : 'id';
    } catch (e) {}
    if (typeof global.dispatchEvent === 'function') {
      try { global.dispatchEvent(new CustomEvent('mlbb:lang', { detail: { lang: L } })); } catch (e) {}
    }
    return L;
  }

  function t(key, vars) {
    const L = getLang();
    let s = (dict[L] && dict[L][key]) || (dict.id && dict.id[key]) || key;
    if (vars && typeof vars === 'object') {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return s;
  }

  function applyI18n(lang) {
    const L = lang || getLang();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        // skip value for inputs unless data-i18n-target
      } else {
        el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    // Sync language switcher UI
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      const code = btn.getAttribute('data-lang-btn');
      if (code === L) btn.classList.add('lang-active');
      else btn.classList.remove('lang-active');
    });
  }

  function initLangSwitchers() {
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      if (btn.dataset.i18nBound) return;
      btn.dataset.i18nBound = '1';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setLang(btn.getAttribute('data-lang-btn'));
      });
    });
  }

  global.MLBB_i18n = { t: t, getLang: getLang, setLang: setLang, applyI18n: applyI18n, initLangSwitchers: initLangSwitchers };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      applyI18n();
      initLangSwitchers();
    });
  } else {
    applyI18n();
    initLangSwitchers();
  }
})(typeof window !== 'undefined' ? window : this);
