import {ObjectKeys} from '../../builder'
import {TextProps} from '../types'

export function filterProps(entry: TextProps): TextProps {
  let result: TextProps = {text: entry.text}

  ObjectKeys(entry).forEach((key) => {
    if (entry[key]) {
      // @ts-ignore
      result[key] = true
    }
  })

  return result
}
