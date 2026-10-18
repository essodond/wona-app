# Wona

Wona est une plateforme de livraison de proximité pour le Togo. Le dépôt contient trois applications reliées :

- une application mobile Expo 54 pour les vendeurs et les livreurs ;
- une API Django 6 sécurisée ;
- un portail web séparé réservé à l’administrateur.

Le MVP couvre l’inscription OTP, les profils, les documents livreur, la validation administrative, la publication et l’acceptation unique des courses, le suivi des statuts, les coordonnées masquées avant acceptation, le PIN de livraison, la preuve photo, la messagerie, les notifications, les paiements suivis séparément, les avis, les incidents, les zones et les commissions.

## Prérequis

- Node.js 20.19 ou plus récent (Node 22 ou 24 recommandé) ;
- Python 3.12 ou plus récent ;
- PostgreSQL en production ; SQLite suffit pour une démonstration locale ;
- Android Studio, un appareil Android, ou Xcode sur macOS.

## 1. Démarrer l’API

Depuis `wona-backend` :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createsuperuser --telephone 90000000
python manage.py runserver 0.0.0.0:8000
```

En développement, `OTP_DEBUG_RETURN_CODE=True` renvoie le code dans la réponse API. En production, cette option doit être désactivée et `SMS_PROVIDER_URL` doit pointer vers une passerelle HTTP recevant :

```json
{
  "to": "+22890000000",
  "message": "Votre code Wona est …",
  "sender": "WONA"
}
```

Vérification de santé : `GET http://127.0.0.1:8000/api/health/`.

## 2. Démarrer l’application mobile

À la racine :

```powershell
Copy-Item .env.example .env
npm ci
npm start
```

Le projet utilise Expo SDK 57. Utilisez un Expo Go compatible avec ce SDK ou un
development build pour lancer l’application sur l’appareil physique.

Valeur de `EXPO_PUBLIC_API_URL` :

- émulateur Android : `http://10.0.2.2:8000/api` ;
- simulateur iOS : `http://127.0.0.1:8000/api` ;
- téléphone physique sur le même réseau Wi-Fi : `http://192.168.1.69:8000/api`.

Les notifications distantes nécessitent un development build ou une build EAS et un `EXPO_PUBLIC_EAS_PROJECT_ID`. Expo Go ne prend pas en charge toutes les fonctions de notifications distantes sur Android.

Commandes de contrôle :

```powershell
npm run typecheck
npx expo-doctor
npx expo export --platform android
```

## 3. Démarrer le portail administrateur

Depuis `admin-web` :

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Ouvrir `http://localhost:3000` et se connecter avec le superutilisateur Django. Le portail permet :

- d’examiner chaque document et de valider, refuser ou suspendre un livreur ;
- de consulter les courses et les montants séparés ;
- de suspendre ou réactiver un utilisateur ;
- de traiter les signalements ;
- de rapprocher les paiements ;
- de gérer les zones, commissions et coordonnées du support.

Un livreur ne peut être validé que lorsque les cinq documents requis sont eux-mêmes validés.

## Cycle d’une course

```text
en_attente → acceptee → en_route_retrait → arrive_retrait
           → confirmation du vendeur → colis_recupere
           → en_livraison → PIN valide → livree
```

Après récupération, une annulation simple est interdite : le livreur doit déclarer un incident ou un échec. Une seule course active est autorisée par livreur.

## Tests

```powershell
.\wona-backend\.venv\Scripts\python.exe .\wona-backend\manage.py test accounts courses core vendeurs livreurs --noinput
cd admin-web
npm test
```

Les tests couvrent notamment l’usage unique du code OTP, le cloisonnement des rôles, le masquage des informations, l’acceptation atomique, le cycle strict, le PIN, l’annulation après retrait, les permissions administrateur, les documents privés et les paiements.

## Mise en production

Avant toute ouverture au public :

1. définir un `SECRET_KEY` aléatoire, `DEBUG=False`, les hôtes et origines CORS exacts ;
2. utiliser PostgreSQL avec sauvegardes chiffrées ;
3. configurer la passerelle SMS, Expo Push et le projet EAS ;
4. publier l’API derrière HTTPS et un proxy respectant `X-Forwarded-Proto` ;
5. ne jamais exposer directement `media/documents/livreurs` depuis le serveur web ;
6. relier `NEXT_PUBLIC_WONA_API_URL` et `EXPO_PUBLIC_API_URL` au domaine HTTPS réel ;
7. lancer `python manage.py check --deploy`, les tests et une sauvegarde de restauration.

Les intégrations Mobile Money automatiques restent volontairement hors du MVP décrit : Wona enregistre et rapproche les paiements TMoney, Flooz, espèces ou directs, sans initier de débit.
