export default function Heading({
  children,
  as = 'h2',
  ...props
}: any) {
  const Elm = as;
  return (
    <Elm {...props} className={`text-heading ${className}`}>
      {children}
    </Elm>
  );
}
