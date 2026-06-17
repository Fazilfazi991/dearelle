# Dearelle Admin Setup

The admin dashboard is now server-backed and protected by an HttpOnly session cookie.

## Required auth environment variables

Set these in your local shell and in Vercel Project Settings:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use_a_strong_password
ADMIN_SESSION_SECRET=use_a_long_random_secret
```

For this site, set `ADMIN_PASSWORD` in Vercel to the password you chose. Do not commit the real password to git.

You can use `ADMIN_PASSWORD_HASH` instead of `ADMIN_PASSWORD`. The hash must be a SHA-256 hex digest of the password.

## Production database storage

For production persistence on Vercel, set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Run the SQL in `supabase-store-data.sql` from the Supabase SQL Editor. It creates:

- `store_data` for admin products/settings/orders
- `profiles` for customer account details
- `user_addresses` for saved customer addresses
- Row-level security policies so customers can only read/edit their own profile and addresses

The service role key must only live in server environment variables. Do not place it in browser JavaScript.

## Local fallback

When Supabase env vars are not set, the local Node server stores admin data in `data/store.json`. That file is ignored by git.
