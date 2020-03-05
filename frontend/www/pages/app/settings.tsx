import React from 'react'
import Seo from '../../components/seo'
import Sidebar from '../../components/sidebar'
import {Formik} from 'formik'
import {useUser} from '../../shared/userContext'
import {motion, AnimatePresence} from 'framer-motion'
import Layout from '../../components/layout'

export default function Settings() {
  const {user, setUser} = useUser()
  const [success, setSuccess] = React.useState(false)
  return (
    <Layout>
      <Seo title="Editor | Mintter" />
      <Sidebar />
      <div className="flex-1 overflow-y-auto px-8 py-10 lg:px-10 lg:py-12">
        <div className="w-full max-w-3xl my-0 mx-auto p-4 relative">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-5">Settings</h1>
            <Formik
              initialValues={user}
              enableReinitialize
              onSubmit={(values, {setSubmitting}) => {
                setUser(values)
                setSubmitting(false)
                setSuccess(true)
                setTimeout(() => setSuccess(false), 2000)
              }}
              // TODO: add validate for alias => url-friendly characters
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                handleSubmit,
                isSubmitting,
              }) => (
                <form
                  className="bg-white border-gray-200 border-solid border-2 rounded px-8 pt-6 pb-8 mb-4"
                  onSubmit={handleSubmit}
                >
                  <div className="mb-4">
                    <label
                      className="block text-gray-700 text-sm font-bold"
                      htmlFor="alias"
                    >
                      Alias
                    </label>
                    <p className="text-gray-600 text-xs mb-2 text-left font-light">
                      set the alias you want others to see on your publications
                      and profile
                    </p>
                    <input
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      id="alias"
                      name="alias"
                      type="text"
                      value={values.alias}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Your alias"
                    />
                    {errors.alias && touched.alias && errors.alias}
                  </div>
                  <div className="flex items-center">
                    <button
                      type="submit"
                      disabled={isSubmitting || success}
                      className={`bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-3 border border-blue-500 hover:border-transparent rounded ${
                        isSubmitting || success
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      Save
                    </button>
                    <AnimatePresence>
                      {success && (
                        <motion.div
                          initial={{opacity: 0, y: 10}}
                          animate={{opacity: 1, y: 0}}
                          exit={{
                            opacity: 0,
                            y: -10,
                            transition: {duration: 0.2},
                          }}
                        >
                          <p className="flex-1 mx-4 text-green-500">saved!</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </Layout>
  )
}
