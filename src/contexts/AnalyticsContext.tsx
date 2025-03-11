import React, { createContext, useContext, useEffect, useState } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Replace with your actual Google Analytics measurement ID
const GA_MEASUREMENT_ID = 'G-D43YGX4DFB'; // You'll need to replace this with your actual GA4 ID

interface AnalyticsContextType {
  trackEvent: (category: string, action: string, label?: string, value?: number) => void;
  trackPageView: (path?: string) => void;
  initialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Initialize Google Analytics
  useEffect(() => {
    if (!initialized && GA_MEASUREMENT_ID !== 'G-D43YGX4DFB') {
      ReactGA.initialize(GA_MEASUREMENT_ID);
      setInitialized(true);
    }
  }, [initialized]);

  // Track page views
  useEffect(() => {
    if (initialized) {
      trackPageView(location.pathname + location.search);
    }
  }, [location, initialized]);

  // Set user ID for cross-device tracking when user logs in
  useEffect(() => {
    if (initialized && user) {
      ReactGA.set({ userId: user.id });
    }
  }, [user, initialized]);

  // Track events
  const trackEvent = (category: string, action: string, label?: string, value?: number) => {
    if (initialized) {
      ReactGA.event({
        category,
        action,
        label,
        value,
      });
    }
  };

  // Track page views
  const trackPageView = (path?: string) => {
    if (initialized) {
      ReactGA.send({
        hitType: 'pageview',
        page: path || location.pathname + location.search,
      });
    }
  };

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView, initialized }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
} 