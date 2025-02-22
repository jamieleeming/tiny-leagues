import { SvgIcon, SvgIconProps } from '@mui/material'

interface CardsIconProps extends SvgIconProps {
  className?: string;
}

export const CardsIcon = ({ className, ...props }: CardsIconProps) => {
  return (
    <SvgIcon className={className} {...props} viewBox="0 0 24 24">
      {/* Back card */}
      <path
        d="M4 3
           C4 2.44772 4.44772 2 5 2
           H14C14.5523 2 15 2.44772 15 3
           V18C15 18.5523 14.5523 19 14 19
           H5C4.44772 19 4 18.5523 4 18
           V3Z"
        fill="currentColor"
        opacity="0.3"
      />
      
      {/* Front card */}
      <path
        d="M9 6
           C9 5.44772 9.44772 5 10 5
           H19C19.5523 5 20 5.44772 20 6
           V21C20 21.5523 19.5523 22 19 22
           H10C9.44772 22 9 21.5523 9 21
           V6Z"
        fill="currentColor"
      />
    </SvgIcon>
  )
} 