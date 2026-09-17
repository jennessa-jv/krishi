import guidePublicKeyPem from '../public-key.pem?raw';

const SUPPORTED_LANGUAGES = ['en', 'kn', 'tcy'];
const DEFAULT_GUIDE_MANIFEST_URL = 'https://krishi-guides.onrender.com/manifest.json';

// This provides an empty, safe initial state while the signed remote release loads.
export const bundledGuideRelease = {
  activeVersion: 'loading', releasedAt: null,
  guides: {
    en: { content: '# Loading guide…' },
    kn: { content: '# ಮಾರ್ಗದರ್ಶಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ…' },
    tcy: { content: '# ಮಾರ್ಗದರ್ಶಿ ಲೋಡ್ ಆಪುಂಡು…' }
  }
};

function isValidManifest(value) {
  return value && typeof value.activeVersion === 'string'
    && SUPPORTED_LANGUAGES.every((language) => {
      const guide = value.guides?.[language];
      return typeof guide?.url === 'string';
    });
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, '');
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

function base64ToArrayBuffer(base64) {
  const bytes = Uint8Array.from(atob(base64.replace(/\s/g, '')), (character) => character.charCodeAt(0));
  return bytes.buffer;
}

let verificationKey;

async function verifyGuide(content, signature) {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot verify guide signatures');
  verificationKey ??= crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(guidePublicKeyPem),
    { name: 'Ed25519' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' },
    await verificationKey,
    base64ToArrayBuffer(signature),
    new TextEncoder().encode(content)
  );
  if (!valid) throw new Error('Guide signature is invalid');
}

async function fetchCachedText(url, signatureUrl, version) {
  const cache = 'caches' in window ? await caches.open(`krishi-guides-${version}`) : null;
  const cached = cache && await cache.match(url);
  const content = cached
    ? await cached.text()
    : await (async () => {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Unable to load guide (${response.status})`);
      return { content: await response.text() };
    })();
  const text = typeof content === 'string' ? content : content.content;
  const signatureResponse = await fetch(signatureUrl, { cache: 'no-store' });
  if (!signatureResponse.ok) throw new Error(`Unable to load guide signature (${signatureResponse.status})`);
  await verifyGuide(text, await signatureResponse.text());
  if (!cached && cache) await cache.put(url, new Response(text));
  return text;
}

export async function loadGuideRelease() {
  const manifestUrl = import.meta.env.VITE_GUIDE_MANIFEST_URL || DEFAULT_GUIDE_MANIFEST_URL;
  const response = await fetch(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load guide manifest (${response.status})`);
  const manifest = await response.json();
  if (!isValidManifest(manifest)) throw new Error('Guide manifest is invalid');
  // All languages load before this is returned, making the release swap atomic.
  const content = await Promise.all(SUPPORTED_LANGUAGES.map((language) => {
    const guide = manifest.guides[language];
    const guideUrl = new URL(guide.url, manifestUrl).toString();
    const signatureUrl = new URL(guide.signatureUrl || `${guide.url}.sig`, manifestUrl).toString();
    return fetchCachedText(guideUrl, signatureUrl, manifest.activeVersion);
  }));
  return { ...manifest, guides: Object.fromEntries(SUPPORTED_LANGUAGES.map((language, index) => [language, { ...manifest.guides[language], content: content[index] }])) };
}
