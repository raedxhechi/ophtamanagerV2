'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Card } from '@/components/ui/card'
import { useGetDraftOrder } from '@/react-query/draftOrders'
import { CreateOrderForm } from './_components/CreateOrderForm/CreateOrderForm'

export default function NewOrderPage() {
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
        />
      </Card>
    </div>
  )
}
