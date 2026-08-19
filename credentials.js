window.MLBB_USERS = [
    // === AKUN ADMIN KHUSUS (hanya ini yang bisa akses Admin Panel) ===
    // Username & Password ini HANYA untuk membuat/mengatur user lain + set batas device.
    // Jangan bagikan ke user biasa.
    {
        username: "adi",
        password: "ilyas",
        isAdmin: true,
        maxDevices: 1,   // null = unlimited
        expiryDate: null
    },

    // === USER BIASA (bisa diubah/ditambah lewat Admin Panel juga) ===
    { username: "admin",     password: "admin123",  maxDevices: 2, expiryDate: null },
    { username: "bwi",       password: "bwiteam",   maxDevices: 1, expiryDate: "2025-12-31" },

    // Contoh format:
    // { username: "userbaru", password: "passwordbaru", maxDevices: 2, expiryDate: "2026-12-31" },
];
