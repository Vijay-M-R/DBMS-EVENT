/**
 * DBMS-EVENT: Freelance Service Marketplace
 * Provider Portal Client Application Controller
 */

import { apiFetch, Auth, showToast, openModal, closeModal, formatCurrency, formatDate, formatTime, escapeHtml } from '/js/api.js';

// Global portal state
let currentProvider = null;
let allCategories = [];
let providerServices = [];
let providerSlots = [];
let providerBookings = [];
let allHistoryBookings = [];

// Expose modal/tab helpers globally for inline HTML event handlers
window.closeModal = closeModal;
window.openModal = openModal;
window.switchTab = switchTab;
window.toggleSlotStatus = toggleSlotStatus;
window.changeReviewsPage = changeReviewsPage;

// 1. Enforce Authentication & Role Guard
if (!Auth.requireAuth(['PROVIDER'])) {
  throw new Error('Unauthorized');
}

// 2. Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await loadPortalData();
});

/**
 * Setup Sidebar Tab Switching
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', () => {
    Auth.logout();
  });

  // Booking history filter pills
  const filterBtns = document.querySelectorAll('#history-filter-bar .filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const status = btn.getAttribute('data-status');
      renderBookingHistory(status);
    });
  });
}

function switchTab(tabId) {
  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach((item) => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Show target section
  document.querySelectorAll('.content-section').forEach((sec) => {
    sec.classList.remove('active');
  });
  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add('active');
  }
}

/**
 * Master Data Loader
 */
async function loadPortalData() {
  try {
    // 1. Fetch Profile
    const profileRes = await apiFetch('/providers/profile');
    currentProvider = profileRes.data;
    renderProfileHeader(currentProvider);
    populateProfileForm(currentProvider);

    // 2. Load Categories (for service creation dropdown)
    const catRes = await apiFetch('/categories');
    allCategories = catRes.data || [];
    populateCategoryDropdown(allCategories);

    // 3. Load Services
    await loadServices();

    // 4. Load Availability Slots
    await loadSlots();

    // 5. Load Bookings (Pending and All)
    await loadBookings();

    // 6. Load Reviews
    await loadReviews();

    // 7. Update Dashboard KPI Statistics
    updateDashboardKPIs();
  } catch (err) {
    console.error('Failed to initialize provider portal:', err);
    showToast(err.message || 'Error loading provider data', 'error');
  }
}

/**
 * Render Profile & Verification Badges
 */
function renderProfileHeader(provider) {
  document.getElementById('sidebar-user-name').textContent = provider.full_name || 'Provider';

  const badge = document.getElementById('sidebar-verify-badge');
  const banner = document.getElementById('verification-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerDesc = document.getElementById('banner-desc');

  const status = provider.verification_status || 'PENDING';
  badge.textContent = status;
  badge.className = `badge badge-${status.toLowerCase()}`;

  if (status !== 'VERIFIED') {
    banner.style.display = 'flex';
    if (status === 'PENDING') {
      banner.className = 'alert alert-warning';
      bannerTitle.textContent = 'Account Verification Pending';
      bannerDesc.textContent = 'Your provider account is currently pending administrator verification. You can configure your profile and slots, but publishing live services requires admin approval.';
    } else if (status === 'SUSPENDED') {
      banner.className = 'alert alert-danger';
      bannerTitle.textContent = 'Provider Account Suspended';
      bannerDesc.textContent = 'Your provider account has been temporarily suspended by platform administrators. Customer bookings cannot be scheduled while suspended.';
    } else if (status === 'REJECTED') {
      banner.className = 'alert alert-danger';
      bannerTitle.textContent = 'Verification Rejected';
      bannerDesc.textContent = 'Your verification request was rejected. Please update your profile information or contact support.';
    }
  } else {
    banner.style.display = 'none';
  }

  // Dashboard rating
  document.getElementById('stat-avg-rating').textContent = Number(provider.average_rating || 0).toFixed(2);
}

function populateProfileForm(provider) {
  document.getElementById('prof-name').value = provider.full_name || '';
  document.getElementById('prof-email').value = provider.email || '';
  document.getElementById('prof-phone').value = provider.phone || '';
  document.getElementById('prof-exp').value = provider.experience_years ?? 0;
  document.getElementById('prof-city').value = provider.service_city || '';
  document.getElementById('prof-pincode').value = provider.service_pincode || '';
  document.getElementById('prof-bio').value = provider.professional_bio || '';
}

/**
 * Profile Form Submission
 */
function setupEventListeners() {
  // Profile update
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const payload = {
      full_name: document.getElementById('prof-name').value.trim(),
      phone: document.getElementById('prof-phone').value.trim(),
      experience_years: parseInt(document.getElementById('prof-exp').value, 10),
      service_city: document.getElementById('prof-city').value.trim(),
      service_pincode: document.getElementById('prof-pincode').value.trim(),
      professional_bio: document.getElementById('prof-bio').value.trim(),
    };

    try {
      const res = await apiFetch('/providers/profile', {
        method: 'PUT',
        body: payload,
      });

      currentProvider = { ...currentProvider, ...res.data };
      renderProfileHeader(currentProvider);
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Profile Changes';
    }
  });

  // Open Add Service Modal
  document.getElementById('add-service-btn').addEventListener('click', () => {
    const alertBox = document.getElementById('service-modal-alert');
    const submitBtn = document.getElementById('save-service-submit-btn');

    document.getElementById('service-form').reset();
    document.getElementById('service-id-hidden').value = '';
    document.getElementById('service-modal-title').textContent = 'Add New Service';

    // Requirement: If unverified, display clear message explaining admin verification is required
    if (currentProvider.verification_status !== 'VERIFIED') {
      alertBox.style.display = 'block';
      alertBox.className = 'alert alert-warning';
      alertBox.textContent = `Notice: Your account is currently in '${currentProvider.verification_status}' status. Platform administrators must VERIFY your account before you can publish services.`;
      submitBtn.disabled = true;
    } else {
      alertBox.style.display = 'none';
      submitBtn.disabled = false;
    }

    openModal('service-modal');
  });

  // Service Form Submission (Create or Update)
  document.getElementById('service-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = document.getElementById('service-id-hidden').value;
    const isEdit = !!serviceId;

    const payload = {
      service_name: document.getElementById('svc-name').value.trim(),
      category_id: parseInt(document.getElementById('svc-category').value, 10),
      price: parseFloat(document.getElementById('svc-price').value),
      estimated_duration: parseInt(document.getElementById('svc-duration').value, 10),
      description: document.getElementById('svc-description').value.trim(),
    };

    const submitBtn = document.getElementById('save-service-submit-btn');
    submitBtn.disabled = true;

    try {
      if (isEdit) {
        await apiFetch(`/services/${serviceId}`, {
          method: 'PUT',
          body: payload,
        });
        showToast('Service updated successfully!', 'success');
      } else {
        await apiFetch('/services', {
          method: 'POST',
          body: payload,
        });
        showToast('Service created successfully!', 'success');
      }

      closeModal('service-modal');
      await loadServices();
      updateDashboardKPIs();
    } catch (err) {
      showToast(err.message || 'Failed to save service', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Open Add Slot Modal
  document.getElementById('add-slot-btn').addEventListener('click', () => {
    document.getElementById('slot-form').reset();
    // Default slot date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('slot-date').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('slot-start').value = '10:00';
    document.getElementById('slot-end').value = '11:00';
    openModal('slot-modal');
  });

  // Slot Form Submission
  document.getElementById('slot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const slot_date = document.getElementById('slot-date').value;
    const start_time = document.getElementById('slot-start').value;
    const end_time = document.getElementById('slot-end').value;

    if (end_time <= start_time) {
      showToast('End time must be later than start time', 'warning');
      return;
    }

    const submitBtn = document.getElementById('save-slot-submit-btn');
    submitBtn.disabled = true;

    try {
      await apiFetch('/availability', {
        method: 'POST',
        body: { slot_date, start_time, end_time },
      });

      showToast('Availability slot added!', 'success');
      closeModal('slot-modal');
      await loadSlots();
    } catch (err) {
      showToast(err.message || 'Failed to create slot', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function populateCategoryDropdown(categories) {
  const select = document.getElementById('svc-category');
  select.innerHTML = '<option value="">Select Category...</option>';
  categories.forEach((cat) => {
    if (cat.category_status === 'ACTIVE') {
      const opt = document.createElement('option');
      opt.value = cat.category_id;
      opt.textContent = cat.category_name;
      select.appendChild(opt);
    }
  });
}

/**
 * Services Management Functions
 */
async function loadServices() {
  const tbody = document.getElementById('services-table-body');
  try {
    const res = await apiFetch('/services/provider/my-services');
    providerServices = res.data || [];

    if (providerServices.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
        <div class="empty-icon">💼</div>
        <p>No services published yet. Click "Add New Service" to create your first offering.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = providerServices.map((svc) => `
      <tr>
        <td>
          <strong>${escapeHtml(svc.service_name)}</strong>
          <p style="font-size: 0.8rem; margin-top: 0.2rem;">${escapeHtml(svc.description)}</p>
        </td>
        <td><span class="badge badge-completed">${escapeHtml(svc.category_name || 'General')}</span></td>
        <td class="font-bold text-success">${formatCurrency(svc.price)}</td>
        <td>${svc.estimated_duration} mins</td>
        <td><span class="badge badge-${svc.service_status.toLowerCase()}">${svc.service_status}</span></td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="window.editService(${svc.service_id})">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteService(${svc.service_id})">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

window.editService = (serviceId) => {
  const svc = providerServices.find((s) => s.service_id === serviceId);
  if (!svc) return;

  document.getElementById('service-id-hidden').value = svc.service_id;
  document.getElementById('service-modal-title').textContent = 'Edit Service';
  document.getElementById('svc-name').value = svc.service_name;
  document.getElementById('svc-category').value = svc.category_id;
  document.getElementById('svc-price').value = svc.price;
  document.getElementById('svc-duration').value = svc.estimated_duration;
  document.getElementById('svc-description').value = svc.description;

  document.getElementById('service-modal-alert').style.display = 'none';
  document.getElementById('save-service-submit-btn').disabled = false;
  openModal('service-modal');
};

window.deleteService = async (serviceId) => {
  if (!confirm('Are you sure you want to delete this service offering?')) return;
  try {
    await apiFetch(`/services/${serviceId}`, { method: 'DELETE' });
    showToast('Service listing removed successfully', 'success');
    await loadServices();
    updateDashboardKPIs();
  } catch (err) {
    showToast(err.message || 'Failed to delete service', 'error');
  }
};

/**
 * Availability Slots Management Functions
 */
async function loadSlots() {
  const tbody = document.getElementById('slots-table-body');
  tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Loading schedule slots...</td></tr>';

  try {
    const res = await apiFetch('/availability/my-slots');
    providerSlots = res.data || [];

    if (providerSlots.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">
        <div class="empty-icon">📅</div>
        <p>No availability slots created. Click "Add Time Slot" to schedule working hours.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = providerSlots.map((slot) => {
      const isBooked = slot.slot_status === 'BOOKED';
      const isCancelled = slot.slot_status === 'CANCELLED';
      const isAvailable = slot.slot_status === 'AVAILABLE';
      const isBlocked = slot.slot_status === 'BLOCKED';

      let actionButtons = '';
      if (isBooked) {
        actionButtons = '<span class="badge badge-booked">Reserved</span>';
      } else if (isCancelled) {
        actionButtons = '<span class="badge badge-cancelled">Cancelled</span>';
      } else if (isAvailable) {
        actionButtons = `
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" id="btn-status-${slot.slot_id}" onclick="window.toggleSlotStatus(${slot.slot_id}, 'BLOCKED')">🚫 Block</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteSlot(${slot.slot_id})">🗑️ Delete</button>
          </div>
        `;
      } else if (isBlocked) {
        actionButtons = `
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-success btn-sm" id="btn-status-${slot.slot_id}" onclick="window.toggleSlotStatus(${slot.slot_id}, 'AVAILABLE')">✓ Unblock</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteSlot(${slot.slot_id})">🗑️ Delete</button>
          </div>
        `;
      }

      return `
        <tr>
          <td><strong>${formatDate(slot.slot_date)}</strong></td>
          <td>${formatTime(slot.start_time)}</td>
          <td>${formatTime(slot.end_time)}</td>
          <td><span class="badge badge-${slot.slot_status.toLowerCase()}">${slot.slot_status}</span></td>
          <td>${slot.customer_name ? `👤 ${escapeHtml(slot.customer_name)}` : '<span class="text-muted">—</span>'}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

/**
 * Toggle Slot Status (AVAILABLE <-> BLOCKED)
 * Calls PATCH /api/v1/availability/:id/status
 */
async function toggleSlotStatus(slotId, targetStatus) {
  const btn = document.getElementById(`btn-status-${slotId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  try {
    await apiFetch(`/availability/${slotId}/status`, {
      method: 'PATCH',
      body: { slot_status: targetStatus },
    });

    showToast(`Slot status updated to ${targetStatus}`, 'success');
    await loadSlots();
  } catch (err) {
    showToast(err.message || 'Failed to update slot status', 'error');
    if (btn) {
      btn.disabled = false;
      btn.textContent = targetStatus === 'BLOCKED' ? '🚫 Block' : '✓ Unblock';
    }
  }
}

window.deleteSlot = async (slotId) => {
  if (!confirm('Delete this unbooked availability slot?')) return;
  try {
    await apiFetch(`/availability/${slotId}`, { method: 'DELETE' });
    showToast('Slot deleted successfully', 'success');
    await loadSlots();
  } catch (err) {
    showToast(err.message || 'Failed to delete slot', 'error');
  }
};

/**
 * Incoming & Historical Bookings Functions
 */
async function loadBookings() {
  // Load Pending bookings for Incoming Tab
  const inboundBody = document.getElementById('inbound-bookings-body');
  try {
    const resPending = await apiFetch('/bookings/provider/history?status=PENDING');
    providerBookings = resPending.data || [];

    if (providerBookings.length === 0) {
      inboundBody.innerHTML = `<tr><td colspan="7" class="empty-state">
        <div class="empty-icon">📥</div>
        <p>No pending customer booking requests at this moment.</p>
      </td></tr>`;
    } else {
      inboundBody.innerHTML = providerBookings.map((b) => `
        <tr>
          <td>#${b.booking_id}</td>
          <td>
            <strong>${escapeHtml(b.customer_name || 'Customer')}</strong>
            <p style="font-size: 0.8rem;">${escapeHtml(b.customer_phone || '')}</p>
          </td>
          <td><strong>${escapeHtml(b.service_name)}</strong></td>
          <td>
            ${formatDate(b.slot_date)}<br>
            <span style="font-size: 0.8rem;" class="text-muted">${formatTime(b.start_time)} - ${formatTime(b.end_time)}</span>
          </td>
          <td class="font-bold text-success">${formatCurrency(b.service_price)}</td>
          <td>${b.customer_notes ? `<span style="font-style: italic;">"${escapeHtml(b.customer_notes)}"</span>` : '<span class="text-muted">—</span>'}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-success btn-sm" onclick="window.updateBookingStatus(${b.booking_id}, 'ACCEPTED')">✓ Accept</button>
              <button class="btn btn-danger btn-sm" onclick="window.updateBookingStatus(${b.booking_id}, 'REJECTED')">✕ Reject</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Load All bookings for History Tab
    const resAll = await apiFetch('/bookings/provider/history');
    allHistoryBookings = resAll.data || [];
    renderBookingHistory('ALL');
  } catch (err) {
    inboundBody.innerHTML = `<tr><td colspan="7" class="text-danger empty-state">${escapeHtml(err.message)}</td></tr>`;
  }
}

window.updateBookingStatus = async (bookingId, newStatus) => {
  const actionText = newStatus === 'ACCEPTED' ? 'Accept this customer reservation?' : 'Reject this booking request? (This will release your availability slot)';
  if (!confirm(actionText)) return;

  try {
    await apiFetch(`/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: { booking_status: newStatus },
    });

    showToast(`Booking #${bookingId} marked as ${newStatus}`, 'success');
    await loadBookings();
    await loadSlots();
    updateDashboardKPIs();
  } catch (err) {
    showToast(err.message || 'Failed to update booking status', 'error');
  }
};

function renderBookingHistory(statusFilter) {
  const tbody = document.getElementById('history-bookings-body');
  const filtered = statusFilter === 'ALL' ? allHistoryBookings : allHistoryBookings.filter((b) => b.booking_status === statusFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No bookings found for status: ${statusFilter}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((b) => `
    <tr>
      <td>#${b.booking_id}</td>
      <td>${escapeHtml(b.customer_name || 'Customer')}</td>
      <td><strong>${escapeHtml(b.service_name)}</strong></td>
      <td>${formatDate(b.slot_date)} (${formatTime(b.start_time)})</td>
      <td><span class="badge badge-${b.booking_status.toLowerCase()}">${b.booking_status}</span></td>
      <td class="font-bold">${formatCurrency(b.service_price)}</td>
    </tr>
  `).join('');
}

/**
 * Reviews & Ratings Functions
 * Connects to authenticated GET /api/v1/reviews/my-reviews with pagination
 */
let currentReviewsPage = 1;

async function loadReviews(page = 1) {
  currentReviewsPage = page;
  const container = document.getElementById('reviews-list-container');
  const paginationContainer = document.getElementById('reviews-pagination-container');

  container.innerHTML = '<div class="empty-state"><p>Loading customer reviews...</p></div>';

  try {
    const res = await apiFetch(`/reviews/my-reviews?page=${page}&limit=10`);
    const reviews = res.data?.reviews || [];
    const avg = Number(res.data?.average_rating || 0).toFixed(2);
    const count = res.data?.total_reviews ?? res.data?.pagination?.total ?? reviews.length;
    const pagination = res.data?.pagination;

    // Update rating counters
    document.getElementById('reviews-avg-rating').textContent = `${avg} / 5.0`;
    document.getElementById('reviews-total-count').textContent = count;
    const statAvg = document.getElementById('stat-avg-rating');
    if (statAvg) statAvg.textContent = avg;

    if (reviews.length === 0) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">💬</div>
        <p>No customer reviews received yet. Reviews are posted by customers after service completion.</p>
      </div>`;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    container.innerHTML = reviews.map((r) => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      return `
        <div style="padding: 1.25rem 0; border-bottom: 1px solid var(--border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <div>
              <strong>${escapeHtml(r.customer_name || 'Customer')}</strong>
              <span class="text-muted" style="font-size: 0.85rem; margin-left: 0.5rem;">for <strong>${escapeHtml(r.service_name || 'Service')}</strong></span>
            </div>
            <div style="color: #f59e0b; font-size: 1.15rem; letter-spacing: 2px;">${stars}</div>
          </div>
          <p style="margin: 0.4rem 0; color: var(--text-main);">${escapeHtml(r.comment || 'No written feedback provided.')}</p>
          <span style="font-size: 0.775rem;" class="text-muted">${formatDate(r.created_at)}</span>
        </div>
      `;
    }).join('');

    // Render pagination controls if multiple pages exist
    if (paginationContainer) {
      if (pagination && pagination.totalPages > 1) {
        paginationContainer.innerHTML = `
          <span class="text-muted" style="font-size: 0.85rem;">
            Page <strong>${pagination.page}</strong> of <strong>${pagination.totalPages}</strong> (${pagination.total} total reviews)
          </span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm" ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.changeReviewsPage(${pagination.page - 1})">
              ← Previous
            </button>
            <button class="btn btn-secondary btn-sm" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="window.changeReviewsPage(${pagination.page + 1})">
              Next →
            </button>
          </div>
        `;
      } else {
        paginationContainer.innerHTML = '';
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="empty-state text-danger"><p>Failed to load reviews: ${escapeHtml(err.message)}</p></div>`;
    if (paginationContainer) paginationContainer.innerHTML = '';
  }
}

function changeReviewsPage(page) {
  loadReviews(page);
}

/**
 * Compute Dashboard Counters
 */
function updateDashboardKPIs() {
  document.getElementById('stat-services-count').textContent = providerServices.length;
  document.getElementById('stat-pending-count').textContent = providerBookings.length;
  
  const completedCount = allHistoryBookings.filter((b) => b.booking_status === 'COMPLETED').length;
  document.getElementById('stat-completed-count').textContent = completedCount;
}
