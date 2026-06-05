# Assets — Voyage horizontal des 4 saisons (aquarelle)

On traverse **horizontalement** 4 stations : **Printemps → Été → Automne → Hiver**
(ordre Vivaldi). Chaque saison = une petite compo en couches (parallax + zoom),
sur **Les Quatre Saisons de Vivaldi**.

Style : **aquarelle**, composité en **`multiply`** (fond blanc, pas de détourage).

---

## 0. Format (rappel)

- Éléments → **PNG ou JPG sur fond BLANC**, AUCUN détourage (le multiply rend le
  blanc invisible). sRGB.
- Sujet **centré, entier, avec marge**. ~1500-2048 px grand côté.
- Exception éléments **clairs** (soleil, neige, oiseaux blancs) → vrai PNG
  transparent OU blend `screen` (peu nombreux, traités à part).

## 1. STYLE BIBLE (coller à CHAQUE prompt)

```
, loose watercolour painting, soft translucent washes, wet-on-wet bleeding
edges, visible paper grain, delicate pigment blooms, gentle light from the
upper-left, light airy luminous palette, single isolated subject, plain white
background, no hard outline, no cast shadow, no frame, no text, centered with
generous padding
```

Cohérence : **un seul modèle/esthétique**, **même lumière (haut-gauche)** partout,
**même niveau de détrempe**. Outils gratuits : Leonardo.ai, Bing/Designer (DALL·E 3),
Google ImageFX, ou **Draw Things** en local (Mac).

---

## 2. À générer — 2 à 3 par saison

> 🎯 **Minimum viable = 2/saison** (héros + premier plan). Le 3e (accent) est
> optionnel mais ajoute de la vie. Les **ciels** ne sont PAS des assets (dégradé
> procédural qui change selon la station).

### 🌸 Printemps (Primavera)
- `spring-tree.png` — *a tree in spring blossom, pink and white buds, fresh light-green leaves* (héros)
- `spring-fore.png` — *a clump of wildflowers and fresh spring grass* (premier plan)
- `spring-accent.png` *(opt)* — *two small birds in flight*

### ☀️ Été (Estate)
- `tree-summer.jpg` — **déjà là** ✅ (héros)
- `summer-fore.png` — *lush summer grass with tiny flowers and a leafy bush*
- `summer-accent.png` *(opt)* — *a soft glowing sun* (élément clair → blend screen)

### 🍂 Automne (Autunno)
- `autumn-tree.png` — *a tree with orange, red and golden autumn foliage* (héros)
- `autumn-fore.png` — *fallen autumn leaves and dry golden grass* (premier plan)
- `autumn-accent.png` *(opt)* — *a calm standing deer*

### ❄️ Hiver (Inverno)
- `winter-tree.png` — *a bare winter tree, snow resting on the branches* (héros)
- `winter-fore.png` — *snow-covered foreground with a few dry stems* (premier plan)
- `winter-accent.png` *(opt)* — *a small evergreen fir tree dusted with snow*

**Total** : 7 nouveaux (minimum) → 11 (avec accents). L'été réutilise l'existant.

---

## 3. Placement

```
public/assets/
  spring-tree.png   spring-fore.png   spring-accent.png
  tree-summer.jpg   summer-fore.png   summer-accent.png
  autumn-tree.png   autumn-fore.png   autumn-accent.png
  winter-tree.png   winter-fore.png   winter-accent.png
```
Chaque fichier = une entrée dans `lib/scene.ts` (season, x le long du voyage,
profondeur/parallax, scale).

---

## 4. Conseils

- **Héros** des 4 saisons : garde un **cadrage/silhouette proche** d'un arbre à
  l'autre → la traversée paraît cohérente (même « espèce » qui change de saison).
- Lumière haut-gauche partout, palette désaturée/naturelle.
- Premier plan = pensé pour être **gros et proche** (parallax rapide), héros au
  milieu, et on garde des couches **lointaines pâles** (perspective atmosphérique).

---

## 5. Audio — Vivaldi (libre)

Un mouvement par saison, crossfade au passage de station. Interprétation **libre**
obligatoire : **Musopen** → John Harrison / Wichita State University (CC-BY).
```
public/audio/  spring.mp3  summer.mp3  autumn.mp3  winter.mp3
```
