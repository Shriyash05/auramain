# AURA UX ARCHITECTURE

**Product:** AURA
**Document:** UX Architecture
**Status:** Approved working specification
**Version:** 1.0

---

# 1. UX NORTH STAR

AURA should feel like opening a fashion companion that already knows enough about the user to help without requiring the user to repeatedly explain themselves.

The experience should minimize:

* forms
* configuration
* searching
* manual categorization
* unnecessary typing
* technical terminology

The experience should maximize:

* visual discovery
* experimentation
* fast decisions
* personal expression
* wardrobe exploration
* confidence

The user should feel:

> "AURA gets me."

---

# 2. CORE UX MODEL

AURA consists of five conceptual areas:

1. HOME
2. CLOSET
3. CREATE
4. INSPIRATION
5. PROFILE

Additional experiences should appear contextually:

* MIRROR / TRY ON
* SHOPPING
* OUTFIT MEMORY
* STYLE INSIGHTS

Memory should primarily remain an underlying intelligence rather than a permanent primary navigation destination.

Shopping should remain secondary to wardrobe and styling.

---

# 3. PRIMARY NAVIGATION

Recommended primary navigation:

```text
HOME
CLOSET
CREATE
INSPIRATION
PROFILE
```

Contextual destinations:

```text
MIRROR
SHOP
OUTFIT MEMORY
STYLE INSIGHTS
```

The navigation should not become overloaded.

---

# 4. HOME

Home is not a traditional dashboard.

It should feel like a contextual fashion conversation.

The primary content should change according to:

* time
* weather
* known occasions
* calendar context when permitted
* recent behavior
* wardrobe state
* inspiration
* unfinished outfits
* relevant trends

Example:

> Good morning.
> It's warm today.

Then:

> Here's what I'd wear.

Show the outfit.

Actions:

* Wear this
* Change
* See it on me
* Create my own

---

# 5. HOME PRIORITIZATION

Home should prioritize the single most relevant fashion opportunity.

Avoid:

* large analytics dashboards
* excessive cards
* multiple competing AI suggestions
* meaningless statistics

The hierarchy should be:

```text
Primary fashion moment
        ↓
Primary action
        ↓
Secondary opportunities
        ↓
Optional discovery
```

---

# 6. CONTEXTUAL HOME EXAMPLES

Examples:

> Dinner tonight?
> Let's get you dressed.

> Good morning.
> It's going to be warm today. Here's what I'd wear.

> You haven't worn this jacket in a while.
> Want to see what we can do with it?

> You have 8 outfits you haven't worn yet that fit your current style.

> You've been saving relaxed silhouettes lately.
> Want to try one with your wardrobe?

AURA should not surface every possible insight simultaneously.

---

# 7. PROACTIVE INTELLIGENCE

AURA may proactively identify:

* upcoming occasions
* weather changes
* wardrobe rediscovery
* unused outfits
* new wardrobe additions
* relevant inspiration
* travel
* style experimentation opportunities
* relevant trends

Proactivity must be confidence-based.

AURA should not become notification spam.

Users should eventually control notification intensity.

---

# 8. CREATE

Create is the user's active styling workspace.

Two primary modes:

## AURA STYLE

AURA creates the starting outfit.

## MIX & MATCH

The user creates the outfit themselves.

The two modes should feel like complementary experiences rather than separate products.

---

# 9. AURA STYLE

AURA should avoid forcing users through long questionnaires.

The system should infer as much as possible from:

* wardrobe
* personal style
* context
* weather
* occasion
* inspiration
* previous behavior

Optional user input can refine the result.

Examples:

* casual
* polished
* experimental
* date
* dinner
* work
* party
* travel

---

# 10. OUTFIT RESULT

The outfit result should show:

1. Complete outfit
2. Individual garments
3. Save
4. Change
5. See it on me
6. Share

The visual composition should dominate the screen.

---

# 11. MIX & MATCH

Mix & Match is a visual styling playground.

The user can independently browse:

* tops
* bottoms
* shoes
* outerwear
* accessories

Example:

```text
TOP
← garment → garment → garment →

BOTTOM
← garment → garment → garment →

SHOES
← garment → garment → garment →
```

Changing one garment should immediately update the complete outfit.

---

# 12. GARMENT RANKING

When the user opens a category, AURA should show:

## BEST MATCHES

AI-ranked based on:

* current outfit
* personal style
* context
* color relationships
* proportions
* previous behavior

Then:

## EXPLORE ALL

Allow the user to freely browse relevant garments.

The AI must never trap the user inside its ranking.

---

# 13. AURA GUIDANCE

AURA can provide lightweight feedback.

Examples:

> This works really well.

> Try something more relaxed.

> These trousers balance the proportions nicely.

However:

AURA should not constantly comment.

The user must be able to experiment freely.

The AI should act as a collaborator rather than a critic.

---

# 14. GARMENT DETAIL

Garment detail should include:

* original garment image
* cleaned representation
* garment name
* attributes
* last worn
* wear count
* outfits using it

Actions:

* Style this
* Mix & Match
* See on me
* Edit

---

# 15. ADD CLOTHING

Users should be able to add clothing through:

* Camera
* Gallery
* Bulk upload
* Screenshot
* Product image

The system should support messy real-world inputs.

Examples:

* multiple garments in one image
* model wearing a garment
* retailer screenshot
* product listing
* poorly framed clothing photo

Users should not need perfect photography.

---

# 16. GARMENT PROCESSING UX

After upload:

```text
Upload
↓
Processing
↓
Garment detected
↓
Attributes extracted
↓
User confirms/corrects
↓
Wardrobe
```

If multiple garments are detected:

```text
We found 3 pieces.
```

The user can confirm them individually.

---

# 17. USER CORRECTIONS

Users must be able to edit AI-generated attributes.

Example:

AURA:

> White oversized shirt

User changes:

> Cream
> Regular fit

The correction becomes a learning signal.

---

# 18. ONBOARDING

Onboarding should establish enough context for meaningful personalization.

Recommended stages:

```text
Welcome
↓
Account
↓
Permissions
↓
Appearance
↓
Body / fit
↓
Style
↓
First wardrobe items
↓
First AURA experience
```

The user should reach value quickly.

---

# 19. APPEARANCE INPUT

Potential input:

* face image
* full-body image
* optional additional references

Potential uses:

* appearance understanding
* complexion-aware color recommendations
* visualization
* styling
* fit/proportion understanding

Sensitive information must not be collected without a clear product purpose.

---

# 20. STYLE INPUT

Users can upload:

* best outfits
* favorite outfits
* inspiration
* creator looks
* Pinterest references
* screenshots

The system should learn styling patterns rather than simply classify images.

---

# 21. INSPIRATION

Inspiration flow:

```text
Upload inspiration
↓
Understand visual structure
↓
Identify garments
↓
Understand silhouette
↓
Understand colors
↓
Understand layering
↓
Understand aesthetic
↓
Map against wardrobe
```

Results:

### Recreate with my closet

and:

### Complete the look

The wardrobe-first option should be prioritized.

---

# 22. INSPIRATION RESULT

Example:

```text
Your version

Cream oversized shirt     OWNED
Relaxed black trousers    OWNED
Minimal sneakers          OWNED
Silver accessories        MISSING
```

AURA should communicate how much of the look can already be created.

---

# 23. MIRROR / VTO

Mirror is the personal visualization experience.

Flow:

```text
Outfit
↓
See it on me
↓
Generate
↓
View result
↓
Change
↓
Compare
↓
Save
↓
Share
```

VTO should not expose technical implementation details.

---

# 24. VTO FAILURE UX

If generation fails:

> We couldn't create your try-on right now.

Actions:

* Try again
* Continue with outfit
* Change outfit

Never show a fake result and pretend generation succeeded.

---

# 25. OUTFIT MEMORY

Memory should appear contextually.

Examples:

> You haven't worn this yet.

> You wore this three times last month.

> You keep changing the pants in outfits like this.

Memory should support action rather than become a dashboard of statistics.

---

# 26. WEAR TRACKING

Supported signals:

1. Manual "Wore this"
2. Occasional confirmation
3. Uploaded outfit photo

The system should avoid asking constantly.

---

# 27. OUTFIT SHARING

Users can share:

* outfit photo
* outfit breakdown
* inspiration transformation
* AURA-generated look
* creator look

Sharing should feel native to fashion/social media.

---

# 28. CREATOR UX

Creator-specific workflows eventually include:

* large wardrobe
* shoot styling
* outfit planning
* occasion styling
* outfit history
* content photography
* VTO
* product links

AURA should integrate with external social platforms rather than immediately creating another social network.

---

# 29. SHOPPING UX

Shopping should only appear when useful.

Example:

> You can create this look with what you own.

or:

> You're missing one piece that would unlock 7 outfits.

Shopping should never dominate the primary experience.

---

# 30. UX PRINCIPLES

1. Image-first
2. Context-first
3. User-controlled
4. AI-assisted
5. Minimal explanation
6. Progressive disclosure
7. Real wardrobe first
8. Fast visual feedback
9. No technical language
10. No unnecessary dashboards
11. No fake intelligence
12. No manipulative engagement

---

# 31. CORE USER JOURNEYS

## Journey A — First Outfit

```text
Sign up
↓
Onboarding
↓
Add garments
↓
AURA understands garments
↓
Home
↓
Create first look
↓
Modify
↓
Save
```

## Journey B — Daily Styling

```text
Open AURA
↓
Contextual prompt
↓
AURA look
↓
Change
↓
See on me
↓
Wear
↓
Confirm
```

## Journey C — Mix & Match

```text
Create
↓
Mix & Match
↓
Select top
↓
Select bottom
↓
Select shoes
↓
Experiment
↓
Save
```

## Journey D — Inspiration

```text
Inspiration
↓
Upload image
↓
AURA understands it
↓
Recreate with closet
↓
Identify missing pieces
↓
Save
```

## Journey E — Learning

```text
Recommendation
↓
User changes garments
↓
User saves
↓
User wears
↓
AURA observes
↓
Future recommendations improve
```

---

# 32. UX SUCCESS CRITERION

A user should be able to go from:

> "I don't know what to wear."

to:

> "This looks like me."

with minimal friction.
