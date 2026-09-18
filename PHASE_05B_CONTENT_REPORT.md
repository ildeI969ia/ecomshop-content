# PHASE 05B — CONTENT WORKSPACE, WYSIWYG & VERSIONING REPORT

## 1. Editorial Lifecycle & Immutable Versioning

The editorial pipeline strictly enforces the sequential progression:

```
BRIEFING → DRAFT → AI GENERATION → HUMAN EDIT → VERSION → APPROVAL → READY
```

- **Zero Destructive Overwrites:** Every technical edit (e.g. updating PoE budget figures or cable standards) generates a new incremental entry in the `versions` array of the `ContentItem`.
- **Dual Attribution:** Clearly distinguishes between `isAIGenerated: true` (with model and token provenance) and `isAIGenerated: false` (recording the human editor's UID and timestamp).
- **Approval Locking:** When an article reaches `APPROVED` status by a `MARKETING_MANAGER` or `ADMIN`, subsequent edits increment the `currentVersion` and require a fresh approval cycle before publication.

---

## 2. WYSIWYG Sanitization & Anti-XSS Rigor

All rich text rendered or exported for Durable CMS, Mailchimp, or web previews is filtered through `isomorphic-dompurify`.

```html
<!-- Malicious payload tested -->
<script>stealSession()</script><img src="x" onerror="leak()" />
<!-- Output rendered safely -->
<img src="x" />
```
