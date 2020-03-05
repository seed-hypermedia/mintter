interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export default function Heading({children, className, ...props}: HeadingProps) {
  return (
    <h2
      {...props}
      className={`text-white font-semibold text-3xl text-center ${className}`}
    >
      {children}
    </h2>
  )
}
