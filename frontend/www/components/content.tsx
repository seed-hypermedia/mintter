interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Content({children}: ContentProps) {
  return <div>{children}</div>
}
