/* Admin bookings page: sign in, then watch booking requests arrive in real time. */
import { signIn, signOut, getMyRole, onAuthChange } from './lib/auth.js';
import {
  BOOKING_STATUSES,
  listBookings,
  updateBookingStatus,
  subscribeToBookings,
} from './lib/bookings.js';

const $ = (selector) => document.querySelector(selector);

const loading = $('[data-loading]');
const loginForm = $('[data-login-form]');
const loginStatus = $('[data-login-status]');
const noAccess = $('[data-no-access]');
const panel = $('[data-admin-panel]');
const account = $('[data-account]');
const accountEmail = $('[data-account-email]');
const adminStatus = $('[data-admin-status]');
const tbody = $('[data-bookings]');
const empty = $('[data-empty]');
const count = $('[data-booking-count]');
const live = $('[data-live-state]');

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

let currentUserId; // undefined until the first auth event, so a signed-out start still renders
let unsubscribe = null;

/* ---------- View switching ---------- */
function show(view) {
  loading.hidden = true;
  loginForm.hidden = view !== 'login';
  noAccess.hidden = view !== 'no-access';
  panel.hidden = view !== 'admin';
  account.hidden = view === 'login';
}

function showMessage(element, text) {
  element.textContent = text;
  element.hidden = !text;
}

/* ---------- Table rendering (textContent only: rows hold visitor input) ---------- */
function link(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  return a;
}

function cell(content) {
  const td = document.createElement('td');
  if (content instanceof Node) td.append(content);
  else td.textContent = content;
  return td;
}

function statusSelect(booking) {
  const select = document.createElement('select');
  select.setAttribute('aria-label', `Status for ${booking.first_name} ${booking.last_name}`);
  BOOKING_STATUSES.forEach((status) => select.add(new Option(status, status)));
  select.value = booking.status;

  select.addEventListener('change', async () => {
    const row = select.closest('tr');
    const previous = row.dataset.status;
    select.disabled = true;
    try {
      await updateBookingStatus(booking.id, select.value);
      row.dataset.status = select.value;
      showMessage(adminStatus, '');
    } catch (error) {
      console.error(error);
      select.value = previous;
      showMessage(adminStatus, 'Could not update the status. Please try again.');
    } finally {
      select.disabled = false;
    }
  });
  return select;
}

function renderRow(booking) {
  const row = document.createElement('tr');
  row.dataset.id = booking.id;
  row.dataset.status = booking.status;
  row.append(
    cell(dateFormat.format(new Date(booking.created_at))),
    cell(`${booking.first_name} ${booking.last_name}`),
    cell(link(`mailto:${booking.email}`, booking.email)),
    cell(link(`tel:${booking.phone.replace(/[^\d+]/g, '')}`, booking.phone)),
    cell(statusSelect(booking)),
  );
  return row;
}

function findRow(id) {
  return [...tbody.rows].find((row) => row.dataset.id === id);
}

function updateCounts() {
  const total = tbody.rows.length;
  count.textContent = `${total} ${total === 1 ? 'request' : 'requests'}`;
  empty.hidden = tbody.rows.length > 0;
}

function renderAll(bookings) {
  tbody.replaceChildren(...bookings.map(renderRow));
  updateCounts();
}

/* ---------- Realtime ---------- */
function applyChange({ eventType, new: next, old }) {
  if (eventType === 'INSERT' && !findRow(next.id)) {
    const row = renderRow(next);
    row.classList.add('is-new');
    tbody.prepend(row);
  } else if (eventType === 'UPDATE') {
    findRow(next.id)?.replaceWith(renderRow(next));
  } else if (eventType === 'DELETE') {
    findRow(old.id)?.remove();
  }
  updateCounts();
}

async function refresh() {
  try {
    renderAll(await listBookings());
  } catch (error) {
    console.error(error);
    showMessage(adminStatus, 'Could not load bookings. Please reload the page.');
  }
}

function startLiveUpdates() {
  let wasConnected = false;
  unsubscribe = subscribeToBookings(applyChange, (status) => {
    const connected = status === 'SUBSCRIBED';
    live.textContent = connected ? 'Live' : 'Reconnecting';
    live.classList.toggle('is-live', connected);
    // Reload after a reconnect to pick up anything missed while offline
    if (connected && wasConnected) refresh();
    if (connected) wasConnected = true;
  });
}

function stopLiveUpdates() {
  unsubscribe?.();
  unsubscribe = null;
}

/* ---------- Session handling ---------- */
async function handleSession(session) {
  const userId = session?.user.id ?? null;
  if (userId === currentUserId) return; // token refreshes need no re-render
  currentUserId = userId;
  stopLiveUpdates();

  if (!session) {
    tbody.replaceChildren();
    show('login');
    return;
  }

  accountEmail.textContent = session.user.email;
  let role = 'user';
  try {
    role = await getMyRole(userId);
  } catch (error) {
    console.error(error);
  }
  if (userId !== currentUserId) return; // signed out while loading

  if (role !== 'admin') {
    show('no-access');
    return;
  }

  show('admin');
  await refresh();
  startLiveUpdates();
}

// Deferred so Supabase calls never run inside the auth callback itself
onAuthChange((session) => setTimeout(() => handleSession(session), 0));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  const { email, password } = loginForm.elements;
  if (!email.value.trim() || !password.value) {
    showMessage(loginStatus, 'Enter your email and password.');
    return;
  }

  button.disabled = true;
  showMessage(loginStatus, '');
  try {
    await signIn(email.value.trim(), password.value);
    loginForm.reset();
  } catch (error) {
    showMessage(loginStatus, error.message || 'Sign in failed.');
  } finally {
    button.disabled = false;
  }
});

$('[data-sign-out]').addEventListener('click', async () => {
  try {
    await signOut();
  } catch (error) {
    console.error(error);
  }
});
