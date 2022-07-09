# xstate-tree routing, how does it work?

Since xstate-tree is designed around a hierarchical tree of machines, routing can't function similar to how react-router works

Instead, routing is based around the construction of route objects representing specific urls. Route objects can be composed together to create hierarchies, designed to mimic the xstate-tree machine hierarchy, but not required to match the actual hierarchy of machines

## Constructing routes

First you must build a `createRoute` function, this can be done by calling `buildCreateRoute` exported from xstate-tree. `buildCreateRoute` takes two arguments, a history object and a basePath. These arguments are then stapled to any routes created by the returned `createRoute` function from `buildCreateRoute` so the routes can make use of them. These arguments must match the history and basePath arguments provided to `buildRootComponent`

To construct a Route object you use the `createRoute` function. `createRoute` is a "curried" function, meaning it returns a function when called which requires more arguments. The first argument to `createRoute` is an optional parent route, the arguments to the second function are, url this route handles, event for the route and an options object to define params/query schemas and the meta type

Examples

```typescript
const parentRoute = createRoute.staticRoute()("/foo", "GO_FOO");
const childRoute = createRoute.staticRoute(parentRoute)("/bar/:barId", "GO_BAR", {
  params: Z.object({
    barId: Z.string()
  })
});

const routeWithMeta = createRoute.staticRoute()("/whatever", "GO_WHATEVER", {
  meta: {} as { metaField: string }
});
```

The parent route does not extend another route so the first function call takes no arguments, it does not define any params as part of the URL or consume any query string arguments so it does not require any arguments

The child route extends the parent route, adding it as an argument to the first function call, and defines params as part of the URL so has a params schema defined with Zod

Since the child route composes with the parent route the resulting URL that it will match against is actually /foo/bar/123. If the parent route had defined a params schema or a meta type, those would also have been composed with the the routes params schema/meta type

### What is the "meta" type?

When you call history.pushState you can also supply "state" data, this is stored in the history stack. When a popstate event is fired it contains the "state" of that history entry that was stored with pushState, but this state is not actually part of the URL. It's just additional data we can attach to a history entry

What this allows for is attaching "enriched" data to a routing event that isn't required for the route to function, since it won't be present during the initial page load, but can be used by handlers of the route to access extra data for some purpose.

The meta field on a routing event (if it has a meta type defined) is optional, but will be defined if the route event was broadcast with meta (ie if you attached meta to a Link route) or from a popstate event where it extracts the state associated with the history and attaches it to the meta property of the event

This is used in browse-data when opening a datasheet to pass the dataset the sheet is opening along with the routing event so it doesn't require the datasheet to load the dataset again. On the initial page load where meta won't be set for that route the dataset sheet fetches the dataset from the API

Because the meta information is attached from popstate events it means that if the user closes the datasheet and then presses the back button, opening the datasheet again, the dataset is already loaded from the history state instead of having to fetch it from the API again.

## Using routes

The two most common usages of routes are using it with the `Link` component or creating a navigation function with `useRouteNavigator`

The `Link` component accepts a Route in the `to` prop and then requires query/params/meta props as per that route. It renders an `a` tag pointing at the full URL of the route (relative to the configured base path). Any props an `a` tag accepts can be used, barring `onClick` and `href`

`useRouteNavigator` takes a Route as the only argument and returns a function that can be called with params/query/meta objects and navigates to the URL for the route when called

There are a couple other functions on them like `reverse`, `navigate`, `getEvent` and `matches` but those are primarily for internal use

## What happens when navigating to a route?

When the page loads or when the url is updated xstate-tree takes the URL and query string (if it exists) and iterates through the list of routes it knows about (how it knows we will get to after this) looking for a route that matches the current URL

### A matching route is found

1. Collect all of the routes parent routes into an array
2. Iterates through that array generating events from those routes based on the current URL params/query
3. broadcasts the events for those routes in reverse order, ie the topmost route -> its child -> its child -> the route that was matched
4. Stores the routing events that were just broadcast
5. When a new child machine is invoked it gets sent every routing event (in the same order) that it has a handler for

It is done this way so that you don't need to have handlers at every layer of the machine tree handling every routing event that a sub machine might route to.

How this works in practice is like so, given the following routes

```typescript
const topRoute = createRoute.staticRoute()("/foo", "GO_FOO");
const middleRoute = createRoute.staticRoute(topRoute)("/bar", "GO_BAR");
const bottomRoute = createRoute.staticRoute(middleRoute)("/qux", "GO_QUX");
```

if you were to load up the URL `/foo/bar/qux` which is matched by the `bottomRoute` the following happens

broadcast GO_FOO
broadcast GO_BAR
broadcast GO_QUX

Assuming you have a hierarchy of four machines, with the root invoking the top, which invokes the middle which invokes the bottom, you design it as so

root machine -> GO_FOO -> invokes top machine  
top machine -> GO_BAR -> invokes middle machine  
middle machine -> GO_QUX -> invokes bottom machine  

That way the root machine doesn't need to have a handler for all three of GO_FOO/GO_BAR/GO_QUX events causing it to invoke the top machine

If you were already on the `/foo/bar/qux` url and navigated to the `/foo/bar` url then GO_FOO and GO_BAR would be broadcast

### No matching route is found

If it does not find a matching route, either because no routes matched, or because the matching route threw an error parsing the query/params schemas it logs an error message currently

404 and routing "errors" don't currently have any way to handle them, this will be worked on when it is needed (soon?)

## Adding routes to an xstate-tree root machine

`buildRootComponent` takes a 2nd optional routing configuration object. This object requires you to specify an array of routes (routes are matched in the order they are in the array), a history object, and a basePath.

The routes should be fairly self explanatory, export a routes array from the routes definition file and ensure the routes are in the right order for matching.

The history object must be a shared history object for the project, in Matais case that is the `~matai-history` import. It is important that the same history object is used in Matai as it is also used in React router

The basePath is prepended to route links and stripped from routing events when they come in. This should be set to the URL that the root machine is going to be rendered at. In Matai React router will handle navigation to that URL and any sub URLs are handled by xstate-tree routing

There are two optional arguments that won't be needed in Matai but will be needed in Rimu, `getPathName` and `getQueryString` which are functions that return pathname/query string respectively.

These by default return window.location.pathname and window.location.search which is fine for Matai but won't work in Rimu

### A full example

```typescript
const home = createRoute.staticRoute()("/", "GO_HOME");
const products = createRoute.staticRoute()("/products", "GO_PRODUCTS");
const product = createRoute.staticRoute(products)("/:productId(\\d+)", "GO_PRODUCT", {
  params: Z.object({
    // All params come in as strings, but this actually represents a number so transform it into one
    productId: Z.string().transform((id) => parseInt(id, 10))
  })
});

// Routes only match exact URLs, so '/' won't match '/products', unlike react-router
const routes = [home, products, product];

const machine = createMachine({
  initial: "home",
  on: {
    GO_HOME: "home",
    GO_PRODUCTS: "products",
  },
  states: {
    home: {},
    products: {
      on: {
        GO_PRODUCTS: ".product"
      },
      initial: "index",
      states: {
        index: {},
        product: {}
      }
    }
  }
});

const App = buildXstateTreeMachine(machine, {
  selectors: ...,
  actions: ...,
  view: ...,
});

const history = createBrowserHistory();
export const Root = buildRootComponent(App, {
  routes,
  history,
  basePath: "/"
});
```