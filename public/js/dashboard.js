/* ==========================================================================
   BharatServe UNIFIED DASHBOARDS CONTROLLER
   Manages customer actions, provider workflows, and admin verifications
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure API is configured
  if (API.isMockMode === undefined) {
    await API.init();
  }

  const path = window.location.pathname;

  if (path.includes('dashboard-customer.html')) {
    initCustomerDashboard();
  } else if (path.includes('dashboard-provider.html')) {
    initProviderDashboard();
  } else if (path.includes('dashboard-admin.html')) {
    initAdminDashboard();
  }
});

// Common Tab switcher
window.switchTab = function(tabName) {
  // Hide all panels
  const panels = document.querySelectorAll('.card-panel');
  panels.forEach(p => p.style.display = 'none');
  
  // Also handle admin panels which might not have card-panel class
  const panelAnalytics = document.getElementById('panel-analytics');
  if (panelAnalytics) panelAnalytics.style.display = 'none';

  // Show active panel
  const activePanel = document.getElementById(`panel-${tabName}`);
  if (activePanel) {
    activePanel.style.display = 'block';
  }

  // Update menu item CSS
  const menuItems = document.querySelectorAll('.db-menu-item');
  menuItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick').includes(tabName)) {
      item.classList.add('active');
    }
  });
};

// ==========================================================================
// 1. CUSTOMER DASHBOARD CONTROLLER
// ==========================================================================
let selectedRating = 0;

async function initCustomerDashboard() {
  const user = await Auth.getCurrentUser();
  if (!user) return;

  // Set Profile details
  const avatarEl = document.getElementById('cust-avatar');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  } else {
    avatarEl.innerText = user.name.split(' ').map(n=>n[0]).join('').toUpperCase();
  }
  document.getElementById('cust-name').innerText = user.name;

  loadCustomerBookings();
  loadCustomerAddressesPanel();
  loadFavoritesPanel();

  // Populate Edit Profile inputs
  const editCustName = document.getElementById('edit-cust-name');
  const editCustPhone = document.getElementById('edit-cust-phone');
  if (editCustName && editCustPhone) {
    editCustName.value = user.name || '';
    editCustPhone.value = user.phone || '';
  }

  // Customer Profile Form Submit
  const custProfileForm = document.getElementById('customer-profile-form');
  if (custProfileForm) {
    custProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-cust-name').value;
      const phone = document.getElementById('edit-cust-phone').value;
      const fileInput = document.getElementById('edit-cust-avatar-file');
      const successDiv = document.getElementById('profile-success');

      let avatar = user.avatar;

      if (fileInput && fileInput.files[0]) {
        const getBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
        try {
          avatar = await getBase64(fileInput.files[0]);
        } catch (err) {
          alert('Failed to process avatar picture. Saving without picture.');
        }
      }

      try {
        const updated = await API.request('/api/auth/profile', {
          method: 'PUT',
          body: { name, phone, avatar }
        });
        
        if (successDiv) {
          successDiv.style.display = 'block';
          setTimeout(() => successDiv.style.display = 'none', 3000);
        }

        // Refresh navbar header and sidebar avatar
        await Auth.updateHeader();
        
        const sidebarAvatar = document.getElementById('cust-avatar');
        if (sidebarAvatar) {
          if (updated.avatar) {
            sidebarAvatar.innerHTML = `<img src="${updated.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
          } else {
            sidebarAvatar.innerHTML = updated.name.split(' ').map(n=>n[0]).join('').toUpperCase();
          }
        }
        document.getElementById('cust-name').innerText = updated.name;
        if (fileInput) fileInput.value = '';
      } catch (err) {
        alert(err.error || 'Failed to update profile settings.');
      }
    });
  }

  // Setup Review Stars
  const stars = document.querySelectorAll('#star-selector i');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.getAttribute('data-rating'));
      selectedRating = rating;
      document.getElementById('review-rating').value = rating;
      
      stars.forEach((s, idx) => {
        if (idx < rating) {
          s.className = 'fas fa-star active';
        } else {
          s.className = 'far fa-star';
        }
      });
    });
  });

  // Review Form Submit
  document.getElementById('review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId = document.getElementById('review-booking-id').value;
    const comment = document.getElementById('review-comment').value;
    const errorDiv = document.getElementById('review-modal-error');
    const imageFile = document.getElementById('review-image').files[0];

    errorDiv.style.display = 'none';

    if (selectedRating === 0) {
      errorDiv.style.display = 'block';
      errorDiv.querySelector('span').innerText = 'Please select a star rating.';
      return;
    }

    let workPicture = '';
    if (imageFile) {
      const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      try {
        workPicture = await getBase64(imageFile);
      } catch (e) {
        alert('Failed to process image. Proceeding without photo.');
      }
    }

    try {
      await API.request('/api/reviews', {
        method: 'POST',
        body: { bookingId, rating: selectedRating, comment, workPicture }
      });
      alert('Review submitted successfully!');
      
      // Clear file input
      document.getElementById('review-image').value = '';
      
      closeReviewModal();
      loadCustomerBookings();
    } catch (err) {
      errorDiv.style.display = 'block';
      errorDiv.querySelector('span').innerText = err.error || 'Failed to submit review.';
    }
  });

  // Add Address Form Submit
  document.getElementById('add-address-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newAddress = document.getElementById('new-address-input').value;
    
    try {
      user.addresses.push(newAddress);
      await API.request('/api/auth/profile', {
        method: 'PUT',
        body: { addresses: user.addresses }
      });
      document.getElementById('new-address-input').value = '';
      loadCustomerAddressesPanel();
    } catch (err) {
      alert('Failed to save address.');
    }
  });
}

async function loadCustomerBookings() {
  const container = document.getElementById('customer-bookings-list');
  try {
    const bookings = await API.request('/api/bookings');
    
    // Metrics
    document.getElementById('stat-total-bookings').innerText = bookings.length;
    document.getElementById('stat-active-bookings').innerText = bookings.filter(b => b.status === 'pending' || b.status === 'accepted').length;
    document.getElementById('stat-completed-bookings').innerText = bookings.filter(b => b.status === 'completed').length;

    if (bookings.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-circle-info fa-2x" style="margin-bottom:12px;"></i>
          <p>You have not placed any bookings yet.</p>
        </div>
      `;
      return;
    }

    // Load reviews to check which bookings have already been reviewed
    let reviews = [];
    if (API.isMockMode) {
      reviews = JSON.parse(localStorage.getItem('BharatServe_reviews') || '[]');
    }

    container.innerHTML = bookings.map(b => {
      const p = b.provider || { name: 'Verified Professional' };
      const formattedDate = new Date(b.bookingDate).toLocaleDateString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });

      let actionsHtml = '';
      if (b.status === 'pending' || b.status === 'accepted') {
        actionsHtml = `<button onclick="cancelBooking('${b._id}')" class="btn btn-outline btn-sm btn-text" style="color:var(--error-red); border-color:var(--error-red);"><i class="fas fa-xmark"></i> Cancel</button>`;
      } else if (b.status === 'completed') {
        // Check if reviewed already
        const hasReviewed = API.isMockMode 
          ? reviews.some(r => r.booking === b._id)
          : false; // In server mode, the server error checks handle block, but we can write dynamic lookups. Let's simplify:

        actionsHtml = `
          <button onclick="viewInvoice('${b._id}')" class="btn btn-outline btn-sm"><i class="fas fa-file-invoice"></i> Receipt</button>
          ${!hasReviewed ? `<button onclick="openReviewModal('${b._id}')" class="btn btn-primary btn-sm"><i class="fas fa-star"></i> Review</button>` : `<span style="font-size:12px; color:var(--success-green); font-weight:600;"><i class="fas fa-circle-check"></i> Reviewed</span>`}
        `;
      }

      let otpHtml = '';
      if (b.status === 'pending' || b.status === 'accepted') {
        otpHtml = `<p style="font-size:12px; color:var(--success-green); font-weight:700; background-color:rgba(16,185,129,0.08); padding:4px 8px; border-radius:4px; display:inline-block; margin-top:6px;"><i class="fas fa-key"></i> Work Start OTP: <strong>${b.otp || 'N/A'}</strong></p>`;
      } else if (b.status === 'started') {
        otpHtml = `<p style="font-size:12px; color:var(--secondary-orange); font-weight:700; background-color:rgba(249,115,22,0.08); padding:4px 8px; border-radius:4px; display:inline-block; margin-top:6px;"><i class="fas fa-person-digging"></i> Job In Progress</p>`;
      }

      return `
        <div class="db-booking-card">
          <div class="db-booking-details">
            <div class="db-booking-info">
              <h4>${p.name}</h4>
              <p style="color:var(--secondary-orange); font-weight:600; font-size:12px;">${b.serviceSubCategory}</p>
              <p><i class="fas fa-calendar-days"></i> ${formattedDate} | <i class="fas fa-clock"></i> ${b.bookingTimeSlot}</p>
              <p style="font-size:12px; color:var(--text-muted);"><i class="fas fa-location-dot"></i> ${b.address}</p>
              ${otpHtml}
            </div>
          </div>
          <div class="db-booking-meta">
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:16px;">₹${b.totalAmount}</div>
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:2px;">${b.paymentMethod === 'card' ? 'Online Paid' : 'Cash on Service'}</div>
            </div>
            <span class="status-indicator status-${b.status}">${b.status}</span>
            <div style="display:flex; gap:8px;">
              ${actionsHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; color:var(--error-red); padding: 40px;">Failed to load bookings.</div>`;
  }
}

async function cancelBooking(id) {
  if (!confirm('Are you sure you want to cancel this booking request?')) return;
  try {
    await API.request(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: { status: 'cancelled' }
    });
    alert('Booking cancelled successfully.');
    loadCustomerBookings();
  } catch (err) {
    alert(err.error || 'Failed to cancel booking.');
  }
}

window.cancelBooking = cancelBooking;

window.openReviewModal = function(bookingId) {
  document.getElementById('review-booking-id').value = bookingId;
  document.getElementById('review-comment').value = '';
  document.getElementById('review-modal-error').style.display = 'none';
  selectedRating = 0;
  
  const stars = document.querySelectorAll('#star-selector i');
  stars.forEach(s => s.className = 'far fa-star');

  document.getElementById('review-modal').style.display = 'flex';
};

window.closeReviewModal = function() {
  document.getElementById('review-modal').style.display = 'none';
};

async function loadCustomerAddressesPanel() {
  const user = await Auth.getCurrentUser();
  const container = document.getElementById('addresses-container');
  if (!container) return;

  if (!user.addresses || user.addresses.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:14px;">No addresses saved yet. Use checkout or the form below to add.</div>`;
    return;
  }

  container.innerHTML = user.addresses.map((addr, idx) => `
    <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: 8px; background-color: var(--bg-soft-gray); display:flex; justify-content:space-between; align-items:center;">
      <p style="font-size:14px; margin:0;"><i class="fas fa-location-dot" style="color:var(--secondary-orange); margin-right:8px;"></i> ${addr}</p>
      <button onclick="deleteAddress(${idx})" class="btn btn-icon-only btn-sm" style="color:var(--error-red); border-color:transparent; background:transparent;"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

window.deleteAddress = async function(idx) {
  const user = await Auth.getCurrentUser();
  user.addresses.splice(idx, 1);
  try {
    await API.request('/api/auth/profile', {
      method: 'PUT',
      body: { addresses: user.addresses }
    });
    loadCustomerAddressesPanel();
  } catch (err) {
    alert('Failed to delete address.');
  }
};

async function loadFavoritesPanel() {
  const user = await Auth.getCurrentUser();
  const container = document.getElementById('favorites-container');
  if (!container) return;

  if (!user.favorites || user.favorites.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:14px; padding: 20px; text-align:center;">No favorite professionals saved yet.</div>`;
    return;
  }

  try {
    const list = [];
    for (let fid of user.favorites) {
      try {
        const prov = await API.request(`/api/providers/${fid}`);
        list.push(prov);
      } catch (e) {}
    }

    if (list.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:14px; padding: 20px; text-align:center;">No favorite professionals saved yet.</div>`;
      return;
    }

    container.innerHTML = list.map(p => {
      const profile = p.providerProfile || {};
      const initials = p.name.split(' ').map(n=>n[0]).join('').toUpperCase();
      return `
        <div class="provider-card" style="grid-template-columns: auto 1fr auto;">
          <div class="provider-photo-area">
            <div class="provider-avatar" style="width:60px; height:60px; font-size:20px;">${initials}</div>
          </div>
          <div class="provider-info-area">
            <h4 class="provider-name" style="font-size:16px;">${p.name}</h4>
            <p style="color:var(--secondary-orange); font-weight:600; font-size:12px; margin-bottom:4px;">${profile.subCategory}</p>
            <p style="font-size:12px; color:var(--text-muted);"><i class="fas fa-star" style="color:var(--accent-gold)"></i> ${profile.rating} (${profile.completedJobs} Jobs)</p>
          </div>
          <div style="display:flex; flex-direction:column; justify-content:center; gap:8px;">
            <a href="booking.html?providerId=${p._id}" class="btn btn-primary btn-sm">Book</a>
            <button onclick="toggleFav('${p._id}')" class="btn btn-outline btn-sm" style="color:var(--error-red); border-color:var(--border-color);"><i class="fas fa-heart-crack"></i> Unsave</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<div style="color:var(--error-red);">Failed to load favorites.</div>`;
  }
}

window.toggleFav = async function(id) {
  try {
    await API.request(`/api/providers/${id}/favorite`, { method: 'POST' });
    loadFavoritesPanel();
  } catch (err) {
    alert('Operation failed.');
  }
};

window.viewInvoice = async function(bookingId) {
  const modal = document.getElementById('invoice-modal');
  const container = document.getElementById('invoice-modal-content');
  container.innerHTML = `<div style="text-align:center;"><i class="fas fa-spinner fa-spin"></i></div>`;
  modal.style.display = 'flex';

  try {
    const bookings = await API.request('/api/bookings');
    const b = bookings.find(item => item._id === bookingId);
    if (!b) throw new Error('Invoice booking not found');

    const basePrice = b.totalAmount - 79;
    const taxes = Math.round(basePrice * 0.05);

    const user = await Auth.getCurrentUser();
    const customerName = user ? user.name : 'Customer';

    container.innerHTML = `
      <div style="position: relative; overflow: hidden; padding: 10px;">
        <!-- Faded Logo Watermark Overlay -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); width: 260px; height: 260px; background-image: url('img/DP.png'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.04; pointer-events: none; z-index: 0;"></div>
        
        <div style="position: relative; z-index: 1;">
          <div style="text-align:center; margin-bottom:24px; border-bottom: 2px solid var(--primary-navy); padding-bottom:16px;">
            <h2 style="font-size:24px; font-weight:800; color:var(--primary-navy);">BharatServe Invoice</h2>
            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Serving India, One Home at a Time.</p>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:20px;">
            <div>
              <strong>Invoice To:</strong><br>
              ${customerName}<br>
              ${b.address}
            </div>
            <div style="text-align:right;">
              <strong>Invoice ID:</strong> #${b._id}<br>
              <strong>Date:</strong> ${new Date(b.createdAt).toLocaleDateString('en-IN')}<br>
              <strong>Status:</strong> <span style="color:var(--success-green); font-weight:700;">PAID</span>
            </div>
          </div>
          <table style="width:100%; font-size:13px; margin-bottom:20px; border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color);">
            <thead>
              <tr style="background:var(--bg-soft-gray);">
                <th style="padding:8px;">Description</th>
                <th style="text-align:right; padding:8px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:8px;">${b.serviceSubCategory} Service Charge (${b.provider.name})</td>
                <td style="text-align:right; padding:8px;">₹${basePrice}</td>
              </tr>
              <tr>
                <td style="padding:8px;">Safety & Booking Fee</td>
                <td style="text-align:right; padding:8px;">₹49</td>
              </tr>
              <tr>
                <td style="padding:8px;">Taxes & CGST/SGST</td>
                <td style="text-align:right; padding:8px;">₹${taxes}</td>
              </tr>
              <tr style="font-weight:700; border-top: 1.5px solid var(--primary-navy);">
                <td style="padding:8px;">Grand Total</td>
                <td style="text-align:right; padding:8px;">₹${b.totalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:30px;">
            Thank you for booking with BharatServe! This is a computer-generated transaction document.
          </div>
        </div>
      </div>
      <button onclick="window.print()" class="btn btn-outline btn-sm" style="margin-top:20px; width:100%;"><i class="fas fa-print"></i> Print Invoice</button>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--error-red);">Invoice not found.</div>`;
  }
};

window.closeInvoiceModal = function() {
  document.getElementById('invoice-modal').style.display = 'none';
};

// ==========================================================================
// 2. SERVICE PROVIDER DASHBOARD CONTROLLER
// ==========================================================================
async function initProviderDashboard() {
  const user = await Auth.getCurrentUser();
  if (!user) return;

  const profile = user.providerProfile || {};
  const avatarEl = document.getElementById('prov-avatar');
  if (user.avatar) {
    avatarEl.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  } else {
    avatarEl.innerText = user.name.split(' ').map(n=>n[0]).join('').toUpperCase();
  }
  document.getElementById('prov-name').innerText = user.name;
  document.getElementById('prov-category-badge').innerText = `${profile.subCategory} Pro`;

  loadProviderStats(user);
  loadProviderBookings();
  loadProviderReviews(user._id);
  loadProfileSettingsForm(user);
  showProviderNotifications(user._id);

  // Edit Profile Form Submit
  document.getElementById('provider-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('edit-name').value;
    const phone = document.getElementById('edit-phone').value;
    const experience = document.getElementById('edit-experience').value;
    const price = document.getElementById('edit-price').value;
    const skills = document.getElementById('edit-skills').value.split(',').map(s => s.trim()).filter(Boolean);
    const languages = document.getElementById('edit-languages').value.split(',').map(l => l.trim()).filter(Boolean);
    const address = document.getElementById('edit-address').value;
    const bio = document.getElementById('edit-bio').value;
    const fileInput = document.getElementById('edit-avatar-file');

    const successDiv = document.getElementById('profile-success');

    let avatar = user.avatar;

    if (fileInput && fileInput.files[0]) {
      const getBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      try {
        avatar = await getBase64(fileInput.files[0]);
      } catch (err) {
        alert('Failed to process avatar picture. Saving without picture.');
      }
    }

    try {
      await API.request('/api/auth/profile', {
        method: 'PUT',
        body: {
          name,
          phone,
          avatar,
          providerDetails: { experience, startingPrice: price, skills, languages, address, bio }
        }
      });
      successDiv.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { successDiv.style.display = 'none'; }, 4000);
      
      // Reload stats/details
      const updatedUser = await Auth.getCurrentUser();
      
      // Update sidebar visual details
      document.getElementById('prov-name').innerText = updatedUser.name;
      
      const sidebarAvatar = document.getElementById('prov-avatar');
      if (sidebarAvatar) {
        if (updatedUser.avatar) {
          sidebarAvatar.innerHTML = `<img src="${updatedUser.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
          sidebarAvatar.innerText = updatedUser.name.split(' ').map(n=>n[0]).join('').toUpperCase();
        }
      }
      
      // Update navbar header immediately
      await Auth.updateHeader();

      loadProviderStats(updatedUser);
      loadProfileSettingsForm(updatedUser);
      if (fileInput) fileInput.value = '';
    } catch (err) {
      alert('Failed to update settings: ' + (err.error || 'Server error.'));
    }
  });
}

function loadProviderStats(user) {
  const profile = user.providerProfile || {};
  
  document.getElementById('stat-completed-jobs').innerText = profile.completedJobs || 0;
  document.getElementById('stat-rating').innerText = profile.rating || '5.0';
  document.getElementById('stat-response-time').innerText = (profile.responseTime || 30) + 'm';

  // Earnings calculation: base price aggregated from completed bookings
  // (We'll load from booking loop, or just show 85% of standard completed booking charges)
  document.getElementById('perf-repeat-customers').innerText = profile.repeatCustomersCount || 0;
  document.getElementById('perf-completeness').innerText = (profile.profileCompleteness || 85) + '%';

  // Performance badges list
  const badgeContainer = document.getElementById('perf-badges');
  if (badgeContainer) {
    let badges = [];
    if (profile.isVerified) badges.push('<span class="badge badge-verified" style="display:inline-block;"><i class="fas fa-check-circle"></i> Verified</span>');
    if (profile.isBackgroundVerified) badges.push('<span class="badge badge-bg-verified" style="display:inline-block; margin-top:4px;"><i class="fas fa-shield-check"></i> BG Cleared</span>');
    if (profile.isTopRated) badges.push('<span class="badge badge-top-rated" style="display:inline-block; margin-top:4px;"><i class="fas fa-award"></i> Top Rated</span>');
    
    badgeContainer.innerHTML = badges.length > 0 ? badges.join('') : '<span style="font-size:12px; color:var(--text-muted);">No badges unlocked.</span>';
  }
}

async function loadProviderBookings() {
  const container = document.getElementById('provider-bookings-list');
  const invoicesContainer = document.getElementById('earnings-invoices-list');
  
  try {
    const bookings = await API.request('/api/bookings');

    // Update notifications badge for pending requests
    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const badge = document.getElementById('requests-badge');
    if (badge) {
      if (pendingCount > 0) {
        badge.innerText = pendingCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Calculate Earnings
    const completed = bookings.filter(b => b.status === 'completed');
    const revenue = completed.reduce((sum, b) => sum + b.totalAmount, 0);
    const payout = parseFloat((revenue * 0.85).toFixed(1));
    const commission = parseFloat((revenue * 0.15).toFixed(1));

    document.getElementById('stat-earnings').innerText = `₹${revenue}`;
    document.getElementById('earnings-payout').innerText = `₹${payout}`;
    document.getElementById('earnings-commission').innerText = `₹${commission}`;

    // Renders earnings list
    if (invoicesContainer) {
      if (completed.length === 0) {
        invoicesContainer.innerHTML = `<div style="font-size:13px; color:var(--text-muted);">No earnings logged yet.</div>`;
      } else {
        invoicesContainer.innerHTML = completed.map(b => `
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding: 12px 0;">
            <div>
              <strong style="font-size:14px;">Booking #${b._id}</strong>
              <p style="font-size:11px; color:var(--text-muted);">${new Date(b.bookingDate).toLocaleDateString('en-IN')}</p>
            </div>
            <div style="text-align:right;">
              <span style="font-weight:800; color:var(--success-green);">+ ₹${Math.round(b.totalAmount * 0.85)}</span>
              <p style="font-size:10px; color:var(--text-muted);">Gross: ₹${b.totalAmount}</p>
            </div>
          </div>
        `).join('');
      }
    }

    if (bookings.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 40px; color: var(--text-muted);">
          <i class="fas fa-inbox fa-2x" style="margin-bottom:12px;"></i>
          <p>No job requests assigned to your profile yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = bookings.map(b => {
      const c = b.customer || { name: 'Customer' };
      const formattedDate = new Date(b.bookingDate).toLocaleDateString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });

      let actionHtml = '';
      let phoneHtml = '<i class="fas fa-lock" style="font-size:12px; color:var(--text-muted);"></i> Accepted bookings only';
      
      if (b.status === 'pending') {
        actionHtml = `
          <button onclick="updateJobStatus('${b._id}', 'accepted')" class="btn btn-primary btn-sm"><i class="fas fa-circle-check"></i> Accept</button>
          <button onclick="updateJobStatus('${b._id}', 'rejected')" class="btn btn-outline btn-sm" style="color:var(--error-red); border-color:var(--border-color);"><i class="fas fa-circle-xmark"></i> Decline</button>
        `;
      } else if (b.status === 'accepted') {
        phoneHtml = `<i class="fas fa-phone"></i> ${c.phone}`;
        actionHtml = `
          <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
            <div style="display:flex; gap:6px;">
              <input type="text" id="otp-input-${b._id}" class="form-control form-control-sm" placeholder="Enter Start OTP" style="width:110px; padding:4px 8px; font-size:12px; text-align:center; border:1px solid var(--border-color); border-radius:4px;">
              <button onclick="verifyStartOtp('${b._id}')" class="btn btn-primary btn-sm" style="background-color:var(--secondary-orange); border-color:var(--secondary-orange); box-shadow:none;"><i class="fas fa-circle-play"></i> Start Job</button>
            </div>
            <span style="font-size:10px; color:var(--text-muted);">Ask customer for verification OTP</span>
          </div>
        `;
      } else if (b.status === 'started') {
        phoneHtml = `<i class="fas fa-phone"></i> ${c.phone}`;
        actionHtml = `
          <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
            <span style="font-size:11px; color:var(--secondary-orange); font-weight:700;"><i class="fas fa-person-digging"></i> Job In Progress...</span>
            <button onclick="updateJobStatus('${b._id}', 'completed')" class="btn btn-primary btn-sm" style="background-color:var(--success-green); border-color:var(--success-green); box-shadow:none;"><i class="fas fa-square-check"></i> Mark Completed</button>
          </div>
        `;
      } else if (b.status === 'completed') {
        phoneHtml = `<i class="fas fa-phone"></i> ${c.phone}`;
        actionHtml = `<span style="font-size:12px; color:var(--success-green); font-weight:600;"><i class="fas fa-circle-check"></i> Order Closed</span>`;
      } else {
        actionHtml = `<span style="font-size:12px; color:var(--text-muted); text-transform:uppercase;">${b.status}</span>`;
      }

      let messageHtml = '';
      if (b.message) {
        messageHtml = `
          <div style="margin-top: 10px; padding: 10px 14px; border-left: 3px solid var(--secondary-orange); background-color: var(--border-color); border-radius: 4px; font-size: 13px; color: var(--text-dark);">
            <i class="fas fa-comment-dots" style="color: var(--secondary-orange); margin-right: 6px;"></i> <strong>Note from client:</strong> "${b.message}"
          </div>
        `;
      }

      let otpHtml = '';
      if (b.status === 'started') {
        otpHtml = `<p style="font-size:12px; color:var(--secondary-orange); font-weight:700; background-color:rgba(249,115,22,0.08); padding:4px 8px; border-radius:4px; display:inline-block; margin-top:6px;"><i class="fas fa-person-digging"></i> Job In Progress</p>`;
      }

      return `
        <div class="db-booking-card">
          <div class="db-booking-details">
            <div class="db-booking-info">
              <h4>${c.name}</h4>
              <p><i class="fas fa-calendar-days"></i> ${formattedDate} | <i class="fas fa-clock"></i> ${b.bookingTimeSlot}</p>
              <p><i class="fas fa-location-dot"></i> ${b.address}</p>
              <p style="font-size:12px; color:var(--text-muted);"><i class="fas fa-contact-book"></i> Client Contact: ${phoneHtml}</p>
              ${otpHtml}
              ${messageHtml}
            </div>
          </div>
          <div class="db-booking-meta">
            <div style="text-align:right;">
              <div style="font-weight:800; font-size:16px;">₹${b.totalAmount}</div>
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-top:2px;">${b.paymentMethod === 'card' ? 'Online Paid' : 'Cash on Service'}</div>
            </div>
            <span class="status-indicator status-${b.status}">${b.status}</span>
            <div style="display:flex; gap:8px;">
              ${actionHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="color:var(--error-red); padding: 40px; text-align:center;">Failed to fetch jobs.</div>`;
  }
}

async function updateJobStatus(bookingId, status) {
  if (status === 'completed' && !confirm('Are you sure you want to close this job as completed? This triggers review tokens for customers.')) return;
  try {
    await API.request(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: { status }
    });
    alert(`Job status updated: ${status}`);
    
    // Refresh page details
    const updatedUser = await Auth.getCurrentUser();
    loadProviderStats(updatedUser);
    loadProviderBookings();
  } catch (err) {
    alert(err.error || 'Failed to update job status.');
  }
}

window.updateJobStatus = updateJobStatus;

async function verifyStartOtp(id) {
  const otpInput = document.getElementById(`otp-input-${id}`);
  if (!otpInput) return;
  const otp = otpInput.value.trim();
  
  if (!otp) {
    alert('Please enter the 4-digit OTP provided by the customer.');
    return;
  }

  try {
    await API.request(`/api/bookings/${id}/status`, {
      method: 'PUT',
      body: { status: 'started', otp }
    });
    alert('OTP Verified! Job started successfully.');
    
    // Refresh page stats & lists
    const updatedUser = await Auth.getCurrentUser();
    loadProviderStats(updatedUser);
    loadProviderBookings();
  } catch (err) {
    alert(err.error || 'Invalid OTP. Please check with the customer and try again.');
  }
}

window.verifyStartOtp = verifyStartOtp;

async function loadProviderReviews(provId) {
  const container = document.getElementById('provider-reviews-list');
  if (!container) return;

  try {
    const reviews = await API.request(`/api/reviews/provider/${provId}`);
    
    if (reviews.length === 0) {
      container.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">No customer reviews submitted yet.</div>`;
      return;
    }

    container.innerHTML = reviews.map(r => {
      const clientName = (r.customer && r.customer.name) ? r.customer.name : 'Verified Customer';
      const initials = clientName.split(' ').map(n=>n[0]).join('').toUpperCase();
      const formattedDate = new Date(r.createdAt).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });

      let imageHtml = '';
      if (r.workPicture) {
        imageHtml = `
          <div style="margin-top:10px; padding-left:44px;">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px; font-weight:700;"><i class="fas fa-camera"></i> CUSTOMER WORK PHOTO:</div>
            <img src="${r.workPicture}" alt="Completed Work Photo" style="max-width:160px; max-height:160px; border-radius:6px; border:1px solid var(--border-color); box-shadow:var(--shadow-sm); transition:transform 0.2s; cursor:pointer;" onclick="window.open(this.src, '_blank')" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          </div>
        `;
      }

      return `
        <div class="review-item">
          <div class="review-header">
            <div class="review-meta">
              <div class="review-customer-initials">${initials}</div>
              <div>
                <div class="review-author" style="display:flex; align-items:center; gap:6px;">
                  ${clientName} 
                  <span style="color: var(--success-green); font-size: 10px; font-weight: 700; background-color: rgba(16,185,129,0.06); padding: 1px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px;"><i class="fas fa-shield-check"></i> Verified</span>
                </div>
                <div class="review-date">${formattedDate}</div>
              </div>
            </div>
            <div class="review-stars">
              ${Array(r.rating).fill('<i class="fas fa-star"></i>').join('')}
              ${Array(5 - r.rating).fill('<i class="far fa-star"></i>').join('')}
            </div>
          </div>
          <div class="review-comment" style="padding-left: 44px; margin-top:8px;">"${r.comment}"</div>
          ${imageHtml}
        </div>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:var(--error-red);">Failed to load review logs.</div>`;
  }
}

function loadProfileSettingsForm(user) {
  const nameInput = document.getElementById('edit-name');
  const phoneInput = document.getElementById('edit-phone');
  const expInput = document.getElementById('edit-experience');
  const priceInput = document.getElementById('edit-price');
  const skillsInput = document.getElementById('edit-skills');
  const languagesInput = document.getElementById('edit-languages');
  const addressInput = document.getElementById('edit-address');
  const bioInput = document.getElementById('edit-bio');

  if (!expInput) return;

  const profile = user.providerProfile || {};

  nameInput.value = user.name || '';
  phoneInput.value = user.phone || '';
  expInput.value = profile.experience || 0;
  priceInput.value = profile.startingPrice || 299;
  skillsInput.value = (profile.skills || []).join(', ');
  languagesInput.value = (profile.languages || []).join(', ');
  addressInput.value = profile.address || '';
  bioInput.value = profile.bio || '';
}

// ==========================================================================
// 3. CENTRAL ADMIN DASHBOARD CONTROLLER
// ==========================================================================
async function initAdminDashboard() {
  Auth.protectPage('admin');

  const user = await Auth.getCurrentUser();
  if (!user) return;

  // Set Profile details
  const avatarEl = document.getElementById('admin-avatar');
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    } else {
      avatarEl.innerHTML = `<i class="fas fa-lock"></i>`;
    }
  }
  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.innerText = user.name;

  loadAdminStats();
  loadAdminCustomers();
  loadAdminProviders();
  loadAdminBookings();
  loadAdminReviews();

  // Populate Edit Profile inputs
  const editAdminName = document.getElementById('edit-admin-name');
  const editAdminPhone = document.getElementById('edit-admin-phone');
  if (editAdminName && editAdminPhone) {
    editAdminName.value = user.name || '';
    editAdminPhone.value = user.phone || '';
  }

  // Admin Profile Form Submit
  const adminProfileForm = document.getElementById('admin-profile-form');
  if (adminProfileForm) {
    adminProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('edit-admin-name').value;
      const phone = document.getElementById('edit-admin-phone').value;
      const fileInput = document.getElementById('edit-admin-avatar-file');
      const successDiv = document.getElementById('admin-profile-success');

      let avatar = user.avatar;

      if (fileInput && fileInput.files[0]) {
        const getBase64 = (file) => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
        try {
          avatar = await getBase64(fileInput.files[0]);
        } catch (err) {
          alert('Failed to process avatar picture. Saving without picture.');
        }
      }

      try {
        const updated = await API.request('/api/auth/profile', {
          method: 'PUT',
          body: { name, phone, avatar }
        });
        
        if (successDiv) {
          successDiv.style.display = 'block';
          setTimeout(() => successDiv.style.display = 'none', 3000);
        }

        // Refresh navbar header and sidebar avatar
        await Auth.updateHeader();
        
        const sidebarAvatar = document.getElementById('admin-avatar');
        if (sidebarAvatar) {
          if (updated.avatar) {
            sidebarAvatar.innerHTML = `<img src="${updated.avatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
          } else {
            sidebarAvatar.innerHTML = `<i class="fas fa-lock"></i>`;
          }
        }
        const sidebarName = document.getElementById('admin-name');
        if (sidebarName) sidebarName.innerText = updated.name;
        
        if (fileInput) fileInput.value = '';
      } catch (err) {
        alert(err.error || 'Failed to update admin profile settings.');
      }
    });
  }
}

async function loadAdminReviews() {
  const container = document.getElementById('admin-reviews-table-body');
  if (!container) return;

  try {
    const reviews = await API.request('/api/admin/reviews');

    if (reviews.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No reviews submitted in system.</td></tr>`;
      return;
    }

    container.innerHTML = reviews.map(r => {
      const formattedDate = new Date(r.createdAt).toLocaleDateString('en-IN');
      const photoHtml = r.workPicture 
        ? `<img src="${r.workPicture}" alt="Work photo" style="width:48px; height:48px; border-radius:4px; cursor:pointer;" onclick="window.open(this.src, '_blank')">`
        : `<span style="color:var(--text-muted); font-size:11px;">No Photo</span>`;

      const clientName = r.customer ? r.customer.name : 'Verified Customer';
      const providerName = r.provider ? r.provider.name : 'Professional';

      return `
        <tr>
          <td><strong>${clientName}</strong></td>
          <td><strong>${providerName}</strong></td>
          <td><span style="color:var(--accent-gold); font-weight:700;"><i class="fas fa-star"></i> ${r.rating}</span></td>
          <td><span style="font-style:italic;">"${r.comment}"</span></td>
          <td>${photoHtml}</td>
          <td style="font-size:12px; color:var(--text-muted);">${formattedDate}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--error-red);">Failed to load review logs.</td></tr>`;
  }
}

async function loadAdminStats() {
  try {
    const stats = await API.request('/api/admin/stats');
    
    document.getElementById('admin-stat-revenue').innerText = `₹${stats.metrics.totalRevenue}`;
    document.getElementById('admin-stat-earnings').innerText = `₹${stats.metrics.platformEarnings}`;
    document.getElementById('admin-stat-bookings').innerText = stats.metrics.totalBookings;
    document.getElementById('admin-stat-customers').innerText = stats.metrics.totalCustomers;
    document.getElementById('admin-stat-providers').innerText = stats.metrics.totalProviders;
    document.getElementById('admin-stat-verified-providers').innerText = stats.metrics.verifiedProviders;

    // Renders booking categories list
    const chartDiv = document.getElementById('category-stats-chart');
    const categories = Object.keys(stats.categoryStats);
    if (categories.length === 0) {
      chartDiv.innerHTML = `<div style="font-size:13px; color:var(--text-muted);">No system booking entries.</div>`;
      return;
    }

    const maxBookings = Math.max(...Object.values(stats.categoryStats));

    chartDiv.innerHTML = categories.map(cat => {
      const count = stats.categoryStats[cat];
      const pct = maxBookings > 0 ? (count / maxBookings) * 100 : 0;
      return `
        <div style="font-size:13px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong>${cat}</strong> <span>${count} Bookings</span>
          </div>
          <div style="background-color:var(--border-color); height:12px; border-radius:6px; overflow:hidden;">
            <div style="background-color:var(--secondary-orange); width:${pct}%; height:100%;"></div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error generating admin stats:', err);
  }
}

async function loadAdminCustomers() {
  const container = document.getElementById('admin-customers-table-body');
  if (!container) return;

  try {
    const customers = await API.request('/api/admin/customers');

    if (customers.length === 0) {
      container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No customers registered.</td></tr>`;
      return;
    }

    container.innerHTML = customers.map(c => {
      const formattedDate = new Date(c.createdAt).toLocaleDateString('en-IN');
      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone}</td>
          <td>${formattedDate}</td>
          <td style="font-size:12px;">${c.addresses && c.addresses.length > 0 ? c.addresses[0].slice(0, 30) + '...' : 'No addresses saved'}</td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--error-red);">Failed to load customers list.</td></tr>`;
  }
}

async function loadAdminProviders() {
  const container = document.getElementById('admin-providers-table-body');
  if (!container) return;

  try {
    const providers = await API.request('/api/admin/providers');

    if (providers.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No service providers registered.</td></tr>`;
      return;
    }

    container.innerHTML = providers.map(p => {
      const profile = p.providerProfile || {};
      const verifyBtn = profile.isVerified 
        ? `<button onclick="toggleProviderVerify('${p._id}', false, 'verify')" class="btn btn-outline btn-sm" style="color:var(--error-red); border-color:var(--error-red); padding:4px 8px; font-size:11px;">Revoke</button>`
        : `<button onclick="toggleProviderVerify('${p._id}', true, 'verify')" class="btn btn-primary btn-sm" style="background-color:var(--success-green); box-shadow:none; padding:4px 8px; font-size:11px;">Approve</button>`;
      
      const bgBtn = profile.isBackgroundVerified
        ? `<button onclick="toggleProviderVerify('${p._id}', false, 'bg')" class="btn btn-outline btn-sm" style="color:var(--error-red); border-color:var(--error-red); padding:4px 8px; font-size:11px;">Revoke</button>`
        : `<button onclick="toggleProviderVerify('${p._id}', true, 'bg')" class="btn btn-primary btn-sm" style="background-color:var(--primary-navy); box-shadow:none; padding:4px 8px; font-size:11px;">Pass Check</button>`;

      return `
        <tr>
          <td><strong>${p.name}</strong><br><span style="font-size:11px; color:var(--text-muted);">${p.email}</span></td>
          <td>${profile.subCategory}</td>
          <td>${profile.experience} Yrs</td>
          <td>${profile.completedJobs} Jobs</td>
          <td><i class="fas fa-star" style="color:var(--accent-gold);"></i> ${profile.rating}</td>
          <td>
            <span style="font-size:11px; margin-right:8px;" class="status-indicator status-${profile.isVerified ? 'completed' : 'cancelled'}">${profile.isVerified ? 'VERIFIED' : 'UNVERIFIED'}</span>
            ${verifyBtn}
          </td>
          <td>
            <span style="font-size:11px; margin-right:8px;" class="status-indicator status-${profile.isBackgroundVerified ? 'completed' : 'cancelled'}">${profile.isBackgroundVerified ? 'PASSED' : 'PENDING'}</span>
            ${bgBtn}
          </td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--error-red);">Failed to load providers listing.</td></tr>`;
  }
}

window.toggleProviderVerify = async function(id, value, mode) {
  try {
    const body = {};
    if (mode === 'verify') body.isVerified = value;
    if (mode === 'bg') body.isBackgroundVerified = value;

    await API.request(`/api/admin/providers/${id}/verify`, {
      method: 'PUT',
      body
    });
    alert('Verification status updated.');
    
    // Refresh admin lists
    loadAdminStats();
    loadAdminProviders();
  } catch (err) {
    alert('Failed to update verification flags.');
  }
};

async function loadAdminBookings() {
  const container = document.getElementById('admin-bookings-table-body');
  if (!container) return;

  try {
    const bookings = await API.request('/api/bookings');

    if (bookings.length === 0) {
      container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No booking transactions logged in system.</td></tr>`;
      return;
    }

    container.innerHTML = bookings.map(b => {
      const client = b.customer || { name: 'Customer' };
      const vendor = b.provider || { name: 'Professional' };
      const sched = new Date(b.bookingDate).toLocaleDateString('en-IN') + ' ' + b.bookingTimeSlot;

      return `
        <tr>
          <td><code>#${b._id}</code></td>
          <td>${client.name}</td>
          <td>${vendor.name}</td>
          <td>${b.serviceSubCategory}</td>
          <td style="font-size:12px;">${sched}</td>
          <td><strong>₹${b.totalAmount}</strong></td>
          <td><span class="status-indicator status-${b.status}">${b.status}</span></td>
        </tr>
      `;
    }).join('');

  } catch (e) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--error-red);">Failed to load transactions list.</td></tr>`;
  }
}

async function showProviderNotifications(provId) {
  try {
    const notifications = await API.request('/api/notifications');
    const unread = notifications.filter(n => !n.isRead);

    if (unread.length === 0) return;

    // Inject slideIn styles if they don't exist
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.innerHTML = `
        @keyframes slideIn {
          from { transform: translateY(-50px) translateX(50px); opacity: 0; }
          to { transform: translateY(0) translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { transform: translateY(0) translateX(0); opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Display toast for each unread notification
    unread.forEach((n, index) => {
      const topOffset = 80 + (index * 75);

      const toast = document.createElement('div');
      toast.style.position = 'fixed';
      toast.style.top = `${topOffset}px`;
      toast.style.right = '24px';
      toast.style.padding = '14px 18px';
      toast.style.borderRadius = '10px';
      toast.style.backgroundColor = 'var(--primary-navy)';
      toast.style.color = '#ffffff';
      toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.25)';
      toast.style.zIndex = '100000';
      toast.style.borderLeft = '4px solid var(--secondary-orange)';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.justifyContent = 'space-between';
      toast.style.gap = '16px';
      toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      toast.style.width = '320px';
      toast.style.cursor = 'pointer';

      toast.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;" onclick="switchTab('requests')">
          <div style="background-color:rgba(249, 115, 22, 0.2); width:28px; height:28px; border-radius:50%; display:flex; justify-content:center; align-items:center;">
            <i class="fas fa-bell" style="color:var(--secondary-orange); font-size:12px;"></i>
          </div>
          <div style="text-align:left;">
            <div style="font-weight:700; font-size:12px;">New Booking Request!</div>
            <div style="font-size:10px; color:#cbd5e1; margin-top:2px;">${n.customerName} wants ${n.subCategory}</div>
          </div>
        </div>
        <button style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:12px;" onclick="event.stopPropagation(); this.parentElement.remove();"><i class="fas fa-xmark"></i></button>
      `;

      document.body.appendChild(toast);

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        if (toast.parentElement) {
          toast.style.animation = 'fadeOut 0.4s ease-out forwards';
          setTimeout(() => { toast.remove(); }, 400);
        }
      }, 6000);
    });

    // Mark as read so it doesn't show again
    await API.request('/api/notifications/read', { method: 'POST' });

  } catch (err) {
    console.error('Failed to load notifications', err);
  }
}
