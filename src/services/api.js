// API service layer — local-first persistence ready to swap for Flask API calls later

import {
  mockListings as initialListings,
  mockRequests as initialRequests,
  mockIncomingRequests as initialIncomingRequests,
  mockCurrentUser,
  mockUserListings as initialUserListings
} from '../data/mockData.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEYS = {
  LISTINGS: 'shareloop_listings_v2',
  MY_REQUESTS: 'shareloop_my_requests_v2',
  INCOMING_REQUESTS: 'shareloop_incoming_requests_v2',
  USER_LISTINGS: 'shareloop_user_listings_v2'
};

function getStorage(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage error:', err);
  }
}

// Initialize seed data if not present
function initData() {
  if (!localStorage.getItem(STORAGE_KEYS.LISTINGS)) {
    setStorage(STORAGE_KEYS.LISTINGS, initialListings);
  }
  if (!localStorage.getItem(STORAGE_KEYS.MY_REQUESTS)) {
    setStorage(STORAGE_KEYS.MY_REQUESTS, initialRequests);
  }
  if (!localStorage.getItem(STORAGE_KEYS.INCOMING_REQUESTS)) {
    setStorage(STORAGE_KEYS.INCOMING_REQUESTS, initialIncomingRequests);
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_LISTINGS)) {
    setStorage(STORAGE_KEYS.USER_LISTINGS, initialUserListings);
  }
}
initData();

// --- Listings ---

export async function getListings(filters = {}) {
  await delay(200);
  let results = [...getStorage(STORAGE_KEYS.LISTINGS, initialListings)];

  if (filters.query) {
    const q = filters.query.toLowerCase().trim();
    results = results.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        (l.tags && l.tags.some((t) => t.toLowerCase().includes(q))) ||
        (l.categoryLabel && l.categoryLabel.toLowerCase().includes(q))
    );
  }

  if (filters.category && filters.category !== 'all') {
    results = results.filter((l) => l.category === filters.category);
  }

  if (filters.type && filters.type !== 'all') {
    results = results.filter((l) => l.type === filters.type);
  }

  if (filters.condition) {
    results = results.filter((l) => l.condition === filters.condition);
  }

  if (filters.minPrice != null && filters.minPrice !== '') {
    results = results.filter((l) => l.price == null || l.price >= Number(filters.minPrice));
  }

  if (filters.maxPrice != null && filters.maxPrice !== '') {
    results = results.filter((l) => l.price == null || l.price <= Number(filters.maxPrice));
  }

  if (filters.sort === 'price-asc') {
    results.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  } else if (filters.sort === 'price-desc') {
    results.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  } else {
    // Newest first
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return { listings: results, total: results.length };
}

export async function getListingById(id) {
  await delay(150);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const listing = listings.find((l) => String(l.id) === String(id));
  if (!listing) throw new Error('Listing not found');
  return listing;
}

export async function createListing(data) {
  await delay(350);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const userListings = getStorage(STORAGE_KEYS.USER_LISTINGS, initialUserListings);

  const newListing = {
    ...data,
    id: String(Date.now()),
    createdAt: new Date().toISOString().split('T')[0],
    available: true,
    views: 1,
    requests: 0
  };

  const updatedListings = [newListing, ...listings];
  const updatedUserListings = [newListing, ...userListings];

  setStorage(STORAGE_KEYS.LISTINGS, updatedListings);
  setStorage(STORAGE_KEYS.USER_LISTINGS, updatedUserListings);

  return newListing;
}

export async function updateListing(id, updatedFields) {
  await delay(300);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const userListings = getStorage(STORAGE_KEYS.USER_LISTINGS, initialUserListings);

  const updatedListings = listings.map((l) =>
    String(l.id) === String(id) ? { ...l, ...updatedFields } : l
  );
  const updatedUserListings = userListings.map((l) =>
    String(l.id) === String(id) ? { ...l, ...updatedFields } : l
  );

  setStorage(STORAGE_KEYS.LISTINGS, updatedListings);
  setStorage(STORAGE_KEYS.USER_LISTINGS, updatedUserListings);

  const target = updatedListings.find((l) => String(l.id) === String(id));
  return target;
}

export async function deleteListing(id) {
  await delay(250);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const userListings = getStorage(STORAGE_KEYS.USER_LISTINGS, initialUserListings);

  setStorage(
    STORAGE_KEYS.LISTINGS,
    listings.filter((l) => String(l.id) !== String(id))
  );
  setStorage(
    STORAGE_KEYS.USER_LISTINGS,
    userListings.filter((l) => String(l.id) !== String(id))
  );
  return { success: true, id };
}

export async function toggleListingAvailability(id) {
  await delay(200);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const item = listings.find((l) => String(l.id) === String(id));
  if (!item) throw new Error('Listing not found');

  return updateListing(id, { available: !item.available });
}

// --- Requests ---

export async function getMyRequests() {
  await delay(150);
  return getStorage(STORAGE_KEYS.MY_REQUESTS, initialRequests);
}

export async function getIncomingRequests() {
  await delay(150);
  return getStorage(STORAGE_KEYS.INCOMING_REQUESTS, initialIncomingRequests);
}

export async function createRequest(listingId, message) {
  await delay(300);
  const listings = getStorage(STORAGE_KEYS.LISTINGS, initialListings);
  const listing = listings.find((l) => String(l.id) === String(listingId));

  const myRequests = getStorage(STORAGE_KEYS.MY_REQUESTS, initialRequests);
  const incomingRequests = getStorage(STORAGE_KEYS.INCOMING_REQUESTS, initialIncomingRequests);

  const newReq = {
    id: `req_${Date.now()}`,
    listingId: String(listingId),
    listingTitle: listing ? listing.title : 'Campus Item',
    type: listing ? listing.type : 'sale',
    requesterId: 'current-user',
    requesterName: 'You (Demo)',
    sellerId: listing?.seller?.id || 'u_seller',
    sellerName: listing?.seller?.name || 'Fellow Student',
    status: 'pending',
    message: message || "Hi, I'm interested in this item!",
    createdAt: new Date().toISOString().split('T')[0]
  };

  const updatedMyRequests = [newReq, ...myRequests];
  setStorage(STORAGE_KEYS.MY_REQUESTS, updatedMyRequests);

  // If this item belongs to the user, also register in incoming
  const updatedIncoming = [
    {
      ...newReq,
      requesterDept: 'Computer Science, 3rd Year'
    },
    ...incomingRequests
  ];
  setStorage(STORAGE_KEYS.INCOMING_REQUESTS, updatedIncoming);

  // Increment request count on listing
  if (listing) {
    await updateListing(listingId, { requests: (listing.requests || 0) + 1 });
  }

  return newReq;
}

export async function updateRequestStatus(requestId, newStatus) {
  await delay(200);
  const incoming = getStorage(STORAGE_KEYS.INCOMING_REQUESTS, initialIncomingRequests);
  const updatedIncoming = incoming.map((r) =>
    r.id === requestId ? { ...r, status: newStatus } : r
  );
  setStorage(STORAGE_KEYS.INCOMING_REQUESTS, updatedIncoming);

  // Also sync in myRequests if matches
  const my = getStorage(STORAGE_KEYS.MY_REQUESTS, initialRequests);
  const updatedMy = my.map((r) =>
    r.id === requestId ? { ...r, status: newStatus } : r
  );
  setStorage(STORAGE_KEYS.MY_REQUESTS, updatedMy);

  return { success: true, requestId, status: newStatus };
}

// --- User ---

export async function getCurrentUser() {
  await delay(100);
  return mockCurrentUser;
}

export async function getUserListings() {
  await delay(150);
  return getStorage(STORAGE_KEYS.USER_LISTINGS, initialUserListings);
}

// --- Auth (mock with college email verification) ---

export async function login({ email, password }) {
  await delay(450);
  if (!email || !password) {
    throw new Error('Please fill in both email and password.');
  }
  const cleanEmail = email.toLowerCase().trim();
  const isCollegeEmail =
    cleanEmail.endsWith('.edu') ||
    cleanEmail.endsWith('.ac.in') ||
    cleanEmail.endsWith('.edu.in') ||
    cleanEmail.includes('college') ||
    cleanEmail.includes('campus');

  if (!isCollegeEmail) {
    throw new Error('Please enter a valid college email address (e.g. name@college.edu or name@univ.ac.in).');
  }

  const user = {
    ...mockCurrentUser,
    email: cleanEmail,
    name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  };

  return { user, token: 'mock-jwt-token-' + Date.now() };
}

export async function register(data) {
  await delay(500);
  const cleanEmail = (data.email || '').toLowerCase().trim();
  const isCollegeEmail =
    cleanEmail.endsWith('.edu') ||
    cleanEmail.endsWith('.ac.in') ||
    cleanEmail.endsWith('.edu.in') ||
    cleanEmail.includes('college') ||
    cleanEmail.includes('campus');

  if (!isCollegeEmail) {
    throw new Error('Registration requires a recognized college email address.');
  }

  const user = {
    id: `user_${Date.now()}`,
    name: data.name,
    email: cleanEmail,
    department: data.department,
    year: data.year,
    avatar: null,
    joinedAt: new Date().toISOString().split('T')[0]
  };

  return { user, token: 'mock-jwt-token-' + Date.now() };
}
