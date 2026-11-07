// frontend/customer/customer.js
// Member 2 (Ram): Customer Module Integration

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
        window.location.href = '../login.html';
      }, 500);
    });
  }

  // ----------------------------------------------------------------
  // 2. Dashboard Statistics & Recent Activity
  // ----------------------------------------------------------------
  async function loadDashboardStats() {
    try {
      const res = await apiFetch('/bookings/customer/history?status=ALL');
      const bookings = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      const statTotal = document.getElementById('stat-total');
      const statUpcoming = document.getElementById('stat-upcoming');
      const statCompleted = document.getElementById('stat-completed');

      if (statTotal) statTotal.innerText = bookings.length;
      if (statUpcoming) {
        statUpcoming.innerText = bookings.filter(
          b => b.status === 'PENDING' || b.status === 'CONFIRMED'
        ).length;
      }
      if (statCompleted) {
        statCompleted.innerText = bookings.filter(b => b.status === 'COMPLETED').length;
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
            <strong>${escapeHtml(b.service_title || 'Service')}</strong><br />
            <small style="color: #64748b;">
              ${formatDate(b.booking_date)} at ${formatTime(b.start_time)} • Provider: ${escapeHtml(b.provider_name || 'Assigned')}
            </small>
          </div>
          <span class="badge badge-${(b.status || 'pending').toLowerCase()}">${escapeHtml(b.status || 'PENDING')}</span>
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

  async function loadServices() {
    if (!servicesGrid) return;
    servicesGrid.innerHTML = '<p style="color: #64748b;">Searching services...</p>';

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append('search', searchInput.value.trim());
    if (categoryFilter && categoryFilter.value) params.append('category', categoryFilter.value);

    try {
      const res = await apiFetch(`/services/search?${params.toString()}`);
      const services = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      if (services.length === 0) {
        servicesGrid.innerHTML = '<p style="color: #64748b;">No matching services found.</p>';
        return;
      }

      servicesGrid.innerHTML = services.map(s => `
        <div class="service-card">
          <div>
            <span class="badge" style="background:#eff6ff; color:#2563eb;">${escapeHtml(s.category || 'General')}</span>
            <h4 style="margin: 0.5rem 0 0.25rem 0;">${escapeHtml(s.title)}</h4>
            <p style="color: #64748b; font-size: 0.85rem; margin-bottom: 0.5rem;">${escapeHtml(s.description || '')}</p>
            <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.5rem;">
              Provider: <strong>${escapeHtml(s.provider_name || 'Verified Provider')}</strong><br />
              Rating: ★ <strong>${s.avg_rating || '5.0'}</strong> (${s.total_reviews || 0} reviews)
            </div>
            <div class="service-price" style="font-size: 1.25rem; font-weight: 700; color: #2563eb; margin: 0.5rem 0;">
              ${formatCurrency(s.price || 0)}
            </div>
          </div>
          <button class="btn btn-primary" onclick="window.openBookingModal(${s.service_id || s.id}, ${s.provider_id}, '${escapeHtml(s.title).replace(/'/g, "\\'")}', ${s.price})">Book Now</button>
        </div>
      `).join('');
    } catch (err) {
      servicesGrid.innerHTML = '<p style="color: #ef4444;">Error loading services catalog.</p>';
    }
  }

  if (filterBtn) filterBtn.addEventListener('click', loadServices);

  // ----------------------------------------------------------------
  // 4. Booking Flow & Slot Selection (ACID Transaction)
  // ----------------------------------------------------------------
  const bookingModal = document.getElementById('booking-modal');
  const bookingForm = document.getElementById('booking-form');

  window.openBookingModal = (serviceId, providerId, title, price) => {
    document.getElementById('modal-service-title').innerText = `Book: ${title}`;
    document.getElementById('modal-service-id').value = serviceId;
    document.getElementById('modal-provider-id').value = providerId;
    document.getElementById('modal-price').value = price;
    document.getElementById('modal-display-price').innerText = price;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('modal-date');
    dateInput.min = tomorrow.toISOString().split('T')[0];
    dateInput.value = tomorrow.toISOString().split('T')[0];

    bookingModal.style.display = 'flex';
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
      const payload = {
        service_id: document.getElementById('modal-service-id').value,
        provider_id: document.getElementById('modal-provider-id').value,
        booking_date: document.getElementById('modal-date').value,
        start_time: document.getElementById('modal-time').value,
        total_amount: document.getElementById('modal-price').value,
        notes: document.getElementById('modal-notes').value.trim()
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
        }
      } catch (err) {
        showToast(err.message || 'Booking slot conflict. Please choose another time.', 'error');
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
      const res = await apiFetch('/bookings/customer/history?status=ALL');
      const bookings = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);

      if (bookings.length === 0) {
        bookingsList.innerHTML = '<p style="color: #64748b;">You have no bookings recorded.</p>';
        return;
      }

      bookingsList.innerHTML = bookings.map(b => {
        const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED';
        const canReview = b.status === 'COMPLETED' && !b.review_id;

        return `
          <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; background: #fff;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <h4 style="margin: 0;">${escapeHtml(b.service_title || 'Service')}</h4>
                <span class="badge badge-${(b.status || 'pending').toLowerCase()}">${escapeHtml(b.status || 'PENDING')}</span>
              </div>
              <p style="color: #64748b; font-size: 0.85rem; margin: 0.25rem 0;">
                Date: <strong>${formatDate(b.booking_date)} at ${formatTime(b.start_time)}</strong> • Amount: <strong>${formatCurrency(b.total_amount)}</strong>
              </p>
              <p style="font-size: 0.85rem; color: #475569; margin: 0;">
                Provider: <strong>${escapeHtml(b.provider_name || 'Assigned')}</strong> (${escapeHtml(b.provider_phone || 'Phone provided')})
              </p>
              ${b.given_rating ? `<p style="font-size: 0.85rem; color: #16a34a; margin-top: 0.25rem;">★ You rated: ${b.given_rating}/5</p>` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem;">
              ${canCancel ? `<button class="btn btn-danger" onclick="window.cancelBooking(${b.booking_id || b.id})">Cancel</button>` : ''}
              ${canReview ? `<button class="btn btn-primary" onclick="window.openReviewModal(${b.booking_id || b.id}, ${b.provider_id}, ${b.service_id})">Review</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      bookingsList.innerHTML = '<p style="color: #ef4444;">Failed to load booking history.</p>';
    }
  }

  window.cancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await apiFetch(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: { status: 'CANCELLED' }
      });
      if (res) {
        showToast('Booking cancelled successfully', 'info');
        loadBookingHistory();
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
        booking_id: document.getElementById('rev-booking-id').value,
        provider_id: document.getElementById('rev-provider-id').value,
        service_id: document.getElementById('rev-service-id').value,
        rating: Number(document.getElementById('rev-rating').value),
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
  // 7. Profile Management (uses users.full_name)
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

  // Load dashboard on start
  loadDashboardStats();
});