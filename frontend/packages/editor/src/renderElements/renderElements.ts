import {renderUnorderedList} from './renderUnorderedList'
import {renderOrderedList} from './renderOrderedList'
import {renderListItem} from './renderListItem'
import {renderCodeBlockElement} from './renderCodeBlockElement'
import {renderImageBlock} from './renderImageBlock'

export const renderElements = [
  renderUnorderedList(),
  renderOrderedList(),
  renderListItem(),
  renderCodeBlockElement(),
  renderImageBlock(),
]
