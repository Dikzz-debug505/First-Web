/**
 * ============================================================
 *  MLBB Unity Tools — Kredensial Login
 * ============================================================
 *  File ini untuk mengatur Username & Password.
 *
 *  CARA MENGGANTI / MENAMBAH:
 *  1. Edit array MLBB_USERS di bawah.
 *  2. Setiap user: { username: "...", password: "..." }
 *  3. Simpan file, lalu refresh halaman.
 *
 *  CONTOH tambah user baru:
 *    { username: "lisa", password: "rahasia123" },
 *
 *  CATATAN KEAMANAN (PENTING):
 *  - Tools ini 100% client-side (berjalan di browser).
 *  - Siapa pun yang punya akses ke file ini / source code
 *    dapat melihat username & password.
 *  - Login ini hanya penghalang UI sederhana, BUKAN proteksi
 *    setingkat server. Jangan pakai password penting/bank/email.
 *  - Session disimpan di sessionStorage (hilang saat tab ditutup).
 * ============================================================
 */

window.MLBB_USERS = [
    { username: "admin", password: "admin123" },
    { username: "bwi",   password: "bwiteam" },
    // Tambahkan user baru di baris berikutnya, contoh:
    // { username: "userbaru", password: "passwordbaru" },
];
