import { Box, useMediaQuery, useTheme, Container } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

const MainLayout = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        minWidth: '100vw',
        bgcolor: 'background.default',
        overflow: 'hidden' // Prevent horizontal scrollbar
      }}
    >
      <Navbar />
      <Box 
        component="main" 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          py: 4,
          px: 0
        }}
      >
        <Container 
          maxWidth="lg" 
          sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            px: isMobile ? 2 : 3
          }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  )
}

export default MainLayout 