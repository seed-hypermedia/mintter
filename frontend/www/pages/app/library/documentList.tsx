import AppsOutlinedIcon from "@material-ui/icons/AppsOutlined";
import FormatListBulletedOutlinedIcon from "@material-ui/icons/FormatListBulletedOutlined";

export default function DocumentList() {
  return (
    <div>
      <div className="flex items-center">
        <h2 className="text-2xl text-gray-900 font-normal flex-1">
          My Documents
        </h2>
        <div>
          <button>
            <AppsOutlinedIcon />
          </button>
          <button>
            <FormatListBulletedOutlinedIcon />
          </button>
        </div>
      </div>
      <div>
        <p>List here</p>
      </div>
    </div>
  );
}
