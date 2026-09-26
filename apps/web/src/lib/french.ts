/** Élision devant un prénom qui commence par une voyelle ou un h muet : « d'Emma », « qu'Emma ». */
const VOWEL = /^[aeiouyhàâäéèêëîïôöùûü]/i;
export const deName = (name: string) => (VOWEL.test(name) ? `d'${name}` : `de ${name}`);
export const queName = (name: string) => (VOWEL.test(name) ? `qu'${name}` : `que ${name}`);
