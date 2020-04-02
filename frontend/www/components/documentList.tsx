import AppsOutlinedIcon from '@material-ui/icons/AppsOutlined'
import FormatListBulletedOutlinedIcon from '@material-ui/icons/FormatListBulletedOutlined'

export default function DocumentList() {
  return (
    <div>
      <div className="flex items-center">
        <h2 className="text-2xl text-heading text-heading font-normal flex-1">
          My Documents
        </h2>
        <div>
          <button>
            <AppsOutlinedIcon className="text-primary" />
          </button>
          <button>
            <FormatListBulletedOutlinedIcon className="text-primary" />
          </button>
        </div>
      </div>
      <div>
        <p className="text-body">List here</p>
      </div>
    </div>
  )
}
