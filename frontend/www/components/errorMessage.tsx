export interface ErrorInterface {
  message: string
  [k: string]: any
}

export function ErrorMessage({
  error,
  className,
  ...props
}: {
  error?: ErrorInterface
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

export function FullPageErrorMessage({error}: {error?: ErrorInterface}) {
  console.log('MESSAGE', error.message)
  return error ? (
    <div
      className={`absolute z-50 w-screen h-screen bg-danger text-body flex items-center justify-center flex-col`}
    >
      <div className="p-8 m-8 rounded-lg shadow-xl">
        <h1 className="text-danger text-3xl">Something went wrong...</h1>
        <p className="text-gray-500 text-xl mt-4">{error.message}</p>
      </div>
    </div>
  ) : null
}
