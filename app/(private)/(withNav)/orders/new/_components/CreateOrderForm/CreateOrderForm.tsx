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
import { CreateOrderInput, DraftOrder, Medicine } from '@/lib/types/types'
import { toast } from '@/hooks/use-toast'
import { useListPolicies } from '@/react-query/insurancePolicies'
import { useTranslation } from 'react-i18next'
import { useListMedicines } from '@/react-query/medicines'
import { mergeMedicines } from './utils'
import { useCreateDraftOrder, useDeleteDraftOrder } from '@/react-query/draftOrders'
import { parseISO } from 'date-fns'

export interface CreateOrderFormProps {
  onFinish?: () => void
  type: 'new' | 'draft'
  draftOrder?: DraftOrder
}

export const CreateOrderForm = ({ onFinish, type, draftOrder }: CreateOrderFormProps) => {
  const { t } = useTranslation()
  const { data: insurancePolicies, error: policiesError } = useListPolicies()
  const { data: supportedMedicines } = useListMedicines()

  const [view, setView] = useState<'setupOrder' | 'ConfirmOrder'>('setupOrder')
  const [medicineByCompany, setMedicineByCompany] = useState<Record<number, Medicine[]>>(
    mergeMedicines(insurancePolicies)
  )
  useEffect(() => {
    setMedicineByCompany(mergeMedicines(insurancePolicies))
  }, [insurancePolicies])

  const { mutate: createOrder, isPending, error, isError, isSuccess } = useCreateOrder()

  const {
    mutate: createDraft,
    isPending: draftPending,
    error: draftError,
    isError: isDraftError,
    isSuccess: isDraftSuccess,
  } = useCreateDraftOrder()

  const { mutate: deleteDraft } = useDeleteDraftOrder()

  const { user } = useUserStore((state) => state)

  useEffect(() => {
    if (isSuccess) {
      toast({
        title: t('component.CreateOrderForm.toasts.success.title'),
        description: t('component.CreateOrderForm.toasts.success.description'),
      })
      onFinish && onFinish()
      setView('setupOrder')
      form.reset()
    }
  }, [isSuccess])

  useEffect(() => {
    if (isDraftSuccess) {
      toast({
        title: t('component.CreateOrderForm.toasts.success.title'),
        description: t('component.CreateOrderForm.toasts.success.description'),
      })
      onFinish && onFinish()
      setView('setupOrder')
      form.reset()
    }
  }, [isDraftSuccess])

  useEffect(() => {
    error &&
      toast({
        title: t('component.CreateOrderForm.toasts.error.title'),
        description: t('component.CreateOrderForm.toasts.error.description'),
      })
  }, [isError])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryDate: draftOrder?.deliveryDate ? parseISO(draftOrder?.deliveryDate) : undefined,
      typeOfMedicine: draftOrder?.medicine.medicine_type,
      medicine: draftOrder?.medicine.id.toString(),
      applicationDate: draftOrder?.applicationDate
        ? parseISO(draftOrder?.applicationDate)
        : undefined,
      subOrders:
        draftOrder?.subOrders?.map((sub) => ({
          patientId: sub.patient.id,
          fullName: `${sub.patient.lastName} ${sub.patient.firstName}`,
          dateOfBirth: sub.patient.dateOfBirth,
          ikNumber: sub.patient.insuranceCompany.ikNumber,
          leftEye: sub.leftEye,
          rightEye: sub.rightEye,
          invoice: sub.invoice || undefined,
        })) || [],
      confirmRegulations: false,
    },
  })

  const handleBack = () => {
    setView('setupOrder')
  }

  const handleSetupSubmit = () => {
    setView('ConfirmOrder')
  }

  const handleCreateDraft = (data: z.infer<typeof formSchema>) => {
    console.log({ draftData: data })
    if (user && user.doctorOffice) {
      const createDraftOrderInput: Partial<CreateOrderInput> = {
        applicationDate: data.applicationDate,
        deliveryDate: data.deliveryDate,
        medicine: Number(data.medicine),
        doctorOffice: user.doctorOffice.id,
        quantity: data.subOrders.reduce((count, patient) => {
          return count + (patient.leftEye ? 1 : 0) + (patient.rightEye ? 1 : 0)
        }, 0),
        subOrders: {
          create: data.subOrders.map((subOrder) => ({
            patient: Number(subOrder.patientId),
            leftEye: !!subOrder.leftEye,
            rightEye: !!subOrder.rightEye,
            invoice: subOrder.invoice,
          })),
        },
      }

      createDraft(createDraftOrderInput)
      if (draftOrder && draftOrder.id) {
        deleteDraft(draftOrder.id)
      }
    }
  }

  const handleConfirmSubmit = (data: z.infer<typeof formSchema>) => {
    console.log({ data })
    if (user && user.doctorOffice) {
      const createOrderInput: CreateOrderInput = {
        applicationDate: data.applicationDate,
        deliveryDate: data.deliveryDate,
        medicine: Number(data.medicine),
        doctorOffice: user.doctorOffice.id,
        quantity: data.subOrders.reduce((count, patient) => {
          return count + (patient.leftEye ? 1 : 0) + (patient.rightEye ? 1 : 0)
        }, 0),
        subOrders: {
          create: data.subOrders.map((subOrder) => ({
            patient: Number(subOrder.patientId),
            leftEye: !!subOrder.leftEye,
            rightEye: !!subOrder.rightEye,
            invoice: subOrder.invoice,
          })),
        },
      }
      createOrder(createOrderInput)
      if (draftOrder && draftOrder.id) {
        deleteDraft(draftOrder.id)
      }
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
