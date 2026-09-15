import guideEn from './content/guide_en.md?raw';
import guideKn from './content/guide_kn.md?raw';
import guideTcy from './content/guide_tcy.md?raw';
import guideEnUrl from './content/guide_en.md?url';
import guideKnUrl from './content/guide_kn.md?url';
import guideTcyUrl from './content/guide_tcy.md?url';

const SUPPORTED_LANGUAGES = ['en', 'kn', 'tcy'];

// The bundled release keeps local development safe. Production can point
// VITE_GUIDE_MANIFEST_URL at an immutable-release CDN manifest.
export const bundledGuideRelease = {
  activeVersion: '1', releasedAt: '2026-09-16',
  guides: {
    en: { url: guideEnUrl, content: guideEn, reviewedAt: '2026-09-16' },
    kn: { url: guideKnUrl, content: guideKn, reviewedAt: '2026-09-16' },
    tcy: { url: guideTcyUrl, content: guideTcy, reviewedAt: '2026-09-16' }
  }
};

function isValidManifest(value) {
  return value && typeof value.activeVersion === 'string'
    && SUPPORTED_LANGUAGES.every((language) => typeof value.guides?.[language]?.url === 'string');
}

async function fetchCachedText(url, version) {
  const cache = 'caches' in window ? await caches.open(`krishi-guides-${version}`) : null;
  const cached = cache && await cache.match(url);
  if (cached) return cached.text();
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load guide (${response.status})`);
  if (cache) await cache.put(url, response.clone());
  return response.text();
}

export async function loadGuideRelease() {
  const manifestUrl = import.meta.env.VITE_GUIDE_MANIFEST_URL;
  if (!manifestUrl) return bundledGuideRelease;
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load guide manifest (${response.status})`);
  const manifest = await response.json();
  if (!isValidManifest(manifest)) throw new Error('Guide manifest is invalid');
  // All languages load before this is returned, making the release swap atomic.
  const content = await Promise.all(SUPPORTED_LANGUAGES.map((language) => fetchCachedText(manifest.guides[language].url, manifest.activeVersion)));
  return { ...manifest, guides: Object.fromEntries(SUPPORTED_LANGUAGES.map((language, index) => [language, { ...manifest.guides[language], content: content[index] }])) };
}
