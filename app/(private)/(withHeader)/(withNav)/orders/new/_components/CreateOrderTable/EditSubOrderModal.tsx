'use client'

import { format } from 'date-fns'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { SelectInput } from '@/components/ui/selectInput'
import { SubOrderInput } from './schema'

interface EditSubOrderModalProps {
  open: boolean
  setOpen: (open: boolean) => void
  patient: SubOrderInput
  handleConfirmEdit: (values: SubOrderInput) => void
}

export const EditSubOrderModal = ({
  open,
  setOpen,
  patient,
  handleConfirmEdit,
}: EditSubOrderModalProps) => {
  const t = useTranslations()

  const [eyes, setEyes] = useState<
    | {
        leftEye: boolean | undefined
        rightEye: boolean | undefined
      }
    | undefined
  >({ leftEye: patient?.leftEye, rightEye: patient?.rightEye })

  const [invoice, setInvoice] = useState<string | undefined>(patient?.invoice)

  useEffect(() => {
    setEyes({
      leftEye: patient?.leftEye,
      rightEye: patient?.rightEye,
    })
  }, [])

  const handleApplyChanges = (values: SubOrderInput) => {
    handleConfirmEdit(values)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        setOpen(!open)
      }}
    >
      <DialogContent
        className={
          'flex flex-col overflow-y-auto max-h-screen sm:max-w-[400px] lg:max-w-[400px]  lg:h-[400px] p-2 gap-0 bg-[#E8E7E2]'
        }
      >
        <div className='p-6 flex flex-col flex-1 '>
          <div className='flex justify-center items-center mb-8'>
            <h2 className='text-xl font-semibold'>{t('component.EditPatientModal.title')}</h2>
          </div>

          <div className='flex flex-col gap-8'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-bold'>{patient?.fullName}</span>
              <span className='text-sm font-bold'>
                {format(patient?.dateOfBirth, 'dd.MM.yyyy')}
              </span>
            </div>

            <Separator />
            <div className='flex flex-col gap-2'>
              {eyes && (
                <div className='flex space-x-2 bg-white p-4 rounded-lg justify-center items-center'>
                  <div className='flex space-x-2'>
                    <Badge
                      variant={eyes.leftEye ? 'outline' : 'secondary'}
                      onClick={() => {
                        setEyes({
                          leftEye: !eyes.leftEye,
                          rightEye: eyes.rightEye,
                        })
                      }}
                      className={`cursor-pointer ${
                        eyes.leftEye ? 'bg-[#0000ff] text-white' : 'text-[#505050]'
                      } h-[30px] pr-4 rounded-xl`}
                    >
                      <Eye className='mr-2' size={18} />
                      {t('component.EditPatientModal.leftEye')}
                    </Badge>
                  </div>
                  <div className='flex space-x-2'>
                    <Badge
                      variant={eyes.rightEye ? 'destructive' : 'secondary'}
                      onClick={() => {
                        setEyes({
                          rightEye: !eyes.rightEye,
                          leftEye: eyes.leftEye,
                        })
                      }}
                      className={`pl-4 rounded-xl h-[30px] cursor-pointer ${
                        !eyes.rightEye && 'text-[#505050]'
                      }`}
                    >
                      {t('component.EditPatientModal.rightEye')}
                      <Eye className='ml-2' size={18} />
                    </Badge>
                  </div>
                </div>
              )}

              <div className='flex space-x-2 bg-white p-4 mt-0 rounded-lg justify-center items-center'>
                <SelectInput
                  //  disabled={!!row.original.added}
                  listValues={['Patient', 'Kasse', 'Praxis']}
                  name='invoice'
                  label='Rechnungsstellung'
                  setValue={(val) => {
                    setInvoice(val)
                  }}
                  value={invoice}
                  // setValue={(value) => row.original.({ invoice: value })}
                  // value={field.value}
                />
              </div>
            </div>
          </div>
        </div>

        <Button
          className='w-full align-self-end bottom-0 mt-4'
          type='submit'
          // An invoice target is required on every suborder, so the edit can't
          // be applied while it's still unset.
          disabled={!invoice}
          onClick={() =>
            handleApplyChanges({
              ...patient,
              ...eyes,
              invoice,
            })
          }
        >
          {t('component.EditPatientModal.applyChanges')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
