'use client'

import { ArrowLeftRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'

import type { SwapMarking } from '@/lib/swaps'

/**
 * How a suborder row says where it stands in a swap. Three marks, from two
 * independent facts, so a swap that has itself been swapped shows both:
 *
 * - "Tausch" — this suborder replaces another one.
 * - "1/2 getauscht", amber — it is the original of a swap and still has eyes
 *   left, so another swap can be made out of it.
 * - "2/2 getauscht", green — it is the original of a swap and has nothing left.
 *
 * The amber/green pair carries the distinction rather than two different
 * wordings, so the counts read the same way in both cases.
 */
export function SwapMarks({ marking }: { marking: SwapMarking | undefined }) {
  const t = useTranslations()

  if (!marking || (!marking.isSwap && marking.swapCount === 0)) return null

  const fullySwapped = marking.swapCount > 0 && marking.availableEyes === 0

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {marking.isSwap ? (
        <Badge
          variant='outline'
          className='gap-1'
          // Names the patient this one replaced, when that row is to hand.
          title={
            marking.swappedFromName
              ? t('component.SwapMarks.isSwapOf', { patient: marking.swappedFromName })
              : undefined
          }
        >
          <ArrowLeftRight size={12} />
          {t('component.SwapMarks.isSwap')}
        </Badge>
      ) : null}

      {marking.swapCount > 0 ? (
        <Badge
          variant='outline'
          className={
            fullySwapped
              ? 'border-emerald-600/40 text-emerald-600 dark:text-emerald-500'
              : 'border-amber-600/40 text-amber-600 dark:text-amber-500'
          }
          title={
            fullySwapped
              ? t('component.SwapMarks.fullyTitle')
              : t('component.SwapMarks.partlyTitle', { available: marking.availableEyes })
          }
        >
          {t('component.SwapMarks.swapped', {
            used: marking.usedEyes,
            total: marking.totalEyes,
          })}
        </Badge>
      ) : null}
    </div>
  )
}
