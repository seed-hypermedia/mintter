import {useEntityTimeline} from '../models/changes'
import {AccessoryContainer} from './accessory-sidebar'

export function EntitySuggestedChangesAccessory({
  entityId,
}: {
  entityId?: string
}) {
  const timeline = useEntityTimeline(entityId)
  console.log('timeline', timeline.data)
  return <AccessoryContainer title={`Suggested Changes`}></AccessoryContainer>
}
