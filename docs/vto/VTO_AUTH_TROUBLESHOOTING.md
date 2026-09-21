# AURA VTO — Authentication Troubleshooting Guide

This guide explains how to quickly diagnose and resolve `HTTP 401 Unauthorized` errors when connecting to the Kaggle AURA VTO service without exposing secrets or compromising security.

---

## 1. Quick Diagnostic with `GET /v1/vto/diagnostics/auth`

The VTO service includes a safe diagnostic endpoint that tests your request header against the server's validation logic without executing inference or leaking secrets.

### Testing from Command Line (curl)

Run the following command, replacing `<YOUR_NGROK_URL>` with your tunnel URL and `<USER_ACCESS_TOKEN>` with a fresh Supabase user access token:

```bash
curl -i -X GET "https://<YOUR_NGROK_URL>/v1/vto/diagnostics/auth" \
     -H "Authorization: Bearer <USER_ACCESS_TOKEN>"
```

*(Note: Do not use the Supabase Anon Key. Use the user's `session.access_token`.)*

---

## 2. Understanding Diagnostic Codes & Fixes

| Diagnostic Code | Underlying Cause | Corrective Action |
| :--- | :--- | :--- |
| `AUTH_HEADER_MISSING` | The `Authorization` header was not sent or was stripped by a proxy. | Verify that your HTTP client attaches the `Authorization` header. In Expo/React Native, ensure the header is added to the fetch options. |
| `AUTH_SCHEME_INVALID` | The header does not begin with `Bearer `. | Change the header value format to `Bearer <token>`. Ensure there is a single space between `Bearer` and the token string. |
| `TOKEN_STRUCTURE_INVALID` | The string passed is not a valid JWT (it does not have three dot-separated base64url segments). | Ensure you are passing `session.access_token` and not a user ID, email address, or arbitrary string. |
| `ALGORITHM_MISMATCH` | The JWT algorithm is neither `HS256` nor `ES256`. | Modern Supabase uses `ES256` (ECDSA); legacy uses `HS256`. If this occurs, rerun Step 1 and Step 6 in the Kaggle notebook to update the server with dual-algorithm support. |
| `AUDIENCE_MISMATCH` | The token's `aud` claim is not `"authenticated"`. | **Common**: You passed the Supabase Anon Key or service role key instead of a logged-in user's token. In Supabase, only authenticated user sessions contain `aud: "authenticated"`. Log into the app first to obtain a user session. |
| `MISSING_SUB_CLAIM` | The token lacks a `sub` claim. | Ensure you are using an authenticated user session token. The `sub` claim contains the user's UUID in Supabase Auth. |
| `TOKEN_EXPIRED` | The token's timestamp has passed its expiration time (`exp`). | Call `supabase.auth.refreshSession()` in the mobile app to refresh the access token before dispatching the request. |
| `SIGNATURE_VERIFICATION_FAILED` | The signing key does not match the token signature. | For `HS256`, verify `VTO_JWT_SECRET` in Kaggle Secrets matches Supabase Project Settings > API > JWT Settings > JWT Secret. For `ES256`, verify the Kaggle runtime can access `SUPABASE_URL/.well-known/jwks.json`. |
| `AUTH_SUCCESS` | Authentication succeeded! | The token is valid, correctly signed, and authorized. You can now submit jobs via `POST /v1/vto/jobs`. |

---

## 3. Verifying Frontend Configuration

### Step A: Check Environment Variables
In your local `.env` file, ensure:
```env
EXPO_PUBLIC_VTO_API_URL=https://<your-current-ngrok-subdomain>.ngrok-free.dev
```
> [!IMPORTANT]
> Whenever you modify `.env`, restart the Expo Metro bundler with cache clear:
> `npx expo start -c`

### Step B: Confirm User Login State
In `src/services/vto/vtoJobClient.ts`:
- `supabase.auth.getSession()` retrieves the active session.
- If the user is browsing as a guest or not logged in, `session` is `null`. The app must prompt the user to sign in before creating a VTO job.

---

## 4. Kaggle Server Restart Checklist

If you update `VTO_JWT_SECRET` in Kaggle Secrets:
1. Open the Kaggle Notebook.
2. In the right sidebar, verify that **Add-ons > Secrets > `VTO_JWT_SECRET`** is checked/enabled.
3. Restart the FastAPI server cell (`Step 6` in `docs/vto/AURA_VTO_TEMP_SERVICE_KAGGLE.ipynb`).
4. Re-run `curl -s https://<ngrok-url>/ready` to ensure it returns `{"ready": true}`.
5. Re-run `curl -i -X GET https://<ngrok-url>/v1/vto/diagnostics/auth -H "Authorization: Bearer <TOKEN>"` to confirm `AUTH_SUCCESS`.
