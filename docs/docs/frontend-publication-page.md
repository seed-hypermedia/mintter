# Frontend app Architecture: Publication Page

- what happens when we load a publication (publication page)?
	1. get the page params
	2. check if there's a block param in the route to highlight it? and scroll the page into it (`useScrollToBlock`)
	3. create the editor object
	4. start the [mouseService](#mouse-service)
	5. listen to `update_focus_window_route` event, so when we change focus to the window and we have a block in the params, we can highlight the block again.
	6. start the [resizable panel machine](#resizable-panel)
	7. create the [publication machine](#publication-machine)
	8. fetch conversations and apply then to the editor.


## Lego pieces

### Mouse Service

- this service is in charge of showing the blocktools data on each block.
- it uses intersectionObserver to check what blocks are visible in the viewport
- when the mouse moves, we check in which block is the mouse over iterating over only the visible blocks
- it listens to the scroll event to recalculate the list ob visible blocks
- capture all the rendered blocks so the IntersectionObserver can listen to it. this happens on each paragraph and static-paragraph (`useBlockObserve`)

### Resizable Panel

- this is the panel created for the activity section in the publication page. 
- this also listens to the matchMedia event, to change the orientation in which the panels open (mobile == vertical, desktop == horizontal)

### Publication Machine

- This machine is very simple, and does not do much.
- if the fetch response of a publication takes more than 1 second, we should show the message "Searching the network" (`fetching.extended` state)
- when the edit button is clicked, it creates the new draft
- when the publication is fetched, we are getting the current device info, so we can check if the publication's author is the same as the device account. This is important to render different actions in the titlebar.


## Questions

- How can we share events that happen in the editor with the titlebar? (to react to changes in the draft and update the title)
- is Edit a global action?
- is Windows should be handled in the store? because we want to restore windows when the user restart the app
- maybe we can put all the logic to check the publication's author in the titlebar and remove it from the publication machine? I believe the only place we need this info is in the titlebar (now)
- would it be better to create providers for specific stuff? (example: create new drafts??)
- when seeing a previous version of a document and press EDIT, is this a fork? should we change the edit label to say "Fork"


## Todos

- [ ] the edit button does not need to know about the publication, just the route
- [ ] prevent the settings page to open the onboarding
- [ ] make sure we are prefetching every document on hover:
	- [ ] list items
	- [ ] transclusions
	- [ ] links
- [ ] is the globalmachine manager available in XState now?
- [ ] remove the main machine. no need to have it, we can create providers for specific stuff
- [ ] create invalidate query event emitter so we can use that to syunc stuff between windows