import Heading from './heading'
import {css} from 'emotion'

export default function WelcomeHeading({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Heading
      {...props}
      className={`mb-4 ${className} ${css`
        font-weight: 300;
      `}`}
    />
  )
}
