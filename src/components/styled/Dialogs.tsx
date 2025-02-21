import { Dialog, DialogContent, DialogTitle, styled } from '@mui/material'

export const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.spacing(2),
    padding: theme.spacing(2)
  }
}))

export const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingBottom: theme.spacing(1)
}))

export const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingTop: theme.spacing(1)
})) 