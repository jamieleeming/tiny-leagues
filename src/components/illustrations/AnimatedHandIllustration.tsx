import { keyframes } from '@mui/system'
import { styled } from '@mui/material/styles'

const flipCard = keyframes`
  0% {
    transform: rotateY(0deg);
  }
  100% {
    transform: rotateY(180deg);
  }
`

const fillCard = keyframes`
  50%, 50% {
    fill: transparent;
  }
  90%, 100% {
    fill: var(--primary-dark);
  }
`

const StyledCard = styled('g')<{ delay: number }>(({ theme, delay }) => ({
  '--primary-dark': theme.palette.primary.dark,
  '& .card-face': {
    stroke: theme.palette.primary.main,
    strokeWidth: 1.5,
    fill: 'transparent',
    transformOrigin: '50% 50%',
    transformBox: 'fill-box',
    animation: `
      ${flipCard} 0.6s ease-in-out forwards,
      ${fillCard} 0.6s ease-in-out forwards
    `,
    animationDelay: `${delay}s, ${delay}s`
  }
}))

export const AnimatedHandIllustration = () => {
  const cardWidth = 57
  const cardHeight = 80
  const spacing = 19
  
  const totalWidth = (cardWidth * 5) + (spacing * 4)
  const startX = (400 - totalWidth) / 2

  return (
    <svg 
      viewBox="0 0 400 160" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        height: 'auto',
        maxWidth: 400,
        margin: '-30px 0 -40px'
      }}
    >
      {/* Cards */}
      {[0, 1, 2, 3, 4].map((i) => {
        const xPos = startX + i * (cardWidth + spacing)
        return (
          <StyledCard 
            key={i} 
            delay={i < 3 ? i * 0.5 : i === 3 ? 2.5 : 4}
          >
            <rect
              className="card-face"
              x={xPos}
              y={40}
              width={cardWidth}
              height={cardHeight}
              rx={4}
            />
          </StyledCard>
        )
      })}
    </svg>
  )
} 