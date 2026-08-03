'use client'

import { useEffect, useState } from 'react'
import { SetupOrder } from './SetupOrder'

import { formSchema } from './schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmOrder } from './ConfirmOrder/ConfirmOrder'
import { useCreateOrder } from '@/react-query/orders'
import { useUserStore } from '@/zustand/user/user-provider'
import { CreateOrderInput, DraftOrder, Medicine } from '@/types'

import { useListPolicies } from '@/react-query/insurancePolicies'
import { useTranslations } from 'next-intl'
import { useListMedicines } from '@/react-query/medicines'
import { mergeMedicines } from './utils'
import { useCreateDraftOrder, useDeleteDraftOrder } from '@/react-query/draftOrders'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { InvoiceType } from '@/types'

export interface CreateOrderFormProps {
  onFinish?: () => void
  type: 'new' | 'draft'
  draftOrder?: DraftOrder
}

export const CreateOrderForm = ({ onFinish, draftOrder }: CreateOrderFormProps) => {
  const t = useTranslations()
  const { data: insurancePolicies } = useListPolicies()
  const { data: supportedMedicines } = useListMedicines()

  const [view, setView] = useState<'setupOrder' | 'ConfirmOrder'>('setupOrder')
  const [medicineByCompany, setMedicineByCompany] = useState<Record<string, Medicine[]>>(
    mergeMedicines(insurancePolicies)
  )
  useEffect(() => {
    setMedicineByCompany(mergeMedicines(insurancePolicies))
  }, [insurancePolicies])

  const { mutate: createOrder, isPending, error, isError, isSuccess } = useCreateOrder()

  const {
    mutate: createDraft,
    isPending: draftPending,
    // error: draftError,
    // isError: isDraftError,
    isSuccess: isDraftSuccess,
  } = useCreateDraftOrder()

  const { mutate: deleteDraft } = useDeleteDraftOrder()

  // const { user } = useUserStore((state) => state)

    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryDate: draftOrder?.delivery_date ? parseISO(draftOrder.delivery_date) : undefined,
      typeOfMedicine: draftOrder?.medicine.medicine_type,
      medicine: draftOrder?.medicine.id,
      applicationDate: draftOrder?.application_date
        ? parseISO(draftOrder.application_date)
        : undefined,
      subOrders:
        draftOrder?.subOrders?.map((sub) => ({
          patientId: sub.patient.id,
          fullName: `${sub.patient.last_name} ${sub.patient.first_name}`,
          dateOfBirth: sub.patient.date_of_birth,
          ikNumber: sub.patient.insurance_companies?.iknumber,
          leftEye: sub.left_eye,
          rightEye: sub.right_eye,
          invoice: sub.invoice_type || undefined,
        })) || [],
      confirmRegulations: false,
    },
  })


  useEffect(() => {
    if (isSuccess) {
      toast.success(t('component.CreateOrderForm.toasts.success.title'), {
        description: t('component.CreateOrderForm.toasts.success.description'),
      })
      onFinish?.()
      setView('setupOrder')
      form.reset()
    }
  }, [form, isSuccess, onFinish, t])

  useEffect(() => {
    if (isDraftSuccess) {
      toast.success(t('component.CreateOrderForm.toasts.success.title'), {
        description: t('component.CreateOrderForm.toasts.success.description'),
      })
      onFinish?.()
      setView('setupOrder')
      form.reset()
    }
  }, [form, isDraftSuccess, onFinish, t])

  useEffect(() => {
    if (error) {
      toast.error(t('component.CreateOrderForm.toasts.error.title'), {
        description: t('component.CreateOrderForm.toasts.error.description'),
      })
    }
  }, [error, isError, t])


  const handleBack = () => {
    setView('setupOrder')
  }

  const handleSetupSubmit = () => {
    setView('ConfirmOrder')
  }

  const handleCreateDraft = (data: z.infer<typeof formSchema>) => {
    console.log({ draftData: data })
 
      const createDraftOrderInput: Partial<CreateOrderInput> = {
        application_date: format(data.applicationDate, 'yyyy-MM-dd'),
        delivery_date: format(data.deliveryDate, 'yyyy-MM-dd'),
        medicine_id: data.medicine,
        quantity: data.subOrders.reduce((count, patient) => {
          return count + (patient.leftEye ? 1 : 0) + (patient.rightEye ? 1 : 0)
        }, 0),
        subOrders: data.subOrders.map((subOrder) => ({
          patient_id: subOrder.patientId,
          left_eye: !!subOrder.leftEye,
          right_eye: !!subOrder.rightEye,
          invoice_type: subOrder.invoice ? (subOrder.invoice as InvoiceType) : null,
        })),
      }

      createDraft(createDraftOrderInput)
      if (draftOrder && draftOrder.id) {
        deleteDraft(draftOrder.id)
      }
  
  }

  const handleConfirmSubmit = (data: z.infer<typeof formSchema>) => {
    console.log({ data })
  
      const createOrderInput: CreateOrderInput = {
        application_date: format(data.applicationDate, 'yyyy-MM-dd'),
        delivery_date: format(data.deliveryDate, 'yyyy-MM-dd'),
        medicine_id: data.medicine,
        quantity: data.subOrders.reduce((count, patient) => {
          return count + (patient.leftEye ? 1 : 0) + (patient.rightEye ? 1 : 0)
        }, 0),
        subOrders: data.subOrders.map((subOrder) => ({
          patient_id: subOrder.patientId,
          left_eye: !!subOrder.leftEye,
          right_eye: !!subOrder.rightEye,
          invoice_type: subOrder.invoice ? (subOrder.invoice as InvoiceType) : null,
        })),
      }
      createOrder(createOrderInput)
      if (draftOrder && draftOrder.id) {
        deleteDraft(draftOrder.id)
      }
 
  }

  return view === 'setupOrder' ? (
    <SetupOrder
      medicines={supportedMedicines || []}
      form={form}
      onSubmit={handleSetupSubmit}
      medicinesByCompany={medicineByCompany}
      onSaveDraft={handleCreateDraft}
      draftLoading={draftPending}
    />
  ) : (
    <ConfirmOrder
      medicines={supportedMedicines || []}
      form={form}
      onBack={handleBack}
      onSubmit={handleConfirmSubmit}
      loading={isPending}
    />
  )
}
