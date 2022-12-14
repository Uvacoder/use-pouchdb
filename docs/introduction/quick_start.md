---
id: quick_start
title: Quick Start
---

[usePouchDB](https://github.com/Terreii/use-pouchdb) is a collection of _React Hooks_ to access data in a
_PouchDB database_.

## Purpose

usePouchDB is intended to be used by small
[CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete 'CRUD on Wikipedia') apps and more complicated
Web-Apps alike. It was originally created by me, after I realised that with [PouchDB](https://pouchdb.com/) (and
its [vast plugin ecosystem](https://pouchdb.com/external.html 'List of plugins for PouchDB')),
[CouchDB](https://couchdb.apache.org/) as the data backend and [React](https://reactjs.org/) with
[Hooks](https://reactjs.org/docs/hooks-intro.html), you have everything you need to build a CRUD Web-App.

> Note that usePouchDB is, only optimised for local DBs and not for accessing a DB over
> HTTP! But you can still use it over HTTP.
>
> It subscribes to all changes and once for every used view! And every subscription is a HTTP
> request. It will still work, but when you use views, it could exceed the 6 concurrent request
> per domain limit on HTTP 1.1.
>
> When you restrict yourself to not use views, then usePouchDB should work well over HTTP.
> Or if you use **HTTP 2** or newer, that this limitation doesn't matter!

## Installation

usePouchDB requires **React 16.8.3 or later**.

To use usePouchDB with your React app:

```sh
npm install use-pouchdb
```

or

```sh
yarn add use-pouchdb
```

You'll also need to [install PouchDB](https://pouchdb.com/guides/setup-pouchdb.html 'PouchDBs installation guide').
There is also a special [browser version](https://www.npmjs.com/package/pouchdb-browser).

<!--DOCUSAURUS_CODE_TABS-->
<!--npm-->

```sh
npm i -D pouchdb-browser
```

<!--yarn-->

```sh
yarn add -D pouchdb-browser
```

<!--END_DOCUSAURUS_CODE_TABS-->

## Provider

usePouchDB provides a `<Provider />`, to make a PouchDB database available to its child components.

Please visit [`<Provider />`'s API docs](../api/provider.md) for its complete API.

```jsx
// Single database
import React from 'react'
import ReactDOM from 'react-dom'
import PouchDB from 'pouchdb-browser'

import { Provider } from 'use-pouchdb'

import App from './App'

const db = new PouchDB('local')

ReactDOM.render(
  <Provider pouchdb={db}>
    <App />
  </Provider>,
  document.getElementById('root')
)
```

```jsx
// Multiple databases
import React from 'react'
import ReactDOM from 'react-dom'
import PouchDB from 'pouchdb-browser'

import { Provider } from 'use-pouchdb'

import App from './App'

const db = new PouchDB('local')
const remoteDb = new PouchDB('https://example.com/db')

ReactDOM.render(
  <Provider
    default="local"
    databases={{
      local: db,
      remote: remoteDb,
    }}
  >
    <App />
  </Provider>,
  document.getElementById('root')
)
```

## useDoc

usePouchDB provides a `useDoc` hook to access a single document. It automatically subscribes to updates of that
document.

Please visit [`useDoc`'s API docs](../api/use-doc.md) for more options.

```jsx
import React from 'react'

import { useDoc } from 'use-pouchdb'

export default function BlogPost({ id }) {
  const { doc, state, loading, error } = useDoc(id)

  if (loading && doc == null) {
    return <Loading />
  }

  if (state === 'error' && error) {
    return <Error error={error} />
  }

  return (
    <article>
      <DocDisplay doc={doc} />
    </article>
  )
}
```

## useAllDocs

The [allDocs method](https://pouchdb.com/api.html#batch_fetch) is accessible using the `useAllDocs` hook. It, too,
automatically subscribes to updates of those documents (and new ones).

Please visit the [`useAllDocs` API docs](../api/use-all-docs.md) for more options.

```jsx
import React from 'react'

import { useAllDocs } from 'use-pouchdb'

export default function AllPosts() {
  const { rows, offset, total_rows, state, loading, error } = useAllDocs({
    startkey: 'posts:',
    endkey: 'posts:\uffff',
    include_docs: true,
  })

  if (loading && rows.length === 0) {
    return <Loading />
  }

  if (state === 'error' && error) {
    return <Error error={error} />
  }

  return (
    <div>
      {rows.map(row => (
        <PostPreview key={row.id} post={row.doc} />
      ))}
    </div>
  )
}
```

## useFind

Access a [Mango query](https://pouchdb.com/guides/mango-queries.html), and if it doesn't exist, create it.
`useFind` also subscribes to updates to that index.

Please visit the [`useFind` API docs](../api/use-find.md) for more options.
And CouchDBs [Mango query language docs](https://docs.couchdb.org/en/stable/api/database/find.html#selector-syntax).

```jsx
import React from 'react'
import { useFind } from 'use-pouchdb'

export default function StoryList() {
  const { docs, warning, loading, state, error } = useFind({
    // Ensure that this index exist, create it if not. And use it.
    index: {
      fields: ['type', 'title'],
    },
    selector: {
      type: 'story',
      title: { $gt: null },
    },
    sort: ['title'],
    fields: ['_id', 'title'],
  })

  return (
    <main>
      <h1>Stories</h1>

      {error && (
        <p>
          Error: {error.status} - {error.name}
        </p>
      )}
      {loading && docs.length === 0 && <p>loading...</p>}

      <ul>
        {docs.map(doc => (
          <li key={doc._id}>
            <a href={`./${doc._id}`}>{doc.title}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

> `useFind` requires [`pouchdb-find`](https://www.npmjs.com/package/pouchdb-find) to be
> installed and setup.

## useView

Accessing a [view](https://docs.couchdb.org/en/stable/ddocs/views/index.html 'CouchDBs Guide to Views') ([PouchDBs
query](https://pouchdb.com/api.html#query_database 'Documentation about db.query')) is accomplished using the hook
`useView`. It also automatically subscribes to updates of that view.

```jsx
import React from 'react'

import { useView } from 'use-pouchdb'

export default function Comments({ id }) {
  const { rows, offset, total_rows, state, loading, error } = useView(
    'blog/comments', // use the view 'comments' in '_design/blog' design document
    {
      startkey: [id],
      endkey: [id, {}],
      include_docs: true,
    }
  )

  if (loading && rows.length === 0) {
    return <Loading />
  }

  if (state === 'error' && error) {
    return <Error error={error} />
  }

  return (
    <div>
      {rows.map(row => (
        <Comment key={row.key.join('_')} comment={row.doc} />
      ))}
    </div>
  )
}
```

## usePouch

Sometimes you need more direct access to a PouchDB instance. `usePouch` gives you access to the database provided
to `<Provider />`.

```jsx
import { useCallback } from 'react'

import { usePouch } from 'use-pouchdb'

export function useDelete(errorCallback) {
  const db = usePouch()

  return useCallback(
    async id => {
      try {
        const doc = await db.get(id)

        await db.remove(doc)
      } catch (error) {
        errorCallback(error)
      }
    },
    [db, errorCallback]
  )
}
```
