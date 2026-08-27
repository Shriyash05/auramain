# AURA TECHNICAL ARCHITECTURE

**Product:** AURA
**Document:** Technical Architecture
**Version:** 1.0
**Status:** Pre-development architecture

---

# 1. ARCHITECTURE OBJECTIVE

The architecture must support a production-quality fashion application while avoiding premature complexity.

Primary requirements:

* scalable
* affordable
* replaceable
* testable
* privacy-conscious
* observable
* mobile-first

---

# 2. INITIAL PLATFORM

Recommended frontend:

**React Native + Expo**

Target platforms:

* iOS
* Android

AURA is a mobile-first product.

---

# 3. BACKEND DIRECTION

Recommended initial backend foundation:

**Supabase**

Potential responsibilities:

* authentication
* PostgreSQL database
* object storage
* authorization
* server-side functions
* background processing coordination where appropriate

This should not prevent future migration to dedicated services.

---

# 4. ARCHITECTURE PRINCIPLE

Avoid premature microservices.

Use clear logical boundaries first.

```text
AURA MOBILE APP
       |
       ↓
APPLICATION API
       |
       ├── AUTH
       ├── USER
       ├── WARDROBE
       ├── OUTFITS
       ├── PERSONALIZATION
       ├── INSPIRATION
       ├── VTO
       └── COMMERCE
```

These can initially live within a relatively simple backend.

---

# 5. MOBILE APPLICATION LAYERS

Conceptually:

```text
UI
↓
Feature Logic
↓
Domain Services
↓
API / Data Layer
↓
Backend
```

The UI should not directly call AI vendors.

---

# 6. FEATURE MODULES

Suggested logical modules:

```text
auth
onboarding
home
wardrobe
garments
outfits
mix-match
inspiration
vto
profile
notifications
personalization
```

The exact folder structure will be determined after inspecting the actual development environment.

---

# 7. AI SERVICE BOUNDARY

All AI functionality should sit behind replaceable interfaces.

Conceptually:

```text
AI SERVICE
├── Vision
├── Garment Analysis
├── Styling
├── Embeddings
├── Personalization
├── Inspiration Analysis
└── Trend Intelligence
```

The mobile app should not know which model produced the result.

---

# 8. VTO SERVICE BOUNDARY

VTO must be independently replaceable.

```text
VTO SERVICE
      |
      ├── Provider A
      ├── Provider B
      └── Future Internal Model
```

This allows AURA to change providers without redesigning the application.

---

# 9. IMAGE PIPELINE

```text
User Image
↓
Upload Validation
↓
Original Storage
↓
Processing Job
↓
Segmentation / Detection
↓
Attribute Extraction
↓
Processed Asset
↓
User Confirmation
↓
Wardrobe Item
```

The original image remains available according to retention policy.

---

# 10. IMAGE STORAGE

Separate conceptual asset types:

```text
Original
Processed
Thumbnail
Transparent Garment
VTO Input
VTO Output
User Outfit Photo
Inspiration
```

Storage access should be private by default.

---

# 11. BACKGROUND JOBS

Expensive operations should use asynchronous processing.

Examples:

* bulk garment processing
* high-resolution image processing
* VTO generation
* embedding generation
* large-scale personalization updates

Flow:

```text
Request
↓
Job Created
↓
Processing
↓
Result
↓
UI Update
```

---

# 12. FAILURE HANDLING

Every asynchronous AI job must have:

* pending
* processing
* completed
* failed
* cancelled where appropriate

Failures must be persisted sufficiently to support debugging and user recovery.

---

# 13. CACHING

Potential caching targets:

* processed garment images
* repeated VTO requests
* outfit candidate sets
* common trend information

Do not cache sensitive information inappropriately.

---

# 14. AUTHENTICATION

Potential providers:

* Apple
* Google
* email/password or passwordless

The exact authentication provider configuration will be finalized after environment inspection.

---

# 15. AUTHORIZATION

Every user-owned resource must be authorized by ownership.

Examples:

* wardrobe
* garments
* outfits
* photos
* VTO results
* inspiration
* preferences

Database-level policies should reinforce application-level checks.

---

# 16. PRIVACY

Sensitive information includes:

* face photos
* body photos
* wardrobe photos
* style preferences
* location
* calendar information
* behavioral history

Data collection must follow minimization principles.

Optional integrations should remain optional.

---

# 17. DATA DELETION

Users must eventually be able to:

* delete garments
* delete photos
* delete outfits
* disconnect integrations
* delete personalization data
* delete account

Deletion behavior must be defined for derived data as well.

---

# 18. OBSERVABILITY

The system should eventually capture operational telemetry around:

* request failures
* image processing failures
* AI latency
* VTO failures
* generation costs
* job duration
* backend errors

Product analytics should be separated from operational telemetry.

---

# 19. SECURITY

Requirements:

* secure authentication
* private image storage
* encrypted transport
* least-privilege service access
* protected secrets
* server-side AI credentials
* authorization at data layer
* auditability for sensitive operations

AI provider keys must never be shipped in the mobile application.

---

# 20. COST CONTROL

AI/image processing can become the largest variable cost.

Architecture should support:

* model selection
* provider switching
* caching
* resolution tiers
* generation limits
* asynchronous processing
* usage monitoring

Cost should be tracked per capability.

---

# 21. API DESIGN

API contracts should expose product concepts rather than provider concepts.

Good:

```text
createOutfit()
processGarment()
generateTryOn()
analyzeInspiration()
recordOutfitFeedback()
```

Bad:

```text
callOpenAIModelX()
callVTONProviderY()
```

Provider implementation must remain behind the service boundary.

---

# 22. TESTABILITY

Core domain logic must be testable without external AI calls.

Examples:

* garment filtering
* outfit composition rules
* ranking logic
* wardrobe ownership
* save behavior
* feedback processing
* context selection

AI calls should be mocked in unit tests.

End-to-end tests should use controlled environments.

---

# 23. ENVIRONMENT STRATEGY

At development start:

* inspect installed runtimes
* inspect package manager
* inspect Expo version
* inspect available native tooling
* inspect device/simulator availability
* inspect backend credentials
* inspect CI environment

Dependencies should be selected based on the actual environment rather than assumptions.

---

# 24. REPLACEABILITY

The following must remain replaceable:

* AI provider
* VTO provider
* image processing provider
* authentication provider
* storage layer
* recommendation implementation

This protects AURA against rapid AI market changes.

---

# 25. ARCHITECTURAL ANTI-PATTERNS

Do not:

* build unnecessary microservices
* create duplicate data layers
* couple UI to AI vendors
* hardcode provider responses
* store sensitive secrets in the client
* invent APIs
* build a 3D engine before product validation
* create unnecessary agent systems
* build infrastructure before proving user value

---

# 26. VERTICAL SLICE

The first production slice should be:

```text
User
↓
Add garment
↓
Process garment
↓
Wardrobe
↓
Create outfit
↓
Mix & Match
↓
Save
↓
Record feedback
```

This slice must work end-to-end before major expansion.

---

# 27. TECHNICAL NORTH STAR

The architecture should make it easy to replace technology without changing the user's experience.

The user should care about:

> “AURA helped me dress.”

not:

> “AURA used model X.”
