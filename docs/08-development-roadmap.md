# AURA DEVELOPMENT ROADMAP

**Product:** AURA
**Document:** Development Roadmap
**Version:** 1.0
**Status:** Pre-development

---

# 1. ROADMAP PRINCIPLE

AURA should be developed through vertical slices.

Do not build:

```text
20 features
↓
connect everything later
```

Instead:

```text
One complete user journey
↓
make it excellent
↓
measure
↓
expand
```

---

# 2. PHASE 0 — ENVIRONMENT AND FOUNDATION

Before implementation:

* inspect development environment
* inspect Node version
* inspect package manager
* inspect Expo tooling
* inspect iOS/Android availability
* inspect Supabase environment
* establish repository
* establish CI
* establish linting
* establish type checking
* establish testing

Do not choose dependencies blindly.

---

# 3. PHASE 1 — FIRST VERTICAL SLICE

Goal:

> Prove real wardrobe → outfit → modification → save.

Build:

### Authentication

* login
* account
* session

### Onboarding

* minimum appearance input
* basic style input

### Garment ingestion

* camera
* gallery
* image processing
* garment confirmation

### Closet

* garment browsing
* garment detail
* edit

### Styling

* generate outfit
* Mix & Match
* save outfit

### Learning

* record modifications
* record saves
* basic preference signals

This is the most important phase.

---

# 4. PHASE 1 SUCCESS CRITERION

A real user should be able to:

```text
Create account
↓
Add clothing
↓
See clothing in closet
↓
Create outfit
↓
Change pants
↓
Save outfit
```

without encountering fake or disconnected functionality.

---

# 5. PHASE 2 — CONTEXTUAL AURA

Add:

* weather
* occasion
* contextual Home
* proactive suggestions
* unused wardrobe discovery
* daily styling

Goal:

> Make AURA useful repeatedly rather than only during initial setup.

---

# 6. PHASE 3 — BEHAVIORAL PERSONALIZATION

Add:

* outfit modification learning
* saved outfit learning
* worn outfit tracking
* outfit photo signals
* repeated style patterns
* experimentation preferences

Goal:

> Make AURA noticeably better after repeated use.

---

# 7. PHASE 4 — INSPIRATION

Add:

* inspiration upload
* image analysis
* style extraction
* wardrobe matching
* missing-piece detection
* inspiration-to-personal-outfit transformation

Goal:

> Turn fashion inspiration into something actionable.

---

# 8. PHASE 5 — VTO

Evaluate and integrate the strongest available VTO solution.

Start with:

> generated image-based try-on

Then measure:

* visual realism
* garment fidelity
* latency
* cost
* repeat usage
* user trust

Only after validation consider:

* live VTO
* 3D avatar
* multi-angle VTO

---

# 9. PHASE 6 — STYLE EVOLUTION

Add:

* controlled experimentation
* style discovery
* personalized trend suggestions
* wardrobe utilization intelligence
* style evolution signals

Goal:

> Help users improve rather than merely repeat.

---

# 10. PHASE 7 — SHARING

Add:

* shareable outfit images
* outfit breakdowns
* inspiration transformations
* external share links

Goal:

> Turn successful fashion moments into acquisition.

---

# 11. PHASE 8 — CREATOR

Add:

* creator wardrobes
* shoot styling
* content planning
* creator outfit libraries
* public creator looks
* commerce links

Goal:

> Make AURA useful for creators with large wardrobes and frequent styling needs.

---

# 12. PHASE 9 — SHOPPING

Add:

* wardrobe gap detection
* product recommendations
* alternatives
* affiliate links
* creator commerce

Only begin after AURA has established trust.

---

# 13. PHASE 10 — ADVANCED R&D

Potential:

* live VTO
* 3D clothing
* persistent avatars
* advanced fit simulation
* multi-angle visualization
* advanced trend intelligence
* sophisticated creator commerce

These are optional future directions.

---

# 14. MVP FEATURE PRIORITY

## MUST HAVE

* Authentication
* Onboarding
* Garment ingestion
* Wardrobe
* Garment understanding
* Outfit creation
* Mix & Match
* Save
* Behavioral signals
* Contextual Home

## SHOULD HAVE

* Inspiration
* Worn outfit tracking
* Weather
* VTO
* Style experimentation

## NICE TO HAVE

* Calendar integration
* Social sharing
* advanced VTO
* creator features

## LATER

* commerce
* live VTO
* 3D
* creator marketplace
* brand integrations

## DO NOT BUILD INITIALLY

* social network
* generic fashion feed
* attractiveness scoring
* style score dashboards
* excessive gamification
* huge agent systems
* unnecessary microservices

---

# 15. DEVELOPMENT MILESTONE RULE

Every meaningful milestone must pass:

### Type checking

No type errors.

### Lint

No unexplained lint failures.

### Tests

Relevant tests pass.

### Runtime

Application actually launches.

### User flow

The complete intended flow works.

### Persistence

Data survives app restart where expected.

### Error handling

Failure states are handled.

### Loading

Long-running operations provide honest loading states.

### Image handling

Images work across realistic input sizes and formats.

---

# 16. FIRST PRODUCTION MILESTONE

The first major milestone should be:

> **REAL WARDROBE TO REAL OUTFIT**

User:

```text
Upload garment
↓
AURA processes it
↓
Wardrobe
↓
Create outfit
↓
Change garment
↓
Save
```

This must be excellent before major feature expansion.

---

# 17. SECOND PRODUCTION MILESTONE

> **AURA LEARNS**

User:

```text
Generate
↓
Modify
↓
Save
↓
Wear
↓
AURA records behavior
↓
Future recommendation changes
```

The product should demonstrate measurable personalization improvement.

---

# 18. THIRD PRODUCTION MILESTONE

> **AURA BECOMES CONTEXTUAL**

```text
Time
+
Weather
+
Occasion
+
Wardrobe
+
Personal Style
↓
Relevant recommendation
```

---

# 19. FOURTH PRODUCTION MILESTONE

> **AURA UNDERSTANDS INSPIRATION**

```text
Inspiration
↓
Understand
↓
Personalize
↓
Use wardrobe
↓
Identify gap
```

---

# 20. FIFTH PRODUCTION MILESTONE

> **AURA SHOWS ME**

VTO becomes part of the experience once quality meets the product threshold.

---

# 21. SIXTH PRODUCTION MILESTONE

> **AURA SPREADS**

Sharing and creator experiences create acquisition loops.

---

# 22. SEVENTH PRODUCTION MILESTONE

> **AURA MONETIZES TRUST**

Only after strong user value:

* premium AI
* premium VTO
* creator tools
* affiliate commerce

---

# 23. PRODUCT DEVELOPMENT LOOP

Every phase:

```text
Build
↓
Test
↓
Observe users
↓
Measure
↓
Identify friction
↓
Improve
↓
Repeat
```

Do not blindly execute the roadmap if evidence contradicts the product assumptions.

---

# 24. ROADMAP GOVERNANCE

A feature can be removed if:

* users don't value it
* it increases complexity without benefit
* retention does not improve
* it creates privacy risk
* cost becomes unjustifiable
* a better approach becomes available

The roadmap is a living strategy rather than a contract.

---

# 25. DEVELOPMENT PRINCIPLE

The most important rule:

> **Never build infrastructure merely because the future might need it.**

Build the simplest system that supports the current validated experience while keeping critical AI/image/service boundaries replaceable.

---

# 26. FINAL DEVELOPMENT NORTH STAR

AURA should eventually become:

> **A fashion companion that understands the user better every time they use it.**

But the first milestone is much simpler:

> **Give me a better outfit using my actual clothes.**

Everything else grows from proving that.
