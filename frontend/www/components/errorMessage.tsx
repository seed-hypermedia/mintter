export type ErrorType = {
  message?: string
}

export default function ErrorMessage({error}: {error: ErrorType}) {
  return error ? (
    <div
      role="alert"
      className="w-full py-4 px-6 rounded my-4 border border-danger-hover bg-danger-background"
    >
      <p className="text-white">{error.message}</p>
    </div>
  ) : null
}
