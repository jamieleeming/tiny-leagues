import { Box, Typography, styled } from '@mui/material'
import { TRANSITIONS } from '../../theme/constants'

export const NavLink = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
  cursor: 'pointer',
  transition: TRANSITIONS.default,
  marginBottom: theme.spacing(3),
  
  '&:hover': {
    color: theme.palette.primary.main,
    transform: 'translateX(-4px)'
  },

  '& .MuiSvgIcon-root': {
    fontSize: '1.25rem'
  }
}))

export const BackLink = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
  <NavLink onClick={onClick}>
    <Typography
      variant="body2"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontWeight: 500
      }}
    >
      {children}
    </Typography>
  </NavLink>
) 