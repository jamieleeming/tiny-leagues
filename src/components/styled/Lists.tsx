import { List, ListItem, styled } from '@mui/material'
import { TRANSITIONS } from '../../theme/constants'

export const HoverListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  transition: TRANSITIONS.default,
  padding: theme.spacing(1, 2),
  
  // Style secondary action area
  '& .MuiListItemSecondaryAction-root': {
    right: theme.spacing(1),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  }
}))

export const StyledList = styled(List)(({ theme }) => ({
  '& > *:not(:last-child)': {
    marginBottom: theme.spacing(1)
  }
})) 