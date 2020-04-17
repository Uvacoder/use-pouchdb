import { useState, useEffect, useRef, useMemo, useContext } from 'react'

import { PouchContext } from './context'

export default function useDoc<Content extends {}>(
  id: PouchDB.Core.DocumentId,
  options?: PouchDB.Core.GetOptions,
  initialValue?: (() => Content) | Content
) {
  const pouch = useContext(PouchContext)

  const { rev, revs, revs_info, conflicts, attachments, binary, latest } =
    options || {}

  const [doc, setDoc] = useState<
    Content | (PouchDB.Core.Document<Content> & PouchDB.Core.GetMeta)
  >(initialValue!)
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = useState<PouchDB.Core.Error | null>(null)

  const lastId = useRef(id)
  useEffect(() => {
    if (id === lastId.current) return
    lastId.current = id

    if (typeof initialValue === 'object') {
      setDoc(initialValue)
    } else if (typeof initialValue === 'function') {
      setDoc((initialValue as Function)())
    }
  }, [id, initialValue])

  useEffect(() => {
    let isMounted = true

    const fetchDoc = async () => {
      setState('loading')

      try {
        const doc = await pouch!.get<Content>(id, {
          rev,
          revs,
          revs_info,
          conflicts,
          attachments,
          binary,
          latest,
        })!

        if (isMounted) {
          setState('done')
          setDoc(doc)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setState('error')
          setError(err)
        }
      }
    }

    fetchDoc()

    const subscription = pouch!
      .changes({
        live: true,
        since: 'now',
        include_docs: true,
        conflicts,
        attachments,
        binary,
      })
      .on('change', change => {
        if (change.id !== id || !isMounted) return

        if (change.deleted) {
        } else {
          setDoc(
            change.doc as PouchDB.Core.Document<Content> & PouchDB.Core.GetMeta
          )
          setState('done')
          setError(null)
        }
      })

    return () => {
      isMounted = false
      subscription.cancel()
    }
  }, [id, rev, revs, revs_info, conflicts, attachments, binary, latest])

  return useMemo(() => {
    const resultDoc = doc as PouchDB.Core.Document<Content> &
      PouchDB.Core.GetMeta
    if (resultDoc && resultDoc._id == null) {
      resultDoc._id = id
    }
    if (resultDoc && resultDoc._rev == null) {
      resultDoc._rev = ''
    }
    return {
      doc: resultDoc,
      state,
      error,
    }
  }, [id, doc, state, error])
}
