export default function Heading({ children, as = 'h2', ...props }: any) {
  const Elm = as;
  return <Elm {...props}>{children}</Elm>;
}
