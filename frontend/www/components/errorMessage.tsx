export interface ErrorInterface {
  message: string
  [k: string]: any
}

export function ErrorMessage({
  error,
  className,
  ...props
}: {
  error: ErrorInterface
  className?: string
}) {
  return error ? (
    <div
      {...props}
      role="alert"
      className={`w-full py-4 px-6 rounded my-4 border border-danger-hover bg-danger-background ${className}`}
    >
      <p className="text-white">{error.message}</p>
    </div>
  ) : null
}

export function FullPageErrorMessage({error}: {error: any}) {
  return error ? (
    <div
      className={`absolute z-50 w-screen h-screen bg-danger text-body flex items-center justify-center flex-col`}
    >
      <h1>Something went wrong with the Profile</h1>
      <pre>
        <code>{JSON.stringify(error, null, 4)}</code>
      </pre>
    </div>
  ) : null
}
