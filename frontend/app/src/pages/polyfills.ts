import {debug} from '@app/utils/logger'
import {ResizeObserver} from '@juggle/resize-observer'

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver
}

debug('polyfill executed')
