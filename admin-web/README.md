# Wona Admin

Portail web séparé réservé aux administrateurs Wona.

## Développement

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

`NEXT_PUBLIC_WONA_API_URL` doit contenir l’URL de l’API avec le suffixe `/api`.

Le portail ne contient aucune donnée de démonstration. Sans API joignable, il affiche une erreur de connexion. L’authentification utilise exclusivement le compte superutilisateur Django, avec JWT court et refresh token conservés dans `sessionStorage`.

## Contrôles

```powershell
npm test
npm run lint
```

La build Sites est produite par `npm run build`.
