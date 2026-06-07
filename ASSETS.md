# Assets — Voyage des 4 saisons (aquarelle)

Diorama aquarelle qu'on traverse **horizontalement** au scroll : Printemps → Été
→ Automne → Hiver (ordre de Vivaldi). Chaque saison est une « station » avec
1 à 2 éléments peints, sur fond de ciel dégradé qui change avec la saison.

## Format & compositing

- **Export sur fond BLANC, AUCUN détourage.** Le shader calcule la transparence
  (alpha = « couverture ») à partir de la luminance : la **forme peinte devient
  opaque**, le **papier blanc autour devient transparent**. Inutile de découper.
- PNG ou JPG, sRGB, ~1500–2048 px, sujet **centré, entier, avec marge**.
- Au rendu, la forme est posée sur une **base papier texturée** (générée en
  shader), et l'aquarelle se révèle dessus.

## Style (le « style bible »)

Aquarelle, à coller à chaque prompt pour rester cohérent :

```
loose watercolour painting, soft translucent washes, wet-on-wet bleeding edges,
visible paper grain, delicate pigment blooms, gentle light from the upper-left,
light airy palette, single isolated subject, plain white background, no hard
outline, no cast shadow, no frame, no text, centered with generous padding
```

Règles : un seul modèle/esthétique, **lumière haut-gauche** partout, cadrage
proche entre les 4 arbres-héros (même « espèce » qui change de saison). Outils
gratuits : Leonardo.ai, Bing/Designer (DALL·E 3), Google ImageFX, Draw Things (Mac).

## Assets en place (`/public/assets/`)

| Saison | Fichiers |
|---|---|
| 🌸 Printemps | `tree-spring.jpg` (héros) · `ducks-spring.jpg` (mare, 1er plan) |
| ☀️ Été | `tree-summer.jpg` (héros) · `sunflower-summer.jpg` (1er plan) |
| 🍂 Automne | `tree-autumn.jpg` (héros) |
| ❄️ Hiver | `tree-winter.jpg` (héros) |

Chaque fichier = une entrée dans `lib/scene.ts` (position `x` le long du voyage,
`scale`, `parallax`, `baseOpacity`, `distortion`, `particles`, `tilt`, `flipX`).

### À compléter plus tard
- Un 2ᵉ élément de premier plan pour **automne** et **hiver** (1 ligne chacun
  dans `lib/scene.ts`).
- Les **ciels** restent procéduraux (dégradé interpolé par saison) → pas d'asset.

## Audio — Vivaldi, Les Quatre Saisons (à intégrer)

Un mouvement par saison, crossfadé au scroll. Interprétation **libre**
obligatoire : **Musopen** → John Harrison / Wichita State University (CC-BY).
```
/public/audio/  spring.mp3  summer.mp3  autumn.mp3  winter.mp3
```
