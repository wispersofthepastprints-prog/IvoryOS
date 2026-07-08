import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web client ID for browser OAuth
const GOOGLE_CLIENT_ID = '195901890313-3cacmm6jb1vrsq8ocdh2pihdug8rq2cv.apps.googleusercontent.com';

// IMPORTANT: Replace with your actual GitHub Pages URL after enabling Pages
// Format: https://YOUR_USERNAME.github.io/REPO_NAME/google-auth.html
const REDIRECT_URI = 'https://wispersofthepastprints-prog.github.io/IvoryOS/google-auth.html';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const TOKEN_KEY = 'google_access_token';

export async function signInWithGoogle(): Promise<string | null> {
  try {
    // Build Google OAuth URL
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&prompt=consent` +
      `&include_granted_scopes=true`;

    // Open browser for OAuth
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    if (result.type === 'success') {
      // Parse token from redirect URL
      const url = new URL(result.url);
      const token = url.searchParams.get('token');

      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        return token;
      }
    }

    return null;
  } catch (err: any) {
    console.error('Google auth error:', err);
    throw new Error('Failed to connect to Google Calendar: ' + err.message);
  }
}

export async function getStoredToken(): Promise<string | null> {
  return await AsyncStorage.getItem('google_access_token');
}

export async function clearStoredToken(): Promise<void> {
  await AsyncStorage.removeItem('google_access_token');
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