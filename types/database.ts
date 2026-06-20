export interface Photographer {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  location: string | null;
  vertical: string[];
  bio: string | null;
  profile_image: string | null;
  hourly_rate: number | null;
  subscription_tier: "free" | "pro" | "studio";
  subscription_status: string;
  stripe_connect_account_id: string | null;
  payout_enabled: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  photographer_id: string;
  email: string;
  full_name: string;
  partner_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  photographer_id: string;
  client_id: string;
  title: string;
  vertical: string;
  status: "inquiry" | "quoted" | "contracted" | "confirmed" | "completed" | "cancelled";
  event_date: string | null;
  event_location: string | null;
  package_price: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  balance_due: number | null;
  balance_paid: boolean;
  platform_fee_percent: number;
  created_at: string;
}

export interface DashboardData {
  monthlyRevenue: number;
  bookingCount: number;
  upcomingBooking: Booking | null;
  upcomingClient: Client | null;
  pendingActions: PendingAction[];
}

export interface PendingAction {
  id: string;
  type: "contract" | "invoice" | "payment";
  message: string;
  booking_id: string;
  daysOverdue: number;
}
