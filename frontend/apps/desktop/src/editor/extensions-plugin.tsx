import {invoke} from '@app/ipc'
import {lazy, Suspense} from 'react'
import {EditorPlugin} from './types'

export const extensionsPlugin = (plugins: string[]): EditorPlugin => {
  plugins.map(async (specifier) => {
    await invoke('plugin:extensions|load_extension', {specifier})
  })

  return {
    name: 'extensions',
    // eslint-disable-next-line react/display-name
    renderElement: () => (props) => {
      if (props.element.type.startsWith('extension:')) {
        const AsyncComponent = lazy(async () => {
          const html = (await invoke('plugin:extensions|render_element', {
            props: {
              element: props.element,
              children: [],
              attributes: props.attributes,
            },
          })) as string

          return {
            default: () => (
              <iframe
                src="null"
                srcDoc={html}
                scrolling="no"
                frameBorder="0"
                width="560"
                height="315"
              ></iframe>
            ),
          }
        })

        return (
          <Suspense fallback={'loading'}>
            <AsyncComponent />
          </Suspense>
        )
      }
    },
  }
}
