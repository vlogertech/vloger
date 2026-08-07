// Délègue à @vloger/shared (mutualisé avec le mobile).
import { db } from './supabase';

export const subscribeToMessages = db.subscribeToMessages;
export const subscribeToConversations = db.subscribeToConversations;