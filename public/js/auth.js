/* ==========================================================================
   BharatServe CLIENT-SIDE AUTHENTICATION CONTROLLER
   Manages login sessions, header transitions, and page access controls
   ========================================================================== */

const Auth = {
  // Get current session user
  async getCurrentUser() {
    const token = API.getToken();
    if (!token) return null;

    try {
      return await API.request('/api/auth/me');
    } catch (e) {
      console.warn('Session expired or invalid token');
      this.logout();
      return null;
    }
  },

  // Login handler
  async login(email, password) {
    try {
      const data = await API.request('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      API.setToken(data.token);
      return data.user;
    } catch (error) {
      throw error;
    }
  },

  // Register handler
  async register(name, email, password, phone, role, providerDetails = null) {
    try {
      const body = { name, email, password, phone, role };
      if (role === 'provider' && providerDetails) {
        body.providerDetails = providerDetails;
      }
      const data = await API.request('/api/auth/register', {
        method: 'POST',
        body
      });
      API.setToken(data.token);
      return data.user;
    } catch (error) {
      throw error;
    }
  },

  // Logout handler
  logout() {
    API.setToken(null);
    window.location.href = 'login.html';
  },

  // Synchronously update navigation header options
  async updateHeader() {
    // Wait momentarily for API initialization if offline detection is fast
    if (!API.initialized) {
      await API.init();
    }

    // Inject Google Fonts link for unique premium typography if not present
    if (!document.getElementById('kural-fonts')) {
      const link = document.createElement('link');
      link.id = 'kural-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&family=Kavivanar&display=swap';
      document.head.appendChild(link);
    }

    const navAuth = document.getElementById('nav-auth');
    if (!navAuth) return;

    const user = await this.getCurrentUser();
    
    if (user) {
      const page = window.location.pathname.split('/').pop();
      const isHomepage = page === '' || page === 'index.html' || window.location.pathname.endsWith('/');

      if (isHomepage) {
        const headerEl = document.querySelector('header');
        if (headerEl && !document.getElementById('thirukkural-bar')) {
          const kuralBar = document.createElement('div');
          kuralBar.id = 'thirukkural-bar';
          
          const kurals = [
            {
              no: 1,
              couplet: "அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.",
              trans: "A, as its first of letters, every speech maintains; The 'Primal Deity' is first through all the world's domains.",
              meaning: "எழுத்துக்கள் எல்லாம் அகரத்தை முதலாகக் கொண்டிருக்கின்றன; அதுபோல உலகம் ஆதிபகவனை முதலாகக் கொண்டிருக்கிறது."
            },
            {
              no: 391,
              couplet: "கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக.",
              trans: "So learn that you may flawless learn, and having learnt, obey; And let your conduct with your learning suit in every way.",
              meaning: "கற்க வேண்டியவைகளைக் குற்றம் இல்லாமல் கற்க வேண்டும்; கற்ற பிறகு, கற்ற கல்வியின் வழியில் நெறி தவறாமல் நடக்க வேண்டும்."
            },
            {
              no: 31,
              couplet: "சிறப்பீனும் செல்வமும் ஈனும் அறத்தினூங்கு ஆக்கம் எவனோ உயிர்க்கு.",
              trans: "It yields distinction, yields prosperity; what gain Can life achieve like that from virtue's path to not refrain?",
              meaning: "அறம் சிறப்பையும் தரும், செல்வத்தையும் தரும்; அத்தகைய அறத்தை விட மனிதனுக்கு நன்மை செய்யக்கூடியது வேறு என்ன இருக்கிறது?"
            },
            {
              no: 291,
              couplet: "வாய்மை எனப்படுவது யாதெனின் யாதொன்றும் தீமை இலாத சொலல்.",
              trans: "If ask what 'truth' is, wordy search is vain; It is speaking words that cause no harm, nor inflict pain.",
              meaning: "வாய்மை என்று கூறப்படுவது எதுவென்றால், அது மற்றவர்களுக்கு சிறிதும் தீங்கு தராத சொற்களைச் சொல்லுதல் ஆகும்."
            },
            {
              no: 971,
              couplet: "பெருமைக்கும் ஏனைச் சிறுமைக்கும் தத்தம் கருமமே கட்டளைக் கல்.",
              trans: "Their deeds are touchstones, which to all display; Each man's true greatness, or his low decay.",
              meaning: "ஒருவனுடைய பெருமைக்கும் சிறுமைக்கும் அவனவன் செய்யும் செயல்களே உரைகல் ஆகும்."
            }
          ];

          const day = new Date().getDate();
          const kural = kurals[day % kurals.length];

          kuralBar.style.backgroundColor = 'var(--primary-navy)';
          kuralBar.style.color = '#ffffff';
          kuralBar.style.padding = '10px 24px';
          kuralBar.style.fontSize = '13px';
          kuralBar.style.fontFamily = "var(--font-body), 'Inter', sans-serif";
          kuralBar.style.textAlign = 'center';
          kuralBar.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
          kuralBar.style.display = 'flex';
          kuralBar.style.justifyContent = 'center';
          kuralBar.style.alignItems = 'center';
          kuralBar.style.flexWrap = 'wrap';
          kuralBar.style.gap = '10px';
          kuralBar.style.lineHeight = '1.5';
          kuralBar.style.zIndex = '1001';

          kuralBar.innerHTML = `
            <strong style="color:#0EA5E9; font-weight:700;">Kural #${kural.no}:</strong>
            <span style="color:#FBBF24; font-weight:700;">"${kural.couplet}"</span>
            <span style="color:#cbd5e1; font-weight:500; font-style:italic;">— English: ${kural.trans}</span>
            <span style="color:#38BDF8; font-weight:600;">— பொருள்: ${kural.meaning}</span>
          `;
          headerEl.insertBefore(kuralBar, headerEl.firstChild);
        }
      } else {
        const kuralBar = document.getElementById('thirukkural-bar');
        if (kuralBar) kuralBar.remove();
      }

      let dashboardPage = 'dashboard-customer.html';
      if (user.role === 'provider') dashboardPage = 'dashboard-provider.html';
      if (user.role === 'admin') dashboardPage = 'dashboard-admin.html';

      const firstName = user.name.split(' ')[0];
      let avatarHtml = `<i class="fas fa-user-circle"></i>`;
      if (user.avatar) {
        avatarHtml = `<img src="${user.avatar}" alt="${user.name}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; border:1px solid #ffffff;">`;
      }

      navAuth.innerHTML = `
        <a href="${dashboardPage}" class="btn btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px;">
          ${avatarHtml} <span>${firstName} (${user.role})</span>
        </a>
        <button id="btn-logout" class="btn btn-primary btn-sm">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      `;

      document.getElementById('btn-logout').addEventListener('click', () => {
        this.logout();
      });
    } else {
      const kuralBar = document.getElementById('thirukkural-bar');
      if (kuralBar) kuralBar.remove();

      navAuth.innerHTML = `
        <a href="login.html" class="nav-item">Login</a>
        <a href="register.html?role=provider" class="btn btn-secondary btn-sm">Become a Professional</a>
        <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
      `;
    }
  },

  // Protect dashboard routes
  async protectPage(requiredRole = null) {
    // Await API setup
    setTimeout(async () => {
      const user = await this.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        alert(`Access Denied: ${requiredRole} credentials required.`);
        window.location.href = 'index.html';
      }
    }, 100);
  }
};

// Auto-run header update on page load
document.addEventListener('DOMContentLoaded', () => {
  Auth.updateHeader();
});
