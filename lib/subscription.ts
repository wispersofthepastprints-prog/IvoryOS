// lib/subscription.ts
import { checkProStatus } from './revenuecat';

const FREE_CLIENT_LIMIT = 3;

export async function canAddClient(currentClientCount: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  if (currentClientCount < FREE_CLIENT_LIMIT) {
    return { allowed: true };
  }
  const isPro = await checkProStatus();
  if (isPro) return { allowed: true };
  return {
    allowed: false,
    reason: `Free tier limited to ${FREE_CLIENT_LIMIT} clients. Upgrade to Pro for unlimited clients.`,
  };
}

export function getClientLimitMessage(currentCount: number): string | null {
  const remaining = FREE_CLIENT_LIMIT - currentCount;
  if (remaining > 0) {
    return `${remaining} free client${remaining === 1 ? '' : 's'} remaining. Upgrade to Pro for unlimited.`;
  } else if (remaining === 0) {
    return 'Free tier full. Upgrade to Pro to add more clients.';
  }
  return null;
}
