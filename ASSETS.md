# Assets — Voyage des saisons (génération IA)

Diorama **aquarelle** en **couches PNG transparentes**, parallax + distorsion
au hover, traversant les **4 saisons** au scroll, sur **Les Quatre Saisons de
Vivaldi**. Style : aquarelle (lavis translucides) — colle au nom « water » et
sublime l'effet de distorsion liquide.

Principe : **les mêmes éléments restent visibles** dans toute l'expérience, mais
chaque élément **se transforme selon la saison** (feuillage, couleur du sol,
ciel), + des **surcouches météo** (soleil, pluie, neige, pétales).

---

## 0. Specs techniques (format) + compositing

**Méthode par défaut : `multiply` (PAS de détourage).** L'aquarelle a des bords
clairs/translucides que remove.bg supprime (il mange les feuilles claires). On
évite le problème : tu **exportes sur fond BLANC** et le shader composite en
`multiply` → le papier blanc devient invisible tout seul, les zones claires sont
préservées, rendu « pigment superposé » fidèle à l'aquarelle.

- Éléments à pigment sombre (arbre, faune, sol, collines, buissons) →
  **fond blanc, JPG ou PNG, AUCUN détourage**. C'est tout.
- Ciel (plaque de fond) → JPG/PNG **opaque**, plein cadre ~16:9.
- Résolution : **1500–2048 px** grand côté pour gros éléments, ~1024 px petits.
- Sujet **centré, entier, avec marge** (papier blanc qui respire autour).
- sRGB, 8-bit.

**Exception — éléments CLAIRS** (neige, soleil, oiseaux/fleurs blancs) : le
multiply ne sait pas afficher du clair sur du foncé. Pour eux → vrai PNG
transparent (générateur à alpha : **Recraft/Firefly/Ideogram**) OU blend
`screen`. Ils sont peu nombreux, on les traite à part.

---

## 1. STYLE BIBLE (à coller sur CHAQUE prompt)

> **Suffixe de style** — copie-le tel quel à la fin de chaque prompt :
```
, loose watercolour painting, soft translucent washes, wet-on-wet bleeding
edges, visible paper grain, delicate pigment blooms, gentle light from the
upper-left, light airy luminous palette, storybook diorama element, single
isolated subject, transparent background, no hard outline, no cast shadow,
no frame, no border, no text, centered with generous padding
```

Règles de cohérence :
1. **Un seul modèle / une seule esthétique aquarelle** pour tout le set.
2. **Même direction de lumière** (haut-gauche) sur TOUS les éléments.
3. **Variantes saisonnières** : pars de la version **été** comme base, puis
   **img2img / inpainting** en ne changeant QUE le feuillage / la couleur /
   la neige → la **silhouette reste identique** → crossfade propre.
4. Même **niveau de détrempe / mouillé** partout (ni trop sec sur l'un, ni trop
   délavé sur l'autre).
5. Fonds : laisse le **papier blanc** respirer autour du sujet (aide au détourage
   et garde le côté aquarelle).

---

## 2. Liste à générer (par couche, du fond vers l'avant)

> 🎯 **Astuce volume** : seuls le **ciel**, le **grand arbre** et le **sol**
> méritent 4 variantes peintes (fort impact). Les collines, animaux, buissons :
> **1 seule version** (palette neutre), la saison se fera par **étalonnage
> couleur dans le shader**. La météo (pluie/neige/pétales) = **particules en
> code**, pas des images.

### Couche 0 — Ciel (opaque, plein cadre, 4 variantes)
`sky-spring.jpg` / `sky-summer.jpg` / `sky-autumn.jpg` / `sky-winter.jpg`
- Spring : `painted spring sky, soft pale blue, light scattered clouds`
- Summer : `painted summer sky, bright clear blue, warm glow, few high clouds`
- Autumn : `painted autumn sky, grey overcast, heavy moody clouds, wind`
- Winter : `painted winter sky, pale cold white-grey, low soft light`
- (suffixe sky : `, loose watercolour sky, soft washes, wide format` `--ar 16:9`,
  **pas** transparent)

### Couche 1 — Collines lointaines (1 version, gradée par shader)
`hills.png` — `distant rolling hills, soft hazy horizon line`

### Couche 2 — Le grand arbre HÉROS (4 variantes — le signal de saison)
`tree-spring.png` — `large solitary oak tree covered in pink-white blossoms and buds`
`tree-summer.png` — `large solitary oak tree with full lush green canopy`
`tree-autumn.png` — `large solitary oak tree with orange red golden autumn leaves`
`tree-winter.png` — `large solitary oak tree, bare branches, light snow on limbs`
> ⚠️ Génère `tree-summer` d'abord, puis dérive les 3 autres en gardant **le même
> tronc / la même position** (inpaint le feuillage seulement).

### Couche 3 — Faune (1 version chacun)
`deer.png` — `a calm standing deer, side view`
`birds.png` — `a small flock of little birds in flight`
`rabbit.png` *(option)* — `a small rabbit sitting in grass`

### Couche 4 — Flore / sol premier plan
`ground-spring.png` / `ground-summer.png` / `ground-autumn.png` / `ground-winter.png`
- Spring : `foreground meadow strip with wildflowers and fresh grass`
- Summer : `foreground meadow strip, full green grass, tiny flowers`
- Autumn : `foreground strip with fallen leaves, dry golden grass`
- Winter : `foreground strip covered in snow, a few dry stems`
`bush.png` *(1 version, gradée)* — `a leafy bush / fern clump`

### Couche 5 — Surcouches météo *(optionnel — on peut le faire en code)*
`sun.png` *(été)* — `a soft glowing sun, painted halo` (transparent)
Pétales (printemps), pluie+vent (automne), neige (hiver) : **plutôt en
particules JS/shader** (plus souple) → tu n'as PAS besoin de les générer.

---

## 3. Placement / naming

```
public/
  assets/
    sky-spring.jpg   sky-summer.jpg   sky-autumn.jpg   sky-winter.jpg
    hills.png
    tree-spring.png  tree-summer.png  tree-autumn.png  tree-winter.png
    deer.png         birds.png        rabbit.png
    ground-spring.png ground-summer.png ground-autumn.png ground-winter.png
    bush.png
    sun.png
  audio/
    spring.mp3  summer.mp3  autumn.mp3  winter.mp3
```

Les chemins seront branchés dans `lib/scene.ts` (créé au Step 1).

---

## 4. Audio — Vivaldi, Les Quatre Saisons

Le scroll traverse les 4 concertos (un par saison). La musique pilote la waveform
**et** l'intensité de distorsion (réaction aux coups d'archet).

⚠️ Partition = domaine public, **enregistrements modernes = NON**. Utiliser une
interprétation **libre** :
- **Musopen.org** → **John Harrison / Wichita State University** (CC-BY) : la
  référence. Crédit : « Performed by John Harrison, CC-BY ».
- IMSLP / Wikimedia Commons → autres captations PD.

```
spring.mp3 = La Primavera (Allegro)
summer.mp3 = L'Estate (Presto — l'orage)
autumn.mp3 = L'Autunno (Allegro)
winter.mp3 = L'Inverno (Allegro non molto)
```
~1–2 min par saison, bouclable, suffit pour commencer.

---

## 5. Checklist génération

- [ ] Style bible collé sur chaque prompt
- [ ] Lumière haut-gauche partout
- [ ] `tree-summer` généré en 1er, 3 autres dérivés (même tronc/position)
- [ ] Fond BLANC (sans détourage) pour les éléments pigment ; transparent
      seulement pour les éléments clairs (soleil…)
- [ ] Sujets centrés, entiers, avec marge
- [ ] 4 ciels + 4 arbres + 4 sols ; le reste en 1 version
- [ ] Audio Vivaldi (CC) récupéré
