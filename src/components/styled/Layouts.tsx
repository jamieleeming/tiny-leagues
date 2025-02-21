import { Box, Container, styled } from '@mui/material'
import { SPACING } from '../../theme/constants'

export const PageWrapper = styled(Container)(({ theme }) => ({
  paddingTop: theme.spacing(4),
  paddingBottom: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2)
  }
}))

export const ContentWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4)
}))

export const GridContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
})) 