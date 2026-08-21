/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SelectInput } from '@/components/ui/selectInput'
import { formSchema } from '../schema'
import { DatePicker } from '@/components/ui/datePickerInput'
import { Separator } from '@/components/ui/separator'
import { Medicine } from '@/types'
import { CreateOrderTable } from '../../CreateOrderTable'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { SubOrderInput } from '../../CreateOrderTable/schema'
import { MedicineType } from '@/types/enums'

export interface SetupOrderProps {
  medicines: Medicine[]
  medicinesByCompany: Record<string, Medicine[]>
  form: UseFormReturn<z.infer<typeof formSchema>>
  onSubmit: (values?: any) => void
  onSaveDraft: (values?: any) => void
  draftLoading?: boolean
  /** Scopes the patient picker; see CreateOrderForm's prop of the same name. */
  doctorOfficeId?: string
  /** When false the "park as draft" button is left out. */
  allowDraft?: boolean
}

export const SetupOrder = ({
  medicines,
  form,
  medicinesByCompany,
  onSubmit,
  onSaveDraft,
  draftLoading,
  doctorOfficeId,
  allowDraft = true,
}: SetupOrderProps) => {
  const t = useTranslations()

  const handleCreateDraft = () => {
    const draftValues = form.getValues()
    onSaveDraft(draftValues)
  }

  const handleSubmit = (values?: any) => {
    form.trigger()
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='flex-1 flex flex-col gap-4'>
        <div className='flex justify-center items-center mb-0'>
          <h2 className='text-base font-semibold'>{t('component.SetupOrder.title')}</h2>
        </div>
        <div className='flex gap-4'>
          <div className='min-w-[200px]'>
            <FormField
              control={form.control}
              name='deliveryDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('component.SetupOrder.form.deliveryDate.label')}</FormLabel>
                  <br />
                  <FormControl>
                    <DatePicker
                      date={field.value}
                      setDate={(value: any) => field.onChange(value)}
                      label={t('component.SetupOrder.form.deliveryDate.placeholder')}
                      onlyFutureDates
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className='flex gap-4'>
          <div className='flex-1 mr-4'>
            <FormField
              control={form.control}
              name='typeOfMedicine'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('component.SetupOrder.form.typeOfMedicine.label')}</FormLabel>
                  <FormControl>
                    <SelectInput
                      listValues={[MedicineType.RECIPE, MedicineType.FINISHED]}
                      name='Type'
                      setValue={(value) => {
                        field.onChange(value)
                        form.setValue('medicine', '')
                        form.setValue('subOrders', [])
                      }}
                      label='Type'
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex-1'>
            <FormField
              control={form.control}
              name='medicine'
              render={({ field }) => {
                return (
                  <FormItem>
                    <FormLabel>{t('component.SetupOrder.form.medicine.label')}</FormLabel>
                    <FormControl>
                      <SelectInput
                        disabled={
                          !form.watch('typeOfMedicine') || !!form.watch('subOrders')?.length
                        }
                        listValuesWithLabels={medicines
                          .filter(
                            (medicine) =>
                              medicine.medicine_type.toLowerCase() ===
                              form.watch('typeOfMedicine')?.toLowerCase()
                          )
                          .map((medicine) => ({
                            value: medicine.id.toString(),
                            label: medicine.name,
                          }))}
                        name='Medicine'
                        setValue={(value) => field.onChange(value)}
                        label={t('component.SetupOrder.form.medicine.placeholder')}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </div>
          <div className='flex-1'>
            <FormField
              control={form.control}
              name='applicationDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('component.SetupOrder.form.applicationDate.label')}</FormLabel>
                  <FormControl>
                    <DatePicker
                      date={field.value}
                      setDate={(value: any) => field.onChange(value)}
                      label={t('component.SetupOrder.form.applicationDate.placeholder')}
                      onlyFutureDates
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className='flex-1 gap-4'>
          <FormField
            control={form.control}
            name='subOrders'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('component.SetupOrder.form.patients.label')}</FormLabel>
                <br />
                <FormControl>
                  <CreateOrderTable
                    medicinesByCompany={medicinesByCompany}
                    onChange={(value: SubOrderInput[]) => field.onChange(value)}
                    addedSubOrders={field.value}
                    medicineId={form.watch('medicine')}
                    doctorOfficeId={doctorOfficeId}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='w-full flex gap-4'>
          {allowDraft && (
            <div className='w-1/3 '>
              <Button
                type='button'
                className='w-full'
                disabled={!form.watch('subOrders').length}
                loading={draftLoading}
                onClick={handleCreateDraft}
              >
                Bestellung parken
              </Button>
            </div>
          )}
          <div className={allowDraft ? 'w-2/3 ' : 'w-full'}>
            <Button
              type='submit'
              className='w-full'
              disabled={
                !form.watch('subOrders').length ||
                // A draft parked before an invoice target was picked comes back
                // with rows the add-button gate never saw; catch them here.
                form.watch('subOrders').some((subOrder) => !subOrder.invoice) ||
                !form.watch('deliveryDate') ||
                !form.watch('typeOfMedicine') ||
                !form.watch('medicine') ||
                !form.watch('applicationDate')
              }
            >
              {t('component.SetupOrder.submitButton.text')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
