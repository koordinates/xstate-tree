# xstate-tree routing, how does it work?

Since xstate-tree is designed around a hierarchical tree of machines, routing can't function similar to how react-router works

Instead, routing is based around the construction of route objects representing specific urls. Route objects can be composed together to create hierarchies, designed to mimic the xstate-tree machine hierarchy, but not required to match the actual hierarchy of machines

## Constructing routes

First you must build a `createRoute` function, this can be done by calling `buildCreateRoute` exported from xstate-tree. `buildCreateRoute` takes two arguments, a history object and a basePath. These arguments are then stapled to any routes created by the returned `createRoute` function from `buildCreateRoute` so the routes can make use of them. These arguments must match the history and basePath arguments provided to `buildRootComponent`

To construct a Route object you can use the `route` function or the `simpleRoute` function. Both are "curried" functions, meaning they return a function when called which requires more arguments. The argument to both is an optional parent route, the argument to the second function is the route options object.

### route

A route gives you full control over the matching and reversing behavior of a route. It's up to you to supply a `matcher` and `reverser` function which control this. The matcher function is supplied the url to match as well as the query string parsed into an object. It then returns either false to indicate no match, or an object containing the extracted params/query data as well as a `matchLength` property which indicates how much of the URL was consumed by this matcher. The passed in URL will always be normalized to start with `/` and end with `/`

The match length is required because matching nested routes start from the highest parent route and matches from parent -> child until either a route doesn't match, or the entire URL is consumed, the route does not match if there is any URL left unconsumed. This also means that routes can't attempt to match the full URL if they are a parent route, ie no using regexes with `$` anchors. If matching the URL with a regex the `matchLength` will be `match[0].length` where `match` is the result of `regex.exec(url)`

The `reverser` function is supplied an object containing `params` if the route defines them, and `query` if the route defines them. `query` can be undefined even if the route provides them because they are only passed to the reverser function for the actual route being reversed, not for any parent routes. The reverser function returns a url representing the given params/query combination.

The other arguments are the event, paramsSchema, querySchema and meta type.

### simpleRoute

Simple route is built on top of `route`, for when you aren't interested in full control of the matcher and reverser functions. It takes the same arguments as `route`, without `matcher`/`reverser` and with an additional `url`. The `url` is a string parsed by [path-to-regexp](https://www.npmjs.com/package/path-to-regexp) to generate the `matcher`/`reverser` functions automatically. Simple routes can be composed with normal routes.


Examples

```typescript
// In practice you would always use a simpleRoute for this, this is just to show how `route` works
const parentRoute = createRoute.route()({
  event: "GO_FOO",
  matcher: (url) => {
    if (url === "/foo/") {
      return {
        matchLength: 5,
      };
    }

    return false;
  },
  reverser: () => "/foo/",
});
const childRoute = createRoute.simpleRoute(parentRoute)({
  url: "/bar/:barId",
  event: "GO_BAR", 
  paramsSchema: Z.object({
    barId: Z.string()
  })
});

const routeWithMeta = createRoute.simpleRoute()({
  url: "/whatever",
  event: "GO_WHATEVER", 
  meta: {} as { metaField: string }
});
```

The parent route does not extend another route so the first function call takes no arguments, it does not define any params as part of the URL or consume any query string arguments so it does not require any arguments

The child route extends the parent route, adding it as an argument to the first function call, and defines params as part of the URL so has a params schema defined with Zod

Since the child route composes with the parent route the resulting URL that it will match against is actually /foo/bar/123. If the parent route had defined a params schema or a meta type, those would also have been composed with the the routes params schema/meta type


### Redirects

Routes (both route and simpleRoute) can define an async redirect function. This function is called whenever a route is matched, for all routes in the routing chain. The function is called with the params/query/meta object that the route was originally matched with and you can return a new set of params and/or query objects to perform a redirect. If you return `undefined` no redirect will be performed. You may also navigate to a different route inside this function.

The results of calling the redirect functions is merged with the original params/query/meta objects, from top to bottom (so if two routes override the same param, the one from the parent route will be overwritten).

If the URL is updated while the async redirect function is running then the redirect will be aborted and the redirect will be ignored. An AbortSignal is passed to the redirect functions to enable hooking this into any async processes you may be running.

```typescript
const parentRoute = createRoute.simpleRoute()({
  url: "/foo/:bar",
  event: "GO_FOO",
  paramsSchema: Z.object({
    bar: Z.string()
  }),
  redirect: async ({ params }) => {
    if (params.bar === "123") {
      return {
        params: {
          bar: "456"
        }
      };
    }
  }
});
const childRoute = createRoute.simpleRoute(parentRoute)({
  url: "/baz/:qux",
  event: "GO_BAR", 
  paramsSchema: Z.object({
    qux: Z.string()
  }),
  redirect: async ({ params }) => {
    if (params.qux === "789") {
      return {
        params: {
          bar: "123",
          qux: "012"
        }
      };
    }
  }
});
```

So if the URL is /foo/123/baz/789, the redirect functions will be called in the following order:
1. parentRoute with { params: { bar: "123" } }
2. childRoute with { params: { qux: "789" } }

Since parentRoute returns a redirect to { bar: "456" } but the child route returns a redirect to { bar: "123", qux: "012" } the final params will be { bar: "123", qux: "012" } because the child route overrode the parent route's redirect

### What is the "meta" type?

When you call history.pushState you can also supply "state" data, this is stored in the history stack. When a popstate event is fired it contains the "state" of that history entry that was stored with pushState, but this state is not actually part of the URL. It's just additional data we can attach to a history entry

What this allows for is attaching "enriched" data to a routing event that isn't required for the route to function, since it won't be present during the initial page load, but can be used by handlers of the route to access extra data for some purpose.

The meta field on a routing event (if it has a meta type defined) is optional, but will be defined if the route event was broadcast with meta (ie if you attached meta to a Link route) or from a popstate event where it extracts the state associated with the history and attaches it to the meta property of the event

This is used in browse-data when opening a datasheet to pass the dataset the sheet is opening along with the routing event so it doesn't require the datasheet to load the dataset again. On the initial page load where meta won't be set for that route the dataset sheet fetches the dataset from the API

Because the meta information is attached from popstate events it means that if the user closes the datasheet and then presses the back button, opening the datasheet again, the dataset is already loaded from the history state instead of having to fetch it from the API again.

## Using routes

The most common usages of routes are using the `Link` component, creating a navigation function with `useRouteNavigator`, or detecting active routes.

### Navigation

The `Link` component accepts a Route in the `to` prop and then requires query/params/meta props as per that route. It renders an `a` tag pointing at the full URL of the route (relative to the configured base path). Any props an `a` tag accepts can be used, barring `onClick` and `href`

`useRouteNavigator` takes a Route as the only argument and returns a function that can be called with params/query/meta objects and navigates to the URL for the route when called

### Route Detection

`useIsRouteActive` checks if a route is part of the active route chain (i.e., it or any of its child routes are active)

`useOnRoute` is a hook that executes a callback when you're on the exact route (not just part of the chain). Useful for side effects:

```typescript
useOnRoute(myRoute, ({ params, query }) => {
  // This runs only when myRoute is the active end route
  console.log("On exact route with params:", params);
});
```

`useRouteArgsIfActive` returns the route arguments if the route is active, otherwise undefined

`useActiveRouteEvents` returns all currently active routing events

There are a couple other functions on routes like `reverse`, `navigate`, `getEvent` and `matches` but those are primarily for internal use

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
const topRoute = createRoute.simpleRoute()({ url: "/foo", event: "GO_FOO" });
const middleRoute = createRoute.simpleRoute(topRoute)({ url: "/bar", event: "GO_BAR" });
const bottomRoute = createRoute.simpleRoute(middleRoute)({ url: "/qux", event: "GO_QUX" });
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

If it does not find a matching route, either because no routes matched, or because the matching route threw an error parsing the query/params schema it logs an error message currently

404 and routing errors are now logged with more detail. Routing errors include the actual underlying match error for better debugging.

## Adding routes to an xstate-tree root machine

In v5, `buildRootComponent` has changed its signature. For applications with routing, you pass a single object containing both the machine and routing configuration:

The routes should be fairly self explanatory, export a routes array from the routes definition file and ensure the routes are in the right order for matching.

The history object must be a shared history object for the project, in Matais case that is the `~matai-history` import. It is important that the same history object is used in Matai as it is also used in React router

The basePath is prepended to route links and stripped from routing events when they come in. This should be set to the URL that the root machine is going to be rendered at. In Matai React router will handle navigation to that URL and any sub URLs are handled by xstate-tree routing

There are two optional arguments that won't be needed in Matai but will be needed in Rimu, `getPathName` and `getQueryString` which are functions that return pathname/query string respectively.

These by default return window.location.pathname and window.location.search which is fine for Matai but won't work in Rimu

## Testing Routes

For testing routing scenarios, you can use `TestRoutingContext` which allows nesting routing roots inside test contexts. This is useful for testing complex routing behaviors in isolation.

### A full example

```typescript
import { setup } from "xstate";
import { createXStateTreeMachine, buildRootComponent } from "@koordinates/xstate-tree";

const home = createRoute.simpleRoute()({ url: "/", event: "GO_HOME" });
const products = createRoute.simpleRoute()({ url: "/products", event: "GO_PRODUCTS" });
const product = createRoute.simpleRoute(products)({
  url: "/:productId(\\d+)",
  event: "GO_PRODUCT", 
  paramsSchema: Z.object({
    // All params come in as strings, but this actually represents a number so transform it into one
    productId: Z.string().transform((id) => parseInt(id, 10))
  })
});

// Routes only match exact URLs, so '/' won't match '/products', unlike react-router
const routes = [home, products, product];

const machine = setup({
  types: {} as {
    events: 
      | { type: "GO_HOME" }
      | { type: "GO_PRODUCTS" }
      | { type: "GO_PRODUCT"; productId: number };
  }
}).createMachine({
  initial: "home",
  on: {
    GO_HOME: "home",
    GO_PRODUCTS: "products",
  },
  states: {
    home: {},
    products: {
      on: {
        GO_PRODUCT: ".product"
      },
      initial: "index",
      states: {
        index: {},
        product: {}
      }
    }
  }
});

const App = createXStateTreeMachine(machine, {
  selectors: ({ ctx }) => ctx,
  actions: ({ send }) => ({}),
  View: () => <div>App View</div>,
});

const history = createBrowserHistory();

// v5 signature - single object parameter
export const Root = buildRootComponent({
  machine: App,
  routing: {
    routes,
    history,
    basePath: "/"
  }
});

// Or without routing
export const RootWithoutRouting = buildRootComponent(App);
```