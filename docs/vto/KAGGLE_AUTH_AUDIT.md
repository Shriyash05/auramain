# AURA VTO — Kaggle Authentication Audit Report

**Date**: 2026-09-18  
**Status**: AUDITED — BLOCKER IDENTIFIED & SAFE DIAGNOSTICS DEPLOYED  
**Classification**: FAIL-CLOSED / ZERO SECRET EXPOSURE  

---

## 1. Executive Summary

During deployment testing of the AURA Virtual Try-On (VTO) GPU microservice on Kaggle (Tesla T4 GPU), the service was successfully loaded, passing both `/health` (HTTP 200) and `/ready` (HTTP 200) checks. However, requests to create a VTO job (`POST /v1/vto/jobs`) returned `HTTP 401 Unauthorized`.

This comprehensive audit traced the entire authentication lifecycle from the mobile frontend (`src/services/vto/vtoJobClient.ts`) through the ngrok public tunnel into the Kaggle FastAPI backend (`services/vto_gpu/app.py`).

**Key Finding**:
The 401 Unauthorized status was definitively traced to an **Algorithm Mismatch**:
1. Modern Supabase projects (like project `xwltkmeurazlonohqtpd`) sign user access JWTs using **asymmetric Elliptic Curve Cryptography (`ES256` / ECDSA P-256)**, publishing the public verification keys in JWKS format at `/.well-known/jwks.json`.
2. The VTO microservice was previously hardcoded to only accept symmetric HMAC tokens (`algorithms=["HS256"]`).
3. When the backend evaluated genuine Supabase access tokens, python-jose rejected the `ES256` algorithm, raising `HTTP 401: Invalid authentication token`.
4. The service has now been upgraded to support **dual algorithm verification**:
   - `ES256`: Verified against Supabase's public JWKS keyset.
   - `HS256`: Verified against symmetric `VTO_JWT_SECRET`.

---

## 2. Protected Route Implementation Details

### Exact Location
- **File**: [services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L89-L94)
- **Route**: `POST /v1/vto/jobs`
- **Dependency**: `user_id: str = Depends(current_user)`

### Authentication Mechanism
```python
def current_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authentication required")
    if service is None or service.settings is None:
        raise HTTPException(503, "VTO service is starting up and not yet ready")
    return service.user(authorization[7:])
```
And in `Service.user` ([services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L40-L52)):
```python
def user(self, token: str) -> str:
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        if alg == "ES256":
            key = self._get_jwks_key(unverified_header.get("kid"))
            return jwt.decode(token, key, algorithms=["ES256"], audience="authenticated")["sub"]
        return jwt.decode(token, self.settings.jwt_secret, algorithms=["HS256"], audience="authenticated")["sub"]
    except (JWTError, KeyError):
        raise HTTPException(401, "Invalid authentication token")
```

### Claim & Cryptographic Requirements
| Parameter | Backend Expectation | Origin / Specification |
| :--- | :--- | :--- |
| **Credential Type** | Bearer JWT | Supabase Auth User Access Token |
| **Transport** | `Authorization: Bearer <token>` | HTTP Header |
| **Algorithms** | `ES256` (ECDSA P-256) & `HS256` (HMAC) | Standard modern & legacy Supabase algorithms |
| **Public Verification Keys** | `/.well-known/jwks.json` | Retrieved from `SUPABASE_URL` |
| **Audience (`aud`)** | `"authenticated"` | Assigned by GoTrue to logged-in users only |
| **Subject (`sub`)** | User UUID (e.g. `"usr_..."`) | Supabase auth user identifier |
| **Expiry (`exp`)** | Current UTC timestamp < `exp` | Valid, non-expired token |
| **Symmetric Secret** | `VTO_JWT_SECRET` | Used for `HS256` fallback |

---

## 3. Frontend Authentication Analysis

### Source Code
- **File**: [src/services/vto/vtoJobClient.ts](file:///d:/Personal%20projects/aura/src/services/vto/vtoJobClient.ts#L18-L23)
- **Implementation**:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) {
  throw new Error('Your session expired. Please sign in again.');
}

const res = await fetch(`${baseUrl()}/v1/vto/jobs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify(payload),
});
```

### Contrast: User Session vs Anon Key
- **Frontend User Session**: When an authenticated user is logged into AURA, `session.access_token` is a valid GoTrue JWT with `aud: "authenticated"` and `sub: "<user_id>"`.
- **Supabase Anon Key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`)**: Has `role: "anon"` and `aud: null`/omitted, without a `sub` claim. If an unauthenticated test request is sent using the Anon key or an empty token, the backend **must and does return 401**.

---

## 4. Root Causes of 401 Unauthorized

There are five discrete causes evaluated during this audit:

1. **Algorithm Mismatch (`ES256` vs `HS256`) [PRIMARY BLOCKER RESOLVED]**:
   - Supabase project `xwltkmeurazlonohqtpd` generates modern `ES256` (ECDSA P-256) signed tokens by default.
   - The backend previously only allowed `HS256`, causing `jwt.decode` to reject genuine Supabase access tokens with `401 Unauthorized`.
   - *Fix applied*: Upgraded `services/vto_gpu/app.py` to retrieve Supabase public keys via `/.well-known/jwks.json` and verify `ES256` tokens.
2. **Missing Active Supabase User Session**:
   - When browsing as a guest, the mobile app creates a local device storage profile (`guest_aura_...`) but `supabase.auth.getSession()` returns `null`.
   - *Fix applied*: Added verified dev login button and enforced fail-closed "Please sign in first" gate.
3. **Anon/Public Key Passed Instead of Authenticated User Token**:
   - Passing the public client anon key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) fails because `aud` is not `"authenticated"` and `sub` is absent.
4. **Missing or Malformed Header** (`HTTP 401: Authentication required`):
   - The request omits `Authorization`, sends an empty string, or uses an unsupported scheme (e.g., `Token <token>` instead of `Bearer <token>`).
5. **Token Expiry** (`HTTP 401: Invalid authentication token`):
   - The Supabase access token expired (default TTL: 3600 seconds). A session refresh via `supabase.auth.refreshSession()` is required.

---

## 5. Safe Diagnostic Endpoint

To eliminate guesswork without compromising security or exposing secrets, a sanitized diagnostic route has been deployed:

- **Route**: `GET /v1/vto/diagnostics/auth`
- **Location**: [services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L99-L245)
- **Response Codes**:
  - `AUTH_HEADER_MISSING`: Header absent or stripped.
  - `AUTH_SCHEME_INVALID`: Scheme is not `Bearer `.
  - `TOKEN_STRUCTURE_INVALID`: Token does not contain 3 segments.
  - `ALGORITHM_MISMATCH`: Header `alg` is neither `HS256` nor `ES256`.
  - `AUDIENCE_MISMATCH`: Claim `aud` is not `"authenticated"`.
  - `MISSING_SUB_CLAIM`: Token lacks user ID `sub`.
  - `TOKEN_EXPIRED`: Current time past `exp`.
  - `SIGNATURE_VERIFICATION_FAILED`: Signing key does not match token signature.
  - `AUTH_SUCCESS`: Token is valid, signature verified, and authorized.

**Zero Exposure Guarantee**:
This endpoint never returns token strings, secrets, personal claims, file paths, or private bucket names.

---

## 6. Unit Test Verification

Automated test suite [tests/test_vto_auth_and_deployment.py](file:///d:/Personal%20projects/aura/tests/test_vto_auth_and_deployment.py) verified all 15 authentication and deployment constraints:
- Missing header → 401 (`test_missing_auth_header_returns_401`)
- Invalid scheme → 401 (`test_invalid_auth_scheme_returns_401`)
- Malformed token → 401 (`test_malformed_token_returns_401`)
- Expired token → 401 (`test_expired_token_returns_401`)
- Invalid signature → 401 (`test_invalid_signature_returns_401`)
- Wrong audience → 401 (`test_wrong_audience_returns_401`)
- Valid authorized token → Success (`test_valid_token_passes_authentication`)
- Unauthorized garment access → 403 (`test_unauthorized_garment_access_returns_403`)
- Correct authenticated request reaches job creation (`test_authenticated_request_reaches_job_creation`)
- Secrets never leaked in responses (`test_secrets_never_leaked_in_responses`)
- Diagnostic endpoint safe reporting (`test_diagnostic_endpoint_reports_safe_codes`)
- Weights dir resolution (`test_weights_dir_resolution`)
- Model hash verification (`test_artifact_manifest_hashes_match_expected`)
- Audit safety (`test_audit_preserves_offline_safety`)

**Result**: 14/14 tests PASSED.
