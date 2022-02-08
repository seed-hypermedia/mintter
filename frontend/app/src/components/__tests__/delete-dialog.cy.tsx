import {mountWithAccount} from '@app/test/utils'
import {DeleteDialog} from '@components/delete-dialog'
import {createModel} from '@xstate/test'
import {createMachine} from 'xstate'

describe('<DeleteDialog />', () => {
  var deleteDialogMachine = createMachine({
    initial: 'closed',
    states: {
      closed: {
        on: {
          'DELETE.DIALOG.OPEN': {
            target: 'opened',
          },
        },
      },
      opened: {
        initial: 'idle',
        states: {
          idle: {
            on: {
              'DELETE.DIALOG.CONFIRM': {
                target: 'deleting',
              },
              'DELETE.DIALOG.CANCEL': {
                target: 'dismiss',
              },
            },
            meta: {
              test: () => {
                cy.get('[data-testid="delete-dialog-title"]')
                  .should('be.visible')
                  .contains(/Delete document/i)
              },
            },
          },
          deleting: {
            invoke: {
              id: 'deleteEntry',
              src: 'deleteEntry',
              onDone: [
                {
                  actions: 'onSuccess',
                  target: 'dismiss',
                },
              ],
              onError: [
                {
                  target: 'errored',
                },
              ],
            },
          },
          errored: {
            on: {
              'DELETE.DIALOG.CONFIRM': {
                target: 'deleting',
              },
              'DELETE.DIALOG.CANCEL': {
                target: 'dismiss',
              },
            },
            // meta: {
            //   test: () => {
            //     cy.get('[data-testid="delete-dialog-error"]')
            //       .should('be.visible')
            //       .contains('Something went wrong on deletion')
            //   },
            // },
          },
          canceled: {
            type: 'final',
          },
          dismiss: {
            type: 'final',
          },
        },
        onDone: {
          target: 'closed',
        },
      },
    },
  })

  var testModel = createModel(deleteDialogMachine, {
    events: {
      'DELETE.DIALOG.OPEN': () => {
        cy.get('[data-testid="delete-dialog-trigger"]').click()
      },
      'DELETE.DIALOG.CANCEL': () => {
        cy.get('[data-testid="delete-dialog-cancel"]').click()
      },
      'DELETE.DIALOG.CONFIRM': () => {
        cy.get('[data-testid="delete-dialog-confirm"]').click()
      },
    },
  })

  var testPlans = testModel.getSimplePathPlans()

  testPlans.forEach((plan) => {
    describe(plan.description, () => {
      plan.paths.forEach((path) => {
        it(path.description, async () => {
          const {render} = mountWithAccount()

          let handleDelete = cy.stub().resolves()
          let onSuccess = cy.spy()

          render(
            <DeleteDialog
              entryId="testentry"
              handleDelete={handleDelete}
              onSuccess={onSuccess}
              title="Delete document"
              description="test description"
            >
              <button data-testid="delete-dialog-trigger">test dialog</button>
            </DeleteDialog>,
          ).then(() => {
            path.test({handleDelete, onSuccess})
          })
        })
      })
    })
  })

  // for some reason this is running before the forEach :(
  it.skip('coverage', () => {
    testModel.testCoverage()
  })
})
