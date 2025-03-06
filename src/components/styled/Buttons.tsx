import { Button, styled } from '@mui/material'
import { TRANSITIONS, EFFECTS, GRADIENTS } from '../../theme/constants'
import { alpha } from '@mui/material/styles'

export const GradientButton = styled(Button)(({ theme }) => ({
  background: `${GRADIENTS.primary(theme)} !important`,
  transition: TRANSITIONS.default,
  width: '100%',
  padding: '8px 16px',
  fontWeight: 600,
  color: theme.palette.primary.contrastText,
  textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  
  '&.MuiButton-outlined': {
    background: 'none !important',
    color: theme.palette.text.primary,
    textShadow: 'none',
    borderColor: theme.palette.divider,
    '&:hover': {
      borderColor: theme.palette.primary.main,
      background: `${alpha(theme.palette.primary.main, 0.05)} !important`
    },
    '&.MuiButton-colorError': {
      color: theme.palette.error.main,
      '&:hover': {
        borderColor: theme.palette.error.main,
        background: `${alpha(theme.palette.error.main, 0.05)} !important`
      }
    }
  },

  '&:hover': {
    transform: EFFECTS.buttonHover.transform,
    boxShadow: theme.shadows[EFFECTS.buttonHover.boxShadow],
    background: `${GRADIENTS.primary(theme)} !important`,
  },

  '&:active': {
    transform: 'scale(0.98)',
  },

  '&.auto-width': {
    [theme.breakpoints.up('sm')]: {
      width: 'auto'
    }
  },

  '&.MuiButton-sizeSmall': {
    padding: '6px 12px',
    fontSize: '0.875rem'
  }
})) 