# AURA AI Ownership Strategy
## Self-Hosted, Self-Trained & Autonomous Fashion Intelligence Architecture

**Product:** AURA  
**Version:** 1.0 (Master Strategic Architecture)  
**Author:** AI Architecture & Systems Team  
**Status:** **ACTIVE ARCHITECTURAL POLICY**  

---

## 1. Executive Summary & Core Principle

AURA's core intelligence must **NOT** depend on paid third-party AI APIs (e.g. OpenAI, Claude, Gemini, FASHN.ai, Photoroom, Klarna, Shopify APIs). 

### Strategic Pillars:
1. **AURA Owned Intelligence**: Proprietary algorithms, specialized weights, adapters, and embeddings designed specifically for personal fashion.
2. **AURA Owned Data Pipelines**: Transparent, privacy-first ingestion for trend analysis, taxonomy normalization, and user preference evolution.
3. **Self-Hosted & Self-Controlled Models**: Open-source foundation models adapted, fine-tuned, and served on independent GPU infrastructure (e.g. RunPod, Modal, vLLM, Triton, or dedicated GPU instances) with **$0 per API call to third-party AI vendors**.
4. **Pragmatic Decomposition**: We do not force one giant multimodal foundation model onto every task. We decompose intelligence across 12 specialized domains balancing deterministic algorithms, classical ML, lightweight vision models, and self-hosted diffusion pipelines.

```text
               +---------------------------------------------+
               |              AURA Client (Mobile)           |
               +---------------------------------------------+
                                      |
                                      v
               +---------------------------------------------+
               |        AURA AI Gateway & Model Router       |
               +---------------------------------------------+
                                      |
      +-------------------------------+-------------------------------+
      |                               |                               |
      v                               v                               v
+-------------------+       +-------------------+       +-------------------+
|  Deterministic /  |       |  Specialized ViT  |       |  Self-Hosted GPU  |
|  Classical ML     |       |  & Small VLMs     |       |  Diffusion Models |
+-------------------+       +-------------------+       +-------------------+
| - Styling Engine  |       | - Garment ViT     |       | - IDM-VTON /      |
| - Wardrobe Gaps   |       | - BiRefNet / SAM  |       |   CatVTON         |
| - User Embeddings |       | - Florence-2-L    |       | - Inpainting &    |
| - Search Indexing |       | - Qwen2.5-3B-Inst |       |   High-Res Warp   |
+-------------------+       +-------------------+       +-------------------+
```

---

## 2. The 12 AI Domains Decomposed

```text
Domain 1:  Garment Understanding          -> Specialized Vision Transformer (SigLIP / ViT-B/16 fine-tuned on fashion attributes)
Domain 2:  Garment Segmentation           -> Open-source Matting & Segmentation (BiRefNet / RMBG-1.4 / SAM-2)
Domain 3:  Outfit Compatibility           -> Deterministic Color/Silhouette Matrix + Future Pairwise Graph Embedding
Domain 4:  Personal Preference Learning   -> User Preference Vector + Gradient Updates on In-App Feedback (Runs On-Device & Synced)
Domain 5:  Style Profile & Evolution      -> Dynamic Behavioral Statistics + Style Archetype Clustering
Domain 6:  Inspiration Understanding      -> Fine-tuned Open VLM (Florence-2-L / Qwen2-VL-7B Adapter)
Domain 7:  Fashion Trend Intelligence     -> Open Data Ingestion Pipeline + Structured Fashion Taxonomy
Domain 8:  Natural Language Styling       -> Small Instruction Model (Qwen2.5-3B / Llama-3.2-3B) -> Structured Intent Actions
Domain 9:  Virtual Try-On (VTO)           -> Self-Hosted Open Diffusion Pipeline (IDM-VTON / CatVTON on Serverless GPU)
Domain 10: Creator Styling                -> Shared Deterministic Core + Look Diversity Optimization Algorithm
Domain 11: Wardrobe Gap Intelligence      -> Algorithmic Combination Unlocking Engine (Enforces "You Already Own It" Rule)
Domain 12: Product Matching & Retrieval   -> Dense Vector Search (Open BGE-M3 / FashionCLIP Embeddings) + AURA Re-ranking
```

---

## 3. Detailed Domain Specifications & Model Strategy

### Domain 1: Garment Understanding (Attribute Extraction)
- **Objective:** Convert raw clothing photos into structured taxonomy: category, subcategory, primary/secondary colors, pattern, material, fit, silhouette, formality, and seasonality.
- **Model Type:** Small specialized vision model (Fine-tuned `SigLIP-SO400M` or `ViT-B/16`).
- **Open-Source Candidate:** SigLIP / OpenFashionCLIP / Fashion-DeBERTa.
- **Inference Requirements:** ~1.2 GB VRAM, CPU or lightweight GPU, <80ms latency.
- **Ownership Plan:** Fine-tune open SigLIP weights on open fashion attribute benchmarks (DeepFashion2 / Fashion-Gen) with AURA-specific taxonomy heads.
- **Fallback:** Client-side color palette extractor + manual verification screen.

### Domain 2: Garment Segmentation (Clean Background Removal)
- **Objective:** Separate clothing item from background, hangers, or model bodies into a clean alpha PNG.
- **Model Type:** High-resolution dichotomous image segmentation.
- **Open-Source Candidate:** `BiRefNet` (General/Portrait) or `RMBG-1.4` (Apache 2.0 / Open Weights).
- **Inference Requirements:** ~3.5 GB VRAM (FP16), ONNX Runtime / TensorRT, ~250ms on modern GPU (T4 / A10G).
- **Ownership Plan:** Self-host BiRefNet / RMBG-1.4 on serverless GPU container (Modal / RunPod Serverless / Triton).
- **Fallback:** Client-side canvas center-crop and silhouette masking.

### Domain 3: Outfit Compatibility & Styling
- **Objective:** Evaluate harmony between top, bottom, shoes, and layers.
- **Model Type:** **Deterministic Rule & Compatibility Engine** ([`src/services/stylist/stylingEngine.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/stylingEngine.ts)) + Future Pairwise Contrastive Embedding.
- **Strategic Decision:** **Do NOT replace deterministic algorithms with an LLM.** Color theory, temperature pairing, formality rules, and silhouette balance are provably faster, 100% deterministic, and zero-cost when calculated mathematically.
- **Future ML Extension:** Train a lightweight Siamese Siamese/Pairwise Compatibility network (`aura-compat-v1`) predicting compatibility scores from garment attribute vectors.
- **Ownership Plan:** 100% owned TypeScript & Python algorithms.

### Domain 4: Personal Preference Learning
- **Objective:** Continually learn user style preferences from likes, dislikes, wears, and swaps.
- **Model Type:** On-device User Preference Vector with online gradient/weight updates ([`src/services/stylist/preferenceLearningService.ts`](file:///d:/Personal%20projects/aura/src/services/stylist/preferenceLearningService.ts)).
- **Architecture:** 
  $$\text{Score}(O, u) = \mathbf{w}_u^T \mathbf{f}(O) - \delta_{\text{recency}}(O, u)$$
  Where $\mathbf{w}_u$ is the user preference weight vector, $\mathbf{f}(O)$ is the outfit feature representation, and $\delta_{\text{recency}}$ is the 48-hour damping penalty.
- **Privacy Advantage:** Operates entirely locally on the mobile device with optional encrypted cloud backup. Zero third-party exposure.

### Domain 5: Style Profile & Evolution
- **Objective:** Track behavioral shifts (e.g. shift from slim to relaxed tailoring).
- **Model Type:** Statistical time-window aggregation + Style Archetype clustering (K-Means on wear history).
- **Ownership Plan:** 100% owned deterministic analytical logic.

### Domain 6: Inspiration Understanding
- **Objective:** Deconstruct fashion photos into aesthetic tags, color palettes, and closet matching formulas.
- **Model Type:** Small open Vision-Language Model (VLM).
- **Open-Source Candidate:** `Florence-2-Large` (0.77B parameters, MIT License) or `Qwen2-VL-7B-Instruct` (Apache 2.0).
- **Inference Requirements:** 2–6 GB VRAM with 4-bit quantization, ~450ms latency on A10G.
- **Ownership Plan:** Fine-tune Florence-2 on fashion formula deconstructions using LoRA adapters.
- **Fallback:** Deterministic color extraction + aesthetic heuristic mapping.

### Domain 7: Fashion Trend Intelligence
- **Objective:** Ingest public runway, street style, and seasonal trends without scraping violations.
- **Pipeline:**
  ```text
  Open Fashion Feeds & Public Lookbooks
                   |
                   v
      Structured Fashion Taxonomy Normalizer
                   |
                   v
       AURA Trend Vector Database (Qdrant / pgvector)
                   |
                   v
     Personalized Closet Compatibility Evaluator
  ```
- **Ownership Plan:** Proprietary trend vector store evaluated against user wardrobe vectors.

### Domain 8: Natural Language Intent Engine
- **Objective:** Map queries like *"Make this outfit more casual for dinner"* into structured styling operations.
- **Model Type:** Small Instruction LLM or Intent Classification Head.
- **Open-Source Candidate:** `Qwen2.5-3B-Instruct` (Apache 2.0) or `Llama-3.2-3B-Instruct`.
- **Inference Requirements:** ~3.8 GB VRAM (AWQ / GGUF), <150ms token generation via vLLM / Ollama.
- **Mapping Flow:**
  $$\text{Natural Prompt} \xrightarrow{\text{AURA Model}} \{\text{action: 'substitute'}, \text{category: 'shoes'}, \text{target_vibe: 'casual'}\} \xrightarrow{\text{StylingEngine}} \text{Updated Look}$$
- **Fallback:** Regex & keyword intent router ([`src/services/intelligence/searchService.ts`](file:///d:/Personal%20projects/aura/src/services/intelligence/searchService.ts)).

### Domain 9: Virtual Try-On (VTO)
- **Objective:** Render realistic user try-on visualizations combining user reference photo + outfit garments.
- **Model Type:** Open Diffusion Virtual Try-On Pipeline.
- **Open-Source Candidates:**
  - `IDM-VTON` (High-fidelity image-based virtual try-on with garment warping).
  - `CatVTON` (Lightweight, efficient diffusion-based try-on).
  - `OOTDiffusion` (Outfitting Over Time diffusion with garment preservation).
- **Hosting Strategy:** Self-hosted container deployed on serverless GPU infrastructure (RunPod Serverless / Modal / AWS EC2 G5) running only during active generation requests.
- **Cost:** ~$0.003 - $0.008 per generation in raw GPU compute (vs $0.05 - $0.15 on commercial VTO APIs). **Zero vendor API lock-in.**
- **Fallback:** Side-by-side outfit preview card in AURA Studio.

### Domain 10: Creator Styling
- **Strategic Decision:** Reuses Core Styling Engine, Preference Vector, and Look Diversity Optimization algorithms. Zero separate AI overhead.

### Domain 11: Wardrobe Gap Intelligence
- **Strategic Decision:** Algorithmic combinatorial unlocking matrix. Quantifies exactly how many new outfits a missing piece unlocks while strictly enforcing the *"You already own it"* rule.

### Domain 12: Product Matching & Retrieval
- **Objective:** Match wardrobe gaps to real pieces in partner catalogs.
- **Model Type:** Dense vector similarity search (Embedding Model: `BGE-M3` or `FashionCLIP`).
- **Ownership Plan:** Embeddings stored in self-hosted `pgvector` or `Qdrant`. AURA owns the ranking and scoring functions.

---

## 4. Model Registry & Versioning Matrix

| Domain | Model Identifier | Base Open Weights | License | VRAM (Inference) | Deployment Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Garment Attributes** | `aura-garment-v1` | SigLIP-SO400M / FashionCLIP | Apache 2.0 / MIT | ~1.5 GB | Triton / ONNX Server |
| **Segmentation** | `aura-segment-v1` | BiRefNet / RMBG-1.4 | Open Weights / Apache | ~3.5 GB | Serverless GPU (T4/A10) |
| **Inspiration VLM** | `aura-inspire-v1` | Florence-2-Large + LoRA | MIT | ~2.5 GB (FP16) | vLLM / Serverless GPU |
| **Natural Intent** | `aura-intent-v1` | Qwen2.5-3B-Instruct (4-bit) | Apache 2.0 | ~2.8 GB | vLLM / Local Worker |
| **Virtual Try-On** | `aura-vto-v1` | IDM-VTON / CatVTON | Open Research / Open Weights | ~12 GB (A10G) | Serverless RunPod / Modal |
| **Styling & Gap** | `aura-engine-core` | Proprietary TypeScript Algorithm | Proprietary | <50 MB (RAM) | On-Device & Edge Function |
| **Preference Learning**| `aura-pref-v1` | Proprietary Vector Model | Proprietary | <5 MB (RAM) | On-Device (Client-Side) |

---

## 5. Model Serving Architecture & Cost Model

```text
                                [Mobile Client]
                                       |
                                       v
                     [Supabase Edge Gateway / API Router]
                                       |
                     +-----------------+-----------------+
                     |                                   |
         (Lightweight Requests <50ms)           (GPU Requests ~500ms - 2s)
                     |                                   |
                     v                                   v
             [Edge CPU Function]               [Serverless GPU Pool]
         - Intent Routing (Regex/FastText)     - BiRefNet (Segmentation)
         - Styling Combinatorics               - Florence-2 (Inspiration)
         - Gap Analysis                        - IDM-VTON (Virtual Try-On)
         - Preference Weight Updates           (Scales to 0 when idle)
```

### Cost Comparison: Commercial APIs vs. Self-Hosted Infrastructure

| Intelligence Workload | Commercial Paid API Cost (Per 10,000 Users/mo) | Self-Hosted Open Infrastructure Cost (Per 10,000 Users/mo) | Savings |
| :--- | :--- | :--- | :--- |
| **Garment Cutouts (10k items)** | ~$500 (Photoroom @ $0.05/call) | ~$18 (Serverless GPU @ $0.0018/call) | **96.4%** |
| **Inspiration Analysis (5k photos)**| ~$250 (GPT-4o Vision @ $0.05/call) | ~$12 (Florence-2 Serverless @ $0.0024/call) | **95.2%** |
| **Virtual Try-On (2k try-ons)** | ~$200 (FASHN.ai @ $0.10/call) | ~$16 (IDM-VTON on RunPod @ $0.008/call) | **92.0%** |
| **Styling & Recommendations** | ~$150 (LLM prompting) | **$0** (Client-side Deterministic Engine) | **100%** |
| **Total Monthly AI Vendor Cost** | **$1,100 / month** | **~$46 / month (Raw Compute Only)** | **95.8%** |

---

## 6. Implementation Roadmap for Self-Hosted AI

### Phase A: Architecture & Contract Definition (Current)
- Maintain strict TypeScript interfaces (`IImageProcessingProvider`, `IInspirationAnalysisProvider`, `IVirtualTryOnProvider`, `ITrendProvider`, `IProductDiscoveryProvider`).
- Zero commercial third-party SDK dependencies in mobile client code.

### Phase B: Serverless Open GPU Containers (Infrastructure Setup)
- Package `BiRefNet` into Docker container for background removal.
- Package `Florence-2-Large` with fashion instruction tuning for inspiration parsing.
- Package `IDM-VTON` into cold-start optimized serverless GPU container (Modal / RunPod).

### Phase C: On-Device & Edge Model Optimization
- Export garment classification heads to ONNX for optional on-device offline extraction.
- Refine pairwise outfit compatibility vectors.

---

## 7. Strategic Rules & Constraints

1. **No Paid API Lock-In:** Core app features must never break if a commercial AI vendor changes pricing or terms.
2. **Deterministic First:** If a fashion logic problem can be solved mathematically or rule-based, do not use an LLM or neural network.
3. **Data Sovereignty:** Private user wardrobe and model photos are never sent to external AI foundation model providers for training.
