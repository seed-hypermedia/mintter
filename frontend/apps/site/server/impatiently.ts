export function impatiently<V>(
  slowPromise: Promise<V>,
  waitForMs = 5_000,
): Promise<V | null> {
  return Promise.race([
    slowPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), waitForMs)),
  ])
}
