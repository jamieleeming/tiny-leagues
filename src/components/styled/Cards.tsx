import { Card, styled, Box } from '@mui/material'
import { TRANSITIONS, EFFECTS } from '../../theme/constants'

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
    padding: theme.spacing(2),
    flexGrow: 1,
    '&:last-child': {
      paddingBottom: theme.spacing(2)
    }
  },

  '& .MuiCardActions-root': {
    padding: theme.spacing(2),
    paddingTop: 0
  },

  [theme.breakpoints.up('sm')]: {
    '& .MuiCardContent-root': {
      padding: theme.spacing(2)
    }
  }
}))

export const ContentCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
  }
}))

export const CardHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3)
}))

export const StatBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    color: theme.palette.primary.main,
    fontSize: '2rem'
  },
  '& .MuiTypography-h4': {
    color: theme.palette.primary.main,
    fontWeight: 500
  }
})) 