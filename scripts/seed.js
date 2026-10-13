require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const seedData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhartserve');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Review.deleteMany({});
    console.log('Cleared existing data.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('BhartServe@2026!', salt);

    // 1. Create Admin
    const adminUser = new User({
      name: 'BhartServe Administrator',
      email: 'admin@bhartserve.com',
      password: hashedPassword,
      phone: '9876543210',
      role: 'admin'
    });
    await adminUser.save();
    console.log('Seeded Admin account (admin@bhartserve.com / BhartServe@2026!)');

    // 2. Create Customers
    const customer1 = new User({
      name: 'Amit Sharma',
      email: 'amit@gmail.com',
      password: hashedPassword,
      phone: '9811111111',
      role: 'customer',
      addresses: ['Flat 402, Block A, Green Glen Layout, Bangalore, Karnataka - 560103']
    });
    const customer2 = new User({
      name: 'Priya Patel',
      email: 'priya@gmail.com',
      password: hashedPassword,
      phone: '9822222222',
      role: 'customer',
      addresses: ['7B, Skyline Apartments, Worli, Mumbai, Maharashtra - 400018']
    });
    const customer3 = new User({
      name: 'Rajesh Kumar',
      email: 'rajesh@gmail.com',
      password: hashedPassword,
      phone: '9833333333',
      role: 'customer',
      addresses: ['House 42, Gali 3, Lajpat Nagar, Delhi - 110024']
    });

    await customer1.save();
    await customer2.save();
    await customer3.save();
    console.log('Seeded 3 Customer accounts.');

    // 3. Create Providers
    const providers = [
      // Home Services
      {
        name: 'Ramesh Kumar',
        email: 'ramesh.plumber@gmail.com',
        phone: '9011111111',
        role: 'provider',
        providerProfile: {
          category: 'Home Services',
          subCategory: 'Plumbing',
          experience: 8,
          skills: ['Leak Detection', 'Pipe Repair', 'Bathroom Fitting', 'Water Heater Install'],
          languages: ['Hindi', 'English'],
          startingPrice: 349,
          rating: 4.8,
          completedJobs: 48,
          responseTime: 15, // 15 mins
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
        }
      },
      {
        name: 'Suresh Raina',
        email: 'suresh.electrician@gmail.com',
        phone: '9022222222',
        role: 'provider',
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
        }
      },
      {
        name: 'Vijay Verma',
        email: 'vijay.ac@gmail.com',
        phone: '9033333333',
        role: 'provider',
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
        }
      },
      {
        name: 'Sunita Das',
        email: 'sunita.cleaner@gmail.com',
        phone: '9044444444',
        role: 'provider',
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
        }
      },
      {
        name: 'Rajesh Carpenter',
        email: 'rajesh.wood@gmail.com',
        phone: '9055555555',
        role: 'provider',
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
        }
      },
      // Office Services
      {
        name: 'Amit Patel',
        email: 'amit.officeclean@gmail.com',
        phone: '9066666666',
        role: 'provider',
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
        }
      },
      {
        name: 'Vikram Singh',
        email: 'vikram.network@gmail.com',
        phone: '9077777777',
        role: 'provider',
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
        }
      },
      {
        name: 'Harpreet Singh',
        email: 'harpreet.cctv@gmail.com',
        phone: '9088888888',
        role: 'provider',
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
        }
      },
      // Shop Services
      {
        name: 'Arjun Mehta',
        email: 'arjun.sign@gmail.com',
        phone: '9099999999',
        role: 'provider',
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
        }
      },
      {
        name: 'Anil Kumar',
        email: 'anil.security@gmail.com',
        phone: '9100000000',
        role: 'provider',
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
        }
      }
    ];

    for (let p of providers) {
      const pUser = new User({
        name: p.name,
        email: p.email,
        password: hashedPassword,
        phone: p.phone,
        role: p.role,
        providerProfile: p.providerProfile
      });
      await pUser.save();
    }

    console.log(`Seeded ${providers.length} Service Providers with detailed profile statistics.`);
    console.log('Database Seeding successfully completed!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding database:', error);
    mongoose.connection.close();
  }
};

seedData();
