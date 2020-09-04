import {getRenderElement} from '@udecode/slate-plugins'
import {ImageKeyOption, ImagePluginOptionsValues} from '@udecode/slate-plugins'
import {ImageBlock} from './components/image'

export function renderElementImage(options?: any) {
  const {img} = options

  return getRenderElement(img)
}

export const ELEMENT_IMAGE = 'img'

export const IMAGE_OPTIONS: Record<
  ImageKeyOption,
  Required<ImagePluginOptionsValues>
> = {
  img: {
    component: ImageBlock,
    type: ELEMENT_IMAGE,
    rootProps: {},
  },
}
