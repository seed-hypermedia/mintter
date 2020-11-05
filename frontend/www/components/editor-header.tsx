import Logo from './logo_square'
import {Link} from 'react-router-dom'

interface Props {
  onPublish?: () => void
}

export default function EditorHeader({onPublish}: Props) {
  return (
    <div className="flex items-center mx-4">
      <div className="text-primary">
        <Link to="/library/feed">
          <a>
            <Logo width="50px" className="fill-current" />
          </a>
        </Link>
      </div>
      <div className="flex-1"></div>
      {onPublish && (
        <button
          onClick={onPublish}
          className="bg-primary rounded-full px-12 py-2 text-white font-bold shadow transition duration-200 hover:shadow-lg ml-4"
        >
          Publish
        </button>
      )}
    </div>
  )
}
