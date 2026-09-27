# Mouvement de l'expérience enfant

La vallée vit par petites réactions, sans masquer les chiffres ni retarder les actions.

| Moment | Déclencheur | Mouvement | État réduit |
| --- | --- | --- | --- |
| Plaque de lieu | Survol ou focus | Soulèvement de 5 px, 180 ms ; contour de focus visible | Plaque fixe et contour conservé |
| Personnage | Survol | Petit soulèvement et rotation de 2°, 180 ms | Personnage fixe |
| Navigation | Changement de route | Plaque dorée animée par Framer Motion, ressort court | Durée nulle |
| Quête validée | Réponse confirmée par le serveur | Pièces, XP, booster et personnage en victoire dans `QuestRewardCelebration` | État final sans déplacement |
| Pièces mises de côté | Réponse confirmée par le serveur | Pièces vers le coffre et rebond court du coffre | Soldes et progression mis à jour sans vol |
| Booster | Ouverture demandée par l'enfant | Anticipation, révélation par carte, rareté, récapitulatif ; commandes Tout révéler et Passer | Révélation lisible sans effets persistants |
| Observatoire | Nouveau bilan | Lanternes allumées en séquence discrète | Lanternes immédiatement visibles |
| Chargement | Attente réseau | Pièce lente et texte de lieu | Pièce immobile, texte inchangé |
| Arbre d'aventure | Le serveur renvoie plus d'XP que lors de la dernière visite sur cet appareil | Brève pousse de 850 ms ; la forme et la taille suivent le niveau et l'XP reçus | Forme finale visible immédiatement, aucune animation |

Les interactions de commande durent 120–250 ms. Le mouvement de lieu reste sous 550 ms. Aucun gain de pièce n'est animé avant confirmation serveur. La valeur finale est toujours accessible par texte et ne dépend pas d'un effet. Le son reste facultatif ; ses points d'insertion sont la pièce, le coffre, la quête, le booster, la rareté et le niveau. Le volume et l'activation doivent rester sous contrôle de l'utilisateur si le son est ajouté.
