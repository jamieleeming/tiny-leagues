import { Typography, styled } from '@mui/material'
import { TYPOGRAPHY } from '../../theme/constants'
import { Box } from '@mui/material'

export const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: TYPOGRAPHY.h4.fontSize.xs,
  fontWeight: 700,
  [theme.breakpoints.up('sm')]: {
    fontSize: TYPOGRAPHY.h4.fontSize.sm
  }
}))

export const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  fontWeight: 600,
  [theme.breakpoints.up('sm')]: {
    fontSize: '1.5rem'
  }
}))

export const CardTitle = styled(Typography)({
  fontSize: '1.125rem',
  fontWeight: 600,
  lineHeight: 1.3
})

export const CardHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2)
})) 