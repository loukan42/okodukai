# Direction artistique — Okodukai

## Vision

**Une petite aventure autour de vrais choix d'argent fictif.** Le solde, l'épargne, l'objectif et le gain d'une quête restent lisibles en premier. Le vocabulaire visuel vient du logo officiel : pièce frappée, encre bleu nuit, ivoire, feuilles vertes et fanion vermillon. L'interface enfant emprunte la sensation d'un journal d'aventure et d'un inventaire ; l'interface parent utilise les mêmes matières avec moins d'ornement.

## Références et limites

La mémoire émotionnelle des RPG et jeux de collection 1995–2010 guide la profondeur, les cadres et la progression. Aucun personnage, emblème ou motif d'une licence existante n'est repris. Écarter le tableau de bord bancaire sombre, le SaaS en cartes identiques, le gradient violet/bleu, l'emoji structurel, le verre flou systématique et les effets de jackpot.

## Grammaire visuelle

- **Formes** : panneaux découpés à coins de 18–24 px, petit filet intérieur, onglets qui évoquent des marque-pages. Les chiffres financiers sont plus grands et plus sobres que les ornements.
- **Matières** : parchemin ivoire à grain très fin pour le plan de lecture, ardoise bleu nuit pour les scènes, or brossé uniquement sur les pièces, récompenses et objets de collection. Un seul niveau de relief par rôle.
- **Lumière** : chaude et localisée autour du solde, d'un booster ou d'une carte révélée. Pas de lueur diffuse sur chaque composant.
- **Palette** : bleu nuit `#172941`, ivoire `#f6f0df`, encre `#21344a`, or `#d59b38`, vert feuille `#2d7254`, fanion `#bd5140`, ciel `#4a7895`. Les raretés reçoivent chacune une couleur, un contour et un motif distinct.
- **Typographie** : Fraunces pour les titres de chapitre et moments de jeu, Manrope pour les actions, chiffres et formulaires. Deux familles maximum ; texte courant de 15–16 px.
- **Iconographie** : pictogrammes SVG monolignes au trait arrondi, dans un médaillon à double bord. Pièce Okodukai dessinée en CSS/SVG à partir de la silhouette carrée évidée du logo ; jamais un simple symbole euro ou emoji.

## Objets et écrans

- **Personnage** : les avatars existants, cadrés dans un médaillon. Pas de mascotte ajoutée.
- **Pièce** : disque doré, double cercle, centre évidé carré. Disponible à 18, 24 et 48 px.
- **Coffre** : panneau d'épargne vert profond, chiffre de dépôt et jauge de l'objectif ; il évoque la patience, pas un gain aléatoire.
- **Quête** : ligne de journal avec numéro de chapitre utile, titre, état, pièces et XP. L'action reste explicite.
- **Objectif** : destination nommée, montant présent, montant restant et progression accessible sans la couleur.
- **Boutique** : étal de récompenses avec coût très visible et catégorie illustrée par une icône, sans image factice.
- **Cartes** : conserver les illustrations et les cadres dorés importés de *Héros de la classe*. Améliorer la galerie, les libellés de rareté, la lecture des doublons et les états verrouillés. Ne pas redessiner les cartes originales.
- **Booster** : conserver le packaging et la révélation existants. Animation courte, saut possible et réduction du mouvement. Le résultat reste décidé par le serveur.

## Mouvement et audio

Les réactions aux actions durent 120–400 ms. Le booster peut avoir une séquence plus longue mais doit être interrompable. La préférence `prefers-reduced-motion` supprime les transformations et séquences. Événements audio futurs : pièce, validation, XP, booster, rareté ; aucun son joué sans contrôle utilisateur.

## Parent, enfant et formats

Enfant : scène plus colorée, solde et objectif dès le premier écran, navigation à zones tactiles de 44 px. Parent : cockpit clair avec les validations avant les raccourcis, tables et formulaires sobres. À 360–430 px, une seule colonne et navigation fixe avec marge de sécurité ; tablette et desktop élargissent la scène et les grilles sans étirer les lignes de lecture au-delà de 80 caractères. Contraste, focus et libellés textuels priment sur les effets.

## Assets

`apps/web/public/logo-full.png` est le logo complet officiel ; `apps/web/public/icons/logo-mark.png` est sa marque compacte. Garder les 109 images de cartes locales et les avatars provenant de *Héros de la classe* ; ils sont gitignorés et devront rejoindre un stockage propre à Okodukai avant production. Garder les images de booster existantes. Ajouter les objets d'interface en SVG ou CSS natif et documenté. Ne pas générer une famille d'illustrations incompatible avec ces assets.
