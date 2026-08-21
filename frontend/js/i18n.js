/**
 * MLBB Unity Tools — i18n (id / en)
 */
(function (global) {
  const LANG_KEY = 'mlbb_lang_v1';
  const dict = {
    id: {
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
      'login.err.maintenance': '🔧 Website sedang diupdate. User biasa tidak bisa login. Coba lagi nanti.',
      'login.maint.title': 'Website sedang diupdate',
      'login.maint.desc': 'User biasa tidak dapat login saat ini. Silakan coba lagi nanti. (Admin tetap bisa masuk)',
      'login.lamp_hint': 'Tarik tali lampu untuk menyalakan & membuka form login',

      'header.subtitle': 'Hero.bytes Viewer, Document Extractor & GameObject Overrider — Export/Import & Patch',
      'header.logout': 'Keluar',
      'header.online': 'Online',
      'tab.hero': '🧬 Hero.bytes Viewer',
      'tab.doc': '📦 DocumentExtractor',
      'tab.go': '⚡ GameObject Overrider',
      'lang.label': 'Bahasa',
      'lang.id': 'Indonesia',
      'lang.en': 'English',

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
      'menu.support': '3. Supported by',
      'menu.support_note': 'Bantuan AI untuk UI & tooling',

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
      'admin.th.ip': 'IP Address',
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
      'admin.maint.title': '🔧 Mode Update Website',
      'admin.maint.hint': 'Aktifkan untuk menampilkan peringatan update dan memblokir login user biasa. Admin tetap bisa login.',
      'admin.maint.on': 'ON',
      'admin.maint.off': 'OFF',
      'admin.maint.btn_on': 'ON — Update',
      'admin.maint.btn_off': 'OFF — Normal',
      'admin.maint.toast_on': 'Mode update website AKTIF — user biasa diblokir login',
      'admin.maint.toast_off': 'Mode update website NONAKTIF — user biasa bisa login',

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

      'tutorial.title': 'Tutorial Pemakaian',
      'tutorial.sub': 'Panduan singkat DocumentExtractor',
      'tutorial.close': 'Mengerti ✓',
      'tutorial.dont': 'Jangan tampilkan lagi',

      'hero.pick': 'pilih Hero.bytes',
      'doc.pick': 'pilih Document.unity3d',
      'go.pick': 'pilih file .unity3d',
      'stat.hero': 'hero',
      'stat.values': 'nilai stat',
      'stat.size': 'ukuran',
      'stat.status': 'status',
      'stat.ready': 'siap',
      'stat.file': 'file',
      'btn.save': '⬇ simpan',
      'btn.reset': '↺ reset',
      'hero.pick_label': '🧬 Pilih hero',
      'hero.search_ph': 'Cari nama hero...',
      'hero.select_ph': '— pilih hero —',
      'hero.all': '☕ semua hero',
      'hero.open': 'buka',
      'hero.close': 'tutup',
      'doc.desc': 'Ekstrak <strong>Document.unity3d</strong>, lihat/ubah file, export/import per file, pack ulang, dan patch XML.',
      'doc.upload_hint': 'upload Document.unity3d',
      'doc.extract': '📂 ekstrak & tampilkan',
      'doc.no_files': 'belum ada file, ekstrak dulu',
      'doc.edit_label': '📝 edit file:',
      'doc.select_ph': '— pilih file —',
      'doc.patch_xml': '🔧 Patch XML:',
      'doc.not_uploaded': 'belum diupload',
      'doc.run_patch': '🔧 jalankan patch',
      'doc.pack': '📦 pack ulang & download',
      'go.desc': 'Nonaktifkan <strong>GameObject</strong> yang namanya sama dengan file, dan ganti string <strong>CAB</strong> (opsional). Upload 1 file <code>.unity3d</code> saja.',
      'go.upload_hint': 'upload 1 file .unity3d ke sini',
      'go.cab_label': '🔧 CAB Baru (opsional — support karakter spesial, contoh: <code>CAB-©ByLisa</code>)',
      'go.cab_ph': 'Kosongkan jika tidak ingin ubah CAB',
      'go.cab_hint': 'Akan dipad ke 36-byte (UTF-8 + null padding). Jika tidak diawali CAB-, otomatis ditambahkan.',
      'go.process': '⚡ process override',
      'go.cab_replaced': 'CAB diganti',
      'go.download': '⬇ download hasil',
      'tutorial.s1t': 'Upload file',
      'tutorial.s1': 'Upload <b>Document.unity3d</b> (zona atas) lalu upload <b>ResCheckConf.xml</b> &amp; <b>BinaryPatchMD5.xml</b> (bagian bawah).',
      'tutorial.s2t': 'Ekstrak',
      'tutorial.s2': 'Klik tombol <b>📂 ekstrak &amp; tampilkan</b> untuk membuka isi file.',
      'tutorial.s3t': 'Edit sesuka hati',
      'tutorial.s3': 'Pilih file, muat, ubah isinya, atau export/import sesuai kebutuhan.',
      'tutorial.s4t': 'Pack ulang &amp; download',
      'tutorial.s4': 'Setelah selesai editing, klik tombol <b>📦 pack ulang &amp; download</b>.',
      'music.pick': 'Pilih Lagu',
      'music.track1': 'Lagu 1',
      'music.track2': 'Lagu 2',
      'music.hint': 'Tahan tombol musik untuk buka menu',
      'music.fab_title': 'Ketuk: play/pause · Tahan: pilih lagu',
      'js.file_not_chosen': 'file tidak dipilih',
      'js.file_must_bytes': 'file harus .bytes',
      'js.file_must_unity3d': 'file harus .unity3d',
      'js.file_too_big': 'file terlalu besar (maks. 512 MB)',
      'js.file_too_small': 'file terlalu kecil',
      'js.scan_done': 'scan selesai',
      'js.ready': 'siap',
      'js.processing': 'memproses...',
      'js.done': 'selesai',
      'js.error': 'error',
      'js.reset_ok': '↺ reset berhasil',
      'js.download_ok': '⬇️ unduhan berhasil',
      'js.extract_ok': 'ekstrak selesai',
      'js.pack_ok': 'pack & download siap',
      'js.patch_ok': 'patch selesai',
      'js.not_extracted': 'Document belum diekstrak',
      'js.choose_file': '— pilih file —',
      'js.choose_hero': '— pilih hero —',
      'js.heroes_found': '{n} hero tersedia — pilih satu untuk melihat nilai',
      'js.music_off': '🔇 Musik dimatikan',
      'js.music_on': '🔊 Musik diputar',
      'js.song_play': '{name} diputar',
      'js.song_fail': 'Gagal memutar lagu',
      'js.user_required': 'Username wajib diisi (1–64 karakter).',
      'js.pass_required': 'Password wajib diisi (1–128 karakter).',
      'js.server_fail': 'Gagal menghubungi server. Coba lagi.',
      'js.save_fail': 'Gagal menyimpan user.',
      'js.confirm_reset_dev': 'Reset semua device untuk user "{name}"?\nSetelah reset, user bisa login lagi dari device baru (sampai batas max).',
      'js.confirm_delete': 'Hapus akun ini dari Supabase?\n\nUsername: {name}\n\nAkun akan dinonaktifkan dan device registry dihapus.\nUser tidak bisa login lagi.',
      'js.confirm_delete_all': 'Hapus SEMUA akun non-admin dari Supabase?\n\nJumlah: {n} akun\nAkun akan dinonaktifkan + device di-reset.\n\nTindakan ini tidak bisa dibatalkan dari panel.',
      'js.uploaded': 'sudah diupload',
      'js.not_uploaded': 'belum diupload',
      'js.wait_upload': 'tunggu upload'
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
      'login.err.maintenance': '🔧 Website is being updated. Regular users cannot sign in. Please try again later.',
      'login.maint.title': 'Website is being updated',
      'login.maint.desc': 'Regular users cannot sign in right now. Please try again later. (Admin can still sign in)',
      'login.lamp_hint': 'Pull the lamp cord to turn on the light and open the login form',

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
      'menu.support': '3. Supported by',
      'menu.support_note': 'AI assistance for UI & tooling',
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
      'admin.th.ip': 'IP Address',
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
      'admin.maint.title': '🔧 Website Update Mode',
      'admin.maint.hint': 'Enable to show an update warning and block regular user login. Admin can still sign in.',
      'admin.maint.on': 'ON',
      'admin.maint.off': 'OFF',
      'admin.maint.btn_on': 'ON — Update',
      'admin.maint.btn_off': 'OFF — Normal',
      'admin.maint.toast_on': 'Update mode ON — regular users blocked from login',
      'admin.maint.toast_off': 'Update mode OFF — regular users can sign in again',

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
      'tutorial.close': 'Got it ✓',
      'tutorial.dont': 'Don’t show again',

      'hero.pick': 'choose Hero.bytes',
      'doc.pick': 'choose Document.unity3d',
      'go.pick': 'choose .unity3d file',
      'stat.hero': 'hero',
      'stat.values': 'stat values',
      'stat.size': 'size',
      'stat.status': 'status',
      'stat.ready': 'ready',
      'stat.file': 'file',
      'btn.save': '⬇ save',
      'btn.reset': '↺ reset',
      'hero.pick_label': '🧬 Select hero',
      'hero.search_ph': 'Search hero name...',
      'hero.select_ph': '— select hero —',
      'hero.all': '☕ all heroes',
      'hero.open': 'open',
      'hero.close': 'close',
      'doc.desc': 'Extract <strong>Document.unity3d</strong>, view/edit files, export/import per file, repack, and patch XML.',
      'doc.upload_hint': 'upload Document.unity3d',
      'doc.extract': '📂 extract & show',
      'doc.no_files': 'no files yet — extract first',
      'doc.edit_label': '📝 edit file:',
      'doc.select_ph': '— select file —',
      'doc.patch_xml': '🔧 Patch XML:',
      'doc.not_uploaded': 'not uploaded',
      'doc.run_patch': '🔧 run patch',
      'doc.pack': '📦 repack & download',
      'go.desc': 'Disable <strong>GameObject</strong>s matching the file name, and optionally replace the <strong>CAB</strong> string. Upload one <code>.unity3d</code> file only.',
      'go.upload_hint': 'drop one .unity3d file here',
      'go.cab_label': '🔧 New CAB (optional — special characters supported, e.g. <code>CAB-©ByLisa</code>)',
      'go.cab_ph': 'Leave blank to keep CAB unchanged',
      'go.cab_hint': 'Padded to 36 bytes (UTF-8 + null padding). If it does not start with CAB-, it is added automatically.',
      'go.process': '⚡ process override',
      'go.cab_replaced': 'CAB replaced',
      'go.download': '⬇ download result',
      'tutorial.s1t': 'Upload files',
      'tutorial.s1': 'Upload <b>Document.unity3d</b> (top zone), then upload <b>ResCheckConf.xml</b> &amp; <b>BinaryPatchMD5.xml</b> (below).',
      'tutorial.s2t': 'Extract',
      'tutorial.s2': 'Click <b>📂 extract &amp; show</b> to open the file contents.',
      'tutorial.s3t': 'Edit as you like',
      'tutorial.s3': 'Select a file, load it, edit the contents, or export/import as needed.',
      'tutorial.s4t': 'Repack &amp; download',
      'tutorial.s4': 'When editing is done, click <b>📦 repack &amp; download</b>.',
      'music.pick': 'Select Track',
      'music.track1': 'Track 1',
      'music.track2': 'Track 2',
      'music.hint': 'Hold the music button to open the menu',
      'music.fab_title': 'Tap: play/pause · Hold: choose track',
      'js.file_not_chosen': 'no file selected',
      'js.file_must_bytes': 'file must be .bytes',
      'js.file_must_unity3d': 'file must be .unity3d',
      'js.file_too_big': 'file too large (max 512 MB)',
      'js.file_too_small': 'file too small',
      'js.scan_done': 'scan complete',
      'js.ready': 'ready',
      'js.processing': 'processing...',
      'js.done': 'done',
      'js.error': 'error',
      'js.reset_ok': '↺ reset successful',
      'js.download_ok': '⬇️ download ready',
      'js.extract_ok': 'extract complete',
      'js.pack_ok': 'pack & download ready',
      'js.patch_ok': 'patch complete',
      'js.not_extracted': 'Document not extracted yet',
      'js.choose_file': '— select file —',
      'js.choose_hero': '— select hero —',
      'js.heroes_found': '{n} heroes available — select one to view values',
      'js.music_off': '🔇 Music muted',
      'js.music_on': '🔊 Music playing',
      'js.song_play': '{name} playing',
      'js.song_fail': 'Failed to play track',
      'js.user_required': 'Username is required (1–64 characters).',
      'js.pass_required': 'Password is required (1–128 characters).',
      'js.server_fail': 'Could not reach the server. Try again.',
      'js.save_fail': 'Failed to save user.',
      'js.confirm_reset_dev': 'Reset all devices for user "{name}"?\nAfter reset, the user can sign in from a new device (up to the max limit).',
      'js.confirm_delete': 'Delete this account from Supabase?\n\nUsername: {name}\n\nThe account will be deactivated and its device registry cleared.\nThe user will no longer be able to sign in.',
      'js.confirm_delete_all': 'Delete ALL non-admin accounts from Supabase?\n\nCount: {n} accounts\nAccounts will be deactivated and devices reset.\n\nThis cannot be undone from the panel.',
      'js.uploaded': 'uploaded',
      'js.not_uploaded': 'not uploaded',
      'js.wait_upload': 'waiting for upload'
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
