# Motion design Wona

Teaser vertical 1080 × 1920, 15 secondes, conçu pour les stories, Reels, TikTok et statuts WhatsApp.

## Fichiers livrés

- `wona-motion-design.webm` — master VP9 + Opus, 1080 × 1920, 30 i/s, 15 secondes.
- `wona-motion-design-cover.png` — image de couverture verticale.
- `index.html` — animation source, modifiable sans logiciel de montage.

## Storyboard

1. **Wona** — introduction de marque et promesse « Vos colis. Notre mission. »
2. **Publiez** — mise en avant du parcours vendeur.
3. **Suivez** — suivi de la course en temps réel.
4. **Livrez** — confiance, paiement à la livraison et livreurs vérifiés.
5. **Wona connecte** — signature finale vendeurs + livreurs à Lomé.

## Régénérer la vidéo

Depuis la racine du projet, avec le runtime Codex chargé :

```powershell
$env:NODE_PATH='C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' marketing\motion-design\render-video.mjs
```

Le rendu utilise les visuels existants de `assets/onboarding`, une animation Canvas déterministe et une bande-son synthétique originale.

Pour contrôler cinq images clés après une modification :

```powershell
& 'C:\Users\DELL\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' marketing\motion-design\capture-qa.mjs
```
