import {useHover} from '@mintter/shared'
import {Button, Tooltip} from '@mintter/ui'
import {Star} from '@tamagui/lucide-icons'
import {ComponentProps} from 'react'
import {TiStarFullOutline, TiStarOutline} from 'react-icons/ti'
import {useFavorite} from '../models/favorites'

function RemoveFavoriteButton({
  onPress,
}: {
  onPress: ComponentProps<typeof Button>['onPress']
}) {
  const hover = useHover()
  return (
    <Tooltip content="Remove from Favorites">
      <Button
        {...hover}
        size="$2"
        icon={hover.hover ? TiStarOutline : TiStarFullOutline}
        onPress={onPress}
        color={hover.hover ? undefined : '$yellow10'}
        theme={hover.hover ? 'red' : undefined}
        chromeless
        backgroundColor="$colorTransparent"
      />
    </Tooltip>
  )
}

export function FavoriteButton({url}: {url: string}) {
  const favorite = useFavorite(url)
  if (favorite.isFavorited) {
    return (
      <RemoveFavoriteButton
        onPress={(e) => {
          e.stopPropagation()
          favorite.removeFavorite()
        }}
      />
    )
  }
  return (
    <Tooltip content="Add To Favorites">
      <Button
        icon={TiStarOutline}
        size="$2"
        onPress={(e) => {
          e.stopPropagation()
          favorite.addFavorite()
        }}
      />
    </Tooltip>
  )
}

export function useFavoriteMenuItem(url: string | null) {
  const favorite = useFavorite(url)
  return {
    key: 'toggleFavorite',
    label: favorite.isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
    icon: Star,
    onPress: () => {
      favorite.isFavorited ? favorite.removeFavorite() : favorite.addFavorite()
    },
  }
}
