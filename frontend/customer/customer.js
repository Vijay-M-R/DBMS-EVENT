// frontend/customer/customer.js
// Customer Module Integration for Taskora Freelance Service Platform

import { 
  Auth, 
  apiFetch, 
  showToast, 
  formatCurrency, 
  formatDate, 
  formatTime, 
  escapeHtml 
} from '../js/api.js';

// Route Guard: Ensures only logged-in CUSTOMER can access this page
if (!Auth.requireAuth(['CUSTOMER'])) {
  // If not logged in as CUSTOMER, requireAuth automatically redirects to /login.html
}

document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  const welcomeUserEl = document.getElementById('welcome-user');
  if (welcomeUserEl && user) {
    welcomeUserEl.innerText = `Welcome, ${escapeHtml(user.full_name || user.email || 'Customer')}`;
  }

  // ----------------------------------------------------------------
  // 1. Tab Switching Navigation
  // ----------------------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetEl = document.getElementById(targetTab);
      if (targetEl) targetEl.classList.add('active');

      if (targetTab === 'tab-dash') loadDashboardStats();
      if (targetTab === 'tab-services') loadServices();
      if (targetTab === 'tab-bookings') loadBookingHistory();
      if (targetTab === 'tab-profile') loadProfile();
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clearAuth();
      showToast('Logged out successfully', 'info');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    });
  }

  // ----------------------------------------------------------------
  // 2. Dashboard Statistics & Recent Activity
  // ----------------------------------------------------------------
  async function loadDashboardStats() {
    try {
      const res = await apiFetch('/bookings/customer/history');
      const bookings = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      const statTotal = document.getElementById('stat-total');
      const statUpcoming = document.getElementById('stat-upcoming');
      const statCompleted = document.getElementById('stat-completed');

      if (statTotal) statTotal.innerText = bookings.length;
      if (statUpcoming) {
        statUpcoming.innerText = bookings.filter(
          b => b.booking_status === 'PENDING' || b.booking_status === 'ACCEPTED'
        ).length;
      }
      if (statCompleted) {
        statCompleted.innerText = bookings.filter(b => b.booking_status === 'COMPLETED').length;
      }

      const recentContainer = document.getElementById('recent-bookings');
      if (!recentContainer) return;

      if (bookings.length === 0) {
        recentContainer.innerHTML = '<p style="color: #64748b;">No recent bookings found.</p>';
        return;
      }

      recentContainer.innerHTML = bookings.slice(0, 3).map(b => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0;">
          <div>
            <strong>${escapeHtml(b.service_name || 'Service')}</strong><br />
            <small style="color: #64748b;">
              ${formatDate(b.slot_date || b.booking_date)} at ${formatTime(b.start_time)} • Provider: ${escapeHtml(b.provider_name || 'Assigned')}
            </small>
          </div>
          <span class="badge badge-${(b.booking_status || 'pending').toLowerCase()}">${escapeHtml(b.booking_status || 'PENDING')}</span>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    }
  }

  // ----------------------------------------------------------------
  // 3. Service Catalog, Search & Filtering
  // ----------------------------------------------------------------
  const searchInput = document.getElementById('service-search-input');
  const categoryFilter = document.getElementById('service-category-filter');
  const filterBtn = document.getElementById('search-filter-btn');
  const servicesGrid = document.getElementById('services-grid');

  // Dynamically load active categories from backend
  async function loadCategories() {
    if (!categoryFilter) return;
    try {
      const res = await apiFetch('/categories');
      const categories = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(categories) && categories.length > 0) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
          categories.map(c => `<option value="${c.category_id}">${escapeHtml(c.category_name)}</option>`).join('');
      }
    } catch (err) {
      console.warn('Could not load categories:', err.message);
    }
  }

  async function loadServices() {
    if (!servicesGrid) return;
    servicesGrid.innerHTML = '<p style="color: #64748b;">Searching services...</p>';

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (categoryFilter && categoryFilter.value) params.append('categoryId', categoryFilter.value);

    try {
      const res = await apiFetch(`/services/search?${params.toString()}`);
      const services = res?.data?.services || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));

      if (!services || services.length === 0) {
        servicesGrid.innerHTML = '<p style="color: #64748b;">No matching services found.</p>';
        return;
      }

      servicesGrid.innerHTML = services.map(s => {
        const escapedTitle = escapeHtml(s.service_name || 'Service').replace(/'/g, "\\'");
        return `
        <div class="service-card">
          <div>
            <span class="badge" style="background:#eff6ff; color:#2563eb;">${escapeHtml(s.category_name || 'General')}</span>
            <h4 style="margin: 0.5rem 0 0.25rem 0;">${escapeHtml(s.service_name)}</h4>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 0.5rem;">${escapeHtml(s.description || '')}</p>
            <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem;">
              Provider: <strong>${escapeHtml(s.provider_name || 'Verified Provider')}</strong><br />
              Rating: ★ <strong>${s.average_rating || '5.00'}</strong> (${s.total_reviews || 0} reviews)
            </div>
            <div class="service-price" style="font-size: 1.25rem; font-weight: 700; color: #2563eb; margin: 0.5rem 0;">
              ${formatCurrency(s.price || 0)}
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.openBookingModal(${s.service_id}, ${s.provider_id}, '${escapedTitle}', ${s.price})">Book Now</button>
        </div>
      `;
      }).join('');
    } catch (err) {
      servicesGrid.innerHTML = '<p style="color: #ef4444;">Error loading services catalog: ' + escapeHtml(err.message) + '</p>';
    }
  }

  if (filterBtn) filterBtn.addEventListener('click', loadServices);

  // ----------------------------------------------------------------
  // 4. Booking Flow & Slot Selection (ACID Transaction)
  // ----------------------------------------------------------------
  const bookingModal = document.getElementById('booking-modal');
  const bookingForm = document.getElementById('booking-form');
  const slotSelect = document.getElementById('modal-slot-id');
  const confirmBookingBtn = document.getElementById('confirm-booking-btn');

  window.openBookingModal = async (serviceId, providerId, title, price) => {
    document.getElementById('modal-service-title').innerText = `Book: ${title}`;
    document.getElementById('modal-service-id').value = serviceId;
    document.getElementById('modal-provider-id').value = providerId;
    document.getElementById('modal-price').value = price;
    document.getElementById('modal-display-price').innerText = price;
    document.getElementById('modal-notes').value = '';

    if (slotSelect) {
      slotSelect.innerHTML = '<option value="">Loading available slots...</option>';
      slotSelect.disabled = true;
    }
    if (confirmBookingBtn) confirmBookingBtn.disabled = true;

    bookingModal.style.display = 'flex';

    // Fetch live availability slots for provider
    try {
      const res = await apiFetch(`/availability/provider/${providerId}`);
      const slots = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      const openSlots = slots.filter(s => s.slot_status === 'AVAILABLE');

      if (openSlots.length === 0) {
        slotSelect.innerHTML = '<option value="">No open slots available for this provider</option>';
        slotSelect.disabled = true;
        if (confirmBookingBtn) confirmBookingBtn.disabled = true;
      } else {
        slotSelect.innerHTML = '<option value="">-- Choose an appointment slot --</option>' +
          openSlots.map(s => `
            <option value="${s.slot_id}">
              ${formatDate(s.slot_date)} • ${formatTime(s.start_time)} - ${formatTime(s.end_time)}
            </option>
          `).join('');
        slotSelect.disabled = false;
        if (confirmBookingBtn) confirmBookingBtn.disabled = false;
      }
    } catch (err) {
      slotSelect.innerHTML = '<option value="">Error loading slots</option>';
      showToast('Could not load provider availability slots: ' + err.message, 'error');
    }
  };

  const closeBookingBtn = document.getElementById('close-booking-modal-btn');
  if (closeBookingBtn) {
    closeBookingBtn.addEventListener('click', () => {
      bookingModal.style.display = 'none';
    });
  }

  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const slotId = parseInt(document.getElementById('modal-slot-id').value, 10);
      const serviceId = parseInt(document.getElementById('modal-service-id').value, 10);

      if (!slotId) {
        showToast('Please select a valid appointment slot.', 'warning');
        return;
      }

      const payload = {
        service_id: serviceId,
        slot_id: slotId,
        customer_notes: document.getElementById('modal-notes').value.trim() || undefined
      };

      try {
        const res = await apiFetch('/bookings', {
          method: 'POST',
          body: payload
        });

        if (res) {
          showToast('Booking placed successfully!', 'success');
          bookingModal.style.display = 'none';
          document.querySelector('[data-tab="tab-bookings"]').click();
          loadDashboardStats();
        }
      } catch (err) {
        showToast(err.message || 'Booking slot conflict. Please choose another slot.', 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // 5. Booking History & Cancellations
  // ----------------------------------------------------------------
  const bookingsList = document.getElementById('bookings-list');

  async function loadBookingHistory() {
    if (!bookingsList) return;
    bookingsList.innerHTML = '<p style="color: #64748b;">Loading history...</p>';

    try {
      const res = await apiFetch('/bookings/customer/history');
      const bookings = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      if (bookings.length === 0) {
        bookingsList.innerHTML = '<p style="color: #64748b;">You have no bookings recorded.</p>';
        return;
      }

      bookingsList.innerHTML = bookings.map(b => {
        const canCancel = b.booking_status === 'PENDING' || b.booking_status === 'ACCEPTED';
        const canReview = b.booking_status === 'COMPLETED' && !b.review_id;

        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; background: #fff;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <h4 style="margin: 0;">${escapeHtml(b.service_name || 'Service')}</h4>
                <span class="badge badge-${(b.booking_status || 'pending').toLowerCase()}">${escapeHtml(b.booking_status || 'PENDING')}</span>
              </div>
              <p style="color: #64748b; font-size: 0.85rem; margin: 0.25rem 0;">
                Date: <strong>${formatDate(b.slot_date || b.booking_date)} at ${formatTime(b.start_time)}</strong> • Amount: <strong>${formatCurrency(b.service_price)}</strong>
              </p>
              <p style="font-size: 0.85rem; color: #475569; margin: 0;">
                Provider: <strong>${escapeHtml(b.provider_name || 'Assigned')}</strong> ${b.service_city ? `(${escapeHtml(b.service_city)})` : ''}
              </p>
              ${b.rating ? `<p style="font-size: 0.85rem; color: #16a34a; margin-top: 0.25rem;">★ You rated: ${b.rating}/5${b.review_comment ? ` - "${escapeHtml(b.review_comment)}"` : ''}</p>` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${canCancel ? `<button class="btn btn-danger" onclick="window.cancelBooking(${b.booking_id})">Cancel</button>` : ''}
              ${canReview ? `<button class="btn btn-primary" onclick="window.openReviewModal(${b.booking_id}, ${b.provider_id}, ${b.service_id})">Review</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      bookingsList.innerHTML = '<p style="color: #ef4444;">Failed to load booking history: ' + escapeHtml(err.message) + '</p>';
    }
  }

  window.cancelBooking = async (bookingId) => {
    const reason = prompt('Please enter the cancellation reason (minimum 3 characters):', 'Customer requested cancellation');
    if (reason === null) return; // User clicked Cancel
    if (reason.trim().length < 3) {
      showToast('Cancellation reason must be at least 3 characters.', 'warning');
      return;
    }

    try {
      const res = await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: {
          booking_status: 'CANCELLED',
          cancellation_reason: reason.trim()
        }
      });
      if (res) {
        showToast('Booking cancelled successfully', 'info');
        loadBookingHistory();
        loadDashboardStats();
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel booking', 'error');
    }
  };

  // ----------------------------------------------------------------
  // 6. Ratings & Reviews
  // ----------------------------------------------------------------
  const reviewModal = document.getElementById('review-modal');
  const reviewForm = document.getElementById('review-form');

  window.openReviewModal = (bookingId, providerId, serviceId) => {
    document.getElementById('rev-booking-id').value = bookingId;
    document.getElementById('rev-provider-id').value = providerId;
    document.getElementById('rev-service-id').value = serviceId || '';
    document.getElementById('rev-comment').value = '';
    reviewModal.style.display = 'flex';
  };

  const closeReviewBtn = document.getElementById('close-review-modal-btn');
  if (closeReviewBtn) {
    closeReviewBtn.addEventListener('click', () => {
      reviewModal.style.display = 'none';
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        booking_id: parseInt(document.getElementById('rev-booking-id').value, 10),
        rating: parseInt(document.getElementById('rev-rating').value, 10),
        comment: document.getElementById('rev-comment').value.trim()
      };

      try {
        const res = await apiFetch('/reviews', {
          method: 'POST',
          body: payload
        });
        if (res) {
          showToast('Thank you! Your review was recorded.', 'success');
          reviewModal.style.display = 'none';
          loadBookingHistory();
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit review', 'error');
      }
    });
  }

  // ----------------------------------------------------------------
  // 7. Profile Management
  // ----------------------------------------------------------------
  const profileForm = document.getElementById('profile-form');

  async function loadProfile() {
    try {
      const res = await apiFetch('/customers/profile');
      const profile = (res && res.data) ? res.data : res;
      if (profile) {
        const nameInput = document.getElementById('prof-name');
        const emailInput = document.getElementById('prof-email');
        const phoneInput = document.getElementById('prof-phone');

        if (nameInput) nameInput.value = profile.full_name || '';
        if (emailInput) emailInput.value = profile.email || '';
        if (phoneInput) phoneInput.value = profile.phone || '';
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        full_name: document.getElementById('prof-name').value.trim(),
        phone: document.getElementById('prof-phone').value.trim()
      };

      try {
        const res = await apiFetch('/customers/profile', {
          method: 'PUT',
          body: body
        });
        if (res) {
          showToast('Profile updated successfully!', 'success');
          const currentUser = Auth.getUser();
          if (currentUser) {
            currentUser.full_name = body.full_name;
            localStorage.setItem('dbms_user', JSON.stringify(currentUser));
          }
          if (welcomeUserEl) welcomeUserEl.innerText = `Welcome, ${escapeHtml(body.full_name)}`;
        }
      } catch (err) {
        showToast(err.message || 'Failed to update profile', 'error');
      }
    });
  }

  // Initialization
  loadCategories();
  loadDashboardStats();
});