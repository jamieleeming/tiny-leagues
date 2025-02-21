import { Box, Paper, styled } from '@mui/material'
import { SPACING, BORDER_RADIUS } from '../../theme/constants'

export const PageContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  padding: theme.spacing(2)
}))

export const ContentCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(2),
  background: theme.palette.mode === 'dark' 
    ? theme.palette.background.paper 
    : theme.palette.background.default
}))

export const Section = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3)
})) 