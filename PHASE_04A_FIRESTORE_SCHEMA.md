# PHASE 04A — FIRESTORE DATA SCHEMA

## 1. Collection Structure & Schemas

### 1.1 `users/{userId}`
- `id`: string (Firebase Auth UID)
- `email`: string (required, must match `*@ecomspain.com`)
- `displayName`: string
- `avatarUrl`: string (optional)
- `role`: enum (`ADMIN`, `MARKETING_MANAGER`, `CONTENT_MANAGER`, `PRODUCT_MANAGER`, `DESIGNER`, `SALES`, `VIEWER`)
- `workspaceId`: string (default: `"default-ecomspain"`)
- `organizationId`: string (default: `"org-ecomspain"`)
- `active`: boolean
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string
- `lastLoginAt`: ISO 8601 string (optional)

### 1.2 `campaigns/{campaignId}`
- `id`: string (UUID)
- `workspaceId`: string
- `code`: string (e.g. `CAMP-2026-WIFI7`)
- `name`: string (e.g. `Q3 Enterprise Wi-Fi 7 & 10G PoE Switch Rollout`)
- `status`: enum (`DRAFT`, `PLANNED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`)
- `objective`: string
- `targetAudience`: string
- `targetPipelineEur`: number
- `budgetEur`: number
- `spentEur`: number
- `aiCostEur`: number
- `productIds`: string[] (references to `products`)
- `sourceIds`: string[] (references to `sources`)
- `ownerId`: string (reference to `users/{userId}`)
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string
- `createdBy`: string
- `updatedBy`: string

### 1.3 `contents/{contentId}`
- `id`: string (UUID)
- `workspaceId`: string
- `campaignId`: string (optional)
- `title`: string
- `slug`: string
- `category`: string (`wifi`, `switches`, `fibra`, `engenius`)
- `status`: enum (`DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`)
- `currentVersion`: number (int >= 1)
- `authorId`: string
- `canonicalBody`: map (Clean Markdown, H2/H3 hierarchy, editorial layout)
- `linkedProductIds`: string[]
- `linkedSourceIds`: string[]
- `versions`: array of `ContentVersion`:
  - `version`: number
  - `body`: map
  - `changeSummary`: string
  - `editedByUserId`: string
  - `isAIGenerated`: boolean
  - `aiProvenance`: map (optional)
  - `timestamp`: ISO 8601 string
- `latestAIProvenance`: map (optional)
- `approvedBy`: string (optional)
- `approvedAt`: ISO 8601 string (optional)
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string
- `createdBy`: string
- `updatedBy`: string

#### Subcollection: `contents/{contentId}/variants/{variantId}`
- `id`: string
- `contentId`: string
- `channel`: enum (`BLOG`, `MAILCHIMP`, `WHATSAPP`, `LINKEDIN`, `X_TWITTER`, `CASE_STUDY_PDF`)
- `status`: enum (`DRAFT`, `IN_REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`)
- `title`: string (optional)
- `bodyPayload`: map (Channel specific fields)
- `version`: number
- `isAIGenerated`: boolean
- `humanModified`: boolean
- `aiProvenance`: map (optional)
- `approvedBy`: string (optional)
- `approvedAt`: string (optional)
- `publishedAt`: string (optional)
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string

### 1.4 `usage_records/{recordId}` (FinOps)
- `id`: string
- `workspaceId`: string
- `timestamp`: ISO 8601 string
- `userId`: string
- `campaignId`: string (optional)
- `contentId`: string (optional)
- `action`: enum (`gemini_generation`, `gemini_angles`, `gemini_multimodal_advisor`, `imagen_image`, `firestore_read`, `firestore_write`, `cloud_run_req`)
- `model`: string (e.g. `gemini-2.5-flash`, `imagen-3.0-generate-002`)
- `tokensInput`: number
- `tokensOutput`: number
- `cachedTokens`: number
- `imageCount`: number
- `latencyMs`: number
- `estimatedCostEur`: number
- `currency`: `"EUR"`

### 1.5 `audit_logs/{logId}`
- `id`: string
- `workspaceId`: string
- `timestamp`: ISO 8601 string
- `userId`: string
- `userEmail`: string
- `action`: enum (`CREATE`, `EDIT`, `DELETE`, `APPROVE`, `REJECT`, `PUBLISH`, `GENERATE_AI`, `LOGIN`, `PERMISSION_CHANGE`)
- `entity`: string (`CAMPAIGN`, `CONTENT_ITEM`, `CONTENT_VARIANT`, `USER`, `LOCALSTORAGE_SYNC`)
- `entityId`: string
- `diff`: map (optional)
- `ipAddress`: string (optional)
- `userAgent`: string (optional)
- `source`: enum (`UI`, `SYSTEM_JOB`)

### 1.6 `sources/{sourceId}`
- `id`: string
- `workspaceId`: string
- `title`: string
- `type`: enum (`datasheet`, `pdf`, `note`, `url`, `competitor_intel`, `field_memo`)
- `description`: string
- `url`: string (optional)
- `fileStoragePath`: string (optional)
- `tags`: string[]
- `verified`: boolean
- `verifiedBy`: string (optional)
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string
- `createdBy`: string
