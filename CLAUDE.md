# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## XState v5 Migration

This codebase uses XState v5 with xstate-tree v5. Key differences from v4:
- Use `setup()` to configure machines with typed actors, actions, guards
- Replace `@xstate/immer` with native XState v5 assign functions  
- Use `assertEvent` for type-safe event handling
- Actor spawning uses actor names from `setup()` configuration
- View property is now capitalized as `View` in createXStateTreeMachine
- The `provide()` method now correctly preserves xstate-tree metadata
- Children in final states must be manually stopped with `stopChild`

## Essential Commands

### Development
- `npm install` - Install dependencies
- `npm run build` - Build the library (outputs to `lib/`)
- `npm run build:watch` - Build in watch mode

### Testing
- `npm test` - Run all tests using Jest
- `npm test -- --watch` - Run tests in watch mode
- `npm test -- path/to/file.spec.tsx` - Run a specific test file
- `npm test -- --testNamePattern="pattern"` - Run tests matching pattern
- `npm run test-examples` - Type-check example code

### Code Quality
- `npm run lint` - Run ESLint on src/**/*
- TypeScript is checked during build, no separate typecheck script

### Examples
- `npm run todomvc` - Run the TodoMVC example app with Vite

### Release
- `npm run release` - Semantic release (CI only)
- `npm run api-extractor` - Generate API documentation

## Architecture Overview

xstate-tree is a UI framework that uses XState v5 actors as building blocks, combining state machines with React views in a hierarchical tree structure.

### Core Concepts

1. **Machine Trees**: Applications are modeled as a tree of XState machines, each responsible for a sub-section of the UI. Child machines are invoked/spawned into parent "slots".

2. **createXStateTreeMachine**: The main builder function that binds together:
   - **Selectors**: Transform machine state into view-friendly data (memoized)
   - **Actions**: Abstract event sending, receive `send` and selector results
   - **Slots**: Define where child machines render (single or multi)
   - **View**: React component receiving actions, selectors, and slots as props (note: capital V in v5)

3. **Loose Coupling**: Views have no direct knowledge of the state machine, enabling easy testing and Storybook integration.

4. **Inter-machine Communication**: Uses `broadcast()` for global events between machines. Events must be declared in the global `XstateTreeEvents` interface.

5. **Routing**: Hierarchical routing system based on composed route objects:
   - Routes are built using `createRoute.simpleRoute()` or `createRoute.route()`
   - Routes can be nested to match the machine hierarchy
   - Uses `path-to-regexp` for URL pattern matching
   - Routing events are broadcast to all machines

### Key Files and Directories

- `src/xstateTree.tsx` - Core runtime, machine-to-view binding, and broadcasting
- `src/builders.tsx` - `createXStateTreeMachine`, `viewToMachine` (supports Root components), and `buildRoutingMachine` utilities
- `src/slots/` - Slot system for parent-child machine composition
- `src/routing/` - Routing implementation with route matching, navigation, `useOnRoute` hook, and `TestRoutingContext` for testing
- `src/useService.ts` - Hook for subscribing to machine state changes
- `src/lazy.tsx` - Lazy loading support for code splitting
- `examples/todomvc/` - Complete example application using XState v5
- `src/test-app/` - Test fixtures and integration tests

### Testing Approach

- Unit tests use `.spec.tsx` files alongside source
- Integration tests in `src/test-app/tests/`
- Uses Jest with ts-jest and React Testing Library
- Test environment: jsdom
- Setup script: `src/setupScript.ts`
- `TestRoutingContext` available for testing routing scenarios
- `genericSlotsTestingDummy` for mocking slots in tests/Storybook

### TypeScript Patterns

- Heavy use of generics for type safety between machines, selectors, and actions
- Global event types declared via `declare global { interface XstateTreeEvents { ... } }`
- Machine metadata types for routing: `XstateTreeMachineStateSchemaV2`
- Extensive use of type inference to reduce boilerplate
- `AnyXstateTreeMachine` type for any xstate-tree machine
- XState v5 types: `SnapshotFrom`, `ActorRefFrom`, `InputFrom`, etc.

### Build Process

- TypeScript compilation to `lib/` directory (TypeScript 5.0.2)
- Outputs both `.js` and `.d.ts` files with source maps
- API documentation generated via api-extractor
- Main entry: `lib/index.js`, Types: `lib/xstate-tree.d.ts`
- Peer dependencies: xstate ^5.x, @xstate/react ^4.x