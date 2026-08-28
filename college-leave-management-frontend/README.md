# College Leave Management Frontend

Professional responsive frontend for the College Leave Management system.

## Branding
The supplied college logo and header artwork are in `assets/`.

## Backend
This frontend uses the existing Supabase project:
- URL: `https://hkazpnrlbitkbyymnoof.supabase.co`
- Publishable key is used in the browser.
- OTP authentication is handled by Supabase Auth.
- Leave workflow uses the existing database RPC functions:
  - `submit_leave`
  - `hod_review_leave`
  - `principal_review_leave`
- Admin user creation calls the existing `create-user` Edge Function.

## Important
Do NOT put a Supabase secret/service-role key in this frontend.

## Deploy
Upload the contents of this folder to your static host (for example Vercel).
`index.html` is the entry point.
