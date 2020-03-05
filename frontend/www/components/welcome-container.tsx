import Container from './container'

export default function WelcomeContainer({children, className = ''}) {
  return (
    <Container
      className={`flex flex-col max-w-3xl flex-1 items-center ${className}`}
    >
      {children}
    </Container>
  )
}
