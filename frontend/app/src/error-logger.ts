export function myErrorHandler(
  error: Error /* , info: { componentStack: string } */,
) {
  //TODO: log error boundary error somewhere (Sentry?)
  // Do something with the error
  // E.g. log to an error logging client here
  console.log('ERROR SHOULD BE LOOGED!');
  console.log(error);
}
