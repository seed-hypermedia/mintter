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

It also [spawns the router actor](https://github.com/mintterteam/mintter/blob/c23cef5992612455626c73db25bbf989a9c0372e/frontend/app/src/main-page-machine.ts#L268-L271), which is in charge of transition the machine to its proper state.

We have one big state (`routes` state) that cointains all the actual app states, this is needed to prevent infinite loops in the machine.
As you can see, the initial state is `routes.idle`, and this state does nothing. this is in purpose since the machine waits for the router to send the event needed. Here's where Navaid comes in.

[Navaid](https://github.com/lukeed/navaid) is the tool that listens to the actual page route and updates it. when we enter the app, we are in `routes.idle`, but the actual page route can be different. You can [see here](https://github.com/mintterteam/mintter/blob/master/frontend/app/src/main-page-machine.ts#L557-L589) all the `navaid` listeners, that based on a route pattern, sends the appropiate event to the main-page machine to change its state.

The Router actor also receive events from the parent machine, this is needed to update the page route based on any machine transition. you can see the [events here](https://github.com/mintterteam/mintter/blob/c23cef5992612455626c73db25bbf989a9c0372e/frontend/app/src/main-page-machine.ts#L591-L621). We generally send this events after we settle the state in the main-page machine. to make sure that if the user reloads the page, we land in the same state as before.

You can checkout [this gist](https://gist.github.com/ChrisShank/369aa8cbd4002244d7769bd1ba3e232a) to see some core ideas and a simple example

## Open a New Window

All the new window creation is handled by Tauri. we just create the draft and calls the open window function. Tauri will check if the document is currently open in any of its available windows. If there's one window available, it will focus that window. If not, it will create a new window with the new URL.

There are multiple ways a user can create a new window. For every way, the one that controls the actions is the main-machine.

You will find multiple buttons and context menu items throughout the app that triggers the creation of a new window, but those can be summarize into a couple of Scenarios:

1. **Open a Publication**: We pass the Publication's URL to the open function
1. **Open a Draft**: We pass the Draft's URL to the open function
1. **Create a new Draft**: In this case, the main-machine will create a new draft, generates the new URL and then call the open function with the generated URL.
1. **Edit a Publication**: In this case, the main-machine will create a new draft from the current publication, generates the new URL and then call the open function with the generated URL.
