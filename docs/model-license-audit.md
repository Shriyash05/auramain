# AURA AI Model License & Commercial Rights Audit

**Product:** AURA  
**Document:** Model License Verification & Commercial IP Audit  
**Version:** 1.0  
**Status:** **ACTIVE LEGAL & ARCHITECTURAL AUDIT**  

---

## 1. Core Licensing Rules

1. **Permissive Open Source Permitted:** MIT, Apache 2.0, BSD-3-Clause, and permissive Open Weights.
2. **Non-Commercial Licenses Prohibited:** Any model tagged **CC-BY-NC**, **Research Only**, or containing restrictive commercial rider clauses is marked **REJECTED FOR PRODUCTION**.
3. **Derived Model Ownership:** Any fine-tuned adapter, LoRA, or embeddings created by AURA on top of permissive base weights remain 100% proprietary to AURA.

---

## 2. Model License Audit Table

| Model Name | Version / Checkpoint | Primary Source | Exact License | Commercial Use Permitted? | Fine-Tuning Permitted? | Redistribution Permitted? | Known Restrictions | Decision Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SigLIP** | `google/siglip-so400m-patch14-384` | Hugging Face (Google) | **Apache 2.0** | **YES** | **YES** | **YES** | Attribution required | **APPROVED** |
| **OpenFashionCLIP** | `marqo/open-fashion-clip` | Hugging Face / Marqo | **MIT License** | **YES** | **YES** | **YES** | None | **APPROVED** |
| **Florence-2** | `microsoft/Florence-2-large` | Hugging Face (Microsoft) | **MIT License** | **YES** | **YES** | **YES** | None | **APPROVED** |
| **Qwen2.5** | `Qwen/Qwen2.5-3B-Instruct` | Hugging Face (Alibaba) | **Apache 2.0** | **YES** | **YES** | **YES** | Standard Apache terms | **APPROVED** |
| **BiRefNet** | `ZhengPeng7/BiRefNet` | GitHub / Hugging Face | **Apache 2.0** | **YES** | **YES** | **YES** | Standard Apache terms | **APPROVED** |
| **RMBG-1.4** | `briaai/RMBG-1.4` | BRIA AI | **BRIA Non-Commercial** | **NO** (Requires Enterprise agreement) | **YES** (Internal only) | **NO** | Commercial royalty required | **REJECTED** |
| **IDM-VTON** | `yisol/IDM-VTON` | GitHub / Hugging Face | **Research / Open** | **NEEDS REVIEW** | **YES** | **NEEDS REVIEW** | Checkpoint terms in review | **ARCHITECTURE ONLY** |
| **CatVTON** | `Zheng-Chong/CatVTON` | GitHub / Hugging Face | **Academic Open** | **NEEDS REVIEW** | **YES** | **NEEDS REVIEW** | Non-commercial base terms | **ARCHITECTURE ONLY** |
| **BGE-M3** | `BAAI/bge-m3` | Hugging Face (BAAI) | **MIT License** | **YES** | **YES** | **YES** | None | **APPROVED** |

---

## 3. License Compliance Actions

1. **Purge BRIA RMBG Dependencies:** Ensure no production serving scripts rely on RMBG-1.4. Standardize segmentation on **BiRefNet (Apache 2.0)** or open **U2-Net**.
2. **Virtual Try-On License Cleansing:** Before activating live self-hosted VTO in production, audit the underlying base diffusion checkpoint (e.g. SDXL vs SD 1.5 commercial grants) to ensure zero licensing encumbrance.
