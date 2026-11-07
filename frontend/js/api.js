/**
 * Taskora: Freelance Service Marketplace
 * Shared Client-Side API & Authentication Utility
 */

const API_BASE = '/api/v1';

export const Auth = {
  getToken() {
    return localStorage.getItem('dbms_token');
  },

  getUser() {
    const raw = localStorage.getItem('dbms_user');
    return raw ? JSON.parse(raw) : null;
  },

  getProfile() {
    const raw = localStorage.getItem('dbms_profile');
    return raw ? JSON.parse(raw) : null;
  },

  setAuth(token, user, profile) {
    if (token) localStorage.setItem('dbms_token', token);
    if (user) localStorage.setItem('dbms_user', JSON.stringify(user));
    if (profile) localStorage.setItem('dbms_profile', JSON.stringify(profile));
  },

  clearAuth() {
    localStorage.removeItem('dbms_token');
    localStorage.removeItem('dbms_user');
    localStorage.removeItem('dbms_profile');
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Route Guard: Ensures user is logged in with an allowed role.
   * If unauthorized, clears session and redirects to login.html.
   * @param {Array<string>} allowedRoles e.g. ['PROVIDER'] or ['ADMIN']
   */
  requireAuth(allowedRoles = []) {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user) {
      this.clearAuth();
      window.location.href = '/login.html';
      return false;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert(`Access denied. Your role (${user.role}) is not authorized to access this portal.`);
      this.clearAuth();
      window.location.href = '/login.html';
      return false;
    }

    return true;
  },

  logout() {
    this.clearAuth();
    window.location.href = '/login.html';
  }
};

/**
 * Universal JSON Fetch Wrapper with automatic Bearer Token Injection
 * @param {string} endpoint - e.g. '/providers/profile'
 * @param {object} options - fetch options (method, body, headers, etc.)
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  const token = Auth.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, { ...options, headers });
    
    // Check for HTTP 401 Unauthorized (expired token)
    if (res.status === 401 && !url.includes('/auth/login')) {
      Auth.clearAuth();
      showToast('Session expired. Please log in again.', 'warning');
      setTimeout(() => { window.location.href = '/login.html'; }, 1000);
      throw new Error('Unauthorized');
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || (data?.errors ? data.errors.join(', ') : `HTTP ${res.status}: ${res.statusText}`);
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (err) {
    console.error(`[API Error: ${options.method || 'GET'} ${url}]`, err.message);
    throw err;
  }
}

/**
 * Toast Notification System
 * Displays temporary alert pills in bottom-right corner.
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span style="font-weight:bold">${icon}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.25s ease-out';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Modal Dialog Utilities
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Global modal background click-to-close listener
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

/**
 * Formatting Utilities
 */
export function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  // If time is "14:30:00"
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeStr;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
