import { Box, TextField, styled } from '@mui/material'

export const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4)
}))

export const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(1),
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main
    }
  }
}))

export const FormActions = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(4),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column'
  }
})) 