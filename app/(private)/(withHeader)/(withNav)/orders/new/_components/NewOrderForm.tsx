'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Card } from '@/components/ui/card'
import { useGetDraftOrder } from '@/react-query/draftOrders'
import { CreateOrderForm } from './CreateOrderForm/CreateOrderForm'

/**
 * The client half of /orders/new. The office comes from the page above, which
 * resolves it server-side: it scopes the patient picker and the insurance
 * policies, and it is the office the order (or the parked draft) is created in.
 */
export function NewOrderForm({ doctorOfficeId }: { doctorOfficeId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftId = searchParams.get('draft')

  const { data: draftOrder, isLoading } = useGetDraftOrder(draftId)

  // The form prefills its default values from the draft on mount, so wait for
  // the draft to load before rendering it.
  if (draftId && isLoading) {
    return (
      <div className='flex justify-center items-center h-[60vh]'>
        <Loader2 size={50} className='animate-spin' />
      </div>
    )
  }

  return (
    <div className='px-4 py-6'>
      <Card className='mx-auto flex w-full max-w-[1100px] flex-col bg-[oklch(1_0_0)] p-6'>
        <CreateOrderForm
          onFinish={() => router.push('/orders')}
          onDraftFinish={() => router.push('/draft-orders')}
          type={draftId ? 'draft' : 'new'}
          draftOrder={draftOrder}
          doctorOfficeId={doctorOfficeId}
        />
      </Card>
    </div>
  )
}
