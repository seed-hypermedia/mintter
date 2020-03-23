export default function WelcomeP({
  children,
  className = '',
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-body text-lg font-light ${className}`}>{children}</p>
  )
}
