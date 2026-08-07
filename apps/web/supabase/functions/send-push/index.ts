// @ts-nocheck
// Ce fichier s'exécute dans l'environnement Deno de Supabase Edge Functions,
// pas dans le projet TypeScript du site web — VS Code ne connaît donc ni le
// global `Deno` ni les imports `https://`. @ts-nocheck désactive le
// typecheck sur CE fichier uniquement ; le code fonctionne normalement une
// fois déployé sur Supabase. Pour avoir l'auto-complétion Deno dans VS Code,
// vous pouvez installer l'extension officielle "Deno" (denoland.vscode-deno).
//
// Supabase Edge Function : send-push
//
// Déclenchée par un Database Webhook (INSERT sur public.notifications).
// Lit les tokens push de l'utilisateur destinataire et envoie une
// notification via l'API Expo Push.
//
// Déploiement : supabase functions deploy send-push
// Configuration du webhook : voir README.md dans ce dossier.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name: string | null;
  type: string;
  post_id: string | null;
  post_thumbnail: string | null;
  message: string | null;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: NotificationRow;
  old_record: NotificationRow | null;
}

function buildMessageBody(record: NotificationRow): string {
  const actor = record.actor_name || 'Quelqu\'un';
  switch (record.type) {
    case 'like':
      return `${actor} a aimé ta publication`;
    case 'comment':
      return `${actor} a commenté ta publication`;
    case 'follow':
      return `${actor} te suit maintenant`;
    case 'mention':
      return `${actor} t'a mentionné`;
    case 'reply':
      return `${actor} a répondu à ton message`;
    default:
      return record.message || 'Nouvelle notification';
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Payload JSON invalide' }), { status: 400 });
  }

  const record = payload?.record;
  if (!record?.user_id) {
    return new Response(JSON.stringify({ error: 'record.user_id manquant' }), { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: tokenRows, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', record.user_id);

  if (tokensError) {
    console.error('Erreur lecture push_tokens:', tokensError.message);
    return new Response(JSON.stringify({ error: tokensError.message }), { status: 500 });
  }

  if (!tokenRows || tokenRows.length === 0) {
    // Aucun appareil enregistré pour cet utilisateur : rien à envoyer.
    return new Response(JSON.stringify({ sent: 0, reason: 'no_tokens' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = buildMessageBody(record);
  const messages = tokenRows.map((row: { token: string }) => ({
    to: row.token,
    sound: 'default',
    title: 'Vloger',
    body,
    data: { type: record.type, postId: record.post_id ?? null, notificationId: record.id },
  }));

  let expoResult: any = null;
  try {
    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    expoResult = await expoRes.json();
  } catch (err) {
    console.error('Erreur appel API Expo Push:', err);
    return new Response(JSON.stringify({ error: 'Échec appel Expo Push API' }), { status: 502 });
  }

  // Nettoyage : un token dont l'app a été désinstallée renvoie
  // DeviceNotRegistered — on le retire pour ne plus jamais réessayer dessus.
  const invalidTokens: string[] = [];
  if (Array.isArray(expoResult?.data)) {
    expoResult.data.forEach((r: any, i: number) => {
      if (r?.status === 'error' && r?.details?.error === 'DeviceNotRegistered') {
        invalidTokens.push(tokenRows[i].token);
      }
    });
  }
  if (invalidTokens.length > 0) {
    await supabase.from('push_tokens').delete().in('token', invalidTokens);
  }

  return new Response(
    JSON.stringify({ sent: messages.length, removedTokens: invalidTokens.length, expoResult }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});