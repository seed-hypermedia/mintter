export default function Content({
  children,
  className = '',
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 box-border ${className}`}>{children}</div>
}
