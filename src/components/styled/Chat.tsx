import { Box, TextField, styled } from '@mui/material'
import { alpha } from '@mui/material/styles'

export const ChatContainer = styled(Box)(({ theme }) => ({
  height: '400px',
  overflowY: 'auto',
  marginBottom: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  '&::-webkit-scrollbar': {
    width: '8px',
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    }
  },
  scrollbarWidth: 'thin',
  scrollbarColor: `${alpha(theme.palette.primary.main, 0.2)} transparent`
}))

export const ChatMessageList = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  paddingLeft: theme.spacing(1),
  paddingRight: theme.spacing(1),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.up('sm')]: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  }
}))

export const ChatInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.spacing(3),
    backgroundColor: theme.palette.background.paper
  }
}))

export const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isCurrentUser'
})<{ isCurrentUser: boolean }>(({ theme, isCurrentUser }) => ({
  backgroundColor: isCurrentUser 
    ? alpha(theme.palette.primary.main, 0.08)
    : theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.3)
      : alpha(theme.palette.grey[100], 0.5),
  color: theme.palette.text.primary,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(0.75, 1.5),
  maxWidth: '80%',
  wordBreak: 'break-word',
  boxShadow: isCurrentUser 
    ? `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`
    : theme.palette.mode === 'dark'
      ? `inset 0 0 0 1px ${alpha(theme.palette.common.white, 0.05)}`
      : 'none'
})) 