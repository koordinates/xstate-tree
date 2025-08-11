# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

xstate-tree is a UI framework that uses XState actors as building blocks, combining state machines with React views in a hierarchical tree structure.

### Core Concepts

1. **Machine Trees**: Applications are modeled as a tree of XState machines, each responsible for a sub-section of the UI. Child machines are invoked/spawned into parent "slots".

2. **createXStateTreeMachine**: The main builder function that binds together:
   - **Selectors**: Transform machine state into view-friendly data (memoized)
   - **Actions**: Abstract event sending, receive `send` and selector results
   - **Slots**: Define where child machines render (single or multi)
   - **View**: React component receiving actions, selectors, and slots as props

3. **Loose Coupling**: Views have no direct knowledge of the state machine, enabling easy testing and Storybook integration.

4. **Inter-machine Communication**: Uses `broadcast()` for global events between machines. Events must be declared in the global `XstateTreeEvents` interface.

5. **Routing**: Hierarchical routing system based on composed route objects:
   - Routes are built using `createRoute.simpleRoute()` or `createRoute.route()`
   - Routes can be nested to match the machine hierarchy
   - Uses `path-to-regexp` for URL pattern matching
   - Routing events are broadcast to all machines

### Key Files and Directories

- `src/xstateTree.tsx` - Core runtime, machine-to-view binding, and broadcasting
- `src/builders.tsx` - `createXStateTreeMachine` and legacy builders
- `src/slots/` - Slot system for parent-child machine composition
- `src/routing/` - Routing implementation with route matching and navigation
- `src/useService.ts` - Hook for subscribing to machine state changes
- `examples/todomvc/` - Complete example application
- `src/test-app/` - Test fixtures and integration tests

### Testing Approach

- Unit tests use `.spec.tsx` files alongside source
- Integration tests in `src/test-app/tests/`
- Uses Jest with ts-jest and React Testing Library
- Test environment: jsdom
- Setup script: `src/setupScript.ts`

### TypeScript Patterns

- Heavy use of generics for type safety between machines, selectors, and actions
- Global event types declared via `declare global { interface XstateTreeEvents { ... } }`
- Machine metadata types for routing: `XstateTreeMachineStateSchemaV1/V2`
- Extensive use of type inference to reduce boilerplate

### Build Process

- TypeScript compilation to `lib/` directory
- Outputs both `.js` and `.d.ts` files with source maps
- API documentation generated via api-extractor
- Main entry: `lib/index.js`, Types: `lib/xstate-tree.d.ts`