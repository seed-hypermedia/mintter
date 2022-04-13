import {TextProps} from '../types'
import {ObjectKeys} from './object-keys'

export function filterProps(entry: TextProps): TextProps {
  const result: TextProps = {}

  ObjectKeys(entry).forEach((key) => {
    if (entry[key] === true) {
      //@ts-ignore
      result[key] = true
    }
  })

  return result
}
