import { Box, styled } from '@mui/material'
import { SPACING } from '../../theme/constants'

export const FlexBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2)
}))

export const FlexBetween = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(2),
  width: '100%',
  
  '&.maintain-row': {
    flexDirection: 'row',
    alignItems: 'center',
    '& > *': {
      width: 'auto'
    }
  },
  
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    
    '&.maintain-row': {
      flexDirection: 'row',
      alignItems: 'center'
    }
  }
}))

export const IconText = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2)
})) 