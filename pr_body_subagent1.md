## RESUMEN DE CAMBIOS DE SUBAGENTE 1

### 1. Definición de Tipos TypeScript (`src/types/geo-content.ts`)
- Interfaces estrictas: `GeoArticleRequest`, `GeoArticleOutput`, `SchemaJsonLdOutput`, `ChannelContentRequest`, `ChannelContentOutput`, `LinkedinContentOutput`, `WhatsappContentOutput`, `ProductSheetContentOutput`.

### 2. Endpoints Atómicos GEO / AEO
- `/api/generate/geo-article`: `maxDuration = 60`, RBAC `withAuthAndPermission("ai:execute")`, FinOps (`checkAiBudget` y `recordAiUsage`). Prompt estructurado con párrafo Quick Answer (45-60 palabras con throughput real, puertos, consumo PoE y 0€ cuotas cloud recurrentes), tabla comparativa Markdown/HTML EnGenius vs Meraki/UniFi, arquitectura de red y mitigación de cuellos de botella 1G/10G.
- `/api/generate/schema-jsonld`: `maxDuration = 60`, RBAC `withAuthAndPermission("ai:execute")`, FinOps. Genera etiqueta `<script type="application/ld+json">` válida que integra `@type: "TechArticle"`, `@type: "Product"` y `@type: "FAQPage"` con 4 Q&As reales de ingeniería preventa.
- `/api/generate/channel`: `maxDuration = 60`, RBAC `withAuthAndPermission("ai:execute")`, FinOps. Generación bajo demanda para `linkedin` (hook < 210 chars, comparativa licencias, CTA), `whatsapp` (condensado, negritas, UTM) y `product-sheet` (viñetas comerciales y accesorios de venta cruzada).

### 3. Orquestador Vertex AI / Gemini (`src/server/orchestrator/antigravity-ts-provider.ts`)
- Configurado `activeModel` por defecto con `process.env.GEMINI_MODEL || "gemini-2.0-flash"` y fallback automático a `"gemini-1.5-flash"`.
- Eliminación total de respuestas genéricas de contingencia; devolución de errores explícitos o estructuras de datos válidas.

### 4. Verificación
- `npm run build` ejecutado exitosamente con 0 errores TypeScript/Next.js.
