# Google & Microsoft OAuth Setup

EmberFlow ships with working Google and Microsoft ("Continue with Google" / "Continue with Microsoft") sign-in on the login and signup pages. Email/password authentication works with no configuration at all — this guide is only needed if you want those two buttons to actually work.

Google OAuth has been tested and confirmed working end-to-end in production following these exact steps. Microsoft OAuth uses the identical code path (same `signInWithOAuth` call, same callback handling) but requires its own Azure app registration, which has not been separately verified — the steps below for Azure are given by direct analogy to the Google flow's Supabase-side configuration, since both providers are wired up identically in the app.

## How EmberFlow's OAuth flow works (read this first)

Understanding this makes every step below make sense, and is the fastest way to diagnose anything that doesn't work:

1. The user clicks "Continue with Google" → the app calls Supabase's `signInWithOAuth({ provider: 'google', options: { redirectTo } })`, where `redirectTo` is always built from `window.location.origin` at the moment of the click (`new URL('/auth/callback', window.location.origin)`) — **not** from an environment variable. This is deliberate: it guarantees the redirect always targets the same origin the sign-in was started from.
2. The browser is redirected to Google's consent screen, then back to **Supabase's own callback URL** (`https://<your-project-ref>.supabase.co/auth/v1/callback`) — this is the only URL Google ever redirects to directly, and it's the one you register in Google Cloud Console.
3. Supabase's server completes the token exchange with Google, then redirects the browser to the `redirectTo` URL from step 1 — but **only if that exact URL (or a matching pattern) is in your Supabase project's Redirect URLs allow-list**. If it isn't, Supabase silently redirects to your project's configured Site URL instead, which will not be `/auth/callback` and will break the flow with no error message.
4. EmberFlow uses the **PKCE flow** (`flowType: 'pkce'` in `frontend/src/services/supabase.js`), so this redirect lands on `/auth/callback?code=...` — a one-time authorization code, not a token. The app's `AuthCallbackPage` explicitly exchanges that code for a session via `supabase.auth.exchangeCodeForSession(code)`, then navigates to `/app` on success.

The two things that actually need configuring are: **(a)** Google/Azure needs to know to redirect to Supabase's callback URL, and **(b)** Supabase needs to know it's allowed to redirect back to *your* app's `/auth/callback` URL, for every origin (local, production, any custom domain) you actually use.

## 1. Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or use an existing one).
2. **APIs & Services > OAuth consent screen** — configure it (external users, app name, support email). This can stay in "Testing" mode while you develop; move it to "Production" (may require Google verification depending on scopes) before real users sign in.
3. **APIs & Services > Credentials > Create Credentials > OAuth client ID** — Application type: **Web application**.
4. Under **Authorized redirect URIs**, add exactly one URL:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   Find `<your-project-ref>` in your Supabase project's URL / Project Settings > API. This is the *only* redirect URI Google ever needs — it never redirects directly to your app.
5. Copy the generated **Client ID** and **Client Secret**.

## 2. Supabase Authentication provider config

1. Supabase Dashboard > **Authentication > Providers > Google**.
2. Enable it, paste in the Client ID and Client Secret from step 1.
3. Save.

## 3. Supabase Redirect URLs (the step almost everyone misses)

Supabase Dashboard > **Authentication > URL Configuration**:

- **Site URL** — your primary production URL (e.g. `https://your-domain.com`). This is the fallback Supabase uses if a requested `redirectTo` isn't allow-listed — getting the Redirect URLs list right (next) means you should never actually see this fallback happen.
- **Redirect URLs** — add an entry for **every origin you'll ever sign in from**, each pointing at `/auth/callback`:
  ```
  http://localhost:5173/auth/callback
  https://your-production-domain.com/auth/callback
  ```
  Or, simpler and more future-proof, use a wildcard per origin so you never have to revisit this when paths change:
  ```
  http://localhost:5173/**
  https://your-production-domain.com/**
  ```

If you deploy previews (e.g. Vercel preview deployments on random subdomains) or add a custom domain later, **each new origin needs its own entry here** — this is the #1 cause of OAuth "working locally but not in production" or "working on one domain but not another."

## 4. Local development

With steps 1–3 done, `npm run dev` and click "Continue with Google" from `http://localhost:5173/login`. You should land on `/auth/callback?code=...` briefly, then `/app`.

No `VITE_APP_URL` setting affects this flow — the redirect always targets whatever origin you're actually running on, so local development just works once `http://localhost:5173/**` (or your actual dev port) is in the Redirect URLs list.

## 5. Production (Vercel)

Same steps 1–3, adding your real production URL to Supabase's Redirect URLs. Nothing OAuth-specific needs to change in Vercel's environment variables — the flow doesn't depend on `VITE_APP_URL`/`APP_URL` at all.

## 6. Custom domains

If you later move from a `*.vercel.app` URL to your own domain (or add one alongside it), add the new domain's `/auth/callback` (or wildcard) entry to Supabase's Redirect URLs **before** testing sign-in on that domain — this is the same requirement as step 3, just easy to forget when a domain changes after the initial setup.

## 7. Microsoft (Azure)

The Supabase-side configuration mirrors Google exactly (same Redirect URLs list serves both providers — you don't need separate entries per provider, only per origin):

1. [Azure Portal](https://portal.azure.com) > **App registrations > New registration**.
2. Redirect URI (Web platform):
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. **Certificates & secrets** > create a new client secret.
4. Supabase Dashboard > **Authentication > Providers > Azure** — enable it, paste in the Application (client) ID and the client secret value, and set the Azure Tenant URL/ID per Supabase's field.
5. The Redirect URLs list from step 3 above already covers Microsoft too — no additional entries needed.

## 8. Common mistakes

- **Adding the app's `/auth/callback` URL to Google/Azure's redirect URI settings.** Don't — Google/Azure only ever redirect to Supabase's `/auth/v1/callback`. Your app's callback URL only goes in *Supabase's* Redirect URLs list.
- **Forgetting a wildcard/path suffix.** `https://your-domain.com` alone will not match `https://your-domain.com/auth/callback` unless you use the `/**` wildcard form or list the exact path.
- **Testing from a domain that was never added.** A stale browser tab or a URL you forgot to add to the Redirect URLs list will silently fall back to the Site URL instead of erroring clearly.
- **Assuming `VITE_APP_URL`/`APP_URL` control the OAuth redirect.** They don't — those affect email links (signup confirmation, password reset) and CORS, not the OAuth `redirectTo`, which is always the actual browser origin.

## 9. Troubleshooting

**Redirect lands on `/app#access_token=...` (a `#`, not `?code=`)**
This would mean the app is using implicit flow instead of PKCE — check `frontend/src/services/supabase.js` still has `flowType: 'pkce'` in the `createClient()` auth options. This should not happen in an unmodified copy of the app.

**Redirect lands on your Site URL / homepage instead of `/auth/callback`**
The origin you're testing from isn't in Supabase's Redirect URLs list. Add it (see step 3) and try again in a fresh browser tab.

**Redirect reaches `/auth/callback?code=...` but you're bounced back to `/login` with "Sign-in was cancelled or failed"**
The code exchange itself failed. Open the browser console and check for errors from `supabase.auth.exchangeCodeForSession`. The most common cause is testing from a different origin than the one that initiated the sign-in (e.g. the PKCE code verifier, stored in that origin's `localStorage`, isn't visible from a different origin) — make sure you're not switching domains mid-flow.

**Works in one browser/tab but not another, or intermittently**
Usually a stale tab that loaded the app before a Redirect URLs change took effect, or before a deploy went live. Hard-refresh or open a fresh incognito window before retesting.

**Provider consent screen itself shows an error (not an EmberFlow page)**
That's a Google/Azure-side configuration issue, not a Supabase/app issue — double check the OAuth consent screen and redirect URI from steps 1/7.
