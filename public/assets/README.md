# /public/assets — où déposer les visuels

Aquarelle, **compositée en `multiply`** → tu exportes **sur fond blanc**,
**sans détourer** (JPG ou PNG, peu importe l'alpha pour ces éléments).

## Pour tester maintenant
Dépose simplement :

```
tree-summer.jpg   (ou .png)   ← le grand arbre, version été, sur fond blanc
```

> Le code cherchera `tree-summer` en premier pour le test du Step 1.

## Set complet (au fur et à mesure)

Éléments à pigment sombre → **fond blanc + multiply** (pas de détourage) :
```
hills.png
tree-spring.png  tree-summer.png  tree-autumn.png  tree-winter.png
deer.png  birds.png  rabbit.png
ground-spring.png  ground-summer.png  ground-autumn.png  ground-winter.png
bush.png
```

Plaque de fond ciel (opaque, ~16:9) :
```
sky-spring.jpg  sky-summer.jpg  sky-autumn.jpg  sky-winter.jpg
```

Éléments CLAIRS (neige, soleil, blanc) → traités à part (vrai PNG transparent
ou blend `screen`), PAS en multiply :
```
sun.png   (+ neige/pétales = plutôt particules en code)
```

Voir [../../ASSETS.md](../../ASSETS.md) pour les prompts et la méthode complète.
