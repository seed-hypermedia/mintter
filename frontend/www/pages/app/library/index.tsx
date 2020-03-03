import {Fragment} from 'react'
import Link from '../../../components/link'
import Container from '../../../components/container'
import Seo from '../../../components/seo'
import Sidebar from '../sidebar'
import NoteAddOutlinedIcon from '@material-ui/icons/NoteAddOutlined'
import DocumentList from './documentList'

export default function Library() {
  return (
    <Fragment>
      <Seo title="Editor | Mintter" />
      <div className="h-screen flex bg-gray-100">
        <Sidebar />
        <div className="flex-1 overflow-y-auto px-8 py-10 lg:px-10 lg:py-12">
          <Container className="max-w-4xl">
            <h1 className="text-4xl font-bold text-gray-800 mb-5 flex-1">
              Library
            </h1>
            {/* show/hide depending on the desired criteria (TBD) */}
            <Fragment>
              <div className="bg-white border-gray-200 border-solid border-2 rounded px-8 pt-6 pb-8 mb-4 text-center flex flex-col items-center">
                <h2 className="text-3xl font-semibold text-blue-500">
                  Welcome to Mintter!
                </h2>
                <p className="text-gray-700 font-light mt-5">
                  Some clain sentence that's fun, welcomes user to the community
                  and tells how it works and encourages to get started
                </p>
                <Link href="/app/editor">
                  <a className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 px-4 rounded rounded-full flex items-center mt-5 justify-center">
                    <NoteAddOutlinedIcon />
                    <span className="ml-2">Create your first document</span>
                  </a>
                </Link>
              </div>
              <hr className="border-t-2 border-gray-300 border-solid my-8" />
            </Fragment>

            <DocumentList />
          </Container>
        </div>
      </div>
    </Fragment>
  )
}
