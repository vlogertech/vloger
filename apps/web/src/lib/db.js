// Ce fichier ne fait plus que déléguer à @vloger/shared (mutualisé avec le
// mobile) — les noms exportés sont conservés à l'identique pour ne rien
// changer aux imports existants dans les pages/composants.
import { db } from './supabase';

export const getUser = db.getUser;
export const dbList = db.list;
export const dbFilter = db.filter;
export const dbCreate = db.create;
export const dbUpdate = db.update;
export const dbDelete = db.delete;
export const toggleLike = db.toggleLike;
export const getLikeStatus = db.getLikeStatus;
export const findOrCreateConversation = db.findOrCreateConversation;
export const createNotification = db.createNotification;