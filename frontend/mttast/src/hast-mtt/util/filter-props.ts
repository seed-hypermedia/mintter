import {TextProps} from '../types'

export function filterProps(entry: TextProps): TextProps {
  const result: TextProps = {}

  Object.keys(entry).forEach((key) => {
    //@ts-ignore
    if (entry[key] === true) {
      //@ts-ignore
      result[key] = true
    }
  })

  return result
}
