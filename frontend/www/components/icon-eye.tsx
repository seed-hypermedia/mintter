export default function SvgComponent({
  width = '1rem',
  fill = 'currentColor',
  ...rest
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={width} viewBox="0 0 24 24" fill="none" {...rest}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 12c1.73-4.39 6-7.5 11-7.5s9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12zm19.82 0A9.77 9.77 0 0012 6.5 9.77 9.77 0 003.18 12 9.76 9.76 0 0012 17.5c3.8 0 7.17-2.13 8.82-5.5zM12 9.5a2.5 2.5 0 010 5 2.5 2.5 0 010-5zM7.5 12c0-2.48 2.02-4.5 4.5-4.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5-4.5-2.02-4.5-4.5z"
        fill={fill}
      />
    </svg>
  )
}
