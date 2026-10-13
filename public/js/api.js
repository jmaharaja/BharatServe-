/* ==========================================================================
   BharatServe UNIFIED API CLIENT & MOCK DATABASE ENGINE
   Auto-detects active Node.js server or falls back to LocalStorage DB
   ========================================================================== */

const API_BASE = window.location.origin;

const API = {
  isMockMode: false,
  initialized: false,
  initPromise: null,
  
  // Initialize and check status
  init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve) => {
      // If mock mode is explicitly set to true, run in mock mode
      if (localStorage.getItem('BharatServe_mock_mode') === 'true') {
        this.isMockMode = true;
        this.initMockDatabase();
        this.showOfflineBanner();
        this.initialized = true;
        resolve();
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/health`);
        if (response.ok) {
          this.isMockMode = false;
          console.log('BharatServe API Client: Connected to active Node.js backend.');
        } else {
          throw new Error('Server returned error status');
        }
      } catch (e) {
        this.isMockMode = true;
        localStorage.setItem('BharatServe_mock_mode', 'true');
        this.initMockDatabase();
        this.showOfflineBanner();
      }
      this.initialized = true;
      resolve();
    });

    return this.initPromise;
  },

  showOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      if (window.location.protocol === 'file:') {
        banner.style.display = 'block';
        banner.style.backgroundColor = '#ef4444';
        banner.style.color = '#ffffff';
        banner.innerHTML = '<i class="fas fa-triangle-exclamation"></i> <strong>Browser Restriction:</strong> You opened this page as a local file (<code>file://</code>). Browser security blocks local storage sharing between local files, which prevents logging in. Please open <strong><a href="http://localhost:5000/login.html" target="_blank" style="color:#ffffff; text-decoration:underline; font-weight:700;">http://localhost:5000/login.html</a></strong> to log in.';
      } else {
        banner.style.display = 'none'; // Hide the banner completely on live server
      }
    }
  },

  // Token helper
  getToken() {
    return localStorage.getItem('BharatServe_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('BharatServe_token', token);
    } else {
      localStorage.removeItem('BharatServe_token');
    }
  },

  // Base HTTP Request handler
  async request(endpoint, options = {}) {
    if (!this.initialized) {
      await this.init();
    }

    if (this.isMockMode || endpoint.startsWith('/api/notifications')) {
      return this.mockRequest(endpoint, options);
    }

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 500 || response.status === 503) {
          console.warn('API returned server error. Falling back to Mock Database...');
          this.isMockMode = true;
          localStorage.setItem('BharatServe_mock_mode', 'true');
          this.initMockDatabase();
          this.showOfflineBanner();
          return this.mockRequest(endpoint, options);
        }
        throw new Error(data.error || 'Network error occurred');
      }
      return data;
    } catch (error) {
      console.warn('Network request failed. Falling back to Mock Database...', error);
      this.isMockMode = true;
      localStorage.setItem('BharatServe_mock_mode', 'true');
      this.initMockDatabase();
      this.showOfflineBanner();
      return this.mockRequest(endpoint, options);
    }
  },

  // ==========================================================================
  // HIGH FIDELITY LOCALSTORAGE SIMULATION LAYER
  // ==========================================================================
  initMockDatabase() {
    const DB_VERSION = '2';
    if (localStorage.getItem('BharatServe_db_version') !== DB_VERSION) {
      localStorage.removeItem('BharatServe_users');
      localStorage.removeItem('BharatServe_bookings');
      localStorage.removeItem('BharatServe_reviews');
      localStorage.setItem('BharatServe_db_version', DB_VERSION);
    }

    let checkUsers = null;
    try {
      checkUsers = JSON.parse(localStorage.getItem('BharatServe_users'));
    } catch(e){}
    if (!checkUsers || !Array.isArray(checkUsers) || checkUsers.length === 0) {
      const defaultUsers = [
        // Admin
        {
          _id: 'usr_admin',
          name: 'BharatServe Administrator',
          email: 'admin@BharatServe.com',
          password: 'BharatServe@2026!', // plaintext for simulation simplicty
          phone: '9876543210',
          role: 'admin',
          avatar: 'A',
          addresses: [],
          favorites: [],
          createdAt: new Date().toISOString()
        },
        // Customers
        {
          _id: 'usr_cust1',
          name: 'Amit Sharma',
          email: 'amit@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9811111111',
          role: 'customer',
          avatar: 'AS',
          addresses: ['Flat 402, Block A, Green Glen Layout, Bangalore, Karnataka - 560103'],
          favorites: [],
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_cust2',
          name: 'Priya Patel',
          email: 'priya@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9822222222',
          role: 'customer',
          avatar: 'PP',
          addresses: ['7B, Skyline Apartments, Worli, Mumbai, Maharashtra - 400018'],
          favorites: [],
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_cust3',
          name: 'Rajesh Kumar',
          email: 'rajesh@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9833333333',
          role: 'customer',
          avatar: 'RK',
          addresses: ['House 42, Gali 3, Lajpat Nagar, Delhi - 110024'],
          favorites: [],
          createdAt: new Date().toISOString()
        },
        // Service Providers
        {
          _id: 'usr_prov1',
          name: 'Ramesh Kumar',
          email: 'ramesh.plumber@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9011111111',
          role: 'provider',
          avatar: 'RK',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Home Services',
            subCategory: 'Plumbing',
            experience: 8,
            skills: ['Leak Detection', 'Pipe Repair', 'Bathroom Fitting', 'Water Heater Install'],
            languages: ['Hindi', 'English'],
            startingPrice: 349,
            rating: 4.8,
            completedJobs: 48,
            responseTime: 15,
            repeatCustomersCount: 15,
            totalCustomersCount: 30,
            profileCompleteness: 100,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            bio: 'Experienced plumber with 8+ years of expertise. Certified and quick resolution guaranteed.',
            address: 'Andheri East, Mumbai'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov2',
          name: 'Suresh Raina',
          email: 'suresh.electrician@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9022222222',
          role: 'provider',
          avatar: 'SR',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Home Services',
            subCategory: 'Electrician',
            experience: 5,
            skills: ['Wiring', 'Switchboard Repair', 'Fan/Light Install', 'Short Circuit Fix'],
            languages: ['Hindi', 'English'],
            startingPrice: 299,
            rating: 4.6,
            completedJobs: 32,
            responseTime: 25,
            repeatCustomersCount: 6,
            totalCustomersCount: 26,
            profileCompleteness: 95,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: false,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sunday'],
            bio: 'Professional electrician. Specialized in home safety testing and wiring inspections.',
            address: 'Koramangala, Bangalore'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov3',
          name: 'Vijay Verma',
          email: 'vijay.ac@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9033333333',
          role: 'provider',
          avatar: 'VV',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Home Services',
            subCategory: 'AC Repair',
            experience: 6,
            skills: ['AC Gas Charging', 'Filter Cleaning', 'Compressor Repair', 'AC Installation'],
            languages: ['Hindi', 'English', 'Punjabi'],
            startingPrice: 499,
            rating: 4.9,
            completedJobs: 65,
            responseTime: 10,
            repeatCustomersCount: 22,
            totalCustomersCount: 40,
            profileCompleteness: 100,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            bio: 'AC specialist trained by major brands. Prompt service with 30-day warranty.',
            address: 'Lajpat Nagar, Delhi'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov4',
          name: 'Sunita Das',
          email: 'sunita.cleaner@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9044444444',
          role: 'provider',
          avatar: 'SD',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Home Services',
            subCategory: 'Home Cleaning',
            experience: 4,
            skills: ['Deep Cleaning', 'Kitchen Cleaning', 'Bathroom Deep Cleaning', 'Sofa Sanitization'],
            languages: ['Hindi', 'Bengali'],
            startingPrice: 999,
            rating: 4.5,
            completedJobs: 28,
            responseTime: 40,
            repeatCustomersCount: 4,
            totalCustomersCount: 24,
            profileCompleteness: 90,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: false,
            isFastResponse: false,
            availability: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            bio: 'Committed to sparkling clean homes. Eco-friendly cleaning materials used.',
            address: 'Whitefield, Bangalore'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov5',
          name: 'Rajesh Carpenter',
          email: 'rajesh.wood@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9055555555',
          role: 'provider',
          avatar: 'RC',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Home Services',
            subCategory: 'Carpenter',
            experience: 12,
            skills: ['Furniture Repair', 'Modular Kitchens', 'Door/Window Repair', 'Custom Cabinets'],
            languages: ['Hindi'],
            startingPrice: 399,
            rating: 4.7,
            completedJobs: 82,
            responseTime: 35,
            repeatCustomersCount: 20,
            totalCustomersCount: 60,
            profileCompleteness: 100,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: false,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            bio: 'Master craftsman with over a decade of carpentry experience. Quality wood work.',
            address: 'Bandra West, Mumbai'
          },
          createdAt: new Date().toISOString()
        },
        // Office Services
        {
          _id: 'usr_prov6',
          name: 'Amit Patel',
          email: 'amit.officeclean@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9066666666',
          role: 'provider',
          avatar: 'AP',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Office Services',
            subCategory: 'Office Cleaning',
            experience: 7,
            skills: ['Office Deep Cleaning', 'Carpet Shampooing', 'Glass Panel Cleaning', 'Disinfection Services'],
            languages: ['Hindi', 'English', 'Gujarati'],
            startingPrice: 1999,
            rating: 4.7,
            completedJobs: 45,
            responseTime: 20,
            repeatCustomersCount: 15,
            totalCustomersCount: 25,
            profileCompleteness: 95,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: true,
            availability: ['Saturday', 'Sunday'],
            bio: 'Professional corporate cleaning agency. We work around your office hours.',
            address: 'Worli, Mumbai'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov7',
          name: 'Vikram Singh',
          email: 'vikram.network@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9077777777',
          role: 'provider',
          avatar: 'VS',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Office Services',
            subCategory: 'Network Setup',
            experience: 6,
            skills: ['Router Configuration', 'LAN Cabling', 'Wi-Fi Extenders', 'Firewall Install', 'Server Racks'],
            languages: ['Hindi', 'English'],
            startingPrice: 1499,
            rating: 4.8,
            completedJobs: 38,
            responseTime: 15,
            repeatCustomersCount: 10,
            totalCustomersCount: 28,
            profileCompleteness: 100,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            bio: 'Network engineer specialized in small to medium scale office network design and support.',
            address: 'Sector 62, Noida, Delhi NCR'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov8',
          name: 'Harpreet Singh',
          email: 'harpreet.cctv@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9088888888',
          role: 'provider',
          avatar: 'HS',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Office Services',
            subCategory: 'CCTV Installation',
            experience: 9,
            skills: ['IP Cameras', 'DVR/NVR Configuration', 'Mobile App Viewing Setup', 'CCTV Maintenance'],
            languages: ['Hindi', 'Punjabi', 'English'],
            startingPrice: 899,
            rating: 4.6,
            completedJobs: 54,
            responseTime: 30,
            repeatCustomersCount: 8,
            totalCustomersCount: 44,
            profileCompleteness: 90,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: false,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            bio: 'Securing offices for 9 years. High definition camera installations and biometric setup.',
            address: 'Rajouri Garden, Delhi'
          },
          createdAt: new Date().toISOString()
        },
        // Shop Services
        {
          _id: 'usr_prov9',
          name: 'Arjun Mehta',
          email: 'arjun.sign@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9099999999',
          role: 'provider',
          avatar: 'AM',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Shop Services',
            subCategory: 'Signboard Installation',
            experience: 5,
            skills: ['LED Signboards', 'Acrylic Letter Signs', 'Flex Banner Boards', 'Backlit Signs'],
            languages: ['Hindi', 'English', 'Marathi'],
            startingPrice: 2499,
            rating: 4.4,
            completedJobs: 22,
            responseTime: 45,
            repeatCustomersCount: 3,
            totalCustomersCount: 19,
            profileCompleteness: 85,
            isVerified: true,
            isBackgroundVerified: false,
            isTopRated: false,
            isFastResponse: false,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            bio: 'Eye-catching signboards for retail shops. Full structure design and electrical connection.',
            address: 'Thane, Mumbai'
          },
          createdAt: new Date().toISOString()
        },
        {
          _id: 'usr_prov10',
          name: 'Anil Kumar',
          email: 'anil.security@gmail.com',
          password: 'BharatServe@2026!',
          phone: '9100000000',
          role: 'provider',
          avatar: 'AK',
          addresses: [],
          favorites: [],
          providerProfile: {
            category: 'Shop Services',
            subCategory: 'Security Systems',
            experience: 8,
            skills: ['Shutter Sensors', 'Burglar Alarms', 'Fire Alarms', 'Access Control Systems'],
            languages: ['Hindi', 'English', 'Kannada'],
            startingPrice: 1799,
            rating: 4.9,
            completedJobs: 40,
            responseTime: 12,
            repeatCustomersCount: 12,
            totalCustomersCount: 28,
            profileCompleteness: 100,
            isVerified: true,
            isBackgroundVerified: true,
            isTopRated: true,
            isFastResponse: true,
            availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            bio: 'Retail shop security specialist. Shutter sensor installations and remote alarm setup.',
            address: 'Jayanagar, Bangalore'
          },
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('BharatServe_users', JSON.stringify(defaultUsers));
    }

    let checkBookings = null;
    try {
      checkBookings = JSON.parse(localStorage.getItem('BharatServe_bookings'));
    } catch(e){}
    if (!checkBookings || !Array.isArray(checkBookings)) {
      localStorage.setItem('BharatServe_bookings', JSON.stringify([]));
    }

    let checkReviews = null;
    try {
      checkReviews = JSON.parse(localStorage.getItem('BharatServe_reviews'));
    } catch(e){}
    if (!checkReviews || !Array.isArray(checkReviews) || checkReviews.length === 0) {
      const defaultReviews = [
        {
          _id: 'rev_1',
          booking: 'bk_mock_1',
          customer: { name: 'A.S.' }, // Seeded with user names
          provider: 'usr_prov1',
          rating: 5,
          comment: 'Excellent service. Arrived on time and fixed the leak professionally.',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'rev_2',
          booking: 'bk_mock_2',
          customer: { name: 'P.P.' },
          provider: 'usr_prov1',
          rating: 4,
          comment: 'Very helpful. Resolved water tank issue fast.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          _id: 'rev_3',
          booking: 'bk_mock_3',
          customer: { name: 'R.K.' },
          provider: 'usr_prov3',
          rating: 5,
          comment: 'Outstanding repair. Filled gas and AC is working beautifully now.',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      localStorage.setItem('BharatServe_reviews', JSON.stringify(defaultReviews));
    }
  },

  // Calculate score locally using the recommendation formula
  calculateLocalScore(provider) {
    const profile = provider.providerProfile || {};
    const rating = profile.rating || 5.0;
    const ratingScore = rating * 20;
    const completedJobs = profile.completedJobs || 0;
    const jobsScore = Math.min(completedJobs * 2, 100);
    const responseTime = profile.responseTime || 30;
    const responseScore = Math.max(0, 100 - responseTime);
    const repeatCount = profile.repeatCustomersCount || 0;
    const totalCount = profile.totalCustomersCount || 0;
    const repeatRatio = totalCount > 0 ? (repeatCount / totalCount) * 100 : 0;
    const repeatScore = Math.min(repeatRatio, 100);
    const completenessScore = profile.profileCompleteness || 80;

    const score = (0.40 * ratingScore) + 
                  (0.30 * jobsScore) + 
                  (0.15 * responseScore) + 
                  (0.10 * repeatScore) + 
                  (0.05 * completenessScore);

    return {
      totalScore: parseFloat(score.toFixed(1)),
      breakdown: {
        ratingScore: parseFloat((0.40 * ratingScore).toFixed(1)),
        jobsScore: parseFloat((0.30 * jobsScore).toFixed(1)),
        responseScore: parseFloat((0.15 * responseScore).toFixed(1)),
        repeatScore: parseFloat((0.10 * repeatScore).toFixed(1)),
        completenessScore: parseFloat((0.05 * completenessScore).toFixed(1))
      }
    };
  },

  // Simulated requests handler
  mockRequest(endpoint, options = {}) {
    options.method = (options.method || 'GET').toUpperCase();
    return new Promise((resolve, reject) => {
      // Simulate network delay
      setTimeout(() => {
        try {
          const users = JSON.parse(localStorage.getItem('BharatServe_users') || '[]');
          const bookings = JSON.parse(localStorage.getItem('BharatServe_bookings') || '[]');
          const reviews = JSON.parse(localStorage.getItem('BharatServe_reviews') || '[]');
          
          // Get current authenticated user
          let currentUser = null;
          const token = this.getToken();
          if (token) {
            currentUser = users.find(u => u._id === token);
          }

          const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};

          // --- ROUTE: auth/register ---
          if (endpoint === '/api/auth/register' && options.method === 'POST') {
            const { name, email, password, phone, role, providerDetails } = parsedBody;
            const cleanEmail = (email || '').trim().toLowerCase();
            if (users.find(u => u.email.toLowerCase().trim() === cleanEmail)) {
              return reject({ error: 'User already exists with this email' });
            }
            
            const newUser = {
              _id: 'usr_' + Date.now(),
              name,
              email: cleanEmail,
              password: (password || '').trim(), // Simplification for mock
              phone,
              role: role || 'customer',
              avatar: name.split(' ').map(n => n[0]).join('').toUpperCase(),
              addresses: [],
              favorites: [],
              createdAt: new Date().toISOString()
            };

            if (role === 'provider') {
              const details = providerDetails || {};
              newUser.providerProfile = {
                category: details.category || 'Home Services',
                subCategory: details.subCategory || 'Plumbing',
                experience: Number(details.experience) || 0,
                skills: details.skills || [],
                languages: details.languages || ['Hindi', 'English'],
                startingPrice: Number(details.startingPrice) || 299,
                rating: 5.0,
                completedJobs: 0,
                responseTime: 30,
                repeatCustomersCount: 0,
                totalCustomersCount: 0,
                profileCompleteness: 85,
                isVerified: false,
                isBackgroundVerified: false,
                isTopRated: false,
                isFastResponse: true,
                availability: details.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                bio: details.bio || 'Professional service provider',
                address: details.address || ''
              };
            }

            users.push(newUser);
            localStorage.setItem('BharatServe_users', JSON.stringify(users));
            resolve({ token: newUser._id, user: { id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone, role: newUser.role } });
            return;
          }

          // --- ROUTE: auth/login ---
          if (endpoint === '/api/auth/login' && options.method === 'POST') {
            const { email, password } = parsedBody;
            const cleanEmail = (email || '').trim().toLowerCase();
            const cleanPassword = (password || '').trim();
            const matchedUser = users.find(u => 
              u.email.toLowerCase().trim() === cleanEmail && 
              u.password.trim() === cleanPassword
            );
            if (!matchedUser) {
              return reject({ error: 'Invalid credentials. User not found or password incorrect.' });
            }
            resolve({ token: matchedUser._id, user: { id: matchedUser._id, name: matchedUser.name, email: matchedUser.email, phone: matchedUser.phone, role: matchedUser.role } });
            return;
          }

          // Secure route checks
          if (endpoint.startsWith('/api/auth/me') || endpoint.startsWith('/api/auth/profile') || endpoint.startsWith('/api/bookings') || endpoint.startsWith('/api/reviews') || endpoint.startsWith('/api/admin')) {
            if (!currentUser) {
              return reject({ error: 'Access denied. Please login first.' });
            }
          }

          // --- ROUTE: auth/me ---
          if (endpoint === '/api/auth/me' && options.method === 'GET') {
            resolve(currentUser);
            return;
          }

          // --- ROUTE: auth/profile ---
          if (endpoint === '/api/auth/profile' && options.method === 'PUT') {
            const { name, phone, addresses, avatar, providerDetails } = parsedBody;
            const uIdx = users.findIndex(u => u._id === currentUser._id);
            
            if (name) users[uIdx].name = name;
            if (phone) users[uIdx].phone = phone;
            if (avatar !== undefined) users[uIdx].avatar = avatar;
            if (addresses) users[uIdx].addresses = addresses;

            if (users[uIdx].role === 'provider' && providerDetails) {
              const details = users[uIdx].providerProfile || {};
              if (providerDetails.category) details.category = providerDetails.category;
              if (providerDetails.subCategory) details.subCategory = providerDetails.subCategory;
              if (providerDetails.experience !== undefined) details.experience = Number(providerDetails.experience);
              if (providerDetails.startingPrice !== undefined) details.startingPrice = Number(providerDetails.startingPrice);
              if (providerDetails.skills) details.skills = providerDetails.skills;
              if (providerDetails.languages) details.languages = providerDetails.languages;
              if (providerDetails.bio) details.bio = providerDetails.bio;
              if (providerDetails.address) details.address = providerDetails.address;
              if (providerDetails.availability) details.availability = providerDetails.availability;
              
              // Recalculate completeness
              let completeCount = 0;
              const totalFields = 8;
              if (details.category) completeCount++;
              if (details.subCategory) completeCount++;
              if (details.experience > 0) completeCount++;
              if (details.startingPrice > 0) completeCount++;
              if (details.skills && details.skills.length > 0) completeCount++;
              if (details.languages && details.languages.length > 0) completeCount++;
              if (details.bio) completeCount++;
              if (details.address) completeCount++;
              details.profileCompleteness = Math.round((completeCount / totalFields) * 100);

              users[uIdx].providerProfile = details;
            }

            localStorage.setItem('BharatServe_users', JSON.stringify(users));
            resolve(users[uIdx]);
            return;
          }

          // --- ROUTE: providers (List & Recommendation sort) ---
          if (endpoint.startsWith('/api/providers') && options.method === 'GET') {
            const url = new URL(endpoint, 'http://dummy.com');
            const category = url.searchParams.get('category');
            const subCategory = url.searchParams.get('subCategory');
            const location = url.searchParams.get('location');
            const search = url.searchParams.get('search');

            // Check if looking for details of single provider: /api/providers/:id
            const parts = endpoint.split('/');
            if (parts.length === 4 && parts[3] && !parts[3].includes('?')) {
              const provId = parts[3];
              const provider = users.find(u => u._id === provId && u.role === 'provider');
              if (!provider) {
                return reject({ error: 'Provider not found.' });
              }

              const provReviews = reviews.filter(r => r.provider === provId);
              const scoreData = this.calculateLocalScore(provider);

              resolve({
                ...provider,
                recommendationScore: scoreData.totalScore,
                recommendationBreakdown: scoreData.breakdown,
                reviews: provReviews
              });
              return;
            }

            // Filter provider users
            let providerList = users.filter(u => u.role === 'provider');

            if (category) {
              providerList = providerList.filter(p => p.providerProfile.category === category);
            }
            if (subCategory) {
              providerList = providerList.filter(p => p.providerProfile.subCategory === subCategory);
            }
            if (location) {
              providerList = providerList.filter(p => p.providerProfile.address && p.providerProfile.address.toLowerCase().includes(location.toLowerCase()));
            }
            if (search) {
              const term = search.toLowerCase();
              providerList = providerList.filter(p => 
                p.name.toLowerCase().includes(term) || 
                p.providerProfile.subCategory.toLowerCase().includes(term) ||
                p.providerProfile.skills.some(s => s.toLowerCase().includes(term))
              );
            }

            // Rank providers using recommendation score formula
            const scoredList = providerList.map(p => {
              const scoreData = this.calculateLocalScore(p);
              return {
                ...p,
                recommendationScore: scoreData.totalScore,
                recommendationBreakdown: scoreData.breakdown
              };
            });

             // Sort descending
            scoredList.sort((a, b) => b.recommendationScore - a.recommendationScore);

            // Apply deterministic daily shuffle to rotate professionals daily
            const today = new Date().toDateString();
            let seed = 0;
            for (let i = 0; i < today.length; i++) {
              seed = (seed << 5) - seed + today.charCodeAt(i);
              seed |= 0;
            }
            const random = () => {
              let x = Math.sin(seed++) * 10000;
              return x - Math.floor(x);
            };
            for (let i = scoredList.length - 1; i > 0; i--) {
              const j = Math.floor(random() * (i + 1));
              [scoredList[i], scoredList[j]] = [scoredList[j], scoredList[i]];
            }

            resolve(scoredList);
            return;
          }

          // --- ROUTE: toggle favorite ---
          if (endpoint.endsWith('/favorite') && options.method === 'POST') {
            const parts = endpoint.split('/');
            const provId = parts[3];
            
            const uIdx = users.findIndex(u => u._id === currentUser._id);
            if (!users[uIdx].favorites) users[uIdx].favorites = [];
            
            const fIdx = users[uIdx].favorites.indexOf(provId);
            let isFavorite = false;
            
            if (fIdx >= 0) {
              users[uIdx].favorites.splice(fIdx, 1);
            } else {
              users[uIdx].favorites.push(provId);
              isFavorite = true;
            }
            
            localStorage.setItem('BharatServe_users', JSON.stringify(users));
            resolve({ isFavorite, favorites: users[uIdx].favorites });
            return;
          }

          if (endpoint === '/api/bookings' && options.method === 'POST') {
            const { providerId, serviceCategory, serviceSubCategory, bookingDate, bookingTimeSlot, address, paymentMethod, totalAmount, message } = parsedBody;
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            
            const newBooking = {
              _id: 'bk_' + Date.now(),
              customer: currentUser._id,
              provider: providerId,
              serviceCategory,
              serviceSubCategory,
              bookingDate,
              bookingTimeSlot,
              status: 'pending',
              address,
              message: message || '',
              otp,
              paymentMethod: paymentMethod || 'cash',
              paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
              totalAmount,
              createdAt: new Date().toISOString()
            };

            bookings.push(newBooking);
            localStorage.setItem('BharatServe_bookings', JSON.stringify(bookings));

            // Create notification for the provider
            try {
              const notifications = JSON.parse(localStorage.getItem('BharatServe_notifications') || '[]');
              notifications.push({
                _id: 'notif_' + Date.now(),
                provider: providerId,
                customerName: currentUser.name || 'A customer',
                subCategory: serviceSubCategory,
                bookingId: newBooking._id,
                isRead: false,
                createdAt: new Date().toISOString()
              });
              localStorage.setItem('BharatServe_notifications', JSON.stringify(notifications));
            } catch (e) {
              console.error('Failed to save notification', e);
            }

            resolve(newBooking);
            return;
          }

          if (endpoint === '/api/bookings' && options.method === 'GET') {
            let userBookings = [];
            if (currentUser.role === 'customer') {
              userBookings = bookings.filter(b => b.customer === currentUser._id)
                .map(b => ({
                  ...b,
                  provider: users.find(u => u._id === b.provider) || { name: 'Unknown Professional' }
                }));
            } else if (currentUser.role === 'provider') {
              userBookings = bookings.filter(b => b.provider === currentUser._id)
                .map(b => ({
                  ...b,
                  customer: users.find(u => u._id === b.customer) || { name: 'Customer' }
                }));
            } else if (currentUser.role === 'admin') {
              userBookings = bookings.map(b => ({
                ...b,
                customer: users.find(u => u._id === b.customer) || { name: 'Customer' },
                provider: users.find(u => u._id === b.provider) || { name: 'Professional' }
              }));
            }
            
            userBookings.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            resolve(userBookings);
            return;
          }

          // --- ROUTE: notifications (Get provider notifications) ---
          if (endpoint === '/api/notifications' && options.method === 'GET') {
            const notifications = JSON.parse(localStorage.getItem('BharatServe_notifications') || '[]');
            const providerNotifications = notifications.filter(n => n.provider === currentUser._id);
            resolve(providerNotifications);
            return;
          }

          // --- ROUTE: mark notifications read ---
          if (endpoint === '/api/notifications/read' && options.method === 'POST') {
            let notifications = JSON.parse(localStorage.getItem('BharatServe_notifications') || '[]');
            notifications = notifications.map(n => {
              if (n.provider === currentUser._id) {
                return { ...n, isRead: true };
              }
              return n;
            });
            localStorage.setItem('BharatServe_notifications', JSON.stringify(notifications));
            resolve({ success: true });
            return;
          }

          // --- ROUTE: bookings status update ---
          if (endpoint.includes('/status') && options.method === 'PUT') {
            const parts = endpoint.split('/');
            const bId = parts[3];
            const { status, otp } = parsedBody;

            const bIdx = bookings.findIndex(b => b._id === bId);
            if (bIdx === -1) return reject({ error: 'Booking not found.' });

            // OTP verification check when starting the job
            if (status === 'started') {
              if (bookings[bIdx].status !== 'accepted') {
                return reject({ error: 'Job must be accepted before it can be started.' });
              }
              if (!otp || otp !== bookings[bIdx].otp) {
                return reject({ error: 'Invalid start OTP. Please ask the customer for the correct code.' });
              }
            }

            if (status === 'completed' && bookings[bIdx].status !== 'started') {
              return reject({ error: 'Job must be started by entering the OTP before it can be marked completed.' });
            }

            const prevStatus = bookings[bIdx].status;
            bookings[bIdx].status = status;
            
            if (status === 'completed' && bookings[bIdx].paymentMethod === 'cash') {
              bookings[bIdx].paymentStatus = 'paid';
            }

            localStorage.setItem('BharatServe_bookings', JSON.stringify(bookings));

            // Stat updates on provider if marked complete
            if (status === 'completed' && prevStatus !== 'completed') {
              const pIdx = users.findIndex(u => u._id === bookings[bIdx].provider);
              if (pIdx !== -1 && users[pIdx].providerProfile) {
                users[pIdx].providerProfile.completedJobs += 1;

                // Check repeat stats
                const matches = bookings.filter(b => 
                  b.customer === bookings[bIdx].customer && 
                  b.provider === bookings[bIdx].provider && 
                  b.status === 'completed' && 
                  b._id !== bookings[bIdx]._id
                );

                if (matches.length === 0) {
                  users[pIdx].providerProfile.totalCustomersCount += 1;
                } else if (matches.length === 1) {
                  users[pIdx].providerProfile.repeatCustomersCount += 1;
                }

                // Top rated badge check
                if (users[pIdx].providerProfile.completedJobs >= 10 && users[pIdx].providerProfile.rating >= 4.7) {
                  users[pIdx].providerProfile.isTopRated = true;
                }

                localStorage.setItem('BharatServe_users', JSON.stringify(users));
              }
            }

            resolve(bookings[bIdx]);
            return;
          }

          // --- ROUTE: reviews (Add) ---
          if (endpoint === '/api/reviews' && options.method === 'POST') {
            const { bookingId, rating, comment, workPicture } = parsedBody;

            if (reviews.find(r => r.booking === bookingId)) {
              return reject({ error: 'Already reviewed this booking.' });
            }

            const booking = bookings.find(b => b._id === bookingId);
            if (!booking) return reject({ error: 'Booking not found.' });

            const newReview = {
              _id: 'rev_' + Date.now(),
              booking: bookingId,
              customer: { 
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar || ''
              },
              provider: booking.provider,
              rating: Number(rating),
              comment,
              workPicture: workPicture || '',
              createdAt: new Date().toISOString()
            };

            reviews.push(newReview);
            localStorage.setItem('BharatServe_reviews', JSON.stringify(reviews));

            // Aggregate rating
            const pReviews = reviews.filter(r => r.provider === booking.provider);
            const avgRating = pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviews.length;

            const pIdx = users.findIndex(u => u._id === booking.provider);
            if (pIdx !== -1) {
              users[pIdx].providerProfile.rating = parseFloat(avgRating.toFixed(2));
              
              if (users[pIdx].providerProfile.rating >= 4.7 && users[pIdx].providerProfile.completedJobs >= 10) {
                users[pIdx].providerProfile.isTopRated = true;
              } else {
                users[pIdx].providerProfile.isTopRated = false;
              }
              
              localStorage.setItem('BharatServe_users', JSON.stringify(users));
            }

            resolve(newReview);
            return;
          }

          // --- ROUTE: admin/stats ---
          if (endpoint === '/api/admin/stats' && options.method === 'GET') {
            const totalCustomers = users.filter(u => u.role === 'customer').length;
            const totalProviders = users.filter(u => u.role === 'provider').length;
            const verifiedProviders = users.filter(u => u.role === 'provider' && u.providerProfile.isVerified).length;
            
            const totalBookings = bookings.length;
            const completedBookings = bookings.filter(b => b.status === 'completed').length;
            const pendingBookings = bookings.filter(b => b.status === 'pending').length;
            const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

            const totalRevenue = bookings
              .filter(b => b.status === 'completed' || b.paymentStatus === 'paid')
              .reduce((sum, b) => sum + b.totalAmount, 0);

            const platformEarnings = parseFloat((totalRevenue * 0.15).toFixed(2));

            const categoryStats = {};
            bookings.forEach(b => {
              categoryStats[b.serviceCategory] = (categoryStats[b.serviceCategory] || 0) + 1;
            });

            resolve({
              metrics: {
                totalCustomers,
                totalProviders,
                verifiedProviders,
                totalBookings,
                completedBookings,
                pendingBookings,
                cancelledBookings,
                totalRevenue,
                platformEarnings
              },
              categoryStats
            });
            return;
          }

          // --- ROUTE: admin list customers/providers ---
          if (endpoint === '/api/admin/customers' && options.method === 'GET') {
            resolve(users.filter(u => u.role === 'customer'));
            return;
          }

          if (endpoint === '/api/admin/providers' && options.method === 'GET') {
            resolve(users.filter(u => u.role === 'provider'));
            return;
          }

          if (endpoint === '/api/admin/reviews' && options.method === 'GET') {
            const populatedReviews = reviews.map(r => {
              const cObj = users.find(u => u._id === (r.customer._id || r.customer));
              const pObj = users.find(u => u._id === r.provider);
              return {
                ...r,
                customer: cObj ? { name: cObj.name, email: cObj.email, avatar: cObj.avatar } : { name: 'Customer', email: '', avatar: '' },
                provider: pObj ? { name: pObj.name, email: pObj.email } : { name: 'Provider', email: '' }
              };
            });
            resolve(populatedReviews);
            return;
          }

          // --- ROUTE: admin verify providers ---
          if (endpoint.includes('/verify') && options.method === 'PUT') {
            const parts = endpoint.split('/');
            const provId = parts[4]; // /api/admin/providers/:id/verify
            const { isVerified, isBackgroundVerified } = parsedBody;

            const pIdx = users.findIndex(u => u._id === provId && u.role === 'provider');
            if (pIdx === -1) return reject({ error: 'Provider not found.' });

            if (isVerified !== undefined) users[pIdx].providerProfile.isVerified = isVerified;
            if (isBackgroundVerified !== undefined) users[pIdx].providerProfile.isBackgroundVerified = isBackgroundVerified;

            localStorage.setItem('BharatServe_users', JSON.stringify(users));
            resolve(users[pIdx]);
            return;
          }

          reject({ error: 'Mock endpoint not found' });
        } catch (e) {
          reject({ error: 'Mock database parsing failed: ' + e.message });
        }
      }, 350); // Simulate mock API latency
    });
  }
};

// Initialize API detector
API.init();
