export default function Heading({
  children,
  className = '',
  as = 'h2',
  ...props
}: any) {
  const Elm = as
  return (
    <Elm {...props} className={`text-heading ${className}`}>
      {children}
    </Elm>
  )
}
