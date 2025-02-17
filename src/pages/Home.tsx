import { Typography, Button, Box, Container } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

const Home = () => {
  return (
    <Container maxWidth="md">
      <Box 
        sx={{ 
          textAlign: 'center', 
          mt: 8,
          bgcolor: 'background.paper',
          p: 4,
          borderRadius: 1,
          boxShadow: 1
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to The River
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom color="text.secondary" sx={{ mb: 4 }}>
          Organize and join poker games with friends
        </Typography>
        <Button
          component={RouterLink}
          to="/games"
          variant="contained"
          size="large"
          sx={{ 
            px: 4,
            py: 1.5,
            fontSize: '1.2rem'
          }}
        >
          Find Games
        </Button>
      </Box>
    </Container>
  )
}

export default Home 