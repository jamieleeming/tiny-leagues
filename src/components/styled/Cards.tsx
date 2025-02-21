import { Card, styled } from '@mui/material'
import { TRANSITIONS, EFFECTS, BORDER_RADIUS, SPACING } from '../../theme/constants'

export const HoverCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: TRANSITIONS.default,
  borderRadius: theme.spacing(2),
  background: `${theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : theme.palette.background.default}`,
  backdropFilter: 'blur(8px)',
  
  '&:hover': {
    transform: EFFECTS.hover.transform,
    boxShadow: theme.shadows[EFFECTS.hover.boxShadow]
  },

  '& .MuiCardContent-root': {
    padding: theme.spacing(SPACING.section.xs),
    flexGrow: 1
  },

  '& .MuiCardActions-root': {
    padding: theme.spacing(2),
    paddingTop: 0
  },

  [theme.breakpoints.up('sm')]: {
    '& .MuiCardContent-root': {
      padding: theme.spacing(SPACING.section.sm)
    }
  }
})) 