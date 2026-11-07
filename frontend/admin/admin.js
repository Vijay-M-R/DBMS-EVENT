/**
 * Taskora: Freelance Service Marketplace
 * Phase 3: Administrator Portal Controller
 */

import { Auth, apiFetch, showToast, openModal, closeModal, formatCurrency, formatDate, formatTime, escapeHtml } from '../js/api.js';

// Route Guard: Strictly ensure user has the ADMIN role
if (!Auth.requireAuth(['ADMIN'])) {
  throw new Error('Unauthorized');
}

// Global modal helpers exposed to window for inline onclick attributes
window.openAdminModal = (modalId) => openModal(modalId);
window.closeAdminModal = (modalId) => closeModal(modalId);

// Global State
let currentTab = 'tab-dashboard';
let categoriesCache = [];

// Pagination States
let customerPageState = { page: 1, limit: 15, search: '', status: '' };
let providerPageState = { page: 1, limit: 15, search: '', verificationStatus: '' };
let bookingPageState = { page: 1, limit: 15, search: '', status: '' };
let servicePageState = { page: 1, limit: 15, search: '', categoryId: '', status: '' };
let logsPageState = { page: 1, limit: 25, actionType: '' };

// Pending Action Confirmation State
let pendingActionCallback = null;

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initUserInfo();
  initNavigation();
  initDashboardEvents();
  initCustomerEvents();
  initProviderEvents();
  initCategoryEvents();
  initBookingEvents();
  initServiceEvents();
  initLogsEvents();
  initConfirmActionModal();

  // Load Initial View (Dashboard & Categories cache)
  loadCategoriesCache();
  loadDashboard();
});

function initUserInfo() {
  const user = Auth.getUser();
  const nameEl = document.getElementById('sidebar-admin-name');
  if (user && nameEl) {
    nameEl.textContent = user.full_name || user.email;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to sign out of the Administrator Portal?')) {
        Auth.logout();
      }
    });
  }
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================
function initNavigation() {
  const navButtons = document.querySelectorAll('.sidebar-nav .nav-item');
  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      if (!targetTab) return;

      navButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.content-section').forEach((sec) => sec.classList.remove('active'));
      const activeSection = document.getElementById(targetTab);
      if (activeSection) {
        activeSection.classList.add('active');
        currentTab = targetTab;
        onTabActivated(targetTab);
      }
    });
  });
}

function onTabActivated(tabId) {
  switch (tabId) {
    case 'tab-dashboard':
      loadDashboard();
      break;
    case 'tab-customers':
      loadCustomers(1);
      break;
    case 'tab-providers':
      loadProviders(1);
      break;
    case 'tab-categories':
      loadCategories();
      break;
    case 'tab-bookings':
      loadBookings(1);
      break;
    case 'tab-services':
      loadServices(1);
      break;
    case 'tab-logs':
      loadAuditLogs(1);
      break;
  }
}

// ============================================================================
// STATUS BADGE RENDERER
// ============================================================================
function getStatusBadge(status) {
  if (!status) return '<span class="badge badge-blocked">N/A</span>';
  const s = String(status).toUpperCase();
  switch (s) {
    case 'VERIFIED':
    case 'ACTIVE':
    case 'AVAILABLE':
      return `<span class="badge badge-verified">${escapeHtml(s)}</span>`;
    case 'PENDING':
      return `<span class="badge badge-pending">${escapeHtml(s)}</span>`;
    case 'COMPLETED':
      return `<span class="badge badge-completed">${escapeHtml(s)}</span>`;
    case 'ACCEPTED':
    case 'BOOKED':
      return `<span class="badge badge-booked">${escapeHtml(s)}</span>`;
    case 'SUSPENDED':
    case 'REJECTED':
    case 'CANCELLED':
    case 'INACTIVE':
    case 'DEACTIVATED':
      return `<span class="badge badge-suspended">${escapeHtml(s)}</span>`;
    default:
      return `<span class="badge badge-blocked">${escapeHtml(s)}</span>`;
  }
}

// ============================================================================
// 1. DASHBOARD OVERVIEW
// ============================================================================
function initDashboardEvents() {
  const refreshBtn = document.getElementById('btn-refresh-dashboard');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing...';
      loadDashboard().finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.textContent = '🔄 Refresh Stats';
      });
    });
  }
}

async function loadDashboard() {
  try {
    const res = await apiFetch('/admin/dashboard');
    const data = res.data || {};
    const users = data.users || {};
    const providers = data.providers || {};
    const bookings = data.bookings || {};
    const services = data.services || {};

    // Primary KPI cards
    document.getElementById('kpi-revenue').textContent = formatCurrency(bookings.total_revenue || 0);
    document.getElementById('kpi-customers').textContent = Number(users.total_customers || 0).toLocaleString();
    document.getElementById('kpi-providers').textContent = Number(users.total_providers || 0).toLocaleString();
    document.getElementById('kpi-pending-providers').textContent = Number(providers.pending_providers || 0).toLocaleString();
    document.getElementById('kpi-bookings').textContent = Number(bookings.total_bookings || 0).toLocaleString();
    document.getElementById('kpi-services').textContent = Number(services.active_services || 0).toLocaleString();

    // Provider Breakdown
    document.getElementById('breakdown-verified-providers').textContent = Number(providers.verified_providers || 0).toLocaleString();
    document.getElementById('breakdown-pending-providers').textContent = Number(providers.pending_providers || 0).toLocaleString();
    document.getElementById('breakdown-suspended-providers').textContent = Number(providers.suspended_providers || 0).toLocaleString();

    // Booking Breakdown
    document.getElementById('breakdown-completed-bookings').textContent = Number(bookings.completed_bookings || 0).toLocaleString();
    document.getElementById('breakdown-accepted-bookings').textContent = Number(bookings.accepted_bookings || 0).toLocaleString();
    document.getElementById('breakdown-pending-bookings').textContent = Number(bookings.pending_bookings || 0).toLocaleString();
    document.getElementById('breakdown-cancelled-bookings').textContent = Number(bookings.cancelled_bookings || 0).toLocaleString();
  } catch (err) {
    showToast(`Failed to load dashboard statistics: ${err.message}`, 'error');
  }
}

// ============================================================================
// 2. CUSTOMER MANAGEMENT
// ============================================================================
function initCustomerEvents() {
  const searchInput = document.getElementById('customers-search-input');
  const statusFilter = document.getElementById('customers-status-filter');
  const resetBtn = document.getElementById('btn-reset-customers-filter');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        customerPageState.search = e.target.value.trim().toLowerCase();
        loadCustomers(1);
      }, 350);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      customerPageState.status = e.target.value;
      loadCustomers(1);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      customerPageState.search = '';
      customerPageState.status = '';
      loadCustomers(1);
    });
  }
}

async function loadCustomers(page = 1) {
  customerPageState.page = page;
  const tbody = document.getElementById('customers-table-body');
  const paginationBar = document.getElementById('customers-pagination-container');
  tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Loading customers...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: customerPageState.page,
      limit: customerPageState.limit,
    });
    if (customerPageState.status) params.append('status', customerPageState.status);

    const res = await apiFetch(`/admin/customers?${params.toString()}`);
    let customers = res.data?.customers || [];
    const pagination = res.data?.pagination || { total: customers.length, page, limit: 15, totalPages: 1 };

    // Client-side search filtering if active
    if (customerPageState.search) {
      const q = customerPageState.search;
      customers = customers.filter((c) =>
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No customers found matching the criteria.</td></tr>';
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    tbody.innerHTML = customers.map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.full_name)}</strong></td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone || 'N/A')}</td>
        <td>${getStatusBadge(c.account_status)}</td>
        <td><span class="badge badge-booked">${Number(c.total_bookings || 0)} Bookings</span></td>
        <td>${formatDate(c.created_at)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="window.viewCustomerDetails(${c.customer_id})">
            👁️ Details
          </button>
          ${c.account_status === 'ACTIVE'
            ? `<button class="btn btn-danger btn-sm" style="margin-left: 0.35rem;" onclick="window.toggleUserAccountStatus(${c.user_id}, '${escapeHtml(c.full_name)}', 'SUSPENDED', 'customer')">
                 Suspend
               </button>`
            : `<button class="btn btn-success btn-sm" style="margin-left: 0.35rem;" onclick="window.toggleUserAccountStatus(${c.user_id}, '${escapeHtml(c.full_name)}', 'ACTIVE', 'customer')">
                 Reactivate
               </button>`
          }
        </td>
      </tr>
    `).join('');

    renderPagination(paginationBar, pagination, 'loadCustomers');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 2rem;">Error loading customers: ${escapeHtml(err.message)}</td></tr>`;
    if (paginationBar) paginationBar.innerHTML = '';
  }
}

window.loadCustomers = loadCustomers;

window.viewCustomerDetails = async function(customerId) {
  openModal('modal-customer-detail');
  const body = document.getElementById('modal-customer-body');
  const title = document.getElementById('modal-customer-name');
  body.innerHTML = '<div style="padding: 2rem; text-align: center;" class="text-muted">Loading customer details...</div>';

  try {
    const res = await apiFetch(`/admin/customers/${customerId}`);
    const c = res.data;
    title.textContent = `${c.full_name} (Customer #${c.customer_id})`;

    const stats = c.stats || {};
    const addresses = c.addresses || [];
    const bookings = c.recent_bookings || [];

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">CONTACT & ACCOUNT</p>
          <p><strong>Email:</strong> ${escapeHtml(c.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(c.phone || 'N/A')}</p>
          <p><strong>Status:</strong> ${getStatusBadge(c.account_status)}</p>
          <p><strong>Registered:</strong> ${formatDate(c.created_at)}</p>
        </div>
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">LIFETIME BOOKING METRICS</p>
          <p><strong>Total Orders:</strong> ${stats.total_bookings || 0}</p>
          <p><strong>Completed:</strong> <span class="badge badge-completed">${stats.completed_bookings || 0}</span></p>
          <p><strong>Total Spent:</strong> <strong style="color: var(--primary);">${formatCurrency(stats.total_spent || 0)}</strong></p>
          <p><strong>Cancelled:</strong> ${stats.cancelled_bookings || 0}</p>
        </div>
      </div>

      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Addresses (${addresses.length})</h4>
        ${addresses.length === 0 ? '<p class="text-muted" style="font-size: 0.85rem;">No saved addresses.</p>' : `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${addresses.map((a) => `
              <div style="padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;">
                <strong>${escapeHtml(a.address_type)} ${a.is_default ? '<span class="badge badge-active">DEFAULT</span>' : ''}</strong>: 
                ${escapeHtml(a.address_line)}, ${escapeHtml(a.city)}, ${escapeHtml(a.state)} - ${escapeHtml(a.pincode)}
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div>
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Recent Bookings (${bookings.length})</h4>
        ${bookings.length === 0 ? '<p class="text-muted" style="font-size: 0.85rem;">No bookings placed yet.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Service</th>
                  <th>Provider</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${bookings.map((b) => `
                  <tr>
                    <td>#${b.booking_id}</td>
                    <td><strong>${escapeHtml(b.service_name)}</strong></td>
                    <td>${escapeHtml(b.provider_name)}</td>
                    <td>${formatCurrency(b.service_price)}</td>
                    <td>${getStatusBadge(b.booking_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="text-danger" style="padding: 2rem; text-align: center;">Failed to load customer details: ${escapeHtml(err.message)}</div>`;
  }
};

// ============================================================================
// 3. PROVIDER MANAGEMENT & VERIFICATION
// ============================================================================
function initProviderEvents() {
  const searchInput = document.getElementById('providers-search-input');
  const verifyFilter = document.getElementById('providers-verification-filter');
  const resetBtn = document.getElementById('btn-reset-providers-filter');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        providerPageState.search = e.target.value.trim().toLowerCase();
        loadProviders(1);
      }, 350);
    });
  }

  if (verifyFilter) {
    verifyFilter.addEventListener('change', (e) => {
      providerPageState.verificationStatus = e.target.value;
      loadProviders(1);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (verifyFilter) verifyFilter.value = '';
      providerPageState.search = '';
      providerPageState.verificationStatus = '';
      loadProviders(1);
    });
  }
}

async function loadProviders(page = 1) {
  providerPageState.page = page;
  const tbody = document.getElementById('providers-table-body');
  const paginationBar = document.getElementById('providers-pagination-container');
  tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Loading providers...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: providerPageState.page,
      limit: providerPageState.limit,
    });
    if (providerPageState.verificationStatus) {
      params.append('verificationStatus', providerPageState.verificationStatus);
    }

    const res = await apiFetch(`/admin/providers?${params.toString()}`);
    let providers = res.data?.providers || [];
    const pagination = res.data?.pagination || { total: providers.length, page, limit: 15, totalPages: 1 };

    // Search filter
    if (providerPageState.search) {
      const q = providerPageState.search;
      providers = providers.filter((p) =>
        (p.full_name && p.full_name.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.service_city && p.service_city.toLowerCase().includes(q))
      );
    }

    if (providers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No providers found matching the criteria.</td></tr>';
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    tbody.innerHTML = providers.map((p) => `
      <tr>
        <td>
          <strong>${escapeHtml(p.full_name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(p.email)}</div>
        </td>
        <td>${escapeHtml(p.service_city)} (${escapeHtml(p.service_pincode)})</td>
        <td>${p.experience_years} Years</td>
        <td>
          <span style="font-weight: bold; color: #f59e0b;">★ ${Number(p.average_rating || 0).toFixed(1)}</span>
          <span class="text-muted" style="font-size: 0.8rem;">(${p.total_reviews} reviews)</span>
        </td>
        <td>${getStatusBadge(p.verification_status)}</td>
        <td>${getStatusBadge(p.account_status)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="window.viewProviderDetails(${p.provider_id})">
            👁️ Details
          </button>
          ${p.verification_status === 'PENDING' ? `
            <button class="btn btn-success btn-sm" style="margin-left: 0.35rem;" onclick="window.approveProvider(${p.provider_id}, '${escapeHtml(p.full_name)}')">
              ✓ Approve
            </button>
            <button class="btn btn-danger btn-sm" style="margin-left: 0.35rem;" onclick="window.promptProviderVerification(${p.provider_id}, '${escapeHtml(p.full_name)}', 'REJECTED')">
              ✗ Reject
            </button>
          ` : p.verification_status === 'VERIFIED' ? `
            <button class="btn btn-danger btn-sm" style="margin-left: 0.35rem;" onclick="window.promptProviderVerification(${p.provider_id}, '${escapeHtml(p.full_name)}', 'SUSPENDED')">
              Suspend
            </button>
          ` : p.verification_status === 'SUSPENDED' ? `
            <button class="btn btn-success btn-sm" style="margin-left: 0.35rem;" onclick="window.approveProvider(${p.provider_id}, '${escapeHtml(p.full_name)}')">
              Reactivate
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');

    renderPagination(paginationBar, pagination, 'loadProviders');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 2rem;">Error loading providers: ${escapeHtml(err.message)}</td></tr>`;
    if (paginationBar) paginationBar.innerHTML = '';
  }
}

window.loadProviders = loadProviders;

window.viewProviderDetails = async function(providerId) {
  openModal('modal-provider-detail');
  const body = document.getElementById('modal-provider-body');
  const title = document.getElementById('modal-provider-title');
  body.innerHTML = '<div style="padding: 2rem; text-align: center;" class="text-muted">Loading provider profile...</div>';

  try {
    const res = await apiFetch(`/admin/providers/${providerId}`);
    const p = res.data;
    title.textContent = `${p.full_name} (Provider #${p.provider_id})`;

    const stats = p.stats || {};
    const services = p.services || [];
    const bookings = p.recent_bookings || [];

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">PROFILE & VERIFICATION</p>
          <p><strong>Email:</strong> ${escapeHtml(p.email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(p.phone || 'N/A')}</p>
          <p><strong>Location:</strong> ${escapeHtml(p.service_city)} (${escapeHtml(p.service_pincode)})</p>
          <p><strong>Verification:</strong> ${getStatusBadge(p.verification_status)}</p>
          <p><strong>Account Status:</strong> ${getStatusBadge(p.account_status)}</p>
          <p><strong>Experience:</strong> ${p.experience_years} Years</p>
        </div>
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">PERFORMANCE & EARNINGS</p>
          <p><strong>Rating:</strong> <span style="color: #f59e0b; font-weight: bold;">★ ${Number(p.average_rating || 0).toFixed(2)}</span> (${p.total_reviews} reviews)</p>
          <p><strong>Total Orders:</strong> ${stats.total_bookings || 0}</p>
          <p><strong>Completed Orders:</strong> <span class="badge badge-completed">${stats.completed_bookings || 0}</span></p>
          <p><strong>Total Revenue Earned:</strong> <strong style="color: var(--primary);">${formatCurrency(stats.total_earnings || 0)}</strong></p>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.35rem;">Professional Bio</h4>
        <div style="background: var(--bg-main); padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.85rem; line-height: 1.4;">
          ${escapeHtml(p.professional_bio || 'No professional bio provided.')}
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Services Offered (${services.length})</h4>
        ${services.length === 0 ? '<p class="text-muted" style="font-size: 0.85rem;">No services published by this provider.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${services.map((s) => `
                  <tr>
                    <td><strong>${escapeHtml(s.service_name)}</strong></td>
                    <td>${escapeHtml(s.category_name)}</td>
                    <td>${formatCurrency(s.price)}</td>
                    <td>${s.estimated_duration} mins</td>
                    <td>${getStatusBadge(s.service_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div>
        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Recent Bookings (${bookings.length})</h4>
        ${bookings.length === 0 ? '<p class="text-muted" style="font-size: 0.85rem;">No bookings received yet.</p>' : `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Service</th>
                  <th>Customer</th>
                  <th>Date &amp; Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${bookings.map((b) => `
                  <tr>
                    <td>#${b.booking_id}</td>
                    <td>${escapeHtml(b.service_name)}</td>
                    <td>${escapeHtml(b.customer_name)}</td>
                    <td>${formatDate(b.slot_date)} ${formatTime(b.start_time)}</td>
                    <td>${getStatusBadge(b.booking_status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="text-danger" style="padding: 2rem; text-align: center;">Failed to load provider profile: ${escapeHtml(err.message)}</div>`;
  }
};

window.approveProvider = async function(providerId, providerName) {
  if (!confirm(`Are you sure you want to approve and verify provider "${providerName}"?`)) return;

  try {
    await apiFetch(`/admin/providers/${providerId}/verification`, {
      method: 'PATCH',
      body: { verification_status: 'VERIFIED' },
    });
    showToast(`Provider "${providerName}" is now VERIFIED.`, 'success');
    loadProviders(providerPageState.page);
    loadDashboard();
  } catch (err) {
    showToast(`Verification failed: ${err.message}`, 'error');
  }
};

window.promptProviderVerification = function(providerId, providerName, targetStatus) {
  promptActionWithReason({
    title: `${targetStatus === 'REJECTED' ? 'Reject' : 'Suspend'} Provider`,
    message: `You are about to set provider "${providerName}" to ${targetStatus}. Please provide the administrative rationale. Note: Suspending a provider will not automatically cancel their existing bookings.`,
    btnText: `${targetStatus === 'REJECTED' ? 'Reject' : 'Suspend'} Provider`,
    requireReason: true,
    onSubmit: async (reason) => {
      await apiFetch(`/admin/providers/${providerId}/verification`, {
        method: 'PATCH',
        body: { verification_status: targetStatus, reason },
      });
      showToast(`Provider "${providerName}" updated to ${targetStatus}.`, 'success');
      loadProviders(providerPageState.page);
      loadDashboard();
    },
  });
};

window.toggleUserAccountStatus = function(userId, userName, targetStatus, roleType) {
  const isSuspending = targetStatus === 'SUSPENDED';
  promptActionWithReason({
    title: `${isSuspending ? 'Suspend' : 'Reactivate'} ${roleType === 'customer' ? 'Customer' : 'User'} Account`,
    message: `Are you sure you want to change account status for "${userName}" to ${targetStatus}?`,
    btnText: `${isSuspending ? 'Suspend' : 'Reactivate'} Account`,
    requireReason: isSuspending,
    onSubmit: async (reason) => {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: { account_status: targetStatus, reason: isSuspending ? reason : 'Reactivated by administrator' },
      });
      showToast(`Account for "${userName}" set to ${targetStatus}.`, 'success');
      if (roleType === 'customer') {
        loadCustomers(customerPageState.page);
      } else {
        loadProviders(providerPageState.page);
      }
      loadDashboard();
    },
  });
};

// ============================================================================
// 4. CATEGORY MANAGEMENT
// ============================================================================
function initCategoryEvents() {
  const addBtn = document.getElementById('btn-open-add-category');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('category-form').reset();
      document.getElementById('category-id').value = '';
      document.getElementById('modal-category-title').textContent = 'Add New Category';
      openModal('modal-category-form');
    });
  }

  const form = document.getElementById('category-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-category');
      const catId = document.getElementById('category-id').value;
      const name = document.getElementById('category-name').value.trim();
      const desc = document.getElementById('category-description').value.trim();
      const status = document.getElementById('category-status').value;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        if (catId) {
          // Update category
          await apiFetch(`/categories/${catId}`, {
            method: 'PUT',
            body: { category_name: name, description: desc, category_status: status },
          });
          showToast(`Category "${name}" updated successfully.`, 'success');
        } else {
          // Create category
          await apiFetch('/categories', {
            method: 'POST',
            body: { category_name: name, description: desc, category_status: status },
          });
          showToast(`Category "${name}" created successfully.`, 'success');
        }
        closeModal('modal-category-form');
        loadCategories();
        loadCategoriesCache();
      } catch (err) {
        showToast(`Failed to save category: ${err.message}`, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Category';
      }
    });
  }
}

async function loadCategoriesCache() {
  try {
    const res = await apiFetch('/categories/all');
    categoriesCache = res.data || [];
    populateCategoryDropdownFilter();
  } catch {
    categoriesCache = [];
  }
}

async function loadCategories() {
  const tbody = document.getElementById('categories-table-body');
  tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Loading categories...</td></tr>';

  try {
    const res = await apiFetch('/categories/all');
    const categories = res.data || [];
    categoriesCache = categories;
    populateCategoryDropdownFilter();

    if (categories.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No categories defined yet.</td></tr>';
      return;
    }

    tbody.innerHTML = categories.map((c) => {
      const sCount = Number(c.service_count || 0);
      return `
        <tr>
          <td>#${c.category_id}</td>
          <td><strong>${escapeHtml(c.category_name)}</strong></td>
          <td style="max-width: 280px; font-size: 0.85rem;" class="text-muted">${escapeHtml(c.description || '—')}</td>
          <td>
            <span class="badge ${sCount > 0 ? 'badge-booked' : 'badge-blocked'}">
              ${sCount} ${sCount === 1 ? 'Service' : 'Services'}
            </span>
          </td>
          <td>${getStatusBadge(c.category_status)}</td>
          <td>${formatDate(c.created_at)}</td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="window.editCategory(${c.category_id})">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm" style="margin-left: 0.35rem;" onclick="window.handleDeleteCategory(${c.category_id}, '${escapeHtml(c.category_name)}', ${sCount}, '${c.category_status}')">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 2rem;">Failed to load categories: ${escapeHtml(err.message)}</td></tr>`;
  }
}

window.loadCategories = loadCategories;

window.editCategory = function(categoryId) {
  const cat = categoriesCache.find((c) => Number(c.category_id) === Number(categoryId));
  if (!cat) return;

  document.getElementById('category-id').value = cat.category_id;
  document.getElementById('category-name').value = cat.category_name;
  document.getElementById('category-description').value = cat.description || '';
  document.getElementById('category-status').value = cat.category_status || 'ACTIVE';
  document.getElementById('modal-category-title').textContent = `Edit Category #${cat.category_id}`;

  openModal('modal-category-form');
};

window.handleDeleteCategory = function(categoryId, categoryName, serviceCount, currentStatus) {
  if (serviceCount > 0) {
    // Cannot delete due to active foreign-key constraint. Offer safe deactivation!
    const isAlreadyInactive = currentStatus === 'INACTIVE';
    promptActionWithReason({
      title: `Cannot Delete "${categoryName}"`,
      message: `Category "${categoryName}" is currently referenced by <strong>${serviceCount} service(s)</strong>. Database integrity prevents hard deletion of referenced categories. ${isAlreadyInactive ? 'This category is already INACTIVE.' : 'Would you like to deactivate this category instead?'}`,
      btnText: isAlreadyInactive ? 'OK' : 'Deactivate Category',
      requireReason: false,
      hideReasonField: true,
      onSubmit: async () => {
        if (!isAlreadyInactive) {
          await apiFetch(`/categories/${categoryId}`, {
            method: 'PUT',
            body: { category_status: 'INACTIVE' },
          });
          showToast(`Category "${categoryName}" deactivated.`, 'success');
          loadCategories();
          loadCategoriesCache();
        }
      },
    });
    return;
  }

  // Zero services reference this category: safe to hard delete
  if (confirm(`Are you sure you want to permanently delete category "${categoryName}"? No services currently reference this category.`)) {
    apiFetch(`/categories/${categoryId}`, { method: 'DELETE' })
      .then(() => {
        showToast(`Category "${categoryName}" deleted successfully.`, 'success');
        loadCategories();
        loadCategoriesCache();
      })
      .catch((err) => {
        showToast(`Deletion failed: ${err.message}`, 'error');
      });
  }
};

// ============================================================================
// 5. BOOKING MONITORING
// ============================================================================
function initBookingEvents() {
  const searchInput = document.getElementById('bookings-search-input');
  const statusFilter = document.getElementById('bookings-status-filter');
  const resetBtn = document.getElementById('btn-reset-bookings-filter');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        bookingPageState.search = e.target.value.trim().toLowerCase();
        loadBookings(1);
      }, 350);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      bookingPageState.status = e.target.value;
      loadBookings(1);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      bookingPageState.search = '';
      bookingPageState.status = '';
      loadBookings(1);
    });
  }
}

async function loadBookings(page = 1) {
  bookingPageState.page = page;
  const tbody = document.getElementById('bookings-table-body');
  const paginationBar = document.getElementById('bookings-pagination-container');
  tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align: center; padding: 2rem;">Loading bookings...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: bookingPageState.page,
      limit: bookingPageState.limit,
    });
    if (bookingPageState.status) params.append('status', bookingPageState.status);

    const res = await apiFetch(`/admin/bookings?${params.toString()}`);
    let bookings = res.data?.bookings || [];
    const pagination = res.data?.pagination || { total: bookings.length, page, limit: 15, totalPages: 1 };

    // Search filter
    if (bookingPageState.search) {
      const q = bookingPageState.search;
      bookings = bookings.filter((b) =>
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.provider_name && b.provider_name.toLowerCase().includes(q)) ||
        (b.service_name && b.service_name.toLowerCase().includes(q))
      );
    }

    if (bookings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-muted" style="text-align: center; padding: 2rem;">No bookings found matching the criteria.</td></tr>';
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    tbody.innerHTML = bookings.map((b) => `
      <tr>
        <td><strong>#${b.booking_id}</strong></td>
        <td><strong>${escapeHtml(b.service_name)}</strong></td>
        <td>${escapeHtml(b.customer_name)}</td>
        <td>${escapeHtml(b.provider_name)}</td>
        <td>
          <div>${formatDate(b.slot_date)}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${formatTime(b.start_time)} - ${formatTime(b.end_time)}</div>
        </td>
        <td><strong>${formatCurrency(b.service_price)}</strong></td>
        <td>${getStatusBadge(b.booking_status)}</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="window.viewBookingDetails(${b.booking_id})">
            👁️ Inspect
          </button>
        </td>
      </tr>
    `).join('');

    renderPagination(paginationBar, pagination, 'loadBookings');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-danger" style="text-align: center; padding: 2rem;">Failed to load bookings: ${escapeHtml(err.message)}</td></tr>`;
    if (paginationBar) paginationBar.innerHTML = '';
  }
}

window.loadBookings = loadBookings;

window.viewBookingDetails = async function(bookingId) {
  openModal('modal-booking-detail');
  const body = document.getElementById('modal-booking-body');
  const title = document.getElementById('modal-booking-title');
  body.innerHTML = '<div style="padding: 2rem; text-align: center;" class="text-muted">Loading booking details...</div>';

  try {
    const res = await apiFetch(`/admin/bookings/${bookingId}`);
    const b = res.data;
    title.textContent = `Booking Contract #${b.booking_id}`;

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">CUSTOMER DETAILS</p>
          <p><strong>Name:</strong> ${escapeHtml(b.customer_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(b.customer_email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(b.customer_phone || 'N/A')}</p>
        </div>
        <div>
          <p class="text-muted" style="font-size: 0.8rem;">PROVIDER DETAILS</p>
          <p><strong>Provider:</strong> ${escapeHtml(b.provider_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(b.provider_email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(b.provider_phone || 'N/A')}</p>
          <p><strong>City:</strong> ${escapeHtml(b.service_city)}</p>
        </div>
      </div>

      <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h4 style="font-size: 1rem;">${escapeHtml(b.service_name)}</h4>
          <span style="font-size: 1.1rem; font-weight: bold; color: var(--primary);">${formatCurrency(b.service_price)}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">${escapeHtml(b.service_description || '')}</p>
        <div style="display: flex; gap: 1.5rem; font-size: 0.85rem;">
          <span><strong>Category:</strong> ${escapeHtml(b.category_name)}</span>
          <span><strong>Duration:</strong> ${b.estimated_duration} mins</span>
          <span><strong>Status:</strong> ${getStatusBadge(b.booking_status)}</span>
        </div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <p class="text-muted" style="font-size: 0.8rem;">APPOINTMENT SCHEDULE</p>
        <p><strong>Date:</strong> ${formatDate(b.slot_date)}</p>
        <p><strong>Window:</strong> ${formatTime(b.start_time)} to ${formatTime(b.end_time)}</p>
        <p><strong>Booking Created:</strong> ${formatDate(b.created_at)}</p>
      </div>

      ${b.customer_notes ? `
        <div style="margin-bottom: 1rem;">
          <p class="text-muted" style="font-size: 0.8rem;">CUSTOMER INSTRUCTIONS</p>
          <div style="padding: 0.5rem 0.75rem; background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 0.85rem;">
            ${escapeHtml(b.customer_notes)}
          </div>
        </div>
      ` : ''}

      ${b.cancellation_reason ? `
        <div style="margin-bottom: 1rem;">
          <p class="text-muted" style="font-size: 0.8rem; color: var(--danger);">CANCELLATION REASON</p>
          <div style="padding: 0.5rem 0.75rem; background: #fee2e2; border-radius: var(--radius-sm); font-size: 0.85rem; color: #991b1b;">
            ${escapeHtml(b.cancellation_reason)}
          </div>
        </div>
      ` : ''}

      ${b.review_id ? `
        <div style="margin-top: 1rem; padding: 0.75rem 1rem; border: 1px solid #fef3c7; background: #fffbeb; border-radius: var(--radius-sm);">
          <p style="font-weight: bold; color: #92400e; font-size: 0.9rem;">Customer Verified Feedback</p>
          <p style="color: #f59e0b; font-size: 1rem;">★ ${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)} (${b.rating} / 5)</p>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">"${escapeHtml(b.review_comment || 'No written comment.')}"</p>
        </div>
      ` : ''}
    `;
  } catch (err) {
    body.innerHTML = `<div class="text-danger" style="padding: 2rem; text-align: center;">Failed to load booking: ${escapeHtml(err.message)}</div>`;
  }
};

// ============================================================================
// 6. SERVICE MONITORING
// ============================================================================
function initServiceEvents() {
  const searchInput = document.getElementById('services-search-input');
  const categoryFilter = document.getElementById('services-category-filter');
  const statusFilter = document.getElementById('services-status-filter');
  const resetBtn = document.getElementById('btn-reset-services-filter');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        servicePageState.search = e.target.value.trim().toLowerCase();
        loadServices(1);
      }, 350);
    });
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      servicePageState.categoryId = e.target.value;
      loadServices(1);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      servicePageState.status = e.target.value;
      loadServices(1);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = '';
      if (statusFilter) statusFilter.value = '';
      servicePageState.search = '';
      servicePageState.categoryId = '';
      servicePageState.status = '';
      loadServices(1);
    });
  }
}

function populateCategoryDropdownFilter() {
  const select = document.getElementById('services-category-filter');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">All Categories</option>' + categoriesCache.map((c) =>
    `<option value="${c.category_id}" ${Number(currentVal) === Number(c.category_id) ? 'selected' : ''}>${escapeHtml(c.category_name)}</option>`
  ).join('');
}

async function loadServices(page = 1) {
  servicePageState.page = page;
  const tbody = document.getElementById('services-table-body');
  const paginationBar = document.getElementById('services-pagination-container');
  tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">Loading services...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: servicePageState.page,
      limit: servicePageState.limit,
    });
    if (servicePageState.status) params.append('status', servicePageState.status);
    if (servicePageState.categoryId) params.append('categoryId', servicePageState.categoryId);
    if (servicePageState.search) params.append('search', servicePageState.search);

    const res = await apiFetch(`/admin/services?${params.toString()}`);
    const services = res.data?.services || [];
    const pagination = res.data?.pagination || { total: services.length, page, limit: 15, totalPages: 1 };

    if (services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted" style="text-align: center; padding: 2rem;">No services found matching the criteria.</td></tr>';
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    tbody.innerHTML = services.map((s) => `
      <tr>
        <td>
          <strong>${escapeHtml(s.service_name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${escapeHtml(s.description)}
          </div>
        </td>
        <td>
          <strong>${escapeHtml(s.provider_name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(s.service_city)}</div>
        </td>
        <td><span class="badge badge-booked">${escapeHtml(s.category_name)}</span></td>
        <td><strong>${formatCurrency(s.price)}</strong></td>
        <td>${s.estimated_duration} mins</td>
        <td>${getStatusBadge(s.service_status)}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${s.service_status === 'ACTIVE'
            ? `<button class="btn btn-danger btn-sm" onclick="window.toggleServiceModeration(${s.service_id}, '${escapeHtml(s.service_name)}', 'INACTIVE')">
                 Deactivate
               </button>`
            : `<button class="btn btn-success btn-sm" onclick="window.toggleServiceModeration(${s.service_id}, '${escapeHtml(s.service_name)}', 'ACTIVE')">
                 Activate
               </button>`
          }
        </td>
      </tr>
    `).join('');

    renderPagination(paginationBar, pagination, 'loadServices');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-danger" style="text-align: center; padding: 2rem;">Failed to load services: ${escapeHtml(err.message)}</td></tr>`;
    if (paginationBar) paginationBar.innerHTML = '';
  }
}

window.loadServices = loadServices;

window.toggleServiceModeration = function(serviceId, serviceName, targetStatus) {
  const isDeactivating = targetStatus === 'INACTIVE';
  promptActionWithReason({
    title: `${isDeactivating ? 'Deactivate' : 'Activate'} Service`,
    message: `Are you sure you want to change the status of service "${serviceName}" to ${targetStatus}?`,
    btnText: `${isDeactivating ? 'Deactivate' : 'Activate'} Service`,
    requireReason: isDeactivating,
    onSubmit: async (reason) => {
      await apiFetch(`/admin/services/${serviceId}/status`, {
        method: 'PATCH',
        body: { service_status: targetStatus, reason: isDeactivating ? reason : 'Reactivated by administrator' },
      });
      showToast(`Service "${serviceName}" set to ${targetStatus}.`, 'success');
      loadServices(servicePageState.page);
      loadDashboard();
    },
  });
};

// ============================================================================
// 7. ADMINISTRATIVE ACTIVITY LOGS
// ============================================================================
function initLogsEvents() {
  const actionInput = document.getElementById('logs-action-input');
  const clearBtn = document.getElementById('btn-reset-logs-filter');

  let debounceTimer;
  if (actionInput) {
    actionInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        logsPageState.actionType = e.target.value.trim();
        loadAuditLogs(1);
      }, 350);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (actionInput) actionInput.value = '';
      logsPageState.actionType = '';
      loadAuditLogs(1);
    });
  }
}

async function loadAuditLogs(page = 1) {
  logsPageState.page = page;
  const tbody = document.getElementById('logs-table-body');
  const paginationBar = document.getElementById('logs-pagination-container');
  tbody.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 2rem;">Loading audit trail...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: logsPageState.page,
      limit: logsPageState.limit,
    });
    if (logsPageState.actionType) params.append('actionType', logsPageState.actionType);

    const res = await apiFetch(`/admin/logs?${params.toString()}`);
    const logs = res.data?.logs || [];
    const pagination = res.data?.pagination || { total: logs.length, page, limit: 25, totalPages: 1 };

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted" style="text-align: center; padding: 2rem;">No audit logs recorded for this criteria.</td></tr>';
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    tbody.innerHTML = logs.map((l) => `
      <tr>
        <td style="white-space: nowrap; font-size: 0.8rem;">
          <div>${formatDate(l.created_at)}</div>
          <div class="text-muted">${formatTime(new Date(l.created_at).toTimeString().split(' ')[0])}</div>
        </td>
        <td>
          <strong>${escapeHtml(l.admin_name || 'Admin')}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHtml(l.admin_email || '')}</div>
        </td>
        <td><span class="badge badge-booked">${escapeHtml(l.action_type)}</span></td>
        <td><code>${escapeHtml(l.target_type)}</code></td>
        <td>#${l.target_id}</td>
        <td style="font-size: 0.85rem; max-width: 320px;">${escapeHtml(l.description)}</td>
      </tr>
    `).join('');

    renderPagination(paginationBar, pagination, 'loadAuditLogs');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger" style="text-align: center; padding: 2rem;">Failed to load audit trail: ${escapeHtml(err.message)}</td></tr>`;
    if (paginationBar) paginationBar.innerHTML = '';
  }
}

window.loadAuditLogs = loadAuditLogs;

// ============================================================================
// GENERIC ACTION CONFIRMATION MODAL WITH MANDATORY REASON
// ============================================================================
function initConfirmActionModal() {
  const form = document.getElementById('action-confirm-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const reasonInput = document.getElementById('action-reason-input');
      const submitBtn = document.getElementById('btn-action-submit');
      const reason = reasonInput ? reasonInput.value.trim() : '';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        if (pendingActionCallback) {
          await pendingActionCallback(reason);
        }
        closeModal('modal-confirm-action');
      } catch (err) {
        showToast(err.message || 'Operation failed', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Action';
      }
    });
  }
}

function promptActionWithReason({ title, message, btnText, requireReason = true, hideReasonField = false, onSubmit }) {
  document.getElementById('modal-action-title').textContent = title;
  document.getElementById('modal-action-message').innerHTML = message;
  const reasonGroup = document.getElementById('group-action-reason');
  const reasonInput = document.getElementById('action-reason-input');
  const submitBtn = document.getElementById('btn-action-submit');

  if (submitBtn && btnText) submitBtn.textContent = btnText;
  if (reasonInput) reasonInput.value = '';

  if (hideReasonField) {
    if (reasonGroup) reasonGroup.style.display = 'none';
  } else {
    if (reasonGroup) reasonGroup.style.display = 'block';
  }

  pendingActionCallback = async (reason) => {
    if (requireReason && (!reason || reason.length < 3)) {
      throw new Error('A mandatory administrative reason of at least 3 characters is required.');
    }
    await onSubmit(reason);
  };

  openModal('modal-confirm-action');
}

// ============================================================================
// PAGINATION COMPONENT BUILDER
// ============================================================================
function renderPagination(container, pagination, fnName) {
  if (!container) return;

  if (!pagination || pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <span class="text-muted" style="font-size: 0.85rem;">
      Page <strong>${pagination.page}</strong> of <strong>${pagination.totalPages}</strong> (${pagination.total} total items)
    </span>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn btn-secondary btn-sm" ${pagination.page <= 1 ? 'disabled' : ''} onclick="window.${fnName}(${pagination.page - 1})">
        ← Previous
      </button>
      <button class="btn btn-secondary btn-sm" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} onclick="window.${fnName}(${pagination.page + 1})">
        Next →
      </button>
    </div>
  `;
}
