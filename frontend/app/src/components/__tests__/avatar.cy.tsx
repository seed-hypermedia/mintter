import {mount} from '@cypress/react'
import {Avatar} from '../avatar'

describe('<Avatar />', () => {
  it('default', () => {
    mount(<Avatar size="3" />)
  })
})
