/* Booking requests: visitors insert, the admin reads and updates (enforced by RLS). */
import { supabase } from './supabase.js';

export const BOOKING_STATUSES = ['new', 'contacted', 'closed'];

// Insert only. Visitors have no read access, so no row is returned.
export async function createBooking({ firstName, lastName, email, phone }) {
  const { error } = await supabase.from('bookings').insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
  });
  if (error) throw error;
}

export async function listBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, first_name, last_name, email, phone, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(id, status) {
  const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
  if (error) throw error;
}

// Calls onChange({ eventType, new, old }) for every insert, update and delete,
// and onStatus(status) as the channel connects or drops ('SUBSCRIBED', 'CLOSED', ...).
// Returns a function that ends the subscription.
export function subscribeToBookings(onChange, onStatus = () => {}) {
  const channel = supabase
    .channel('bookings-admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onChange)
    .subscribe((status) => onStatus(status));
  return () => supabase.removeChannel(channel);
}
