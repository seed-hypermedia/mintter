import {CustomTypes} from './../../app/src/editor/types'
import {Text} from '../mttast'

declare module 'slate' {
  export interface CustomTypes {
    Text: Text
  }
}
