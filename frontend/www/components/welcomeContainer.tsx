import Container from './container'

export default function WelcomeContainer({children, className = ''}) {
  return (
    <Container className={`flex flex-col align-center max-w-3xl ${className}`}>
      {children}
    </Container>
  )
}
