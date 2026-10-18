# Sécurité Wona

## Contrôles implémentés

- OTP à 6 chiffres, haché en base, valide 5 minutes, usage unique et blocage après 5 essais ;
- limitation de débit distincte pour OTP, vérification, connexion admin et téléversements ;
- JWT d’accès de 15 minutes, rotation du refresh token, liste noire à la déconnexion ;
- rôles serveur vendeur, livreur validé et administrateur — l’interface ne constitue jamais l’autorisation ;
- acceptation d’une course sous transaction et verrou de ligne ;
- une seule course active par livreur ;
- informations du destinataire et adresses exactes masquées avant l’acceptation ;
- étapes de course imposées côté serveur et remise vendeur obligatoire ;
- PIN de livraison haché ; le code clair n’est pas conservé par l’API ;
- cinq documents requis, format JPG/PNG/PDF, limite de 5 Mo et décision administrative ;
- téléchargement des pièces d’identité authentifié, privé et sans cache ;
- journal d’audit des décisions sensibles avec utilisateur et adresse IP ;
- en-têtes HTTPS/HSTS, anti-framing, anti-MIME sniffing et cookies protégés en production ;
- portail admin avec politique CSP, jetons limités à l’onglet et aucune donnée simulée.

## Secrets

Ne jamais committer :

- `.env` ou `.env.local` ;
- `SECRET_KEY`, mots de passe de base de données ou jetons SMS/Expo ;
- clés de signature Android/iOS ;
- archives de documents ou sauvegardes de production.

Les modèles `.env.example` ne doivent contenir que des noms de variables et des valeurs factices.

## Documents d’identité

En production, le chemin `media/documents/livreurs` ne doit jamais être monté comme répertoire public par Nginx, Apache ou un stockage objet public. Le portail récupère ces fichiers via l’endpoint authentifié :

```text
GET /api/livreurs/documents/{id}/telecharger/
```

Seuls l’administrateur et le livreur propriétaire y ont accès. Appliquer une politique de rétention, chiffrer le stockage et journaliser les accès au niveau de l’infrastructure.

## Incident de sécurité

En cas de fuite présumée :

1. désactiver le compte concerné ;
2. changer les secrets et révoquer les jetons ;
3. conserver les journaux d’audit ;
4. identifier les documents et utilisateurs concernés ;
5. informer les parties selon les obligations applicables au Togo ;
6. corriger, tester et documenter la cause avant réouverture.

