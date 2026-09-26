/**
 * Version du moteur de simulation. À incrémenter dès qu'un changement modifie un résultat
 * (paramètres, ordre des tirages, règles de frais, arrondis…). Une simulation en cours garde la
 * version et la trajectoire figées à sa création.
 *
 * Convention : finsim-MAJEUR.MINEUR.CORRECTIF
 * - MAJEUR : modèle de marché ou de portefeuille changé (trajectoires différentes) ;
 * - MINEUR : paramètres recalibrés ou scénario ajouté ;
 * - CORRECTIF : correction sans effet sur les nombres (renommage, doc).
 */
export const ENGINE_VERSION = "finsim-1.0.0";
