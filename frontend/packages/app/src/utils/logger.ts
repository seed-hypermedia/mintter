type FnType = 'error' | 'warn' | 'info' | 'debug' | 'trace'

export var error = loggerFactory('error')
export var warn = loggerFactory('warn')
export var info = loggerFactory('info')
export var debug = loggerFactory('debug')
export var trace = loggerFactory('trace')

function loggerFactory(cb: FnType) {
  let fn = (m: string) => Promise.resolve(console[cb](m))

  return function actualLogger(...args: Array<unknown>): Promise<void> {
    if (args.length == 1) {
      return fn(JSON.stringify(args[0], null, 3))
    } else {
      let message = args
        .map((v) => {
          if (typeof v == 'string') {
            return v
          } else {
            return JSON.stringify(v, null, 3)
          }
        })
        .join(', ')

      return fn(message)
    }
  }
}
