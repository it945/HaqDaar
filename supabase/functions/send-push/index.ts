// Supabase Edge Function — sends FCM push notifications to HaqDaar users
// Deploy: supabase functions deploy send-push
// Secrets needed (run once):
//   supabase secrets set FCM_SERVER_KEY=<your-FCM-server-key>
//   (Get it from Firebase Console → Project Settings → Cloud Messaging → Server key)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FCM_KEY = Deno.env.get('FCM_SERVER_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const { user_ids, title, body, data } = await req.json() as {
    user_ids: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  };

  if (!user_ids?.length || !title) {
    return new Response(JSON.stringify({ error: 'user_ids and title required' }), { status: 400 });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: tokens } = await sb
    .from('push_tokens')
    .select('token')
    .in('profile_id', user_ids);

  if (!tokens?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!FCM_KEY) {
    console.log('FCM_SERVER_KEY not configured — skipping FCM send');
    return new Response(JSON.stringify({ sent: 0, reason: 'FCM_SERVER_KEY not set' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.allSettled(
    tokens.map(({ token }) =>
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${FCM_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          notification: { title, body, sound: 'default', android_channel_id: 'haqdaar_main' },
          data: data ?? {},
          priority: 'high',
          android: {
            priority: 'high',
            notification: {
              channel_id: 'haqdaar_main',
              sound: 'default',
              default_vibrate_timings: true,
            },
          },
        }),
      }).then((r) => r.json())
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return new Response(JSON.stringify({ sent, total: tokens.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
