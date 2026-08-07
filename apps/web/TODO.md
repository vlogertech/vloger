# TODO - Migration Base44 -> Supabase (architecture only)

- [x] Analyse des dépendances Base44 (package.json, vite.config.js, src/api/base44Client.js, usages dans src/lib/*)
- [x] Plan approuvé
- [ ] Mettre à jour package.json : retirer @base44/*, ajouter @supabase/supabase-js
- [ ] Modifier vite.config.js : supprimer @base44/vite-plugin
- [ ] Ajouter src/lib/supabase.ts (singleton createClient)
- [ ] Mettre à jour .env : SUPABASE_URL, SUPABASE_ANON_KEY
- [ ] Supprimer base44/ + base44/config.jsonc + src/api/base44Client.js + src/lib/app-params.js
- [ ] Supprimer tous les imports Base44 et brancher src/lib/supabase.ts à la place (sans migrer pages)
- [ ] Corriger les erreurs TypeScript / compilation
- [ ] Vérifier `npm run build` (ou équivalent) et `npm run typecheck`


