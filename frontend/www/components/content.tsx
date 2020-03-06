interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Content({children, className = ''}: ContentProps) {
  return <div className={`p-5 box-border ${className}`}>{children}</div>
}
