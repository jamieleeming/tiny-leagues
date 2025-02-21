export const SPACING = {
  page: { xs: 1, sm: 2 },  // Page padding
  section: { xs: 2, sm: 4 }, // Section padding
  element: { xs: 2, sm: 3 }  // Element spacing (grid, etc)
}

export const BORDER_RADIUS = {
  card: 16,  // Fixed value for cards
  button: 8,  // Fixed value for buttons
  chip: 16    // Fixed value for chips
}

export const TRANSITIONS = {
  default: 'all 0.2s ease-in-out',
}

export const TYPOGRAPHY = {
  h4: {
    fontSize: { xs: '1.5rem', sm: '2.125rem' }
  }
}

export const EFFECTS = {
  hover: {
    transform: 'translateY(-4px)',
    boxShadow: 8  // Will be used with theme.shadows[8]
  },
  buttonHover: {
    transform: 'scale(1.02)',
    boxShadow: 4  // Will be used with theme.shadows[4]
  }
}

export const GRADIENTS = {
  primary: (theme: any) => 
    `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
}

export const SHADOWS = {
  card: '0 2px 8px rgba(0,0,0,0.1)',
  hover: '0 4px 12px rgba(0,0,0,0.15)',
  button: '0 2px 4px rgba(0,0,0,0.1)'
}

export const COLORS = {
  overlay: 'rgba(0,0,0,0.5)',
  backdrop: 'rgba(0,0,0,0.8)'
}

export const ANIMATIONS = {
  fadeIn: 'fade-in 0.2s ease-in-out',
  slideUp: 'slide-up 0.3s ease-out'
}

export const Z_INDEX = {
  modal: 1300,
  drawer: 1200,
  appBar: 1100,
  tooltip: 1500
} 