import Container, {ContainerProps} from './container'

export interface WelcomeContainerProps extends ContainerProps {}

export default function WelcomeContainer({
  children,
  className = '',
}: WelcomeContainerProps) {
  return (
    <Container
      className={`flex flex-col max-w-3xl flex-1 w-full items-center ${className}`}
    >
      {children}
    </Container>
  )
}
