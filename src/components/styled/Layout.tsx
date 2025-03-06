import { Box, Paper, styled, Dialog } from '@mui/material'

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

// Standard styled dialog with consistent visual treatment for all modals
export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: '0px 0px 30px rgba(255, 255, 255, 0.1), 0px 8px 24px rgba(0, 0, 0, 0.2)',
    backgroundColor: theme.palette.background.default,
    backgroundImage: 'none',
    border: '1px solid rgba(0, 0, 0, 0.3)'
  }
})) 