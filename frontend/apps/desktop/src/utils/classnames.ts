export function classnames(...args: Array<string | {[key: string]: boolean}>) {
  let classes: Array<string> = []

  args.forEach(getClass)

  return classes.join(' ')

  function getClass(item: string | {[key: string]: boolean}) {
    if (typeof item == 'object') {
      Object.entries(item).forEach(([key, value]) => {
        if (value) {
          classes.push(key)
        }
      })
    } else if (typeof item == 'string') {
      classes.push(item)
    }
  }
}
