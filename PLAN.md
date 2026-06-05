# Water Experience — Plan de développement

Diorama **impressionniste interactif** : des éléments peints (arbre, maison,
moutons, collines…) disposés en **couches de parallax**, **immobiles au repos**,
avec **distorsion au survol de chaque élément**. Au scroll, on traverse les
**4 saisons** (voyage des saisons). Texte/légende contextuel + son réactif.

**Stack** : Next.js (App Router) + React Three Fiber + drei + Lenis + GLSL.
**Concept** : Voyage des saisons. **Assets** : génération IA (voir `ASSETS.md`).
**Déploiement** : Vercel.

On avance **étape par étape**, validation à chaque step.

---

## ⚠️ Changement de cap (vs scaffolding initial)

Le Step 0 visait UNE image fullscreen animée en continu. Le concept retenu est
différent : **plusieurs sprites détourés**, **statiques au repos**, distorsion
**uniquement au hover**. Donc on va :
- remplacer le plan fullscreen unique par un **système de couches** (`Layer`)
- supprimer l'animation permanente (`uTime` au repos = scène figée)
- déclencher la distorsion **par élément, au survol**

Fichiers du Step 0 réutilisés : config, `shaders.ts` (à adapter), structure.

---

## État actuel

- [x] Step 0 — Scaffolding (config, deps, fonts, Canvas lançable)
- [x] `ASSETS.md` — pack de prompts IA + composition en couches
- [ ] Assets générés par toi et posés dans `/public/assets/` (en cours, de ton côté)

---

## Step 1 — Système de couches + composition statique

**But** : afficher la scène composée (sprites empilés aux bonnes profondeurs),
**sans interaction**, juste la compo.

- [ ] `lib/scene.ts` : description des couches (asset, z/depth, échelle, position)
- [ ] `components/Experience/Layer.tsx` : un sprite peint (plane + texture alpha)
- [ ] `Scene.tsx` : empile les couches selon `lib/scene.ts`
- [ ] Placeholder si assets pas prêts (silhouettes) — swap trivial ensuite

**Validation** : la scène ressemble à un petit tableau composé, bonnes échelles.

---

## Step 2 — Distorsion au hover (par élément)

**But** : survoler un élément → effet de distorsion « peinture qui ondule »
**localisé**, retour au calme à la sortie. Repos = net.

- [ ] Adapter `shaders.ts` : distorsion pilotée par `uHover` (0 au repos)
- [ ] Détection hover par couche (raycast sur l'alpha du sprite)
- [ ] Réglage intensité / easing entrée-sortie

**Validation** : seuls les éléments survolés ondulent, c'est fluide et propre.

---

## Step 3 — Parallax multi-plans (souris)

**But** : profondeur. Les couches se décalent à des vitesses différentes selon
la souris, **à l'opposé** du curseur (parallax inversé).

- [ ] Décalage par couche fonction de sa profondeur + position souris
- [ ] Lissage (inertie), amplitude par couche
- [ ] (option) léger tilt de la caméra pour renforcer la 3D

**Validation** : sensation de profondeur crédible, mouvement doux.

---

## Step 4 — Scroll = voyage des saisons (le cœur)

**But** : au scroll, la scène passe printemps → été → automne → hiver.

- [ ] Lenis + conteneur scrollable → `season` (0..3 continu)
- [ ] Crossfade des variantes du **chêne** (`tree-spring/summer/autumn/winter`)
- [ ] Étalonnage couleur saisonnier des autres couches (shader grading)
- [ ] (option) surcouche pétales / neige selon la saison

**Validation** : la transition de saison est fluide et lisible.

---

## Step 5 — Texte / légende contextuelle

**But** : un court texte à gauche qui change selon la saison (ou au survol d'un
élément). Typo placeholder à remplacer.

- [ ] `TextLayer.tsx` synchronisé avec la saison
- [ ] Crossfade du texte

**Validation** : texte bien placé, lisible, synchro.

---

## Step 6 — Son réactif : Vivaldi, Les Quatre Saisons

**But** : chaque saison joue son concerto de Vivaldi (interprétation libre, voir
`ASSETS.md`). La musique alimente la waveform SVG **et** la distorsion (le shader
réagit aux coups d'archet via un `uAudio`).

- [ ] 4 pistes audio (1 mouvement marquant par saison), crossfade au scroll
- [ ] `AnalyserNode` → waveform SVG + uniform `uAudio` (intensité distorsion)
- [ ] `SoundWave.tsx` (path SVG réactif)
- [ ] Bouton son on/off, gestion autoplay (1er clic utilisateur)
- [ ] Crédit interprète (CC-BY)

**Validation** : la musique change avec la saison, la courbe + la peinture réagissent.

---

## Step 7 — Finitions

- [ ] Boutons (restart…), indicateur scroll
- [ ] Responsive / mobile (touch, perfs, dpr)
- [ ] Remplacement assets + typos définitifs
- [ ] Build + déploiement Vercel

---

## Notes / décisions

- Distorsion **hover-only**, repos figé (pas d'idle animation permanente).
- Saison = crossfade du chêne (héros) + grading shader pour le reste (évite de
  générer 4× toute la scène).
- Assets : voir `ASSETS.md`. Placement `/public/assets/`, chemins dans `lib/scene.ts`.
- Shaders inline (string TS), pas de loader à configurer.
