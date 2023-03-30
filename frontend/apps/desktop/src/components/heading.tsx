import {styled} from '@app/stitches.config'
import {PropsWithChildren} from 'react'
import {Text, TextProps} from './text'

export function Heading(props: PropsWithChildren<TextProps>) {
  return <Text {...props} as="h2" />
}
