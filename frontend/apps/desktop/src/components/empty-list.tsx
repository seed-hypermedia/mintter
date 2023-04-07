import {Button} from '@mintter/ui'
import '../styles/empty-list.scss'

type EmptyListProps = {
  description: string
  action: () => void
}

// TODO: add tests
export function EmptyList({description, action}: EmptyListProps) {
  return (
    <div className="empty-list">
      <p
        className="empty-list-description"
        data-testid="empty-list-description"
      >
        {description}
      </p>
      <Button
        theme="yellow"  

        onPress={() => action()}
      >
        Start a new Draft
      </Button>
    </div>
  )
}
