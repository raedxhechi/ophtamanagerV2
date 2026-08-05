'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Row } from '@tanstack/react-table'
import { ChevronDown, CircleSlash, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteDraftOrder } from '@/react-query/draftOrders'
import { cn } from '@/lib/utils'

import type { DraftOrder } from '@/types'

interface DraftOrderRowActionsProps {
  row: Row<DraftOrder>
}

export function DraftOrderRowActions({ row }: DraftOrderRowActionsProps) {
  const draftOrder = row.original
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mutateAsync: deleteDraft, isPending } = useDeleteDraftOrder()

  const hasSubOrders = !!draftOrder.subOrders?.length

  const handleDelete = async () => {
    try {
      await deleteDraft(draftOrder.id)
      setConfirmOpen(false)
      // The list is rendered by a server component, so re-run its query.
      router.refresh()
    } catch (error) {
      console.error('Failed to delete draft order:', error)
      toast.error('Der Entwurf konnte nicht gelöscht werden.')
    }
  }

  return (
    <div className={cn('flex items-center justify-end space-x-2')}>
      <Button
        variant={hasSubOrders ? 'secondary' : 'ghost'}
        onClick={(e) => {
          e.stopPropagation()
          if (hasSubOrders) row.toggleExpanded()
        }}
        className={cn(!hasSubOrders && 'hover:bg-transparent')}
      >
        <span className={cn('mr-2', !hasSubOrders && 'text-[#CCCCCC]')}>Patients</span>
        {hasSubOrders ? (
          <ChevronDown
            size={22}
            className={cn(
              'transition-transform duration-300 transform',
              row.getIsExpanded() && 'rotate-180'
            )}
          />
        ) : (
          <CircleSlash size={22} className='text-[#cccccc]' />
        )}
      </Button>

      {/* Resume the draft in the create-order form: it reads `?draft=` and
          prefills every field it finds on the draft. */}
      <Button asChild variant='default'>
        <Link href={`/orders/new?draft=${draftOrder.id}`}>
          <Pencil />
        </Link>
      </Button>

      <Button variant='destructive' onClick={() => setConfirmOpen(true)}>
        <Trash2 />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete draft order?</DialogTitle>
            <DialogDescription>
              This deletes the draft and its {draftOrder.subOrders?.length ?? 0} suborder(s). It
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
