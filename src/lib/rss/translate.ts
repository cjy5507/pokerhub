import translate from 'google-translate-api-x';

interface TranslationCache {
  ko: string;
  cachedAt: number;
}

const TRANSLATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const translationCache = new Map<string, TranslationCache>();

// Batch size limit to avoid rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY = 300; // ms between batches

function isKorean(text: string): boolean {
  // Check if text already contains Korean characters
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

function getCacheKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 200);
}

async function translateSingle(text: string): Promise<string> {
  if (!text || isKorean(text)) return text;

  const key = getCacheKey(text);
  const cached = translationCache.get(key);
  if (cached && Date.now() - cached.cachedAt < TRANSLATION_CACHE_TTL) {
    return cached.ko;
  }

  try {
    const result = await translate(text, { from: 'en', to: 'ko' });
    const translated = result.text;
    translationCache.set(key, { ko: translated, cachedAt: Date.now() });
    return translated;
  } catch (error) {
    console.error('Translation failed:', error);
    return text; // Return original on failure
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function translateTexts(
  texts: string[]
): Promise<string[]> {
  const results: string[] = new Array(texts.length);
  const toTranslate: { index: number; text: string }[] = [];

  // Check cache first for all texts
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || isKorean(text)) {
      results[i] = text;
      continue;
    }

    const key = getCacheKey(text);
    const cached = translationCache.get(key);
    if (cached && Date.now() - cached.cachedAt < TRANSLATION_CACHE_TTL) {
      results[i] = cached.ko;
    } else {
      toTranslate.push({ index: i, text });
    }
  }

  // Translate uncached texts in batches
  for (let batchStart = 0; batchStart < toTranslate.length; batchStart += BATCH_SIZE) {
    const batch = toTranslate.slice(batchStart, batchStart + BATCH_SIZE);

    const translations = await Promise.allSettled(
      batch.map((item) => translateSingle(item.text))
    );

    for (let j = 0; j < translations.length; j++) {
      const result = translations[j];
      results[batch[j].index] =
        result.status === 'fulfilled' ? result.value : batch[j].text;
    }

    // Delay between batches to avoid rate limiting
    if (batchStart + BATCH_SIZE < toTranslate.length) {
      await sleep(BATCH_DELAY);
    }
  }

  return results;
}
