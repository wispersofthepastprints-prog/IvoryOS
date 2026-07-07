import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

const GOOGLE_CLIENT_ID = '195901890313-6ufcrbcjvnejbekllmns8dnitd6edqv2.apps.googleusercontent.com';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
];

// FIX: Discovery.Google is undefined in some expo-auth-session versions
// Define the Google OAuth endpoints manually
const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'ivoryos',
  path: 'google-auth',
});

export async function signInWithGoogle() {
  try {
    const authRequest = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri: REDIRECT_URI,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    });

    // FIX: Use manual discovery object instead of AuthSession.Discovery.Google
    const result = await authRequest.promptAsync(GOOGLE_DISCOVERY, {
      useProxy: Platform.OS !== 'web',
    });

    if (result.type === 'success') {
      return result.authentication?.accessToken || null;
    }
    return null;
  } catch (err: any) {
    console.error('Google auth error:', err);
    throw new Error('Failed to connect to Google Calendar: ' + err.message);
  }
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