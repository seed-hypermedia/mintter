# App Routing

in a normal frontend application, the page route is a crucial part. It's the source of truth of that and what not to render. In Mintter is not that important.

Im Mintter we have three main components that needed to render depending on the state its coming from, for example, when we create a new Document and open a new window.

## Main page machine

the app is controlled by one machine: The main page machine. this machine is in charge of a couple of things:

1. keep the window route in sync (an actor) [source]('https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L558-L636')
2. keep the route params in sync
3. keep a reference to all files (another machine) [source]('https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L11-L70')
4. keep a reference to all drafts (another machine) [source]('https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L87-L144')
5. keep a reference to the library (another machine) [source]('https://github.com/mintterteam/mintter/blob/master/frontend/app/src/components/library/library-machine.ts')

### Machine lifecycle

When the machine is spawned, it also spawns the files, draft and library machine and stores a reference to them in its extended state (context) [source](https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L252-L254)

It also [spawns the router actor](https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L265-L268), which is in charge of transition the machine to its proper state.

We have one big state (`routes` state) that cointains all the actual app states, this is needed to prevent infinite loops in the machine.
As you can see, the initial state is `routes.idle`, and this state does nothing. this is in purpose since the machine waits for the router to send the event needed. Here's where Navaid comes in.

[Navaid](https://github.com/lukeed/navaid) is the tool that listens to the actual page route and updates it. when we enter the app, we are in `routes.idle`, but the actual page route can be different. You can [see here](https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L559-L602) all the `navaid` listeners, that based on a route pattern, sends the appropiate event to the main-page machine to change its state.

The Router actor also receives events from the parent machine, this is needed to update the page route based on any machine transition. you can see the [events here](https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L603-L633). We generally send this events after we settle the state in the main-page machine. to make sure that if the user reloads the page, we land in the same state as before.

## Creating a new Draft

![Publication List View]('./publication-list.png')

When the user clicks the `New Document` button, this creates new window. this new window will create a new draft and opens it in the editor view.

all the new window creation is handled by Tauri. we just create the draft and calls the open window function.
