'use client'

import { useEffect, useState } from 'react'
import { SetupOrder } from './SetupOrder'

import { formSchema } from './schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ConfirmOrder } from './ConfirmOrder/ConfirmOrder'
import { useCreateOrder } from '@/react-query/orders'
import { CreateDraftOrderInput, CreateOrderInput, DraftOrder, Medicine } from '@/types'

import { useListPolicies } from '@/react-query/insurancePolicies'
import { useTranslations } from 'next-intl'
import { useListMedicines } from '@/react-query/medicines'
import { mergeMedicines } from './utils'
import {
  useCreateDraftOrder,
  useDeleteDraftOrder,
  useUpdateDraftOrder,
} from '@/react-query/draftOrders'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { InvoiceType } from '@/types'

export interface CreateOrderFormProps {
  onFinish?: () => void
  /** Where to go after parking a draft; falls back to `onFinish`. */
  onDraftFinish?: () => void
  type: 'new' | 'draft'
  draftOrder?: DraftOrder
  /**
   * Which office the order is for. Office users leave this unset — RLS scopes
   * them to their own office and the DB fills the column in. An admin has no
   * office of their own, so `/admin/orders` names one explicitly: it scopes the
   * patient picker and the policies that decide medicine coverage, and it fills
   * the order's `doctor_office_id`.
   */
  doctorOfficeId?: string
  /**
   * Whether the order can be parked as a draft. Drafts are an office user's
   * scratch pad — they belong to the office that will come back and finish
   * them — so the admin form leaves the button out.
   */
  allowDraft?: boolean
}

export const CreateOrderForm = ({
  onFinish,
  onDraftFinish,
  draftOrder,
  doctorOfficeId,
  allowDraft = true,
}: CreateOrderFormProps) => {
  const t = useTranslations()
  const { data: insurancePolicies } = useListPolicies(doctorOfficeId)
  const { data: supportedMedicines } = useListMedicines()

  const [view, setView] = useState<'setupOrder' | 'ConfirmOrder'>('setupOrder')
  const [medicineByCompany, setMedicineByCompany] = useState<Record<string, Medicine[]>>(
    mergeMedicines(insurancePolicies)
  )
  useEffect(() => {
    setMedicineByCompany(mergeMedicines(insurancePolicies))
  }, [insurancePolicies])

  const { mutateAsync: createOrder, isPending, error, isError, isSuccess } = useCreateOrder()

  const {
    mutateAsync: createDraft,
    isPending: createDraftPending,
    isSuccess: isCreateDraftSuccess,
  } = useCreateDraftOrder()

  const {
    mutateAsync: updateDraft,
    isPending: updateDraftPending,
    isSuccess: isUpdateDraftSuccess,
  } = useUpdateDraftOrder()

  const { mutateAsync: deleteDraft } = useDeleteDraftOrder()

  const isDraftSuccess = isCreateDraftSuccess || isUpdateDraftSuccess
  const draftPending = createDraftPending || updateDraftPending

    const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deliveryDate: draftOrder?.delivery_date ? parseISO(draftOrder.delivery_date) : undefined,
      // A draft may have been parked before a medicine was picked, so every
      // field here is optional.
      typeOfMedicine: draftOrder?.medicine?.medicine_type,
      medicine: draftOrder?.medicine?.id,
      applicationDate: draftOrder?.application_date
        ? parseISO(draftOrder.application_date)
        : undefined,
      subOrders:
        draftOrder?.subOrders?.map((sub) => ({
          patientId: sub.patient.id,
          fullName: `${sub.patient.last_name} ${sub.patient.first_name}`,
          dateOfBirth: sub.patient.date_of_birth,
          ikNumber: sub.patient.insurance_companies?.iknumber,
          leftEye: !!sub.left_eye,
          rightEye: !!sub.right_eye,
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
      toast.success(t('component.CreateOrderForm.toasts.draftSuccess.title'), {
        description: t('component.CreateOrderForm.toasts.draftSuccess.description'),
      })
      ;(onDraftFinish ?? onFinish)?.()
      setView('setupOrder')
      form.reset()
    }
  }, [form, isDraftSuccess, onDraftFinish, onFinish, t])

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

  // Parking a draft skips validation, so nothing here can be assumed to be
  // filled in — every column on draft_orders is nullable.
  const handleCreateDraft = async (data: z.infer<typeof formSchema>) => {
    const createDraftOrderInput: CreateDraftOrderInput = {
      application_date: data.applicationDate ? format(data.applicationDate, 'yyyy-MM-dd') : null,
      delivery_date: data.deliveryDate ? format(data.deliveryDate, 'yyyy-MM-dd') : null,
      medicine_id: data.medicine || null,
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

    try {
      // Re-parking a draft that's being edited overwrites it rather than
      // leaving a second copy behind.
      if (draftOrder?.id) {
        await updateDraft({ id: draftOrder.id, data: createDraftOrderInput })
      } else {
        await createDraft(createDraftOrderInput)
      }
    } catch (draftError) {
      console.error('Failed to save draft order:', draftError)
      toast.error(t('component.CreateOrderForm.toasts.draftError.title'), {
        description: t('component.CreateOrderForm.toasts.draftError.description'),
      })
    }
  }

  const handleConfirmSubmit = async (data: z.infer<typeof formSchema>) => {
    const createOrderInput: CreateOrderInput = {
      application_date: format(data.applicationDate, 'yyyy-MM-dd'),
      delivery_date: format(data.deliveryDate, 'yyyy-MM-dd'),
      medicine_id: data.medicine,
      // Left out for office users so the column default (current_office_id())
      // still applies.
      ...(doctorOfficeId ? { doctor_office_id: doctorOfficeId } : {}),
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

    try {
      await createOrder(createOrderInput)
    } catch {
      // The error toast is driven by the mutation's `error` state (see the
      // effect above); nothing to do here but stop.
      return
    }

    // The draft has served its purpose once the real order exists — drop it (and
    // its suborders) only after the order was actually created.
    if (draftOrder?.id) {
      try {
        await deleteDraft(draftOrder.id)
      } catch (deleteError) {
        console.error('Failed to delete draft order after creating the order:', deleteError)
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
      doctorOfficeId={doctorOfficeId}
      allowDraft={allowDraft}
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
