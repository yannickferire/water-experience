# Water Experience — Specs & fonctionnement

Expérience WebGL : un **diorama aquarelle** des **4 saisons** qu'on traverse
horizontalement au scroll, avec un **effet d'eau** au survol et un texte
contextuel. Inspiré du David Whyte Experience (Immersive Garden), reconstruit
avec nos propres assets et notre propre code.

---

## Stack

| Rôle | Techno |
|---|---|
| Framework | Next.js (App Router), client-only pour l'expérience |
| Rendu 3D | Three.js via React Three Fiber (`@react-three/fiber`, `@react-three/drei`) |
| Scroll lissé | Lenis |
| Shaders | GLSL inline (string TS) |
| Typo | `Caudex` (texte) + `Inter` (UI) via `next/font` |
| Déploiement | Vercel |

---

## Architecture des fichiers

```
app/
  layout.tsx        fonts + montage du custom cursor
  page.tsx          import client-only de l'Experience (no SSR)
  globals.css       reset, bloc texte, custom cursor
components/
  CustomCursor.tsx  curseur custom (anneau + point, double traîne)
  SeasonText.tsx    bloc de texte fixe à gauche (défile au scroll)
  Experience/
    Experience.tsx  coquille : <Canvas>, Lenis -> scrollRef, hauteur scrollable
    Scene.tsx       fond (ciel par saison) + map des couches
    Layer.tsx       une couche du diorama (mesh + shader + interactions)
    shaders.ts      vertex/fragment de la couche (reveal, distorsion, alpha)
    useWaterField.ts simulation d'eau GPU (FBO ping-pong) par couche
    LeafEmitter.tsx  particules « feuilles » au survol du feuillage
lib/
  scene.ts          description data-driven des couches (LayerDef[])
  seasonText.ts     textes par saison
  cursor.ts         pont event WebGL -> DOM (état hover du curseur)
```

Principe transverse : **data-driven**. Ajouter un élément = une entrée dans
`lib/scene.ts` (aucune logique à toucher).

---

## Fonctionnalités & specs

### 1. Diorama en couches (parallax horizontal + zoom)
- Chaque couche est un plan texturé, positionné le long d'un axe X (`scene.ts`).
- Le scroll (Lenis, lissé) donne un `scrollRef` 0..1 qui **pan** les couches vers
  la gauche : `panX = -scroll * parallax * viewportW * SCROLL_SPAN`.
  Plus une couche est « devant » (`parallax` élevé), plus elle bouge vite.
- 4 **stations** (saisons) à `x = s * 4.8`, s ∈ {0, ⅓, ⅔, 1}.
- **Zoom** doux au milieu du parcours : `zoom = 1 + 0.18·sin(scroll·π)`.
- Léger **parallax inverse à la souris** (les couches se décalent à l'opposé).

### 2. Ciel par saison
`Scene.tsx` interpole un dégradé (haut/bas) entre 4 palettes selon le scroll
(printemps → été → automne → hiver). Aucun asset, 100 % procédural.

### 3. Effet d'eau au survol (le cœur)
Simulé par couche dans un **FBO ping-pong** (`useWaterField.ts`, 256²) :
- **dépôt** rond le long du déplacement souris (le curseur est la tête) ;
- **diffusion** (l'eau s'étale) ;
- **absorption** : `HOLD` 1 s sans rien, puis **fondu** (`ABSORB_TAU`) **+
  rétrécissement** (`ERODE`) → la flaque est « bue » par le papier ;
- **largeur** de trace pilotée par la **vitesse** du curseur (`RADIUS_MIN/MAX`) ;
- **optimisation** : la sim d'une couche est **mise en pause** ~7 s après la
  dernière interaction → seule la couche survolée tourne.

La couche **échantillonne** ce champ (`shaders.ts`) :
- révèle l'aquarelle (pigment au repos `baseOpacity` → 100 % sous l'eau) ;
- bords **organiques** uniquement loin du centre (warp ∝ faiblesse de l'eau) ;
- **distorsion** = léger décalage d'image basse-fréquence animé, **confiné** à la
  zone mouillée **et** à l'intérieur de la forme (silhouette/tronc figés).

### 4. Compositing alpha + base papier
- `alpha` = « couverture » (1 - papier) → la **forme est opaque** (couvre ce qui
  est derrière), le **papier blanc autour est transparent**.
- À l'intérieur : **base papier texturée** + l'aquarelle par-dessus.
- **Masque d'intérieur érodé** : les structures fines (tronc, branches) ne se
  distordent pas → elles restent droites ; seules les grandes masses ondulent.

### 5. Apparition au chargement (reveal)
`uAppear` (par couche, étagé selon la profondeur) :
1. la **forme papier** apparaît d'abord ;
2. puis l'**aquarelle** se révèle en **vagues de gouttes** (3 couches de bruit
   décalées et mélangées — méthode décrite par le studio original).

### 6. Particules « feuilles »
Au survol du **feuillage** (vert, partie haute), `LeafEmitter.tsx` émet de
petites feuilles grises qui tournoient et retombent (pool GPU de 600 points,
blend multiply). Émission discrète (probabiliste).

### 7. Custom cursor
`CustomCursor.tsx` : un **point** qui suit la souris avec retard + un **anneau**
qui traîne davantage (clampé pour que le point reste dedans). Au survol d'une
image WebGL (event `cursor.ts`), l'anneau **rétrécit, devient blanc opaque** et
le point passe en blanc (transition CSS). Desktop uniquement.

### 8. Texte par saison
`SeasonText.tsx` : bloc **fixe à gauche** (30 % haut → 20 % bas). Les saisons
sont empilées et **défilent** dans cette fenêtre au scroll. Effet « verre » **par
ligne** selon sa position : une ligne près du haut/bas est **floutée + élargie +
fondue** ; au centre elle est nette. La 1ʳᵉ saison a un padding pour qu'au
chargement (avant scroll) aucun texte ne soit dans la zone d'effet.

---

## Réglages clés (où toucher)

| Effet | Fichier | Constante |
|---|---|---|
| Espacement des stations / vitesse pan | `Layer.tsx` | `SCROLL_SPAN` |
| Zoom du voyage | `Layer.tsx` | `ZOOM_AMP` |
| Longueur de scroll | `Experience.tsx` | hauteur `…vh` |
| Absorption de l'eau | `useWaterField.ts` | `HOLD`, `ABSORB_TAU`, `ERODE` |
| Largeur de trace | `useWaterField.ts` | `RADIUS_MIN/MAX`, `SPEED_*` |
| Force/forme distorsion | `scene.ts` (`distortion`) · `shaders.ts` | |
| Reveal (durée/étagement) | `Layer.tsx` (`/2.6`, `order*0.3`) | |
| Effet verre du texte | `SeasonText.tsx` | `EDGE`, blur `e*2.5`, scaleX `e*0.025` |
| Palettes de ciel | `Scene.tsx` | `SKY` |
| Contenu / positions | `lib/scene.ts`, `lib/seasonText.ts` | |

---

## Perfs

- Les couches **hors écran** sont **frustum-culled** → leur shader ne tourne pas.
- La **sim d'eau** est **en pause** sur les couches non survolées.
- DPR plafonné `[1, 2]`.

---

## Améliorable / connu

- **Espace colorimétrique** : les shaders bruts échantillonnent du sRGB sans
  décodage et n'encodent pas la sortie (« juste par accident » visuellement).
  À traiter proprement si on ajoute du grading ou que les couleurs dérivent.
- **Audio Vivaldi** : pas encore intégré (waveform réactive + crossfade par
  saison). Voir `ASSETS.md` pour la source libre (Musopen / John Harrison CC-BY).
- **Automne & hiver** : 1 seul élément chacun (manque un 2ᵉ asset de 1er plan).
- **Étalement « uniquement derrière »** : la diffusion est isotrope ; un
  étalement directionnel (anisotrope, biaisé par le mouvement) serait plus fidèle.
- **Bruit baké** : le studio bake ses bruits en texture (perf). On les calcule en
  live ; OK ici, mais à envisager si le nombre de couches augmente.
- **Mobile / responsive** : pensé desktop. Le custom cursor et certains réglages
  sont désactivés/non optimisés sur tactile ; le cadrage des couches mériterait
  des valeurs responsives.
- **Sampler CPU par couche** : chaque couche lit ses pixels via un canvas (pour
  le hover/particules). Pour de très grandes images, surveiller la mémoire.
