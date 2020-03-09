import Container, {ContainerProps} from './container'

// export interface WelcomeContainerProps extends ContainerProps {}

export default function WelcomeContainer({
  children,
  className = '',
}: ContainerProps) {
  return (
    <Container
      className={`flex flex-col max-w-3xl lg:flex-1 w-full items-center pb-16 lg:pb-0 ${className}`}
    >
      {children}
    </Container>
  )
}
