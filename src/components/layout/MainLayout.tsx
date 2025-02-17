import { Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.tsx'

const MainLayout = () => {
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      bgcolor: '#f5f5f5' // Light grey background
    }}>
      <Navbar />
      <Box component="main" sx={{ flex: 1, py: 4 }}>
        <Outlet />
      </Box>
    </Box>
  )
}

export default MainLayout 