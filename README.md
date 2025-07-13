# Tiny Leagues

A modern web application for organizing and managing home poker games. Tiny Leagues provides a streamlined platform for creating games, managing players, tracking results, and building poker communities.

## 🎯 What is Tiny Leagues?

Tiny Leagues is a React-based web application that helps poker enthusiasts organize and manage their home games. Whether you're hosting casual games with friends or running serious tournaments, Tiny Leagues provides all the tools you need to streamline your poker nights.

### Key Features

- **Game Management**: Create and manage poker games with detailed settings
- **Player RSVP System**: Allow players to confirm attendance with waitlist support
- **Results Tracking**: Record game outcomes and track player statistics
- **League Support**: Organize games into leagues for tournament play
- **Real-time Chat**: Built-in messaging for game coordination
- **Mobile-First Design**: Responsive interface that works on all devices
- **Authentication**: Secure user accounts with Supabase integration

## 🏗️ Project Structure

```
tiny-leagues/
├── src/                          # Main source code
│   ├── components/               # Reusable UI components
│   │   ├── auth/                # Authentication components
│   │   ├── chat/                # Chat functionality
│   │   ├── common/              # Shared components
│   │   ├── games/               # Game-specific components
│   │   ├── icons/               # Custom icons
│   │   ├── illustrations/       # Animated illustrations
│   │   ├── layout/              # Layout components
│   │   └── styled/              # Styled components
│   ├── contexts/                # React contexts
│   │   ├── AuthContext.tsx      # Authentication state
│   │   └── AnalyticsContext.tsx # Google Analytics
│   ├── pages/                   # Main application pages
│   │   ├── Auth.tsx            # Login/signup page
│   │   ├── Games.tsx           # Games listing
│   │   ├── GameDetails.tsx     # Individual game view
│   │   ├── Home.tsx            # Landing page
│   │   ├── Profile.tsx         # User profile
│   │   ├── ResetPassword.tsx   # Password reset
│   │   └── GamePreview.tsx     # Public game preview
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   ├── config/                  # Configuration files
│   ├── theme/                   # Material-UI theme
│   └── assets/                  # Static assets
├── public/                      # Public assets
├── docs/                        # Documentation
├── email-templates/             # Email templates
├── supabase/                    # Supabase configuration
└── scripts/                     # Build and deployment scripts
```

## 🚀 Features & Functionality

### Authentication System
- **User Registration**: Sign up with email, password, and referral code
- **User Login**: Secure authentication with Supabase
- **Password Reset**: Email-based password recovery
- **Protected Routes**: Automatic redirection for unauthenticated users

### Game Management
- **Game Creation**: Set up games with detailed parameters:
  - Game type (cash/tournament)
  - Poker variant (Texas Hold'em/Omaha)
  - Buy-in ranges
  - Blind structures
  - Location and date/time
  - Seat limits
  - Special features (rebuy, bomb pots)

- **Game Settings**:
  - Public/private games
  - Reservation fees
  - Settlement types (centralized/decentralized)
  - League association

### Player Management
- **RSVP System**: Players can confirm attendance
- **Waitlist Support**: Automatic waitlist for full games
- **Player Profiles**: View player information and history
- **Payment Integration**: Track payment methods (Venmo, Zelle)

### Results & Statistics
- **Game Results**: Record buy-ins, cash-outs, and profits/losses
- **Player Statistics**: Track performance over time
- **League Standings**: Tournament leaderboards
- **Export Functionality**: Download game data

### Communication
- **In-Game Chat**: Real-time messaging for game coordination
- **Game Sharing**: Share game links with social media integration
- **Email Notifications**: Automated reminders and updates

### User Experience
- **Modern UI**: Material-UI with dark theme
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization
- **Social Features**: Share games and invite friends

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Material-UI**: Component library and theming
- **React Router**: Client-side routing
- **React Hook Form**: Form handling
- **Emotion**: CSS-in-JS styling

### Backend & Services
- **Supabase**: Backend-as-a-Service
  - Authentication
  - Real-time database
  - Storage
  - Edge functions

### Development Tools
- **Vite**: Fast build tool and dev server
- **ESLint**: Code linting
- **TypeScript**: Type checking
- **GitHub Pages**: Deployment

### Analytics & SEO
- **Google Analytics 4**: User tracking
- **React Helmet**: SEO optimization
- **Open Graph**: Social media sharing

## 📱 Pages & Routes

### Public Pages
- `/` - Landing page with feature overview
- `/auth` - Login and signup forms
- `/auth/reset-password` - Password reset
- `/preview/:id` - Public game preview

### Protected Pages
- `/games` - Games listing and management
- `/games/:id` - Individual game details
- `/profile` - User profile and settings

## 🎨 Design System

### Theme
- **Dark Mode**: Modern dark theme with green accent colors
- **Typography**: Inter font family
- **Colors**: 
  - Primary: Green (#00C853)
  - Secondary: Red (#FF1744)
  - Background: Dark (#121212)

### Components
- **Styled Components**: Custom styled Material-UI components
- **Responsive Design**: Mobile-first approach
- **Animations**: Smooth transitions and hover effects
- **Icons**: Material-UI icons with custom illustrations

## 🔧 Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd tiny-leagues

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Deploy to GitHub Pages

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚀 Deployment

The application is configured for deployment on GitHub Pages:

1. **Build**: `npm run build`
2. **Deploy**: `npm run deploy`

The application is currently deployed at: https://tinyleagues.co

## 📊 Database Schema

### Core Tables
- **users**: User accounts and profiles
- **games**: Game information and settings
- **rsvp**: Player attendance and waitlist
- **results**: Game outcomes and statistics
- **messages**: In-game chat messages
- **leagues**: Tournament league management
- **payments**: Payment method tracking

## 🔐 Security Features

- **Authentication**: Supabase Auth with email/password
- **Protected Routes**: Automatic authentication checks
- **Data Validation**: TypeScript and form validation
- **CSP Headers**: Content Security Policy
- **HTTPS**: Secure connections only

## 📈 Analytics & Monitoring

- **Google Analytics 4**: User behavior tracking
- **Custom Events**: Game creation, RSVPs, results
- **Performance Monitoring**: Build-time optimization
- **Error Tracking**: Console error logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary.

## 🆘 Support

For support or questions:
- Check the documentation in the `docs/` folder
- Review the Supabase settings guide
- Contact the development team

---

**Tiny Leagues** - Making poker nights easier, one game at a time. 