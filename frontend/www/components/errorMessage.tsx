type ErrorProps = {
  code: number
  message: string
}

interface ErrorMessageProps extends React.ReactElement<HTMLDivElement> {
  error?: ErrorProps
}

export default function ErrorMessage({error}: ErrorMessageProps) {
  return error ? (
    <div className=" py-4 px-6 rounded my-4 border border-danger-hover bg-danger-background">
      <p className="text-danger-hover">{error.message}</p>
    </div>
  ) : null
}
