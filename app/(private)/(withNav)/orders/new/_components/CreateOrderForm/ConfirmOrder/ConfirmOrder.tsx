'use client'

import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { ArrowLeft } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'
import { DataTable, useCreateOrderColumns } from '@/components/CreateOrderTable'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '../../ui/button'
import { Medicine } from '@/lib/types/types'
import { useTranslation } from 'react-i18next'

export interface ConfirmOrderProps {
  form: any
  onSubmit: (values: any) => void
  medicines: Medicine[]
  loading: boolean
  onBack: () => void
}

export const ConfirmOrder = ({ form, onSubmit, loading, onBack, medicines }: ConfirmOrderProps) => {
  const { t } = useTranslation()
  const columns = useCreateOrderColumns()

  const handleSubmit = (values: any) => {
    onSubmit(values)
  }

  const medicineName = medicines.find((med) => med.id.toString() === form.watch('medicine'))?.name

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='flex-1 flex flex-col gap-4'>
        <div className='flex justify-center items-center mb-8'>
          <div
            className='flex gap-2 items-center justify-center w-fit absolute left-4 cursor-pointer'
            onClick={onBack}
          >
            <ArrowLeft className='text-xl' size={16} />
            <div className='text-md font-semibold'>
              {t('component.ConfirmOrder.backButton.text')}
            </div>
          </div>
          <h2 className='text-xl font-semibold'>{t('component.ConfirmOrder.title')}</h2>
        </div>

        <div className='flex gap-6 p-4  rounded-lg'>
          <div className='flex-1 flex flex-col items-center text-center'>
            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.sections.deliveryDate.label')}
            </span>
            <span className='text-sm font-semibold'>
              {format(form.watch('deliveryDate'), 'dd.MM.yyyy')}
            </span>
          </div>

          <Separator orientation='vertical' className='h-12' />

          <div className='flex-1 flex flex-col items-center text-center'>
            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.sections.typeOfMedicine.label')}
            </span>
            <span className='text-sm font-semibold'>{form.watch('typeOfMedicine')}</span>
          </div>

          <Separator orientation='vertical' className='h-12' />

          <div className='flex-1 flex flex-col items-center text-center'>
            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.sections.medicine.label')}
            </span>
            <span className='text-sm font-semibold'>{medicineName}</span>
          </div>

          <Separator orientation='vertical' className='h-12' />

          <div className='flex-1 flex flex-col items-center text-center'>
            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.sections.applicationDate.label')}
            </span>
            <span className='text-sm font-semibold'>
              {format(form.watch('applicationDate'), 'dd.MM.yyyy')}
            </span>
          </div>
        </div>

        <div className='flex-1 gap-4 mt-4'>
          <DataTable data={form.watch('subOrders') as any} columns={columns} disableSearch />
        </div>

        <Separator className='my-[20px]' />

        <div className='flex gap-6 p-4  rounded-lg'>
          <div className='flex-1 flex justify-between items-center'>
            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.summary.totalPatients')} {form.watch('subOrders').length}
            </span>

            <span className='text-sm font-semibold'>
              {t('component.ConfirmOrder.summary.totalMedicine')}{' '}
              {(form.watch('subOrders') as unknown as any)?.reduce(
                (total: any, subOrder: any) => total + subOrder?.leftEye + subOrder?.rightEye,
                0
              )}
            </span>
          </div>
        </div>

        <Separator className='my-[20px]' />

        <FormField
          control={form.control}
          name='confirmRegulations'
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='confirmRegulations'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor='confirmRegulations'
                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                  >
                    {t('component.ConfirmOrder.terms.label')}
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          className='w-full align-self-end bottom-0'
          type='submit'
          loading={loading}
          disabled={
            !form.formState.isValid ||
            !form.watch('subOrders').length ||
            form.watch('confirmRegulations') === false
          }
        >
          {t('component.ConfirmOrder.submitButton.text')}
        </Button>
      </form>
    </Form>
  )
}
