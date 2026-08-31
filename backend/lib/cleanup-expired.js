/**
 * Auto-cleanup akun yang sudah lewat expiry_date.
 * - Hanya user biasa (is_admin = false)
 * - Super/admin tidak pernah dihapus otomatis
 * - Hapus device registry + hard-delete row user
 */
const { getSupabase } = require('./session');

function todayISODate() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * Hapus satu user yang sudah kedaluarsa (by username).
 * Skip jika admin/super atau belum expired / tidak punya expiry.
 * @returns {{ deleted: boolean, username?: string }}
 */
async function deleteExpiredUserByUsername(username) {
  const supabase = getSupabase();
  if (!supabase || !username) return { deleted: false };

  const uname = String(username).trim();
  if (!uname) return { deleted: false };

  try {
    const { data: rows, error } = await supabase
      .from('app_users')
      .select('username, is_admin, is_super, expiry_date')
      .eq('username', uname)
      .limit(1);

    if (error || !rows || !rows.length) return { deleted: false };

    const row = rows[0];
    if (row.is_admin) return { deleted: false }; // jangan sentuh admin

    if (!row.expiry_date) return { deleted: false };

    const expDate = new Date(String(row.expiry_date));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(expDate.getTime()) || today <= expDate) return { deleted: false };

    await supabase.from('user_devices').delete().eq('username', row.username);
    const { error: delErr } = await supabase
      .from('app_users')
      .delete()
      .eq('username', row.username);

    if (delErr) {
      console.error('cleanup-expired single', delErr);
      return { deleted: false };
    }
    return { deleted: true, username: row.username };
  } catch (e) {
    console.error('cleanup-expired single exception', e);
    return { deleted: false };
  }
}

/**
 * Batch: hapus semua user biasa yang expiry_date < hari ini.
 * @returns {{ deleted: number, usernames: string[] }}
 */
async function cleanupAllExpiredUsers() {
  const supabase = getSupabase();
  if (!supabase) return { deleted: 0, usernames: [] };

  const today = todayISODate();

  try {
    // User biasa (bukan admin) dengan expiry_date < today
    const { data: expired, error } = await supabase
      .from('app_users')
      .select('username, expiry_date')
      .eq('is_admin', false)
      .not('expiry_date', 'is', null)
      .lt('expiry_date', today);

    if (error) {
      console.error('cleanup-expired list', error);
      return { deleted: 0, usernames: [] };
    }

    const list = expired || [];
    if (!list.length) return { deleted: 0, usernames: [] };

    const usernames = list.map((u) => u.username).filter(Boolean);
    if (!usernames.length) return { deleted: 0, usernames: [] };

    // Hapus devices dulu
    await supabase.from('user_devices').delete().in('username', usernames);

    const { error: delErr } = await supabase
      .from('app_users')
      .delete()
      .in('username', usernames)
      .eq('is_admin', false);

    if (delErr) {
      console.error('cleanup-expired batch delete', delErr);
      return { deleted: 0, usernames: [] };
    }

    return { deleted: usernames.length, usernames };
  } catch (e) {
    console.error('cleanup-expired batch exception', e);
    return { deleted: 0, usernames: [] };
  }
}

module.exports = {
  deleteExpiredUserByUsername,
  cleanupAllExpiredUsers,
  todayISODate
};
