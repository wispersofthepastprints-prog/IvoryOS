import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

const GOOGLE_CLIENT_ID = '195901890313-6ufcrbcjvnejbekllmns8dnitd6edqv2.apps.googleusercontent.com';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
];

const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'ivoryos',
  path: 'google-auth',
});

export async function signInWithGoogle() {
  const authRequest = new AuthSession.AuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    responseType: AuthSession.ResponseType.Token,
    usePKCE: false,
  });

  const result = await authRequest.promptAsync(AuthSession.Discovery.Google, {
    useProxy: Platform.OS !== 'web',
  });

  if (result.type === 'success') {
    return result.authentication?.accessToken || null;
  }
  return null;
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