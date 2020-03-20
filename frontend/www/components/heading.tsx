interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3'
}

export default function Heading({
  children,
  className = '',
  as = 'h2',
  ...props
}: HeadingProps) {
  const Elm = as
  return (
    <Elm
      {...props}
      className={`font-semibold text-3xl text-center text-heading ${className}`}
    >
      {children}
    </Elm>
  )
}
