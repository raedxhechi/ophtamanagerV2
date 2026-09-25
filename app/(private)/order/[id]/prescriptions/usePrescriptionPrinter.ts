'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pdf, type DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

/**
 * Prints a react-pdf document without going through the on-screen viewer, so
 * that what reaches the printer can differ from what is previewed — here, the
 * data without the form template under it.
 *
 * The document is rendered to a blob, loaded into one hidden iframe, and
 * printed from there once it has finished loading; `print()` cannot be called
 * any earlier, hence the handover through `onLoad`.
 *
 * `key` names whichever document is being printed — the column's layout id in
 * the per-pad view — so a caller with several print buttons can tell which one
 * is busy. It is null whenever nothing is printing.
 */
export function usePrescriptionPrinter() {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const urlRef = useRef<string | undefined>(undefined)
  const [printingKey, setPrintingKey] = useState<string | null>(null)

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = undefined
    }
  }, [])

  useEffect(() => releaseUrl, [releaseUrl])

  const print = useCallback(
    async (key: string, document: ReactElement<DocumentProps>) => {
      setPrintingKey(key)
      try {
        const blob = await pdf(document).toBlob()
        releaseUrl()
        urlRef.current = URL.createObjectURL(blob)
        if (frameRef.current) frameRef.current.src = urlRef.current
      } catch {
        setPrintingKey(null)
      }
    },
    [releaseUrl],
  )

  const handleLoad = useCallback(() => {
    const frame = frameRef.current
    if (!frame?.src || !urlRef.current) return
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } catch {
      // Browsers that refuse to print an embedded PDF: hand the document over
      // in a tab of its own and let the user print it from there.
      window.open(urlRef.current, '_blank')
    } finally {
      setPrintingKey(null)
    }
  }, [])

  /** Spread onto the one hidden iframe the caller must render. */
  const frameProps = {
    ref: frameRef,
    title: 'print',
    'aria-hidden': true,
    tabIndex: -1,
    onLoad: handleLoad,
    className: 'pointer-events-none fixed top-0 left-[-10000px] size-px border-0',
  } as const

  return { print, printingKey, isPrinting: printingKey !== null, frameProps }
}
