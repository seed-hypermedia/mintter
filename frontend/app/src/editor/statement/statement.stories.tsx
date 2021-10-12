import {ComponentMeta, ComponentStory} from '@storybook/react'
import {ParagraphUI} from '../paragraph'
import {StatementUI} from './statement-ui'

export default {
  title: 'Editor Elements/Statement',
} as ComponentMeta<typeof StatementUI>

export const Default: ComponentStory<typeof StatementUI> = (args) => (
  <StatementUI {...args}>
    <ParagraphUI data-element-type="paragraph">
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Aperiam eos magnam nisi doloremque eum animi odit
      excepturi. Ea ipsum cumque voluptatibus iure doloribus eius soluta illo sequi, provident explicabo corporis!
    </ParagraphUI>
  </StatementUI>
)

export const WithNestedStatement: ComponentStory<typeof StatementUI> = (args) => (
  <StatementUI>
    <ParagraphUI data-element-type="paragraph">
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Aperiam eos magnam nisi doloremque eum animi odit
      excepturi. Ea ipsum cumque voluptatibus iure doloribus eius soluta illo sequi, provident explicabo corporis!
    </ParagraphUI>
    <ul style={{margin: 0, padding: 0}} data-element-type="group">
      <StatementUI {...args}>
        <ParagraphUI data-element-type="paragraph" data-parent-type="group">
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Aperiam eos magnam nisi doloremque eum animi odit
          excepturi. Ea ipsum cumque voluptatibus iure doloribus eius soluta illo sequi, provident explicabo corporis!
        </ParagraphUI>
      </StatementUI>
    </ul>
  </StatementUI>
)
