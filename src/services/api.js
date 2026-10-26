const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (response.status === 401 && path !== '/auth/login') {
    window.dispatchEvent(new Event('shareloop:unauthorized'));
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload;
}

function asJson(data) {
  return JSON.stringify(data);
}

export async function getListings(filters = {}) {
  const params = new URLSearchParams();
  const mapping = {
    query: 'q',
    category: 'category',
    type: 'type',
    sort: 'sort',
    condition: 'condition',
    minPrice: 'minPrice',
    maxPrice: 'maxPrice',
    page: 'page',
    perPage: 'per_page',
  };
  Object.entries(mapping).forEach(([key, apiKey]) => {
    if (filters[key] !== undefined && filters[key] !== '' && filters[key] !== 'all') {
      params.set(apiKey, filters[key]);
    }
  });
  return request(`/listings${params.size ? `?${params}` : ''}`);
}

export async function getCategories() {
  const { categories } = await request('/categories');
  return categories;
}

export async function getListingById(id) {
  const { listing } = await request(`/listings/${encodeURIComponent(id)}`);
  return listing;
}

export async function createListing(data) {
  const { listing } = await request('/listings', { method: 'POST', body: asJson(data) });
  return listing;
}

export async function updateListing(id, data) {
  const { listing } = await request(`/listings/${encodeURIComponent(id)}`, { method: 'PATCH', body: asJson(data) });
  return listing;
}

export async function deleteListing(id) {
  return request(`/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function toggleListingAvailability(id, available) {
  return updateListing(id, { status: available ? 'available' : 'unavailable' });
}

export async function getMyRequests() {
  const { orders } = await request('/orders/outgoing');
  return orders;
}

export async function getIncomingRequests() {
  const { orders } = await request('/orders/incoming');
  return orders;
}

export async function createRequest(listingId, message, expectedReturnDate) {
  const { order } = await request('/orders', {
    method: 'POST',
    body: asJson({
      listing_id: Number(listingId),
      buyer_note: message,
      expected_return_date: expectedReturnDate || undefined,
    }),
  });
  return order;
}

export async function updateRequestStatus(requestId, newStatus) {
  const action = { accepted: 'accept', rejected: 'reject', cancelled: 'cancel', completed: 'complete', returned: 'return' }[newStatus];
  if (!action) throw new Error('Unsupported request status.');
  const { order } = await request(`/orders/${encodeURIComponent(requestId)}/${action}`, { method: 'PATCH' });
  return order;
}

export async function getCurrentUser() {
  const { user } = await request('/auth/me');
  return user;
}

export async function getUserListings() {
  const { listings } = await request('/listings/mine');
  return listings;
}

export async function login({ email, password }) {
  const { user } = await request('/auth/login', {
    method: 'POST',
    body: asJson({ college_email: email, password }),
  });
  return { user };
}

export async function register(data) {
  const { user } = await request('/auth/register', {
    method: 'POST',
    body: asJson({
      full_name: data.name,
      college_email: data.email,
      department: data.department,
      college_year: data.year,
      password: data.password,
    }),
  });
  return { user };
}

export async function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export async function getFavorites() {
  const { listings } = await request('/favorites');
  return listings;
}

export async function addFavorite(id) {
  return request(`/favorites/${encodeURIComponent(id)}`, { method: 'POST' });
}

export async function removeFavorite(id) {
  return request(`/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const { url } = await request('/uploads/images', { method: 'POST', body: form });
  return `${API_BASE_URL.replace(/\/api$/, '')}${url}`;
}
