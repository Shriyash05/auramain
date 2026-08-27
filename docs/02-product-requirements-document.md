# AURA — Product Requirements Document

**Status:** Draft for approval
**Product:** AURA
**Version:** 1.0
**Product stage:** Pre-development
**Core principle:** Make fashion easier and help people become better at dressing.

---

# 1. Product Vision

AURA is a personal fashion intelligence product that understands:

* the person
* their real wardrobe
* their personal style
* their fashion inspiration
* their context
* their behavior

and continuously connects those things to help them dress better.

AURA is not simply an AI outfit generator.

The long-term vision is:

> **AURA understands me, my wardrobe, and my style—and helps me become better at dressing.**

The product should progressively become more useful as the user interacts with it.

---

# 2. Product Problem

People increasingly consume fashion inspiration through Instagram, Pinterest, creators and other visual platforms.

At the same time, many people own large wardrobes.

But the systems remain disconnected.

A user may know:

> “I love this outfit.”

but not:

> “How do I recreate this with my clothes?”

They may own dozens of garments but still think:

> “I have nothing to wear.”

They may know they want to improve their style but not know:

> “What actually works for me?”

They may save hundreds of references without turning them into useful outfits.

AURA connects these disconnected pieces.

---

# 3. Target User

## Primary

Fashion-conscious people approximately 19–35 who:

* care about how they dress
* want to improve their personal style
* own a meaningful wardrobe
* consume fashion inspiration online
* regularly make outfit decisions
* enjoy visual experimentation
* want personalized recommendations rather than generic fashion advice

## Secondary

Creators and influencers who:

* own large wardrobes
* need outfits for different occasions and shoots
* frequently experiment with styling
* need wardrobe organization
* want to photograph outfits
* want to share outfits externally
* may eventually benefit from creator-commerce functionality

Creators are an important expansion market, but the core consumer experience should not depend on building a social network.

---

# 4. Core User Jobs

## Primary job

> Help me decide what to wear so I look and feel like myself.

## Secondary jobs

### Occasion

> Help me create an outfit appropriate for where I'm going.

### Inspiration

> Help me turn an outfit I love into something I can actually wear.

### Wardrobe

> Help me make better use of what I already own.

### Experimentation

> Let me explore combinations without forcing me to accept AI recommendations.

### Style improvement

> Help me discover what works for me and gradually improve my style.

### Shopping

> Tell me what I genuinely need instead of encouraging me to buy more.

### Confidence

> Help me feel confident about what I'm wearing.

---

# 5. Product Promise

AURA should make the user feel:

> **“AURA gets me.”**

The deeper outcomes are:

1. I know what to wear.
2. My wardrobe feels more useful.
3. I discover combinations I wouldn't have created myself.
4. I understand my style better.
5. I become better at dressing.
6. I feel confident in what I choose.

---

# 6. Product Philosophy

AURA should follow these principles.

## Real clothes > generic clothes

The user's actual wardrobe is the source of truth.

## Personal context > generic recommendations

A dinner tonight should influence recommendations more than a generic “trending outfits” feed.

## AI suggests > user controls

AURA can provide a strong starting point without taking creative control away from the user.

## Behavior > questionnaires

AURA should learn from what users actually do wherever possible.

## Visual > explanatory

The experience should show the user possibilities instead of constantly explaining algorithms.

## Invisible intelligence > AI dashboard

Users should notice AURA becoming smarter without managing a complicated “Style DNA” system.

## Buy better > buy more

Shopping should solve real wardrobe gaps.

## Evolve style > merely predict style

AURA should help users experiment and grow.

## Trust > engagement

No fake intelligence, fake accuracy or manipulative mechanics.

## User value > technical complexity

A technically impressive feature is not valuable unless it improves the user experience.

---

# 7. Core Product Loop

The central AURA loop is:

**USER**

↓

**WARDROBE**

↓

**CONTEXT**

↓

**STYLE + INSPIRATION**

↓

**AURA RECOMMENDATION**

↓

**VISUAL EXPLORATION**

↓

**USER MODIFICATION**

↓

**TRY / WEAR**

↓

**FEEDBACK + BEHAVIOR**

↓

**AURA LEARNS**

↓

**BETTER FUTURE RECOMMENDATIONS**

This learning loop is a fundamental part of the product.

---

# 8. Hero Experience

The primary experience should begin from a contextual fashion moment.

Example:

> **“Going out for dinner tonight? Let's get you dressed.”**

The user receives two choices:

### Create it for me

AURA creates a personalized outfit.

### Let me do it

The user enters Mix & Match and creates the outfit themselves.

This establishes two complementary modes:

**AI styling**

and

**creative styling.**

---

# 9. AURA Styling Flow

AURA considers relevant available information such as:

* actual wardrobe
* personal style
* appearance information
* preferred silhouettes
* color preferences
* occasion
* weather
* location/context when permitted
* upcoming plans when permitted
* recent outfits
* previous likes/dislikes
* saved outfits
* worn outfits
* inspiration
* current fashion trends
* wardrobe utilization
* previous user modifications

AURA then generates a complete outfit.

The recommendation should prioritize the user's existing wardrobe.

---

# 10. Outfit Visualization

The user should initially understand the outfit through the actual garments.

Then they should be able to select:

> **See it on me**

where available.

The intended experience is:

**outfit composition**

↓

**personal visualization**

↓

**decision**

VTO is important to the long-term product vision, but AURA must remain valuable without VTO.

The product must never represent an approximation as an exact reconstruction of a real garment.

---

# 11. Mix & Match

Mix & Match is a core user-controlled experience.

The user can independently explore categories such as:

* tops
* bottoms
* shoes
* outerwear
* accessories

Example:

**Keep everything**

→ tap **Pants**

→ **Best Matches**

→ swipe through pants

→ complete outfit updates immediately.

The same interaction can be used for other garment categories.

---

# 12. Intelligent Ranking

When browsing alternatives, AURA should use a hybrid approach:

### Best Matches

AI-ranked items based on:

* current outfit
* personal style
* context
* proportions
* colors
* occasion
* previous behavior

followed by:

### Explore All

The complete relevant wardrobe category.

The user should never feel trapped by the AI ranking.

---

# 13. AURA Guidance During Mix & Match

AURA may provide occasional guidance such as:

> “This works well.”

or:

> “Try something more relaxed.”

However:

**AURA must not constantly judge the user's choices.**

Mix & Match should remain a creative playground.

The system should intervene when it has genuinely useful information.

---

# 14. Outfit Saving

Users can save outfits they create or receive from AURA.

Saved outfits become:

* reusable wardrobe assets
* future recommendation signals
* style-learning signals
* potential shareable content

Saving an outfit should teach AURA something about the user.

---

# 15. Behavioral Learning

AURA should learn from behavior including:

* garments replaced
* garments retained
* garments skipped
* outfits saved
* outfits discarded
* recommendations accepted
* recommendations rejected
* outfits actually worn
* user-uploaded outfit photos
* repeated combinations
* repeated styling patterns

Example:

AURA recommends:

> oversized shirt + beige trousers + sneakers

User changes:

> beige trousers → black trousers

then saves the outfit.

AURA should learn from that modification.

The modification itself is valuable information.

---

# 16. Wardrobe Memory

AURA should distinguish between:

### Visual preference

“I liked this outfit.”

### Intent

“I saved this outfit.”

### Behavior

“I actually wore this.”

### Strong preference

“I wore this and repeated the combination.”

This distinction should improve future recommendations.

---

# 17. Wear Tracking

AURA should support several ways to establish that an outfit was worn.

### Manual

> Wore this

### Lightweight confirmation

> “Did you wear this today?”

### Outfit photo

The user uploads a photo of themselves wearing the outfit.

The photo provides a particularly strong signal because it connects:

**person + garments + actual usage.**

The system should not force the user to confirm every outfit.

---

# 18. Contextual Home

The Home experience should not behave primarily like a static dashboard.

AURA should understand useful contextual moments.

Examples:

> “Good morning. It's warm today. Here's what I'd wear.”

> “Dinner tonight? Let's get you dressed.”

> “Going somewhere after work? You could switch into this.”

> “You haven't worn this jacket in a while. Want to see what we can do with it?”

> “You have eight outfits you haven't worn yet that fit your current style.”

The Home experience should feel like a fashion companion.

---

# 19. Proactive Intelligence

AURA may proactively surface:

* upcoming occasions
* weather changes
* wardrobe rediscovery
* new inspiration
* new clothing
* travel
* style evolution
* unused outfits
* relevant trends

However, proactive behavior must be:

**high-confidence and useful.**

AURA should not become notification spam.

Users should ultimately have control over how proactive AURA is.

---

# 20. Inspiration

Users can provide:

* Pinterest images
* Instagram screenshots
* creator outfits
* saved fashion references
* personal inspiration photos

AURA should understand:

* garments
* colors
* silhouettes
* proportions
* layering
* footwear
* accessories
* aesthetic
* styling patterns

The goal is not blind copying.

The intended flow is:

**Inspiration**

↓

**Understand the look**

↓

**Find equivalent pieces in my wardrobe**

↓

**Create my interpretation**

↓

**Identify missing pieces if necessary**

---

# 21. Inspiration → Shopping

If the user wants to recreate a reference and something is missing, AURA can eventually say:

> “You can create most of this with your wardrobe. You're missing a pair of relaxed black trousers.”

Shopping recommendations should be secondary.

AURA should prioritize:

> **Can the user achieve the desired result with what they already own?**

Only then:

> **What purchase would unlock meaningful additional utility?**

---

# 22. Personal Style Learning

AURA should learn from:

* onboarding outfit photos
* inspiration
* likes
* dislikes
* saved outfits
* outfit modifications
* worn outfits
* repeated combinations
* skipped recommendations
* context
* wardrobe additions

The user should not need to maintain a complicated style profile.

The intelligence should remain mostly invisible.

---

# 23. Style Evolution

AURA should not only reinforce existing behavior.

Users should be able to control experimentation.

Example:

> “You've been gravitating toward relaxed silhouettes lately. Want to explore this further?”

or:

> “You usually play it safe. Want to try something different?”

The system should allow a user to choose how adventurous AURA should be.

Possible future control:

**Stay familiar ←→ Experiment**

This should not become a rigid personality score.

---

# 24. Trend Intelligence

AURA should understand current fashion trends.

But trends should be personalized.

Instead of:

> “Oversized silhouettes are trending.”

AURA should say:

> **“Oversized silhouettes are everywhere right now, and honestly, they fit the way you already dress. Want to try a few with your wardrobe?”**

The principle is:

**trend → personal relevance → action**

rather than:

**trend → generic recommendation.**

---

# 25. Onboarding

Onboarding should establish enough information to make AURA useful without becoming a form.

Potential inputs include:

### Appearance

User-provided face photo, with explicit consent.

Potential use:

* appearance understanding
* complexion/color considerations

### Body

Potential inputs:

* full-body image
* height
* optional additional information

Potential uses:

* proportions
* fit
* visualization
* styling

Weight should not automatically become mandatory.

AURA should investigate whether visual information provides sufficient value before requiring sensitive numerical information.

### Existing style

Users can provide:

* best outfit photos
* favorite looks
* inspiration

These become early style signals.

---

# 26. Wardrobe Ingestion

AURA should eventually accept:

* individual garment photos
* multiple photos
* bulk uploads
* screenshots
* retailer/product images
* photos containing garments
* photos of users wearing garments

The system should minimize manual data entry.

---

# 27. Garment Understanding

For every wardrobe item, AURA should distinguish:

### Original garment source

The user's actual uploaded image.

### Clean visual representation

A cleaned representation suitable for wardrobe browsing.

### Semantic attributes

Examples:

* garment type
* color
* pattern
* material where identifiable
* silhouette
* fit
* sleeve length
* neckline
* occasion suitability
* style characteristics

### Visualization representation

Whatever representation is required for downstream experiences.

### VTO representation

Whatever the selected VTO technology requires.

These must not be treated as one identical artifact.

---

# 28. User Corrections

If AURA gets something wrong, the user can edit it.

Example:

> AURA: White oversized shirt

User:

> Cream
> Regular fit

The corrected information should become a personalization signal.

AURA should reduce repeated mistakes for that user.

---

# 29. Original Image Preservation

The original uploaded garment image should remain associated with the wardrobe item.

AURA should never discard the source of truth simply because it created a processed representation.

This is particularly important for VTO and future model improvements.

---

# 30. Virtual Try-On

VTO is a major product capability but not the sole differentiator.

### Initial direction

Prioritize high-quality image-based VTO over building a complex 3D avatar system.

Potential long-term approaches can include:

* diffusion-based VTO
* image-based neural rendering
* segmentation/compositing
* hybrid 2D/3D systems
* live VTO
* persistent 3D representation

The provider/model should remain replaceable.

---

# 31. VTO Experience

Eventually:

**Select outfit**

↓

**See it on me**

↓

**Generate**

↓

**Inspect**

↓

**Change garment**

↓

**Regenerate**

↓

**Compare**

↓

**Save**

↓

**Share**

VTO output must accurately communicate its limitations.

No fake claims of exact physical garment reconstruction.

---

# 32. Social Sharing

AURA should not initially build a social network.

Instead, it should make great fashion outputs shareable externally.

Possible share formats:

* user wearing the outfit
* outfit breakdown
* inspiration → AURA interpretation
* outfit card
* creator look
* wardrobe transformation

The share should be designed to make the viewer curious about AURA.

---

# 33. Creator Experience

Creators can eventually use AURA as a private fashion operating system.

Potential capabilities:

* large wardrobe management
* shoot styling
* occasion styling
* outfit planning
* inspiration management
* outfit photography
* wear history
* VTO
* content-ready outfit sharing

Creators can then publish externally.

A shared creator look could contain:

* creator photo
* outfit
* individual garments
* product links
* alternatives
* AURA discovery entry point

This creates a creator acquisition and commerce loop without requiring AURA to become another social network.

---

# 34. Shopping

Shopping should remain secondary.

AURA can eventually recommend:

* missing wardrobe essentials
* items that unlock multiple combinations
* alternatives to inspiration pieces
* price-conscious substitutes
* relevant products
* creator-linked pieces

The recommendation engine should prioritize **wardrobe utility**, not commission.

---

# 35. Monetization

## Free

Potentially:

* basic wardrobe
* basic Mix & Match
* basic outfit creation
* saved outfits
* foundational personalization

## Premium

Potentially:

* advanced AI styling
* unlimited/high-volume generation
* premium VTO
* advanced inspiration interpretation
* deeper wardrobe intelligence
* style evolution
* advanced context awareness

## Creator

Potential future premium tier:

* large wardrobe capacity
* shoot planning
* creator styling workflows
* advanced visualization
* commerce tools

## Commerce

Potential future:

* affiliate revenue
* creator commerce
* brand partnerships

Shopping recommendations must remain trustworthy and user-beneficial.

---

# 36. MVP

The MVP should prove one complete loop.

## Must have

1. Authentication
2. Onboarding
3. Essential appearance/style inputs
4. Real garment ingestion
5. Garment understanding
6. Wardrobe
7. AI outfit creation
8. Mix & Match
9. Save outfit
10. Behavioral feedback
11. Basic learning
12. Contextual Home experience

## MVP success loop

> Add real clothes
> ↓
> AURA understands them
> ↓
> AURA creates an outfit
> ↓
> User changes it
> ↓
> User saves it
> ↓
> AURA learns

This is the minimum loop that proves the product thesis.

---

# 37. MVP VTO Position

VTO should be evaluated as part of the MVP rather than blindly required.

The deciding factor should be:

> **Can we provide sufficiently realistic visualization of the user's actual clothing on the user without compromising the entire experience?**

If yes, it becomes a powerful MVP component.

If not, the MVP should still provide an excellent outfit exploration experience and introduce VTO when its quality is genuinely good enough.

---

# 38. Explicitly Out of MVP

* social network
* public creator marketplace
* full affiliate marketplace
* complex 3D avatars
* live AR try-on
* advanced analytics dashboards
* style scores
* attractiveness scores
* excessive gamification
* giant Style DNA questionnaire
* full shopping feed
* unnecessary microservices
* multi-agent architecture
* fake AI metrics

---

# 39. Functional Requirements

## FR-1 — User account

Users must be able to create and access an AURA account.

## FR-2 — Permissions

AURA must request permissions contextually and explain why they are useful.

## FR-3 — Onboarding

Users must be able to provide the minimum information needed for meaningful personalization.

## FR-4 — Garment upload

Users must be able to add garments from supported image sources.

## FR-5 — Garment processing

AURA must transform uploaded images into usable wardrobe representations.

## FR-6 — Correction

Users must be able to correct garment information.

## FR-7 — Wardrobe

Users must be able to browse and manage garments.

## FR-8 — Outfit generation

AURA must generate outfits from the user's wardrobe.

## FR-9 — Mix & Match

Users must be able to replace individual outfit categories without rebuilding the entire outfit.

## FR-10 — Ranking

AURA should rank alternatives intelligently while preserving access to all relevant garments.

## FR-11 — Save

Users must be able to save outfits.

## FR-12 — Learning

Meaningful user behavior must become available to the personalization system.

## FR-13 — Wear tracking

Users must have lightweight ways to indicate that an outfit was worn.

## FR-14 — Context

The system should support contextual recommendations.

## FR-15 — Inspiration

Users must eventually be able to provide fashion references.

## FR-16 — Visualization

The system should support personal outfit visualization where technically reliable.

---

# 40. Non-Functional Requirements

AURA must prioritize:

### Performance

Image-heavy workflows must feel responsive.

### Reliability

Failures must be visible and recoverable.

### Privacy

Sensitive imagery and behavioral information must be protected.

### Replaceability

AI/VTO providers must not be deeply coupled to the product.

### Scalability

Architecture should support growth without requiring a complete rewrite.

### Truthfulness

No simulated capabilities should be presented as real.

### Accessibility

Core interactions must remain usable across supported devices.

---

# 41. Privacy Requirements

AURA should follow data-minimization principles.

Potential sensitive information includes:

* face images
* body images
* wardrobe photos
* style preferences
* location
* calendar data
* behavioral history

Users should have control over:

* permissions
* stored imagery
* integrations
* deletion
* account removal

Optional integrations should remain optional unless a core experience genuinely requires them.

---

# 42. Trust Requirements

AURA must never fabricate:

* garment recognition
* VTO quality
* personalization
* body measurements
* AI analysis
* confidence
* recommendation accuracy

If a process is approximate, the product should represent it honestly.

---

# 43. Success Metrics

The first metrics should measure whether AURA actually creates value.

## Activation

Percentage of new users who:

> add garments → receive/create an outfit → save or meaningfully modify it.

## First-value time

Time from account creation to first useful outfit.

## Outfit engagement

* outfits generated
* outfits modified
* outfits saved

## Wardrobe engagement

* garments added
* garments used in outfits
* previously unused garments surfaced

## Learning engagement

* repeated use
* recommendation modifications
* accepted recommendations
* worn outfits

## Retention

* next-day return
* weekly return
* monthly return

## Core metric hypothesis

A particularly important future metric may be:

> **Number of meaningful outfit decisions assisted per active user per week.**

This is more meaningful than raw AI generations.

---

# 44. Product North Star Hypothesis

The long-term North Star should likely relate to:

> **successful fashion decisions assisted by AURA**

rather than:

* number of generated images
* number of AI prompts
* number of products clicked
* time spent browsing
* notifications opened

The product should optimize for users **getting dressed better**, not spending more time inside the app.

---

# 45. Major Risks

## Risk 1 — Wardrobe ingestion friction

If adding clothes is painful, the entire personalization loop fails.

**Response:** prioritize bulk ingestion and automatic processing.

## Risk 2 — AI styling feels generic

If recommendations don't feel personal, AURA becomes another outfit generator.

**Response:** behavioral learning and actual wardrobe context must matter.

## Risk 3 — VTO looks fake

Poor visualization can destroy trust.

**Response:** quality threshold before positioning VTO as a core promise.

## Risk 4 — Too many features

AURA could become a collection of fashion utilities.

**Response:** preserve the core loop.

## Risk 5 — Proactive behavior becomes annoying

**Response:** confidence-based contextual interventions and user controls.

## Risk 6 — Privacy concerns

**Response:** data minimization, clear consent and strong deletion/control mechanisms.

## Risk 7 — Shopping corrupts recommendations

**Response:** wardrobe utility comes before commerce.

## Risk 8 — AI becomes overbearing

**Response:** user remains in control, especially in Mix & Match.

---

# 46. MVP Product Thesis

The MVP should prove this statement:

> **If AURA understands my real wardrobe and learns from how I style and wear it, it can help me make better outfit decisions than I could make alone.**

Everything else is secondary until that statement is proven.

---

# 47. Long-Term Product Thesis

If the MVP succeeds, AURA can expand into:

**Personal fashion intelligence**

connecting:

**WARDROBE**

*

**STYLE**

*

**INSPIRATION**

*

**CONTEXT**

*

**BODY / APPEARANCE**

*

**EXPERIMENTATION**

*

**WEAR HISTORY**

*

**SHOPPING**

*

**CREATOR WORKFLOWS**

into one continuously learning system.

---

# 48. Final Product Definition

AURA is not fundamentally a wardrobe app.

It is not fundamentally an AI stylist.

It is not fundamentally a VTO app.

It is not fundamentally a shopping app.

It is not fundamentally a creator platform.

Those are capabilities.

The product is:

> **A personal fashion intelligence system that understands what you own, how you dress, what inspires you, what you're doing, and what you actually wear—and uses that understanding to help you make better fashion decisions.**

The experience should feel like:

> **Having a fashion-savvy friend who knows your entire wardrobe, understands your taste, remembers what you've worn, keeps up with fashion, helps you experiment, and gets better at styling you over time.**

But unlike a human stylist, AURA can continuously remember the user's wardrobe and behavior.

That compounding memory is the core strategic opportunity.

---

