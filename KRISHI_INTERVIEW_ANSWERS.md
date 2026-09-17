# Krishi — project interview answers

This is an implementation-accurate answer bank for the code reviewed on 17 September 2026. A few prompts in the supplied question bank describe an earlier version of the app. In particular, the current client uses `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, the Guide/Latest toggle does change answer behavior, the server validates request bodies, and the fallback state has its own label.

## 1. Project overview and product decisions

### What problem does Krishi solve, and who is its primary user?

Krishi makes locally relevant agricultural guidance easier to access for farmers in Dakshina Kannada. Its primary user is a farmer or farming household member who needs practical, readable help with crop choice, monsoon water management, soil, pests, markets, or schemes, often on a mobile device and in a preferred local language. It is not intended to replace an agronomist for field-specific diagnosis; it is a first layer of curated information and guided questions.

### Why Dakshina Kannada/Mangalore rather than India-wide agriculture?

Agronomy is highly location dependent. Dakshina Kannada has very high monsoon rainfall, lateritic uplands, lowland paddy areas, humid disease pressure, and established areca–pepper–cocoa systems. A nationwide guide would become vague or make unsafe generalisations. Scoping to one district allows the guide to foreground drainage, erosion, local crop systems, KVK support, and monsoon timing that are genuinely relevant to the user.

### What are the core user journeys?

Users select English, Kannada, or Tulu; read the full local Markdown guide; ask a typed or suggested question; receive either an extractive guide answer or an API-produced answer informed by relevant guide sections; and report an answer as outdated, unsafe, or unclear. The app also loads a bundled guide immediately, optionally checks for a newer release, and can keep static guide assets available through caching.

### Which farming topics does the guide cover, and how was it structured?

The guide covers climate and terrain; three-season paddy; pulses; areca, coconut, cashew, pepper, cocoa, rubber, vanilla, fruit, and vegetables; drainage; soil health; integrated pest management; post-harvest handling; KVK and insurance; markets; diversification; climate adaptation; schemes; technology; and sustainability. It is organised as Markdown `##` sections: each section is readable on its own and is also the retrieval chunk. That aligns human navigation with semantic-search boundaries.

### Why English, Kannada, and Tulu? What does Tulu add?

English supports users comfortable with technical terminology; Kannada is the state language and broadest local-language option; Tulu meets people who speak a deeply local language at home and may find advice more approachable in it. Tulu can reduce the language barrier and increase trust, especially for older users, but its written conventions and lower model support mean quality review is especially important.

### How do you keep translations semantically consistent?

Maintain one canonical section inventory and translation-memory/glossary for crop names, schemes, measures, safety wording, and headings. Give every section a stable source ID; review translations against the source with a native speaker and agriculture reviewer; then run parity checks for missing headings, images, metadata, and policy warnings. Current code loads all three guides atomically, but semantic equivalence still requires editorial governance rather than a technical guarantee.

### What does “locally grounded” mean, and how is this different from a generic chatbot?

It means answers start from an explicitly curated, district-focused guide instead of only a model’s broad training knowledge. The client retrieves up to three relevant local sections and sends them with the question in Latest mode; Guide mode displays only retrieved guide text. A generic chatbot may offer plausible national advice without awareness of coastal rainfall, local crops, or source quality. Grounding reduces that risk but does not turn model output into a field inspection or verified current fact.

### What are the functional and non-functional requirements?

Functional requirements are multilingual guide display, language switching, Markdown rendering, semantic/keyword retrieval, Guide and Latest answer modes, feedback submission, a remote guide-release option, and static serving. Key non-functional requirements are usable mobile performance, graceful offline/fallback behavior, privacy of API keys, safe agricultural wording, accessibility, reliable multilingual text handling, and cache/index invalidation when content changes.

### Why retain a static guide and suggested questions?

The static guide remains useful when the LLM API, model download, network, or semantic index is unavailable. It is transparent curated content and provides a safe baseline. Suggested questions reduce the blank-page problem: users need not know how to phrase a query, and the suggestions demonstrate high-value topics such as monsoon water, areca intercropping, and disease-risk reduction.

### How would you measure usefulness, and what assumptions/limitations exist?

Track question completion, fallback/no-match rate, answer-report rate by category, helpful/not-helpful feedback, repeat queries, language distribution, latency, and whether users follow links or escalation advice. Use consented interviews with farmers, extension workers, and native speakers to test comprehension. The prototype assumes a reasonably modern browser, intermittent but sometimes available connectivity, and basic reading ability; its limitations include no authentication, no verified live-search source, no field-specific diagnosis, limited current citations, browser ML download cost, and no automated test suite.

### What would you build in two more weeks?

First, add tests and observability; then source-level citations, dates, and a clearly named “Guide + model answer” mode instead of implying live information. Add a KVK/RSK escalation path, a content-review workflow, retries and request timeout, rate limiting, improved accessibility/focus management, and a multilingual retrieval evaluation set. I would not add new crops before improving factual review and safety controls.

## 2. Front-end architecture

### Why React and Vite? What is App.jsx responsible for?

React is appropriate for a stateful chat UI with conditional panels, language switching, asynchronous work, and repeated message rendering. Vite gives fast local development, straightforward asset imports, environment-variable support, and production bundling. `App.jsx` currently coordinates selected release/language, retrieval, conversation state, requests, and the page layout; it is effectively the application shell and orchestration layer.

### Why is it one component, and how would you split it?

For a small prototype, a single component keeps the data flow visible and reduces prop wiring. It will become hard to test and maintain as features grow. Extract `LanguageSwitcher`, `GuideViewer`, `ChatPanel`, `AnswerModeSwitcher`, `MessageList`/`Message`, `FeedbackActions`, and `ChatComposer`. Also move retrieval/index logic into a `useGuideSearch` hook and API calls into a small client module. I would extract `ChatPanel` and `GuideViewer` first because they are visually and behaviorally distinct; next extract the retrieval hook to separate UI from data processing.

### Which hooks are used, and why is state appropriate?

`useState` stores render-driving values: language, loaded release, release status, panel visibility, input text, messages, mode, in-flight state, and index status. `useMemo` derives sections from guide content/version/language without rebuilding them for every keystroke. `useEffect` performs side effects: refreshing releases on a timer and building/checking the index. `useRef` holds the `refreshingRelease` lock without triggering a render. This is appropriate because each value has clear UI or asynchronous-lifecycle significance.

### Why useMemo for sections, and what are its dependencies?

`buildSections` splits the selected Markdown guide and produces section IDs. Memoising avoids unnecessary parsing while typing or opening/closing chat. In the current code its dependencies are `currentGuide.content`, `lang`, and `release.activeVersion`—not only `lang`. Content and version matter because IDs and retrieval freshness change when a new release arrives.

### What happens on language switch? Why clear messages, and is that always best?

`switchLanguage` sets the new language and clears messages. The guide, labels, suggestions, semantic index, and retrieval corpus change; retaining prior answers risks mixing languages or falsely implying that an answer came from the newly selected guide. The tradeoff is lost conversation continuity. Alternatives are per-language histories, preserving history with a visible language/version badge, or offering translation, but each must preserve provenance and avoid reusing old context silently.

### Why StrictMode, and what does it expose?

`main.jsx` wraps `App` in React `StrictMode`. In development, React can deliberately re-render and re-run effect setup/cleanup to reveal impure rendering, missing cleanup, duplicated network/index work, and stale closure errors. Effects must therefore tolerate a development double invocation. The cancellation flag and `refreshingRelease` ref help here, although idempotent index operations remain important.

### How is Markdown rendered, and why use react-markdown plus remark-gfm?

`ReactMarkdown` converts Markdown into React elements rather than injecting a raw HTML string. `remark-gfm` adds GitHub-flavored Markdown features such as tables, strikethrough, task lists, and autolinks. This is safer than `dangerouslySetInnerHTML`: raw HTML is not blindly executed. Still, treat remote guide text as untrusted; do not enable raw HTML parsing without sanitisation, restrict link/image protocols, and consider a content-security policy.

### What do Vite raw imports do, and why bundle guides?

`?raw` imports each `.md` as a string; `?url` yields its built asset URL. Bundling gives immediate offline-safe startup and simple local development. The costs are a larger JavaScript/download footprint, loading languages the user may not need, and a release build needed for content updates. A larger app could dynamically import each language after selection and lazy-load Transformers.js/model assets; the first-use latency then needs a progress UI and a keyword fallback.

### How are icons and responsive layout used?

Lucide components supply consistent SVG visuals for language-independent affordances. Icons are not labels: buttons still need accessible names, which this code provides for close and send controls. CSS changes layout at 850px: desktop has a guide column and sticky chat panel; mobile uses a fixed, viewport-bounded chat overlay so the composer stays reachable without consuming the document’s full layout. Sticky works well beside a readable long guide; fixed is more controllable on a narrow scrolling screen.

### Which accessibility features exist, and what should improve?

Existing features include semantic `nav`, `main`, `section`, `article`, `aside`, real buttons and form submission, language/answer-mode ARIA labels, labels for icon-only actions, disabled busy controls, and Markdown structure. Improve heading hierarchy/localisation, visible focus styles, colour contrast, `aria-live="polite"` for new answers and index/error status, an explicit busy announcement, keyboard focus moved to the chat input when opened, and focus restored to the reopen button when closed. Also make feedback prompt/confirmation accessible and ensure fixed chat does not trap focus or obscure content at browser zoom.

## 3. Retrieval-augmented generation and semantic search

### Explain the end-to-end question path. Why is this RAG?

The user asks a question; greetings get an immediate local greeting. Otherwise `findSemanticAnswer` embeds the question, loads a validated local vector index, scores sections, and returns up to three matches; it falls back to keyword search when needed. In Guide mode, `getGuideAnswer` joins the matched section bodies. In Latest mode, the client posts question, language, guide version, and matches to `/api/ask`; the server gives the LLM the retrieved context. It is retrieval-augmented generation because retrieval happens before generation and the retrieved text augments the model prompt.

### Why retrieve sections instead of the full guide? How are they chunked?

Whole-guide prompts waste tokens, increase latency/cost, dilute relevance, and make it easier for a model to blend unrelated advice. `buildSections` splits on Markdown level-two headings with `content.split(/(?=^##\s)/m)`, retains only chunks with a detected heading, and embeds `heading + content`. The heading supplies topic context and is also displayed as a human-readable source label. Text before the first `##` is not returned as a section; if that text matters, make it a titled Introduction section or alter the parser.

### Which model is used, and what does feature extraction do?

The current source uses `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, not `Xenova/all-MiniLM-L6-v2` stated in the question bank. `pipeline('feature-extraction', model)` loads a Transformers.js embedding pipeline in the browser and returns vector representations of text. The multilingual paraphrase model is a sensible fit for English, Kannada, and Tulu written in Kannada script, but “multilingual” does not prove equal quality for every language or dialect; evaluate it with real local queries.

### Why browser embeddings, and what are the tradeoffs?

They keep guide content and query retrieval on-device, avoid a vector-search server, can work after model/index download, and reduce server cost. The costs are a large first model download, CPU/RAM/battery use, uneven support on lower-end phones, IndexedDB/browser compatibility, and slower first question. A backend is easier to update and monitor; browser retrieval is attractive for a small, privacy-conscious static guide when a keyword fallback remains available.

### Why mean pooling, normalisation, and dot product?

Token-level model outputs need one fixed-size representation per text; mean pooling averages token embeddings. `normalize: true` makes each vector unit length. For unit vectors, the dot product is equal to cosine similarity: `a·b = ||a|| ||b|| cos(theta) = cos(theta)`. If vectors are not normalised, a dot product is affected by vector magnitude and is not cosine similarity. The implementation therefore only works as intended because both section and query embeddings request normalisation.

### Why threshold 0.32 and top three? How would you tune them?

`0.32` is a practical initial gate: if the best semantic score is weaker, the app tries lexical matching instead of returning an arbitrary semantic neighbour. It is not a universal quality boundary. Build a labelled set of real questions with relevant sections, plot precision/recall and no-answer accuracy at thresholds, then choose a policy based on agricultural safety—typically prefer an honest no-match over a confident irrelevant answer. Three chunks balance coverage against prompt size and distraction. Too few misses complementary advice; too many add cost, contradiction, and irrelevant context.

### How would you evaluate and improve retrieval, especially for Kannada/Tulu?

Create a held-out, reviewer-labelled corpus across languages, crop names, code-switching, spelling variation, short queries, and no-answer cases. Measure Recall@3, MRR, precision of the top result, language parity, latency, and fallback rate. Improve with multilingual model benchmarking, local synonym/terminology dictionaries, better chunk sizes, transliteration handling, hybrid semantic-plus-keyword ranking, reranking, and native-speaker relevance review. Tulu has comparatively sparse representation in many models, so poor embeddings should lead to keyword/hybrid fallback and transparent uncertainty, not fabricated confidence.

### How is the model/index cached and invalidated?

`embedderPromise` ensures one model-pipeline load per page session. Section vectors are persisted in IndexedDB under database `krishi-vector-database-multilingual-v2`, keyed by section ID and tagged with language/version/content hash. `getVectorIndex` reads matching language/version entries, recomputes SHA-256 hashes for current heading/content, and rebuilds if count, ID order, or any hash differs. The `v2` database name is a schema/model separation from earlier vectors. IndexedDB is chosen over localStorage because vectors are large structured arrays and IndexedDB is asynchronous and capacity-friendly.

### What if IndexedDB/model search fails? Explain the keyword fallback.

`findSemanticAnswer` catches embedding/index failures and calls `findKeywordAnswer`; the UI sets `indexStatus` to `fallback` if background preparation fails. The fallback Unicode-tokenizes letters, combining marks, and numbers; removes a small English stop-word list; expands a few related terms such as rain/monsoon/drainage; then scores section-heading matches at four points and content matches at one. Heading weight reflects headings being concise topic labels. It is useful but limited: its English stopwords/synonyms do little for Kannada/Tulu morphology, spelling variants, and semantic paraphrases.

### Why asynchronous retrieval and how can UX/performance improve?

Model loading, embedding, hashing, IndexedDB, and network work are asynchronous and must not freeze rendering. Replace a single status string with stages—downloading model, indexing X of Y sections, ready/fallback—and retain a usable keyword path during preparation. Prewarm after first interaction or idle time, persist model assets via a service worker where suitable, lazy-load only the selected language, batch embeddings, and show a clear first-use progress indicator.

### How do Service Workers and remote releases affect offline behavior?

The worker cache-first serves GET requests under `/assets/` and `/guides/`; it ignores API POSTs. `guideRelease.js` also uses versioned Cache Storage (`krishi-guides-${version}`) and returns a release only after all languages load. That supports offline reuse after a successful fetch. Production should clean old caches, use versioned/immutable guide URLs, handle network failures explicitly, and never describe stale cached material as newly verified information.

### How would this scale to large corpora or many districts?

Use document/section metadata (district, crop, season, author, review date, language, source URL, safety tier), precompute embeddings in a controlled pipeline, filter by district/language, and retrieve through a backend vector index plus lexical search/reranking. Browser brute-force scoring is fine for dozens or hundreds of sections; at thousands of documents, large models, frequent updates, multi-user analytics, or strict source control, move retrieval and access policy to a backend/vector database. Delete stale local index records by tracking active versions and clearing old database stores/caches during activation or a scheduled maintenance step.

## 4. API and LLM integration

### Why a separate Node server? Why not call the provider from the browser?

The Node `http` server keeps `LLM_API_KEY` off the client, centralises validation, prompt policy, logging, rate limits, and provider integration, and serves the production static build. Browser-side provider calls would expose the key and allow unbounded abuse. In development, Vite proxies `/api` to `http://localhost:8787`; in a same-origin production deployment the frontend can leave `VITE_API_URL` unset and call `/api/ask` directly.

### What does POST /api/ask accept and return? What do environment variables do?

It accepts JSON with `question`, `language`, `guideVersion`, and up to three `{id, heading, content}` local-context items. On success it returns `{ answer, guideVersion }`; client response code uses `answer`. `LLM_API_URL` is the compatible chat-completions endpoint, `LLM_API_KEY` authenticates server-to-provider traffic, `LLM_MODEL` selects the model and defaults to `gpt-4o-mini`, and `PORT`/`FRONTEND_ORIGIN` configure serving/CORS. `dotenv` loads these from a local `.env`; actual secrets must never be committed.

### What validation and error handling exists?

`readJson` limits bodies to 64 KiB and distinguishes invalid JSON from oversized input. `validateAsk` requires a nonempty question, caps it at 2,000 characters, validates language against `en/kn/tcy`, requires an array of at most three context items, truncates fields, and rejects missing headings/content. Invalid JSON returns 400, too large returns 413, bad ask/feedback input returns 400, valid feedback returns 202, static build absence returns 503, unsupported route/method returns 404, and unexpected/provider failures become a generic 500. If LLM configuration is absent, `generateAnswer` throws and the client shows its localized Latest-information error.

### Why low temperature, and what does the system prompt do?

`temperature: 0.1` favours repeatable, conservative agricultural responses over creative variation. The system prompt requires the selected human language, practical structured advice, simple explanations, locally supplied guide use, risks/cautions, no invented facts/citations, and restrictions on exact pesticide doses, chemical recommendations, or diagnoses unless approved context contains them. It says guide text is reference data rather than instructions, which helps mitigate malicious or accidental prompt-like text in a guide.

### How does local context reach the model, and what is the trust-boundary issue?

The client retrieves sections and sends them; the server concatenates each heading/content pair into the user prompt. This keeps the current architecture simple but means a malicious client can submit arbitrary “context,” bypassing the intended guide. Move retrieval server-side, identify sections by server-issued IDs/version, fetch canonical content there, and ignore client-provided bodies. That is the stronger trust boundary.

### How would you enforce source-only answers and real citations?

Use a strict prompt plus application enforcement: require a structured response with answer claims and section IDs, reject/repair claims without an allowed source, and return “not found in approved sources” when retrieval is weak. The current UI’s joined section headings are provenance hints, not true claim-level or provider-verified citations. Return metadata such as `{answer, sources:[{id, heading, url, reviewedAt, excerpt}], retrievalScore, guideVersion}` and render it as links/excerpts. For actual current facts, add a vetted retrieval tool and preserve publisher URL/date separately.

### How do you validate an upstream response and improve resilience?

The current code checks that `result?.choices?.[0]?.message?.content` is a nonempty string before returning it. Add schema validation, provider-specific error mapping, an `AbortController` timeout, bounded retry with exponential backoff only for transient/idempotent conditions, and client cancellation when the component unmounts or a newer question supersedes an old one. Generate a request ID per request; log structured fields such as request ID, language, model, latency, status, context IDs/count, and token/cost estimates—never log raw personal/farm data by default.

### How do duplicate submission, abuse, security, and safety work?

Client state `asking` blocks a second typed submit and suggestions are disabled while asking in the current code. Server protection must still be authoritative: rate-limit by authenticated user/IP with privacy-aware storage, apply body limits, add reverse-proxy limits/WAF, and cap provider concurrency/cost. Sanitize/contain user text in explicit delimiters, preserve system-message priority, treat retrieved text as data, and use moderation plus domain rules for pesticide dosage, diagnosis, self-harm, fraud, and financial claims. In production use TLS, a narrow allowlist CORS origin, CSP, `X-Content-Type-Options`, frame protection, referrer policy, and secure cookies if authentication is introduced.

### How would deployment, caching, streaming, and conversations work?

Deploy the static Vite build and Node API behind one TLS reverse proxy or separately with explicit CORS; route `/api` to Node and static routes to `dist`, propagate client IP safely, limit request sizes/timeouts, and serve immutable hashed assets. Cache only carefully normalised, non-personal repeat queries keyed by guide version/language/context/model/prompt revision; do not cache private conversations. Stream provider tokens via SSE/fetch streaming and append safely to a pending assistant message. Conversation history requires an explicit user opt-in, retention policy, token budget/summarisation, encryption/access controls, and disclosure because it raises privacy and provider-cost exposure.

### What data is sent to the provider, and what privacy notice is needed?

Latest mode sends the question, selected language, guide version, and matched guide text. It should warn users that questions in Latest mode are sent to the configured AI provider; say what is retained, by whom, for how long, and how to avoid entering names, phone numbers, exact locations, account/land records, or claim identifiers. Redact obvious PII before forwarding where feasible, provide a Guide-only local option, and obtain meaningful consent before analytics or retaining feedback/conversations.

## 5. Current implementation gaps and corrections

### Does Guide/Latest actually change behavior?

Yes in the code supplied. `mode === 'guide'` calls `getGuideAnswer(matches, currentLabels.empty)` and makes no LLM request. `mode === 'latest'` calls `askLatest(...)`. The question-bank claim that both modes always call the API describes an older implementation.

### Does it provide current sources with citations?

Not fully. Latest mode does call an LLM API, but it does not perform live web, market, weather, or scheme retrieval. The displayed `source` is a joined list of local guide headings, not a dated, claim-level citation. Rename the mode/subtitle or implement vetted current-source retrieval and structured citation metadata.

### What happens on request failure, and are fallback/status controls correct?

`ask` catches failure, logs it, appends a visible localized `latestError` message, and clears `asking`. Guide mode already avoids the API and returns `labels.empty` on no local match. The current grounding note explicitly distinguishes `loading`, `fallback` (“Keyword matching is in use”), and ready; the contrary prompt is stale. A retry button and showing matching local excerpts after a Latest failure would still improve recovery.

### Is index writing safe? Are language guides equivalent?

The supplied `writeVectorIndex` opens a single read-write transaction and only puts the new vectors; it does not delete old records. Since reads filter by language/version and IDs include version, it remains correct but accumulates stale data over time. Add a safe cleanup transaction after/around writes. Current guide files contain sections 26–29 in English, Kannada, and Tulu, so the stated language-parity gap is not present in this revision; automated parity checks are still worthwhile.

### Are inputs, styles, README, and tests production ready?

The current server has substantially stronger validation than the question bank claims. `labels.empty` is used in Guide mode, and no `message.updatedAt` is rendered in the shown App component. `src/App.css` appears unused because `main.jsx` imports `index.css`; remove it only after confirming no other entry imports it. README/documentation and automated tests remain areas to improve: scripts are `dev`, `api`, `start`, `build`, `lint`, `preview`, with no test script.

## 6. Agriculture and domain answers

### Why is drainage emphasised over irrigation? Which crops fit the district?

Dakshina Kannada’s heavy southwest monsoon makes waterlogging, erosion, nutrient leaching, humidity, and root disease more immediate risks than water scarcity. Drainage does not make dry-season irrigation irrelevant: areca flowering and late paddy may still need reliable, efficient water. Low, moisture-retentive land suits paddy; well-drained loamy plantation sites suit areca, coconut, pepper, cocoa, banana, and vanilla systems; drier lateritic uplands can suit cashew; selected hill taluks suit rubber. Actual site selection needs soil, slope, salinity, water-table, and market assessment.

### Explain the rice calendar, paddy practice, and fallow pulses.

The guide describes Karthika/Yenel from roughly May–October, Suggi from October–January, and Kolake from January–April using residual moisture/irrigation. Three crops are an opportunity, not a mandate: Kolake is unsuitable without dependable late-season water. Use rainfall/humidity-suited shorter-to-medium varieties for main monsoon paddy; maintain bunds and drainage before the monsoon. Greengram, blackgram, or horsegram in paddy fallows can add a low-input harvest and biologically fix nitrogen; suitability still depends on residual moisture, seed availability, and local advice.

### Why areca and its intercrops? What are monocrop risks?

Areca is a signature long-term plantation crop suited to warm, humid, well-drained areas, but it takes years to bear and is vulnerable to drainage, disease, price, and climate risk. Pepper can climb supports, cocoa uses understory shade, banana provides earlier cash flow, and vanilla may add value; different canopy/root/timing niches can use land more efficiently. A single crop concentrates disease, weather, and price shocks, whereas diversified systems spread risk—provided competition, shade, labour, disease hygiene, and market capacity are actively managed.

### Why do pepper, cocoa, banana, and vanilla need special management?

Pepper needs well-drained root zones and a live/support tree because prolonged wetness raises quick-wilt risk. Cocoa quality depends on correct ripe-pod harvest, fermentation, and drying; poor processing lowers quality and price. Banana generates earlier returns while a plantation establishes but needs crop/market planning. Vanilla is high-skill and labour intensive because flowers often need hand pollination and pods need careful curing. These are guidance principles, not a substitute for local cultivar, spacing, or treatment advice.

### What about rubber, papaya, vegetables, and humidity?

Rubber can suit suitable hill areas such as Belthangady/Sullya but commits land for years and tapping is constrained by heavy rain. Papaya is especially sensitive to waterlogging/root rot, so it needs the best-drained site. Humidity raises fungal disease pressure for vegetables; raised beds, spacing, airflow, hygiene, drainage, monitoring, and locally approved integrated management reduce risk. Do not infer a diagnosis or pesticide dose from a text description alone.

### What is IPM, and why improve soil organic matter?

Integrated pest management combines prevention and observation—sanitation, spacing, drainage, resistant material where appropriate, biological/cultural measures, thresholds, and targeted approved treatment only when necessary. It is preferable to routine spraying because it can reduce unnecessary cost, resistance, non-target harm, residue, and false confidence. Compost, farmyard manure, green manure, and mulch add organic matter, improve structure and water/nutrient retention, buffer erosion/leaching, and support soil biology; they should complement a soil-test-based nutrient plan rather than be assumed to solve every deficiency.

### How do monsoon and post-harvest risk affect decisions?

Heavy rain can erode exposed slopes, leach nutrients, delay harvest/drying, and cause mould or spoilage. Maintain cover/mulch, contour/drainage measures appropriate to the site, avoid poorly timed nutrient applications, monitor forecasts, use covered drying space/tarpaulins, and store only produce that is dry enough. These reduce losses but are not guarantees; crop insurance requirements and local warnings must be verified before relying on them.

### What do KVK and local economics contribute?

KVK Dakshina Kannada can provide demonstrations, trials, training, and referral for locally relevant cultivation problems. Farm investment is affected by labour, remittances, urban land conversion, land tenure, market volatility, storage, transport, credit, and the long horizon of areca/rubber. Diversification protects income from one crop’s failure or price fall; it does not remove the need to estimate costs, labour, water, and buyers before planting.

### How should farmers adapt to shifting monsoons? What are market and technology practices?

Use observed rainfall and local forecasts rather than a rigid historical calendar; strengthen drainage, organic matter, moisture observation, and contingency planning. Market planning means estimating full cost, likely yield, quality, storage, transport, buyer options, and price risk before planting—not simply chasing the day’s highest price. Useful technology includes weather and price information, soil testing, field records/maps, irrigation controls, and expert consultations. Photo-based AI disease tools are triage aids, not diagnoses, and should escalate uncertain cases.

### Explain the named schemes.

PM-KISAN is income support for eligible farm families; PMFBY is crop-insurance infrastructure; Soil Health Card supports soil testing and nutrient recommendations; PMKSY supports water-use efficiency/conservation measures; KCC is a formal agricultural working-capital credit route; e-NAM is a digital agricultural-market platform. Eligibility, notified crops, premiums, benefits, application dates, subsidy levels, and local access change, so the app must direct users to current official RSK, agriculture department, KVK, bank, or scheme portals—not present fixed details as permanent.

### What sustainable practices and claims need expert verification?

The guide highlights IPM, integrated nutrient management, mulching/composting rather than residue burning, crop rotation/diversification, rainwater harvesting, tree/boundary biodiversity, pollinator protection, and erosion reduction. Claims needing expert/official verification before being prescriptive include pesticide/fungicide dose and timing, disease diagnosis, specific fertiliser ratios, insurance coverage, scheme eligibility/deadlines, local price forecasts, cultivar recommendations, irrigation schedules, and any advice affecting health, finance, or legal entitlement.

## 7. Data quality, responsible AI, and safety

### Who authored/reviews the guide, and how is it maintained?

The supplied code exposes `reviewedAt` but does not identify authors or an approval workflow. In an interview, state that production content needs named subject-matter authors, KVK/Department or qualified agronomist review, language review, versioned source references, release approval, expiry/review dates, and a rollback owner. Validate claims against official extension guidance and local trial evidence; update promptly when regulations, schemes, or disease advisories change.

### How do you distinguish general guidance from plot-specific advice and communicate uncertainty?

Use language such as “generally,” “for suitable well-drained sites,” and “confirm locally,” and collect only safe clarifying context such as crop, season, broad soil/drainage symptoms, and district. Do not infer soil chemistry, diagnosis, pesticide dose, or financial outcome. State evidence/provenance, missing context, and the next safe action—soil test, product label, KVK/extension officer, or field visit—rather than masking uncertainty with confidence.

### What should happen for dosage or diagnosis questions? How are hallucinations limited?

The system prompt forbids exact chemical recommendations/doses and diagnoses unless explicitly contained in approved context; a stronger production policy should refuse or constrain these requests, provide immediate low-risk steps, and route to an authorised local expert/label. Retrieval thresholding, Guide-only mode, source metadata, no-match messaging, structured citations, and evaluation sets all reduce hallucinations. General-knowledge answers must be labelled as such; they must never claim they came from the guide when they did not.

### How do you test multilingual quality and language selection?

Test a parallel set of questions and expected safe intents in all three languages with native speakers, including colloquial Tulu, code switching, typos, and agricultural terms. The server maps codes to human names (`English`, `Kannada`, `Tulu written in Kannada script`) in the system prompt, so it should answer in the requested human language rather than literal `en`, `kn`, or `tcy`; still verify output with automated script detection plus human review. A poor Tulu embedding should result in keyword/hybrid fallback or an honest no-match, not an irrelevant answer.

### What feedback/escalation, privacy, and compliance measures are needed?

The current feedback endpoint records category, optional comment, source IDs, language, version, and timestamp in NDJSON. Add a reviewer queue, severity alerts for unsafe reports, response/rollback workflow, and visible KVK/extension contact path. Obtain consent for data sent to providers, minimise retention, protect feedback files, describe deletion/contact rights, and avoid representing output as medical, legal, financial, insurance, or pesticide-label authority.

## 8. Testing, debugging, and delivery

### How do you run the project?

Run `npm install`; start the Vite frontend with `npm run dev`; start the API with `npm run api`; build with `npm run build`; serve the built app/API with `npm run start` after a build; check static output with `npm run preview`; and lint with `npm run lint`. Development separates Vite’s hot-reload frontend from the Node API; `vite.config.js` proxies `/api` to port 8787. Configure `.env` from `.env.example` without committing actual keys.

### How would you unit-test retrieval?

Test `buildSections` with headings, preamble, malformed Markdown, and version/language ID cases. Test hashes change only when heading/content changes. Mock IndexedDB (for example with fake-indexeddb) and mock the embedder with fixed vectors, then assert ranking, top-three limit, threshold behavior, stale-index rebuild, and fallback on rejection. Deterministic mock vectors are essential: do not make unit tests depend on downloaded model weights.

### How would you test the API and UI end-to-end?

Factor request handling into testable functions, then use a temporary feedback path and mock `fetch` to test valid/invalid JSON, 64 KiB limit, validation failures, provider errors/timeouts, malformed provider payload, CORS, and static path traversal. With Playwright/Cypress, test language switch, guide rendering, suggestions, guide-only no-network answer, Latest loading/error behavior, feedback state, keyboard focus, screen-reader announcements, and mobile viewport/zoom. Test slow model download/offline Cache Storage in browser automation or network throttling.

### What browser/performance checks matter?

Verify IndexedDB, Web Crypto, Unicode property escapes, service workers, wasm/WebAssembly dependencies used by Transformers.js, device memory, and low-end Android behaviour. Profile initial JS size, Markdown/image assets, model download, main-thread blocking, time-to-interactive, and first-answer latency with performance tools and real throttled devices. Consider capability detection and a non-semantic keyword-only mode when browser ML is unsupported.

### How do you test guide parity, CI, rollback, and documentation?

Create a CI content-lint that compares language section IDs/counts, required metadata, banned unsafe claims, link/image validity, and translation review status. CI should run lint, unit/integration/e2e tests, production build, dependency/security scanning, and deploy only approved versioned releases. Roll back a bad guide by changing the immutable manifest’s active version; roll back model/prompt code by deployment version and invalidate related index/cache namespaces. Documentation should cover architecture, prerequisites, scripts, environment-variable names and examples, local/prod deployment, data flow, content approval, safety limits, testing, incident rollback, and the rule that `.env` secrets are never committed.

## 60-second interview answer

“Krishi is a multilingual farming-information portal focused on Dakshina Kannada. It gives farmers a curated Markdown guide in English, Kannada, or Tulu, plus a chat interface. In the browser, the selected guide is split by headings, embedded with a multilingual Transformers.js model, cached in IndexedDB, and searched with normalised-vector similarity; a Unicode-aware keyword search is the fallback. Guide mode returns the local source text directly. Latest mode sends the question and up to three retrieved sections to a Node API, which keeps the LLM key server-side and applies a safety-oriented prompt. The design prioritises local context, low infrastructure, and graceful fallback. My next priorities would be verified current citations, server-side retrieval for a stronger trust boundary, content-review governance, safety escalation, rate limits, and automated multilingual tests.”
