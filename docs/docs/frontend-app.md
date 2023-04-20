# App Main Architecture

in a normal frontend application, the page route is a crucial part. It's the source of truth of that and what not to render. In Mintter is not that important.

Mintter have three main components that needed to render depending on the state its coming from, for example, when we create a new Document and open a new window.

## Main page machine

the app is controlled by one machine: The main page machine. this machine is in charge of a couple of things:

1. [Open new windows](#open-a-new-window)
2. [Create new Drafts](#create-new-drafts)
3. [Store Current file reference](#store-current-file)

### Open a New Window

All the new window creation is handled by Tauri. we just create the draft and calls the open window function. Tauri will check if the document is currently open in any of its available windows. If there's one window available, it will focus that window. If not, it will create a new window with the new URL.

There are multiple ways a user can create a new window. For every way, the one that controls the actions is the main-machine.

You will find multiple buttons and context menu items throughout the app that triggers the creation of a new window, but those can be summarize into a couple of Scenarios:

1. **Open a Publication**: We pass the Publication's URL to the open function
1. **Open a Draft**: We pass the Draft's URL to the open function
1. **Create a new Draft**: In this case, the main-machine will create a new draft, generates the new URL and then call the open function with the generated URL.
1. **Edit a Publication**: In this case, the main-machine will create a new draft from the current publication, generates the new URL and then call the open function with the generated URL.

### Create new Drafts

WIP

### Store Current File

WIP