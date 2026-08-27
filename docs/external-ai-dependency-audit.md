# AURA — External Commercial AI Dependency Audit

**Date:** 2026-08-28  
**Version:** 1.0 (Phase 9 Audit)  
**Author:** AI Architecture & Security Team  
**Status:** **AUDITED & PURGED**  

---

## 1. Executive Summary

This audit rigorously inspects the entire AURA repository (client codebase, server functions, configuration files, package manifests, and documentation) for any hard dependencies, API keys, SDKs, or lingering references to paid third-party AI APIs (e.g. OpenAI, Anthropic, Claude, Gemini, FASHN.ai, Photoroom, Klarna AI, RMBG API).

---

## 2. Dependency Audit Matrix

| Dependency / Mention | File Path | Original Purpose | Current Code Status | Action / Removal Status | Replacement Strategy | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`openai` / OpenAI API** | `package.json` / Client code | N/A | **Zero SDKs Installed** | Verified Absent | N/A (Never installed) | No OpenAI SDK or API keys exist in the repository. |
| **`@google/generative-ai` / Gemini API** | `package.json` / Client code | N/A | **Zero SDKs Installed** | Verified Absent | N/A (Never installed) | Client code relies on internal deterministic models. |
| **`@anthropic-ai/sdk` / Claude API** | `package.json` / Client code | N/A | **Zero SDKs Installed** | Verified Absent | N/A (Never installed) | No Anthropic SDK or keys present. |
| **`FASHN.ai`** | `docs/production-launch-checklist.md`, `docs/production-readiness-audit.md` | Legacy VTO proxy reference in docs | Documentation mention only | **Purged from Launch Checklist & Audit Docs** | Self-hosted `aura-vto-v1` container on serverless GPU (IDM-VTON / CatVTON) | Replaced legacy doc references with AURA Self-Hosted Model Server. |
| **`Photoroom API`** | `docs/production-readiness-audit.md` | Legacy background removal reference | Documentation mention only | **Purged from Launch Checklist & Audit Docs** | Self-hosted `aura-segment-v1` container (BiRefNet Apache 2.0) | Zero commercial matting APIs are called. |
| **`BRIA RMBG-1.4`** | `docs/model-registry.md` | Candidate segmentation model | Evaluated in Lab | **Marked REJECTED for Production** | **BiRefNet (Apache 2.0)** or open **U2-Net** | BRIA non-commercial license riders violate open-source production policy. |
| **`GEMINI_API_KEY` / `FASHN_AI_API_KEY`** | `.env.example` | Commented placeholder secrets | Comment text in `.env.example` | **Removed from `.env.example`** | Clean serverless GPU container endpoints | Purged commented commercial API key placeholders. |

---

## 3. Package Manifest Verification (`package.json`)

- **Commercial AI SDKs in `dependencies`:** `0` (None)
- **Commercial AI SDKs in `devDependencies`:** `0` (None)
- **All Client Logic:** 100% self-contained TypeScript / React Native using internal engines (`StylingEngine`, `PreferenceLearningService`, `WardrobeGapService`, `OutfitMemoryService`, `SearchService`).
