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
import { Medicine, MedicineType } from '@/lib/types/types'
import { CreateOrderTable } from '@/components/CreateOrderTable'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { UseFormReturn } from 'react-hook-form'
import { z } from 'zod'
import { SubOrderInput } from '@/components/CreateOrderTable/schema'

export interface SetupOrderProps {
  medicines: Medicine[]
  medicinesByCompany: Record<number, Medicine[]>
  form: UseFormReturn<z.infer<typeof formSchema>>
  onSubmit: (values?: any) => void
  onSaveDraft: (values?: any) => void
  draftLoading?: boolean
}

export const SetupOrder = ({
  medicines,
  form,
  medicinesByCompany,
  onSubmit,
  onSaveDraft,
  draftLoading,
}: SetupOrderProps) => {
  const { t } = useTranslation()

  const handleCreateDraft = () => {
    const draftValues = form.getValues()
    onSaveDraft(draftValues)
  }

  const handleSubmit = (values?: any) => {
    const validate = form.trigger()
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='flex-1 flex flex-col gap-4'>
        <div className='flex justify-center items-center mb-8'>
          <h2 className='text-xl font-semibold'>{t('component.SetupOrder.title')}</h2>
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
                  <br />
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
                    medicineId={Number(form.watch('medicine'))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='w-full flex gap-4'>
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
          <div className='w-2/3 '>
            <Button
              type='submit'
              className='w-full'
              disabled={
                !form.watch('subOrders').length ||
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
