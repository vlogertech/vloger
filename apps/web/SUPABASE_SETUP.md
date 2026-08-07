# VLOGER — Guide de connexion Supabase

## 1. Créer le projet Supabase

1. Va sur https://supabase.com et crée un compte
2. Clique **New project**
3. Choisis un nom (ex: `vloger`), un mot de passe DB fort, une région proche
4. Attends ~2 minutes que le projet soit prêt

---

## 2. Configurer les variables d'environnement

Dans **Supabase Dashboard > Project Settings > API** :

Copie :
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Édite le fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Créer les tables (migration SQL)

Dans **Supabase Dashboard > SQL Editor** :

1. Clique **New query**
2. Copie-colle le contenu de `supabase_migration.sql`
3. Clique **Run**

Cela crée :
- `profiles` — profils utilisateurs
- `posts` — vlogs et voice posts
- `comments` — commentaires
- `likes` — likes (table dédiée)
- `follows` — abonnements
- `conversations` — conversations messages
- `messages` — messages
- `notifications` — notifications

Et configure automatiquement :
- RLS (Row Level Security) sur toutes les tables
- Triggers pour les compteurs (likes, followers, comments)
- Trigger de création de profil à l'inscription
- Realtime sur messages, conversations, notifications, posts

---

## 4. Créer les buckets Storage

Dans **Supabase Dashboard > Storage** :

Si les buckets n'ont pas été créés par le SQL, crée-les manuellement :

| Nom | Public |
|-----|--------|
| `uploads` | ✅ |
| `videos` | ✅ |
| `audio` | ✅ |
| `thumbnails` | ✅ |
| `avatars` | ✅ |
| `banners` | ✅ |

---

## 5. Configurer l'authentification

Dans **Supabase Dashboard > Authentication > Providers** :

### Email/Password
- Activé par défaut ✅
- Optionnel : désactiver "Confirm email" pour les tests

### Google OAuth
1. Va sur https://console.cloud.google.com
2. Crée un projet > APIs & Services > Credentials
3. Crée un **OAuth 2.0 Client ID** (Web application)
4. Ajoute dans "Authorized redirect URIs" :
   ```
   https://xxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
5. Copie Client ID et Client Secret
6. Dans Supabase > Authentication > Providers > Google : colle les valeurs

### URL de redirection (important)
Dans **Supabase Dashboard > Authentication > URL Configuration** :
- **Site URL** : `http://localhost:5173` (dev) ou ton domaine de prod
- **Redirect URLs** : ajoute `http://localhost:5173/**`

---

## 6. Lancer l'application

```bash
npm run dev
```

Ouvre http://localhost:5173

---

## 7. Vérifier que tout fonctionne

### Test inscription
1. Va sur `/register`
2. Crée un compte avec email/password
3. Vérifie dans Supabase > Authentication > Users que l'utilisateur apparaît
4. Vérifie dans Supabase > Table Editor > profiles qu'un profil a été créé automatiquement

### Test publication
1. Connecte-toi
2. Va sur `/create/vlog`
3. Publie un post
4. Vérifie dans Supabase > Table Editor > posts

### Test messages
1. Crée 2 comptes
2. Depuis le profil de l'un, clique "Message"
3. Envoie un message
4. Vérifie le Realtime dans Supabase > Table Editor > messages

---

## 8. Passer en production

1. Change `Site URL` dans Supabase Auth vers ton domaine
2. Ajoute les variables d'env sur ton hébergeur (Vercel, Netlify, etc.)
3. Lance `npm run build` et déploie le dossier `dist/`

---

## Structure des tables

```
auth.users (géré par Supabase)
    │
    ├── profiles (1:1)
    ├── posts (1:N)
    ├── comments (1:N)
    ├── likes (N:M via posts)
    ├── follows (N:M)
    ├── conversations (N:M via participant_ids[])
    ├── messages (1:N via conversations)
    └── notifications (1:N)
```
