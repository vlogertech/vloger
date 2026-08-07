// Délègue à @vloger/shared (mutualisé avec le mobile). L'upload est scopé
// par utilisateur et le nom de fichier assaini côté service partagé.
import { db } from './supabase';

export const uploadFile = db.uploadFile;