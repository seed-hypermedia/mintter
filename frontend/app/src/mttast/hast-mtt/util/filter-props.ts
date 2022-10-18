import {ObjectKeys} from '@app/utils/object-keys'
import {TextProps} from '../types'

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
