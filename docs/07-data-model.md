# AURA DATA MODEL

**Product:** AURA
**Document:** Conceptual Data Model
**Version:** 1.0
**Status:** Pre-development

---

# 1. DATA MODEL PRINCIPLE

The database should represent the user's actual fashion life rather than merely storing clothing inventory.

Core relationships:

```text
USER
 ↓
WARDROBE
 ↓
GARMENTS
 ↓
OUTFITS
 ↓
BEHAVIOR
 ↓
PERSONALIZATION
```

Alongside:

```text
INSPIRATION
CONTEXT
VTO
SHOPPING
```

---

# 2. USER

Conceptual fields:

```text
id
account_id
created_at
updated_at
preferences
consent_state
notification_preferences
```

---

# 3. APPEARANCE PROFILE

Potential information:

```text
user_id
reference_images
visual_attributes
body_reference
height
optional_measurements
fit_preferences
created_at
updated_at
```

Sensitive fields require stronger access controls.

---

# 4. WARDROBE

Represents a user's clothing collection.

Conceptual fields:

```text
id
user_id
name
created_at
updated_at
```

A user may eventually have:

* main wardrobe
* seasonal wardrobe
* creator wardrobe
* travel capsule

but MVP should avoid unnecessary complexity.

---

# 5. GARMENT

Core entity.

Conceptual fields:

```text
id
user_id
wardrobe_id

original_asset_id
processed_asset_id
transparent_asset_id

category
subcategory

primary_color
secondary_colors
pattern
material
fit
silhouette
length
sleeve
neckline

style_attributes
occasion_attributes
season_attributes

user_verified
created_at
updated_at
```

---

# 6. GARMENT CORRECTIONS

Tracks user corrections.

```text
id
garment_id
field
previous_value
new_value
source
created_at
```

This provides valuable learning data.

---

# 7. GARMENT USAGE

Tracks usage.

```text
garment_id
outfit_id
usage_type
created_at
```

Potential usage types:

* suggested
* selected
* saved
* worn
* photographed

---

# 8. OUTFIT

Conceptual fields:

```text
id
user_id

source
context_id

name
status

created_at
updated_at
```

Source examples:

* AURA
* Mix & Match
* Inspiration
* Imported

---

# 9. OUTFIT GARMENTS

Relationship:

```text
outfit_id
garment_id
category
position
```

This allows individual garments to be replaced without duplicating the entire garment.

---

# 10. OUTFIT EVENT

Tracks user interaction.

```text
id
user_id
outfit_id
event_type
metadata
created_at
```

Possible events:

* generated
* viewed
* modified
* saved
* rejected
* worn
* shared
* deleted

---

# 11. OUTFIT MODIFICATION

Tracks exactly what the user changed.

```text
id
outfit_id
removed_garment_id
added_garment_id
category
created_at
```

This is one of the most important learning signals.

---

# 12. WORN OUTFIT

Potential entity:

```text
id
user_id
outfit_id
confirmation_method
photo_asset_id
worn_at
created_at
```

Confirmation methods:

* manual
* prompt
* photo

---

# 13. INSPIRATION

Conceptual fields:

```text
id
user_id
asset_id
source_type
source_reference
created_at
```

---

# 14. INSPIRATION ANALYSIS

Stores structured understanding:

```text
inspiration_id

garments
colors
silhouettes
proportions
layering
accessories
aesthetic
styling_formula
```

The exact representation may evolve with the AI system.

---

# 15. USER INSPIRATION RELATIONSHIP

Tracks what the user does with inspiration.

```text
inspiration_id
event_type
created_at
```

Possible events:

* saved
* recreated
* ignored
* used in outfit
* shared

---

# 16. STYLE PREFERENCE

Potential internal entity:

```text
id
user_id
dimension
value
strength
confidence
source
updated_at
```

Example:

```text
dimension: silhouette
value: relaxed
strength: high
source: repeated_behavior
```

These are internal personalization signals.

They should not automatically be presented as user-facing scores.

---

# 17. CONTEXT

Conceptual fields:

```text
id
user_id

occasion
weather
location
calendar_reference
time_context

source
created_at
```

---

# 18. USER FEEDBACK

```text
id
user_id
outfit_id
garment_id
feedback_type
value
created_at
```

Examples:

* like
* dislike
* too formal
* too casual
* color preference
* fit preference

---

# 19. VTO JOB

```text
id
user_id
outfit_id
person_asset_id
provider
status
input_assets
output_asset_id
error
created_at
completed_at
```

---

# 20. IMAGE ASSET

Generic image asset abstraction:

```text
id
user_id
asset_type
storage_reference
mime_type
width
height
created_at
deleted_at
```

Asset types:

* face
* body
* garment_original
* garment_processed
* garment_transparent
* outfit_photo
* inspiration
* vto_output

---

# 21. NOTIFICATION

Potential fields:

```text
id
user_id
type
content_reference
scheduled_at
sent_at
opened_at
dismissed_at
```

The notification system should remain context-aware.

---

# 22. SHOPPING OPPORTUNITY

Future entity:

```text
id
user_id
wardrobe_gap
reason
potential_products
priority
created_at
```

The important concept is:

> wardrobe gap

rather than:

> product feed.

---

# 23. CREATOR LOOK

Future entity:

```text
id
creator_id
outfit_id
cover_asset_id
published_at
commerce_enabled
```

---

# 24. PRODUCT LINK

Future entity:

```text
id
creator_look_id
garment_reference
merchant
product_url
affiliate_reference
```

This belongs to the future commerce layer.

---

# 25. DATA RELATIONSHIP

Conceptually:

```text
USER
 │
 ├── Appearance Profile
 │
 ├── Wardrobe
 │     └── Garments
 │
 ├── Outfits
 │     ├── Garments
 │     ├── Events
 │     ├── Modifications
 │     └── Wear History
 │
 ├── Inspiration
 │
 ├── Preferences
 │
 ├── Context
 │
 ├── Feedback
 │
 └── VTO Jobs
```

---

# 26. DATA OWNERSHIP

User-owned data must be isolated by user identity.

No user should be able to access another user's:

* images
* wardrobe
* outfits
* preferences
* VTO results
* behavior

---

# 27. DATA RETENTION

Retention should be defined separately for:

* original images
* processed assets
* VTO results
* behavioral signals
* deleted data
* backups

Deletion policies must account for derived data.

---

# 28. PRIVACY

Potentially sensitive data:

* face
* body
* clothing
* location
* calendar
* preferences
* behavior

AURA should collect only what materially improves the product.

---

# 29. DATA MODEL PRINCIPLE

The most valuable data in AURA is not:

> “User owns a black shirt.”

It is:

> “User owns this black shirt, repeatedly chooses it with relaxed trousers, saves those combinations, and actually wears them.”

The model should therefore preserve **relationships and behavior**, not merely inventory.
