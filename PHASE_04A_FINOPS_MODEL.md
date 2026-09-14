# PHASE 04A — FINOPS & AI COST CONTROL MODEL

## 1. Official Pricing Matrix (Google Cloud & Firebase)

| Service / Resource | Unit of Metric | Cost (EUR) | Notes |
| :--- | :--- | :--- | :--- |
| **Gemini 2.5 Flash (Input)** | 1,000,000 tokens | **€0.070** | Highly optimized with prompt caching |
| **Gemini 2.5 Flash (Output)** | 1,000,000 tokens | **€0.280** | Multi-channel B2B structured JSON |
| **Google Imagen 3.0** | 1 generated image | **€0.028** | Photorealistic hardware rendering |
| **Firestore Reads** | 100,000 operations | **€0.060** | First 50k reads/day free on Spark tier |
| **Firestore Writes** | 100,000 operations | **€0.180** | First 20k writes/day free on Spark tier |
| **Cloud Run Requests** | 1,000,000 requests | **€0.380** | First 2M requests/month free |

---

## 2. Real-Time Telemetry & Attribution

Every AI inference automatically creates a persistent `usage_records` entry linking:
- `workspaceId` & `userId`
- `campaignId` (if part of an active campaign rollout)
- `contentId` (if generating an article or variant)
- `model` (e.g. `gemini-2.5-flash`)
- `tokensInput`, `tokensOutput`, `cachedTokens`
- `estimatedCostEur`

This allows answering all 3 core executive questions instantly:
1. *¿Cuánto hemos gastado en IA?* -> Aggregated sum of `usage_records` across the workspace MTD.
2. *¿Cuánto hemos gastado en esta campaña?* -> Filter `usage_records` where `campaignId == :id`.
3. *¿Cuánto cuesta generar un paquete multicanal?* -> Exact sum of tokens for `gemini_generation` + `imagen_image` (~**€0.031 total** per finished 4-channel pack).
