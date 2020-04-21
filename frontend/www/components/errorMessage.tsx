type ErrorProps = {
  code: number
  message: string
}

interface ErrorMessageProps {
  error?: ErrorProps
}

export default function ErrorMessage({
  error,
}: ErrorMessageProps & React.ReactElement<HTMLDivElement>) {
  return error ? (
    <div
      role="alert"
      className="w-full py-4 px-6 rounded my-4 border border-danger-hover bg-danger-background"
    >
      <p className="text-white">{error.message}</p>
    </div>
  ) : null
}
