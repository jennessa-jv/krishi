# Zero-downtime guide releases

The app always keeps its current release visible until it has downloaded and verified every language file in the next release. It checks the configured manifest on load and every five minutes. Each guide vector is stored under `version:language:section`, so an older index stays usable while the new one is created.

## Publish a release

1. Publish immutable guide files and their signatures first, such as `/guides/42/en.md` and `/guides/42/en.md.sig`. Never replace either file for an existing version. Sign from the guide deployment environment with `GUIDE_PRIVATE_KEY_PATH=/secure/path/private-key.pem npm run sign:guides`; the private key must never enter the React repository, build environment, or deployed application.
2. Validate all languages and obtain reviewer approval. Record each guide's `reviewedAt` date.
3. Atomically replace only `manifest.json` at the configured `VITE_GUIDE_MANIFEST_URL` with this shape:

```json
{
  "activeVersion": "42",
  "releasedAt": "2026-09-16",
  "guides": {
    "en": { "url": "https://cdn.krishi.example/guides/42/en.md", "signatureUrl": "https://cdn.krishi.example/guides/42/en.md.sig", "reviewedAt": "2026-09-16" },
    "kn": { "url": "https://cdn.krishi.example/guides/42/kn.md", "signatureUrl": "https://cdn.krishi.example/guides/42/kn.md.sig", "reviewedAt": "2026-09-16" },
    "tcy": { "url": "https://cdn.krishi.example/guides/42/tcy.md", "signatureUrl": "https://cdn.krishi.example/guides/42/tcy.md.sig", "reviewedAt": "2026-09-16" }
  }
}
```

Set `Cache-Control: no-store` (or a very short TTL) on the manifest. Set a long immutable cache lifetime on versioned guide files. The Service Worker and Cache Storage retain immutable guide/version assets for offline reuse.

## Roll back

Publish no new files. Atomically point the manifest back to the last healthy version. Existing users can finish on their already loaded version; clients that refresh the manifest receive the previous version after its complete language set is available.

## Feedback review

The UI sends only answer ID, guide version, language, retrieved section IDs, category, and timestamp to `POST /api/feedback`. The development server appends those records to `data/feedback.ndjson`, which is ignored by Git. For multi-instance production deployment, replace that local file with a shared database or review-ticket service before scaling; a local disk is not durable across server replacements.
