/* ==========================================================================
   BharatServe HOMEPAGE CONTROLLER
   Manages search dispatching, category tabs, and review feeds
   ========================================================================== */

const SERVICES_DATA = {
  'Home Services': [
    { name: 'Plumbing', icon: 'fa-droplet', price: 349, rating: 4.8 },
    { name: 'AC Repair', icon: 'fa-wind', price: 499, rating: 4.9 },
    { name: 'Electrician', icon: 'fa-bolt', price: 299, rating: 4.6 },
    { name: 'Solar Installation', icon: 'fa-solar-panel', price: 4999, rating: 4.9 },
    { name: 'Water Purification', icon: 'fa-faucet-drip', price: 399, rating: 4.7 },
    { name: 'Borewell Services', icon: 'fa-bore-hole', price: 8999, rating: 4.8 },
    { name: 'Motor Repairs', icon: 'fa-gears', price: 699, rating: 4.7 },
    { name: 'Gas Stove Repair', icon: 'fa-fire-burner', price: 199, rating: 4.6 },
    { name: 'Home Cleaning', icon: 'fa-broom', price: 999, rating: 4.5 },
    { name: 'Carpenter', icon: 'fa-hammer', price: 399, rating: 4.7 }
  ],
  'Office Services': [
    { name: 'Office Cleaning', icon: 'fa-building-shield', price: 1999, rating: 4.7 },
    { name: 'Network Setup', icon: 'fa-network-wired', price: 1499, rating: 4.8 },
    { name: 'CCTV Installation', icon: 'fa-video', price: 899, rating: 4.6 }
  ],
  'Shop Services': [
    { name: 'Signboard Installation', icon: 'fa-sign-hanging', price: 2499, rating: 4.4 },
    { name: 'Security Systems', icon: 'fa-shield-halved', price: 1799, rating: 4.9 }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for API to resolve mode
  if (API.isMockMode === undefined) {
    await API.init();
  }

  initCategoryTabs();
  renderServices('Home Services');
  initHeroSearch();
  loadTestimonials();
});

// Category Tab switches
function initCategoryTabs() {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.getAttribute('data-category');
      renderServices(cat);
    });
  });
}

// Render service cards
function renderServices(category) {
  const grid = document.getElementById('services-grid');
  if (!grid) return;

  const services = SERVICES_DATA[category] || [];
  grid.innerHTML = services.map(s => `
    <div class="service-card" onclick="selectService('${category}', '${s.name}')">
      <div class="service-card-header">
        <div class="service-card-icon">
          <i class="fas ${s.icon}"></i>
        </div>
        <div class="service-card-rating">
          <i class="fas fa-star"></i> ${s.rating}
        </div>
      </div>
      <div class="service-card-body">
        <h3>${s.name}</h3>
        <p>Book top-rated, background-verified professionals for ${s.name.toLowerCase()} in your locality.</p>
      </div>
      <div class="service-card-footer">
        <div class="service-card-price">
          <span>Starting Price</span>
          <span>₹${s.price}</span>
        </div>
        <div class="service-card-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
      </div>
    </div>
  `).join('');
}

// Redirect service selection
window.selectService = function(category, subCategory) {
  window.location.href = `provider-listing.html?category=${encodeURIComponent(category)}&subCategory=${encodeURIComponent(subCategory)}`;
};

// Hero Search dispatching
function initHeroSearch() {
  const btn = document.getElementById('btn-search-hero');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const categorySelect = document.getElementById('search-category');
    const nameInput = document.getElementById('search-provider-name');
    const locationSelect = document.getElementById('search-location');

    let category = '';
    let subCategory = categorySelect.value;
    
    // Auto-detect high level category based on options group if selected
    if (subCategory) {
      const selectedOption = categorySelect.options[categorySelect.selectedIndex];
      const optGroupLabel = selectedOption.parentNode.label;
      category = optGroupLabel;
    }

    const search = nameInput.value;
    const location = locationSelect.value;

    let queryParams = [];
    if (category) queryParams.push(`category=${encodeURIComponent(category)}`);
    if (subCategory) queryParams.push(`subCategory=${encodeURIComponent(subCategory)}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (location) queryParams.push(`location=${encodeURIComponent(location)}`);

    const queryStr = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
    window.location.href = 'provider-listing.html' + queryStr;
  });
}

// Load reviews for testimonials
async function loadTestimonials() {
  const container = document.getElementById('homepage-reviews');
  if (!container) return;

  try {
    // In mock mode it reads from mock DB, in server mode it makes requests
    let reviews = [];
    if (API.isMockMode) {
      reviews = JSON.parse(localStorage.getItem('BharatServe_reviews') || '[]').slice(0, 3);
    } else {
      // Fetch reviews for popular providers or all reviews
      reviews = await API.request('/api/reviews/provider/usr_prov1'); // PLumber Ramesh
      reviews = reviews.slice(0, 3);
    }

    if (reviews.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">No reviews submitted yet. Book a service and leave the first feedback!</div>`;
      return;
    }

    container.innerHTML = reviews.map(r => {
      const customerName = (r.customer && r.customer.name) ? r.customer.name : 'Verified Customer';
      const initials = customerName.split(' ').map(n=>n[0]).join('').toUpperCase();
      const formattedDate = new Date(r.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let imageHtml = '';
      if (r.workPicture) {
        imageHtml = `
          <div style="margin-top:10px; padding-left:44px;">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px; font-weight:700;"><i class="fas fa-camera"></i> VERIFIED SERVICE WORK PHOTO:</div>
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
                  ${customerName}
                  <span style="color: var(--success-green); font-size: 10px; font-weight: 700; background-color: rgba(16,185,129,0.06); padding: 1px 5px; border-radius: 4px; display: inline-flex; align-items: center; gap: 2px;"><i class="fas fa-shield-check"></i> Verified Review</span>
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

  } catch (error) {
    console.error('Error loading homepage reviews:', error);
    container.innerHTML = `<div style="text-align:center; color: var(--error-red);">Could not load reviews feed.</div>`;
  }
}
