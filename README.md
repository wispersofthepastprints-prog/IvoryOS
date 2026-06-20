# Ivory OS

The all-in-one platform for wedding photographers. Built with Expo SDK 56 + React Native + Supabase.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npx expo start
```

## Setup

1. Create a Supabase project at https://supabase.com
2. Run the database schema from the blueprint in the SQL Editor
3. Copy your Supabase URL and anon key into `lib/supabase.ts`
4. Enable Google and Apple auth providers in Supabase Authentication settings

## Brand Colors

- Ivory: `#F8F6F0`
- Obsidian: `#0A0A0A`
- Gold: `#C9A227`

## Screens

- `/login` — Welcome & authentication
- `/` — Dashboard with revenue, upcoming bookings, quick actions
- `/clients` — Client list with search

## Next Steps

- Add New Client form
- Add Booking Detail screen with contract/invoice/payment buttons
- Integrate Stripe Connect for 10% platform fee
- Add RevenueCat for $49/mo Pro subscription
