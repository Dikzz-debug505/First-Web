window.MLBB_USERS = [
    // === AKUN ADMIN KHUSUS (hanya ini yang bisa akses Admin Panel) ===
    {
        username: "adi",
        passwordHash: "e33608fbb683329abf5d0fd116f9d4d2f7866bfbaf33ec42f89e1199511a822e",
        isAdmin: true,
        maxDevices: 1,
        expiryDate: null
    },

    { username: "admin",       passwordHash: "25f43b1486ad95a1398e3eeb3d83bc4010015fcc9bedb35b432e00298d5021f7",   maxDevices: 1, expiryDate: null },
    { username: "admin", passwordHash: "1c142b2d01aa34e9a36bde480645a57fd69e14155dacfab5a3f9257b77fdc8d8",      maxDevices: 3, expiryDate: null },

    // null = Unlimited
    // { username: "userbaru", passwordHash: "<sha256 hex>", maxDevices: 2, expiryDate: "tahun-bulan-tanggal" },
];