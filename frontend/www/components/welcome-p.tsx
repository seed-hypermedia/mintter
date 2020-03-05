export default function WelcomeP({
  children,
  className = '',
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-gray-500 text-lg font-light ${className}`}>
      {children}
    </p>
  )
}
