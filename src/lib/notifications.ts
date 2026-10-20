import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

let _initialized = false;

export async function initNotifications(userId: string, role: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || _initialized) return;
  _initialized = true;

  // ── Notification channel (Android 8+, importance=5 shows banner like WhatsApp) ──
  await LocalNotifications.createChannel({
    id: 'haqdaar_main',
    name: 'HaqDaar Alerts',
    description: 'Allocation and payment notifications',
    importance: 5,
    sound: 'default',
    visibility: 1,
    vibration: true,
  }).catch(() => {/* channel already exists */});

  const { display } = await LocalNotifications.requestPermissions();

  if (role === 'admin' && display === 'granted') {
    await scheduleMonthlyAdminReminder();
  }

  // ── FCM registration (needs google-services.json; fails gracefully without it) ──
  try {
    const { receive } = await PushNotifications.requestPermissions();
    if (receive === 'granted') {
      await PushNotifications.register();

      PushNotifications.addListener('registration', async ({ value: token }) => {
        await supabase.from('push_tokens').upsert(
          { profile_id: userId, token, platform: 'android', updated_at: new Date().toISOString() },
          { onConflict: 'profile_id,token' }
        );
      });

      // FCM foreground message → show as local banner (Android suppresses FCM banners in foreground)
      PushNotifications.addListener('pushNotificationReceived', ({ title, body }) => {
        showBanner(title || 'HaqDaar', body || '', Date.now());
      });
    }
  } catch (_) {
    // google-services.json missing → FCM unavailable; local notifications still work
  }

  // ── Show any unread DB notifications as banners ────────────────────────
  await showPendingDbNotifications(userId);
}

export async function showBanner(title: string, body: string, id: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.schedule({
    notifications: [{
      id: Math.abs(id % 2147483647),
      title,
      body,
      schedule: { at: new Date(Date.now() + 300) },
      channelId: 'haqdaar_main',
      sound: 'default',
      smallIcon: 'ic_notification',
      iconColor: '#16a34a',
    }],
  });
}

async function scheduleMonthlyAdminReminder(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: 9001 }] }).catch(() => {});
  const now = new Date();
  const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
  await LocalNotifications.schedule({
    notifications: [{
      id: 9001,
      title: 'Monthly Allocation Due',
      body: `Time to run ${nextFirst.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })} allocation for all HaqDaar families!`,
      schedule: { at: nextFirst, repeats: true, every: 'month' },
      channelId: 'haqdaar_main',
      sound: 'default',
      smallIcon: 'ic_notification',
      iconColor: '#16a34a',
    }],
  });
}

async function showPendingDbNotifications(userId: string): Promise<void> {
  try {
    const key = `notif_last_seen_${userId}`;
    const lastSeen = localStorage.getItem(key) ?? '1970-01-01T00:00:00Z';

    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, created_at')
      .eq('profile_id', userId)
      .gt('created_at', lastSeen)
      .order('created_at', { ascending: true })
      .limit(5);

    if (!data || data.length === 0) return;

    for (const n of data) {
      await showBanner(
        n.title,
        n.message,
        parseInt(n.id.replace(/-/g, '').slice(0, 8), 16)
      );
    }

    localStorage.setItem(key, data[data.length - 1].created_at);
  } catch (_) {
    // Notifications table may not exist on older builds — fail silently
  }
}
