# AURA VTO — Kaggle Authentication Audit Report

**Date**: 2026-09-18  
**Status**: AUDITED — BLOCKER IDENTIFIED & SAFE DIAGNOSTICS DEPLOYED  
**Classification**: FAIL-CLOSED / ZERO SECRET EXPOSURE  

---

## 1. Executive Summary

During deployment testing of the AURA Virtual Try-On (VTO) GPU microservice on Kaggle (Tesla T4 GPU), the service was successfully loaded, passing both `/health` (HTTP 200) and `/ready` (HTTP 200) checks. However, requests to create a VTO job (`POST /v1/vto/jobs`) returned `HTTP 401 Unauthorized`.

This comprehensive audit traced the entire authentication lifecycle from the mobile frontend (`src/services/vto/vtoJobClient.ts`) through the ngrok public tunnel into the Kaggle FastAPI backend (`services/vto_gpu/app.py`).

**Key Finding**:
The 401 Unauthorized status is not an infrastructure or ngrok header-stripping defect. It is the expected, fail-closed enforcement of `current_user` in [services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L91-L94) when:
1. The request provides an unauthenticated guest session or Supabase **Anon key** (which lacks the required `sub` claim and has `aud: None` rather than `aud: "authenticated"`).
2. The Kaggle environment variable `VTO_JWT_SECRET` does not match the actual **Supabase Project JWT Secret** (e.g. if an anon key or service role key was populated into Kaggle Secrets instead of the HMAC JWT secret from Project Settings > API > JWT Settings).
3. An expired user access token is transmitted (Supabase GoTrue tokens expire after 3600 seconds).

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
And in `Service.user` ([services/vto_gpu/app.py](file:///d:/Personal%20projects/aura/services/vto_gpu/app.py#L24-L26)):
```python
def user(self, token: str) -> str:
    try:
        payload = jwt.decode(
            token,
            self.settings.jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload["sub"]
    except Exception:
        raise HTTPException(401, "Invalid authentication token")
```

### Claim & Cryptographic Requirements
| Parameter | Backend Expectation | Origin / Specification |
| :--- | :--- | :--- |
| **Credential Type** | Bearer JWT | Supabase Auth User Access Token |
| **Transport** | `Authorization: Bearer <token>` | HTTP Header |
| **Algorithm** | `HS256` (HMAC-SHA256) | Standard Supabase GoTrue algorithm |
| **Audience (`aud`)** | `"authenticated"` | Assigned by GoTrue to logged-in users only |
| **Subject (`sub`)** | User UUID (e.g. `"usr_..."`) | Supabase auth user identifier |
| **Expiry (`exp`)** | Current UTC timestamp < `exp` | Valid, non-expired token |
| **Signing Secret** | `VTO_JWT_SECRET` | Supabase Project JWT Secret (from Supabase Dashboard) |

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

There are four discrete causes that produce a 401 response from `POST /v1/vto/jobs`:

1. **Missing or Malformed Header** (`HTTP 401: Authentication required`):
   - The request omits `Authorization`, sends empty string, or uses an unsupported scheme (e.g., `Token <token>` instead of `Bearer <token>`).
2. **Kaggle Secret Mismatch (`VTO_JWT_SECRET`)** (`HTTP 401: Invalid authentication token`):
   - In Kaggle Secrets, `VTO_JWT_SECRET` was populated with the wrong key (such as the Supabase Anon Key or Service Role Key).
   - *Fix*: In Supabase Dashboard > Project Settings > API > JWT Settings > JWT Secret, copy the HMAC secret string and paste it into Kaggle Secrets as `VTO_JWT_SECRET`.
3. **Anon/Public Key Passed Instead of Authenticated User Token** (`HTTP 401: Invalid authentication token`):
   - When calling the API directly (via curl, Postman, or before the mobile app completes user authentication), passing the client anon key fails because `aud` is not `"authenticated"` and `sub` is absent.
4. **Token Expiry** (`HTTP 401: Invalid authentication token`):
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
  - `ALGORITHM_MISMATCH`: Header `alg` is not `HS256`.
  - `AUDIENCE_MISMATCH`: Claim `aud` is not `"authenticated"`.
  - `MISSING_SUB_CLAIM`: Token lacks user ID `sub`.
  - `TOKEN_EXPIRED`: Current time past `exp`.
  - `SIGNATURE_VERIFICATION_FAILED`: `VTO_JWT_SECRET` does not match the token's signature.
  - `AUTH_SUCCESS`: Token is valid, signature verified, and authorized.

**Zero Exposure Guarantee**:
This endpoint never returns token strings, secrets, personal claims, file paths, or private bucket names.

---

## 6. Unit Test Verification

Automated test suite [tests/test_vto_auth_and_deployment.py](file:///d:/Personal%20projects/aura/tests/test_vto_auth_and_deployment.py) verified all 14 authentication and deployment constraints:
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
