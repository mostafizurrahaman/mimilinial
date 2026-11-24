
export function getArticle(word: string): string {
  const vowelSoundExceptions = /^(honest|honor|hour|heir)/i;
  const consonantSoundExceptions = /^(uni|use|user|euro|one)/i;

  if (vowelSoundExceptions.test(word)) return 'an';
  if (consonantSoundExceptions.test(word)) return 'a';

  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}