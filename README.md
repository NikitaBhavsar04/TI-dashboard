# 🔒 THREATWATCH INTELLIGENCE PLATFORM

A comprehensive cybersecurity threat advisory platform built with Next.js, featuring real-time threat intelligence, secure authentication, and role-based access control.

## 🚀 Features

### Core Functionality
- **📊 Threat Advisory Management**: Create, view, edit, and delete security advisories
- **🔐 Secure Authentication**: JWT-based authentication with HTTP-only cookies
- **👥 Role-Based Access Control**: Admin and User roles with different permissions
- **📱 Responsive Design**: Cyber-themed UI that works on all devices
- **🗄️ MongoDB Integration**: Secure data storage with proper indexing

### Security Features
- **🛡️ Protected Routes**: Server-side authentication validation
- **🔑 Password Security**: bcrypt password hashing
- **🚪 Session Management**: Secure login/logout with token validation
- **👨‍💼 Admin Dashboard**: User management and system statistics
- **🔒 Content Protection**: Authentication required for all advisory viewing

### User Roles
- **Admin Users**: 
  - Create, edit, and delete advisories
  - Manage user accounts
  - Access admin dashboard
  - View system statistics
- **Regular Users**: 
  - View advisories after authentication
  - Browse threat intelligence

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.4.4, React, TypeScript
- **Styling**: Tailwind CSS with custom cyber theme
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, bcryptjs
- **UI Components**: Custom cyber-themed components
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hackelite01/Threat-Advisory.git
   cd Threat-Advisory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### MongoDB Setup
1. Create a MongoDB database
2. Add your connection string to `.env.local`
3. The application will automatically create the required collections

### Default Admin User
The system includes seeding for a default admin user:
- **Email**: admin@threatwatch.com
- **Password**: admin123
- **Role**: Admin

## 📁 Project Structure

```
Threat-Advisory/
├── components/
│   ├── ui/
│   │   ├── cyber-components.tsx    # Custom UI components
│   │   └── cyber-effects.tsx       # Visual effects
│   ├── AdvisoryCard.tsx            # Advisory display component
│   ├── Navbar.tsx                  # Navigation component
│   └── SeverityBadge.tsx           # Severity indicator
├── contexts/
│   └── AuthContext.tsx             # Authentication state management
├── lib/
│   ├── auth.ts                     # Authentication utilities
│   ├── db.ts                       # Database connection
│   └── utils.ts                    # Utility functions
├── models/
│   ├── Advisory.ts                 # Advisory data model
│   └── User.ts                     # User data model
├── pages/
│   ├── api/                        # API endpoints
│   ├── admin/                      # Admin-only pages
│   ├── advisories/                 # Advisory listing
│   ├── advisory/                   # Individual advisory pages
│   ├── login.tsx                   # Authentication page
│   └── index.tsx                   # Landing page
└── styles/
    └── globals.css                 # Global styles
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Advisories
- `GET /api/advisories` - List all advisories
- `POST /api/advisories` - Create new advisory (Admin only)
- `GET /api/advisories/[id]` - Get specific advisory
- `PUT /api/advisories/[id]` - Update advisory (Admin only)
- `DELETE /api/advisories/[id]` - Delete advisory (Admin only)

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

## 🎨 UI Theme

The platform features a custom cybersecurity-themed design:
- **Dark cyber aesthetic** with neon accents
- **Monospace fonts** for technical authenticity
- **Glitch effects** and holographic overlays
- **Color scheme**: Cyber blue, green, and red
- **Terminal-style** windows and components

## 🚀 Deployment

The application is ready for deployment on platforms like:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Heroku**

Make sure to set your environment variables in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🛡️ Security

- All passwords are hashed using bcrypt
- JWT tokens are stored in HTTP-only cookies
- Server-side authentication validation
- Protected API endpoints
- Input validation and sanitization

## 📞 Support

If you encounter any issues or have questions, please open an issue in the GitHub repository.

---

**⚠️ DISCLAIMER**: This platform is designed for cybersecurity professionals and educational purposes. Ensure proper security measures are in place before deploying to production.
