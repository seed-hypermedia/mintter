export default function Content({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`p-5 box-border ${className}`}>
      {children}
    </div>
  )
}
