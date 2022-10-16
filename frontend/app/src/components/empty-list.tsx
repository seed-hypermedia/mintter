import {Button} from '@components/button'
import '../styles/empty-list.scss'

type EmptyListProps = {
  description: string
  action: () => void
}

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
        // className="button outlined block"

        onClick={() => action()}
      >
        Start a new Draft
      </Button>
    </div>
  )
}
