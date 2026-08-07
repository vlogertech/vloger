import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Comment gérer une notification reçue pendant que l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande la permission, récupère le token Expo Push et l'enregistre
 * en base pour l'utilisateur connecté. À appeler une fois l'utilisateur
 * authentifié (voir app/_layout.tsx).
 *
 * @param userId
 * @returns Le token enregistré, ou null si indisponible/refusé.
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    // Le simulateur/émulateur ne reçoit pas de push Expo.
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    // Nécessite `eas init` puis d'ajouter extra.eas.projectId dans app.json.
    console.warn(
      "[push] Aucun projectId EAS configuré (app.json > extra.eas.projectId) : impossible de générer un token push."
    );
    return null;
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch (err) {
    console.warn('[push] Échec de récupération du token Expo Push :', err);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
    });
  }

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'token' });

  if (error) {
    console.warn('[push] Échec d\'enregistrement du token en base :', error.message);
    return null;
  }

  return token;
}

/**
 * Supprime le token de cet appareil en base (ex. à la déconnexion),
 * pour ne plus recevoir de push dessus.
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await supabase.from('push_tokens').delete().eq('token', token);
}