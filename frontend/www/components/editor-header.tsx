import Logo from './logo_square'
import IconSettings from './icon-settings'
import IconEye from './icon-eye'

export default function EditorHeader() {
  return (
    <div className="flex items-center mx-4">
      <div className="text-primary">
        <Logo width="50px" className="fill-current" />
      </div>
      <div className="flex-1"></div>
      <button className="text-muted-hover bg-transparent hover:shadow-lg hover:text-muted-hover p-2 rounded-full shadow transition duration-200">
        <IconEye width="24px" />
      </button>
      <button className="text-muted-hover bg-transparent hover:shadow-lg hover:text-muted-hover p-2 rounded-full shadow transition duration-200 ml-4">
        <IconSettings width="24px" />
      </button>
      <button className="bg-primary rounded-full px-12 py-2 text-white font-bold shadow transition duration-200 hover:shadow-lg ml-4">
        Publish
      </button>
    </div>
  )
}
