import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Web client ID for browser OAuth
const GOOGLE_CLIENT_ID = '269799853021-i58g5ucjnu9mf70lj72263hfc0s6ktpf.apps.googleusercontent.com';

// Authorization-code flow: Google redirects here (edge function), which
// exchanges the code for tokens and 302s back into the app.
const REDIRECT_URI = 'https://ewqbywvhgujwkqnxvuqi.supabase.co/functions/v1/google-auth-callback';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const TOKEN_KEY = 'google_access_token';

// Opens Google's consent screen in the browser. No promise to resolve —
// the edge function stores the tokens and bounces the user back into the
// app, where the settings screen re-checks connection state on focus.
export async function signInWithGoogle(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error('Not logged in');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&include_granted_scopes=true` +
    `&state=${encodeURIComponent(user.id)}`;

  await Linking.openURL(authUrl);
}

export async function getStoredToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function createCalendarEvent(accessToken: string, event: {
  summary: string;
  description?: string;
  location?: string;
  startDate: string;
  endDate: string;
}) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { date: event.startDate },
      end: { date: event.endDate },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create calendar event');
  }

  return await response.json();
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.ok;
}
