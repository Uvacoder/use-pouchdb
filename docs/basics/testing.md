---
id: testing
title: Testing
---

Now that everything is working, let's make sure that it stays that way!

## Packages to install

There are 3 packages I recommend you'll install:

- [pouchdb-adapter-memory](https://www.npmjs.com/package/pouchdb-adapter-memory)
- [react-hooks-testing-library](https://www.npmjs.com/package/@testing-library/react-hooks)
- [React Testing Library](https://www.npmjs.com/package/@testing-library/react) (pre installed with
  Create-React-App)

<!--DOCUSAURUS_CODE_TABS-->
<!--npm-->

```sh
npm i -D pouchdb-adapter-memory @testing-library/react-hooks @testing-library/react
```

<!--yarn-->

```sh
yarn add -D pouchdb-adapter-memory @testing-library/react-hooks @testing-library/react
```

<!--END_DOCUSAURUS_CODE_TABS-->

### pouchdb-adapter-memory

[pouchdb-adapter-memory](https://www.npmjs.com/package/pouchdb-adapter-memory) is a
[PouchDB Adapter](https://pouchdb.com/adapters.html). Adapters translate how your documents are stored and
accessed. For example [pouchdb-adapter-http](https://www.npmjs.com/package/pouchdb-adapter-http) (pre installed on
most PouchDB setups) translates them into CouchDB's HTTP API.

But pouchdb-adapter-memory only stores them in _memory_. Perfect or testing!

### react-hooks-testing-library

[react-hooks-testing-library](https://www.npmjs.com/package/@testing-library/react-hooks) is a really good testing
library, specialized in testing React Hooks.

The documentation for it can be found on https://react-hooks-testing-library.com/.

You can use it to test your own hooks. Be they extensions of hooks from `usePouchDB` or your own.

### React Testing Library

[React Testing Library](https://www.npmjs.com/package/@testing-library/react) comes pre-installed with
create-react-app. It is a testing library that encourage you to test from the users perspective.

The documentation for it can be found at https://testing-library.com/docs/react-testing-library/intro.

## Tests

Your tests should be closed systems. And no test before or after it should influence them. To achieve this I
recommend that you create a new PouchDB database before each test. And that db should have the
`pouchdb-adapter-memory` active.

```javascript
// Using jest
import PouchDB from 'pouchdb'
import memory from 'pouchdb-adapter-memory'

// add the adapter to PouchDB
PouchDB.plugin(memory)

let myPouch = null

beforeEach(() => {
  // before each test, create a new DB with the memory adapter.
  // nothing will be saved on disc!
  myPouch = new PouchDB('test', { adapter: 'memory' })
})

afterEach(async () => {
  // Destroy the database after each test,
  // so that no data will be left from the previous test.
  await myPouch.destroy()
})
```

Also remember, that you must add all needed document before/during the test!

### Components

All hooks must be in child components of [`<Provider />`](../api/provider.md).

For **React Testing Library** you can warp your component with `<Provider />`:

```jsx
import React from 'react'
import { render } from '@testing-library/react'
import PouchDB from 'pouchdb'
import memory from 'pouchdb-adapter-memory'

import TodoList from './TodoList'

PouchDB.plugin(memory)

let myPouch = null

beforeEach(() => {
  myPouch = new PouchDB('test', { adapter: 'memory' })
})

afterEach(async () => {
  await myPouch.destroy()
})

test('Test Component', async () => {
  // Add needed documents
  const putResult = await myPouch.bulkDocs([
    {
      _id: new Date(2020, 4, 30, 22, 03, 45, 0).toJSON(),
      type: 'todo',
      text: 'a todo',
      done: false,
    },
    {
      _id: new Date(2020, 4, 30, 21, 03, 45, 0).toJSON(),
      type: 'todo',
      text: 'moar todo',
      done: false,
    },
  ])

  // Render the Component
  const { queryByByText } = render(
    <Provider pouchdb={db}>
      <TodoList />
    </Provider>
  )

  const first = queryByByText('moar todo')
  expect(first).toBeTruthy()
  expect(first.nodeName).toBe('SPAN')
  expect(first.parentNode.nodeName).toBe('LI')
  expect(first.previousElementSibling.nodeName).toBe('INPUT')
  expect(first.previousElementSibling.nodeName.type).toBe('checkbox')

  const second = queryByByText('a todo')
  expect(second).toBeTruthy()
  expect(second.nodeName).toBe('SPAN')
  expect(second.parentNode.nodeName).toBe('LI')
  expect(second.previousElementSibling.nodeName).toBe('INPUT')
  expect(second.previousElementSibling.nodeName.type).toBe('checkbox')

  expect(second.parentNode.previousElementSibling).toBe(first.parentNode)
})
```

[`myPouch.bulkDocs`](https://pouchdb.com/api.html#batch_create) is a method to create/update
multiple docs in one go.

### Hooks

To test hooks that depend on one of `usePouchDB`'s hooks, you also must warp it in
[`<Provider />`](../api/provider.md).

**react-hooks-testing-library**'s `renderHook` function can receive in the second argument a warper
([documented here](https://react-hooks-testing-library.com/usage/advanced-hooks#context)).

Let's test the addTodo from [**Add Todos**](./add-todo.md) extracted into a hook:

```javascript
// hooks.js
import { useCallback } from 'react'
import { usePouch } from 'use-pouchdb'

// This hook returns a function, which we then call with the todo's text.
export function useAddDoc() {
  const db = usePouch()

  return useCallback(
    text => {
      const doc = {
        _id: new Date().toJSON(),
        type: 'todo',
        text: text,
        done: false,
      }

      return db.put(doc)
    },
    [db]
  )
}
```

```jsx
import React from 'react'
import { renderHook } from '@testing-library/react-hooks'
import PouchDB from 'pouchdb'
import memory from 'pouchdb-adapter-memory'
import { Provider } from 'use-pouchdb'

import { useAddDoc } from './hooks'

PouchDB.plugin(memory)

let myPouch = null

beforeEach(() => {
  myPouch = new PouchDB('test', { adapter: 'memory' })
})

afterEach(async () => {
  await myPouch.destroy()
})

test('add document', async () => {
  const wrapper = ({ children }) => (
    <Provider pouchdb={myPouch}>{children}</Provider>
  )
  const { result } = renderHook(() => useAddDoc(), {
    wrapper,
  })

  expect(typeof result.current).toBe('function')

  await result.current('test todo')

  const { rows } = await myPouch.allDocs({ include_docs: true })
  expect(rows).toHaveLength(1)
  expect(rows[0]).toEqual({
    _id: expect.any(String),
    _rev: expect.any(String),
    type: 'todo',
    text: 'test todo',
    done: false,
  })
})
```

Now we are finished with our Todo example. All Todos are replicated, users can sign up and log in.
I know, this was a long tutorial, but we did cover a lot!

Happy coding! ????????
