'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Eye, Loader2, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { InvoiceType, PatientWithInsuranceCompany, SubOrder } from '@/types'
import { useSearchPatientsInfinite } from '@/react-query/patients'
import { useCreateSwap, useListSwaps } from '@/react-query/subOrders'
import { formatDateFromString } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SelectInput } from '@/components/ui/selectInput'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

import { availableEyes, eyeCount } from '@/lib/swaps'

// Mirrors the invoice_types enum. Spelled out rather than imported from
// app/admin/orders/_components/invoiceType so the private tree doesn't reach
// into the admin one; the order form carries the same list.
const INVOICE_TYPES: InvoiceType[] = ['Praxis', 'Kasse', 'Patient']

/** A label above its value, the drawer's read-only half. */
function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <dt className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>{label}</dt>
      <dd className='text-sm'>
        {value === null || value === undefined || value === '' ? (
          <span className='text-muted-foreground'>—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

/**
 * The left/right eye pair, in the same colours the suborder tables use: blue
 * for left, red for right, grey when off. `onToggle` left out renders them
 * read-only, which is how the original and the existing swaps are shown.
 */
function EyePair({
  leftEye,
  rightEye,
  onToggle,
}: {
  leftEye: boolean
  rightEye: boolean
  onToggle?: (eyes: { leftEye: boolean; rightEye: boolean }) => void
}) {
  const t = useTranslations()
  const interactive = !!onToggle

  return (
    <div className='flex space-x-2'>
      <Badge
        variant={leftEye ? 'outline' : 'secondary'}
        onClick={() => onToggle?.({ leftEye: !leftEye, rightEye })}
        className={`h-[30px] pr-4 rounded-xl ${interactive ? 'cursor-pointer' : ''} ${
          leftEye ? 'bg-[#246291] text-white' : 'text-[#505050]'
        }`}
      >
        <Eye className='mr-2' size={18} />
        {t('component.EyeSelector.leftEye')}
      </Badge>
      <Badge
        variant={rightEye ? 'outline' : 'secondary'}
        onClick={() => onToggle?.({ leftEye, rightEye: !rightEye })}
        className={`h-[30px] pl-4 rounded-xl ${interactive ? 'cursor-pointer' : ''} ${
          rightEye ? 'bg-[#E10600] text-white' : 'text-[#505050]'
        }`}
      >
        {t('component.EyeSelector.rightEye')}
        <Eye className='ml-2' size={18} />
      </Badge>
    </div>
  )
}

/**
 * The eyes still to be swapped, at the top of the drawer because it decides
 * what can be built below it: at zero there is nothing left to create.
 */
function AvailabilityBox({
  available,
  total,
  loading,
}: {
  available: number
  total: number
  loading: boolean
}) {
  const t = useTranslations()
  const exhausted = !loading && available === 0

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
        exhausted ? 'bg-muted' : 'bg-muted/40'
      }`}
    >
      <div className='flex flex-col gap-0.5'>
        <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
          {t('component.SwapDrawer.availability.title')}
        </span>
        <span className='text-sm'>
          {loading
            ? t('component.SwapDrawer.availability.loading')
            : exhausted
              ? t('component.SwapDrawer.availability.exhausted')
              : t('component.SwapDrawer.availability.used', {
                  used: total - available,
                  total,
                })}
        </span>
      </div>
      <div className='flex items-baseline gap-1'>
        <span
          className={`text-2xl font-semibold tabular-nums ${
            exhausted ? 'text-muted-foreground' : ''
          }`}
        >
          {loading ? '—' : available}
        </span>
        <span className='text-muted-foreground text-xs'>
          {`/ ${total} ${t('component.SwapDrawer.availability.unit')}`}
        </span>
      </div>
    </div>
  )
}

/** Name, date of birth and IK number — how a patient reads everywhere here. */
function PatientLine({ patient }: { patient: PatientWithInsuranceCompany }) {
  return (
    <div className='flex flex-col gap-0.5'>
      <span className='text-sm font-medium'>
        {`${patient.last_name} ${patient.first_name}`}
      </span>
      <span className='text-muted-foreground flex items-center gap-2 text-xs'>
        {formatDateFromString(patient.date_of_birth)}
        {patient.insurance_companies?.iknumber ? (
          <Badge variant='outline'>{patient.insurance_companies.iknumber}</Badge>
        ) : null}
      </span>
    </div>
  )
}

/**
 * The swaps already made out of this suborder. One hop only: a swap of a swap
 * hangs off its own parent, and is found by opening the drawer on that one.
 */
function ExistingSwaps({
  swaps,
  isLoading,
}: {
  swaps: SubOrder[] | undefined
  isLoading: boolean
}) {
  const t = useTranslations()

  if (isLoading) {
    return (
      <div className='text-muted-foreground flex items-center gap-2 rounded-lg border p-4 text-sm'>
        <Loader2 className='animate-spin' size={16} />
        {t('component.SwapDrawer.swaps.loading')}
      </div>
    )
  }

  if (!swaps?.length) {
    return (
      <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-sm'>
        {t('component.SwapDrawer.swaps.none')}
      </div>
    )
  }

  return (
    <ul className='divide-y rounded-lg border'>
      {swaps.map((swap) => (
        <li key={swap.id} className='flex items-center justify-between gap-3 p-3'>
          <PatientLine patient={swap.patient} />
          <div className='flex items-center gap-3'>
            <EyePair leftEye={!!swap.left_eye} rightEye={!!swap.right_eye} />
            {swap.invoice_type ? <Badge variant='secondary'>{swap.invoice_type}</Badge> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * The patient picker: a search box over the office's patients, with the hits
 * listed underneath it. Server-side search and paging, the same
 * useSearchPatientsInfinite the order form's picker uses, so a practice with
 * thousands of patients never fetches them all.
 */
function PatientSearch({
  doctorOfficeId,
  onSelect,
}: {
  doctorOfficeId?: string
  onSelect: (patient: PatientWithInsuranceCompany) => void
}) {
  const t = useTranslations()
  const [search, setSearch] = useState('')

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useSearchPatientsInfinite(search, doctorOfficeId)

  const patients = useMemo(() => data?.pages.flat() ?? [], [data])

  return (
    <div className='flex flex-col gap-2'>
      <div className='relative'>
        <Search
          className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2'
          size={16}
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('component.SwapDrawer.search.placeholder')}
          className='pl-9'
        />
      </div>

      {/*
        The results sit in the drawer's flow rather than in a popover: a popover
        anchored inside a drawer fights the drawer for focus, and there is room
        here to simply list them.
      */}
      <div className='max-h-[280px] overflow-y-auto rounded-lg border'>
        {isLoading ? (
          <div className='text-muted-foreground flex items-center gap-2 p-4 text-sm'>
            <Loader2 className='animate-spin' size={16} />
            {t('component.SwapDrawer.search.searching')}
          </div>
        ) : patients.length === 0 ? (
          <div className='text-muted-foreground p-4 text-sm'>
            {t('component.SwapDrawer.search.noResults')}
          </div>
        ) : (
          <ul className='divide-y'>
            {patients.map((patient) => (
              <li key={patient.id}>
                <button
                  type='button'
                  onClick={() => onSelect(patient)}
                  className='hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left'
                >
                  <span className='text-sm font-medium'>
                    {`${patient.last_name} ${patient.first_name}`}
                  </span>
                  <span className='text-muted-foreground flex items-center gap-2 text-xs'>
                    {formatDateFromString(patient.date_of_birth)}
                    {patient.insurance_companies?.iknumber ? (
                      <Badge variant='outline'>{patient.insurance_companies.iknumber}</Badge>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {hasNextPage ? (
          <div className='border-t p-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='w-full'
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className='animate-spin' size={16} />
              ) : (
                t('component.SwapDrawer.search.loadMore')
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * "Create a swap" for one suborder: the suborder being swapped out shown
 * read-only, the swaps already made out of it, and the replacement to be built
 * — a patient picked by search, then the eyes and the invoice target.
 *
 * The replacement is created on the same order as the original, with
 * `swapped_from_id` pointing back at it. The drawer stays open afterwards so
 * the new swap appears in the list above, which is also what makes a second
 * swap of the same original (A <- B and A <- C) a matter of picking another
 * patient rather than reopening anything.
 */
export function SwapDrawer({
  subOrder,
  open,
  onOpenChange,
  doctorOfficeId,
}: {
  /** The suborder being swapped out. Null while the drawer is closed. */
  subOrder: SubOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Scopes the patient search to one office. Office users leave it unset — RLS
   * already scopes them — and it is passed where the office is known, which is
   * how the order form's picker is scoped too.
   */
  doctorOfficeId?: string
}) {
  const t = useTranslations()
  const router = useRouter()

  const [patient, setPatient] = useState<PatientWithInsuranceCompany | null>(null)
  const [eyes, setEyes] = useState({ leftEye: false, rightEye: false })
  const [invoiceType, setInvoiceType] = useState<InvoiceType | undefined>(undefined)

  const { mutateAsync: createSwap, isPending } = useCreateSwap()

  // Fetched here rather than inside ExistingSwaps because the same rows decide
  // what is still available, and one query should answer both.
  const {
    data: swaps,
    isLoading: swapsLoading,
    isSuccess: swapsLoaded,
  } = useListSwaps(subOrder?.id, open)

  const totalEyes = subOrder ? eyeCount(subOrder) : 0
  const available = subOrder ? availableEyes(subOrder, swaps ?? []) : 0
  const pickedEyes = (eyes.leftEye ? 1 : 0) + (eyes.rightEye ? 1 : 0)

  // Everything the replacement needs before it can be created: a patient, an
  // eye, and a billing target — the same three the order form's picker requires
  // before it will add a row — and eyes that fit what is left.
  //
  // `swapsLoaded` is part of it on purpose: until the swaps are in, `available`
  // is computed from an empty list and reads as the full count, which would let
  // a swap through on a suborder that has none left.
  const complete =
    !!patient &&
    !!invoiceType &&
    swapsLoaded &&
    pickedEyes > 0 &&
    pickedEyes <= available

  /**
   * Keeps the picked eyes within what is available. With one eye left the pair
   * behaves as a choice between them — switching one on switches the other off
   * — rather than a click that silently does nothing.
   */
  const handleEyeToggle = ({
    leftEye,
    rightEye,
  }: {
    leftEye: boolean
    rightEye: boolean
  }) => {
    if ((leftEye ? 1 : 0) + (rightEye ? 1 : 0) <= available) {
      setEyes({ leftEye, rightEye })
      return
    }
    const turnedOnLeft = leftEye && !eyes.leftEye
    setEyes({ leftEye: turnedOnLeft, rightEye: !turnedOnLeft })
  }

  const clearReplacement = () => {
    setPatient(null)
    setEyes({ leftEye: false, rightEye: false })
    setInvoiceType(undefined)
  }

  // Reset on close rather than on open, so reopening never flashes the previous
  // attempt's patient before clearing it.
  const handleOpenChange = (next: boolean) => {
    if (!next) clearReplacement()
    onOpenChange(next)
  }

  const handleCreate = async () => {
    if (!subOrder || !patient || !invoiceType) return

    try {
      await createSwap({
        swappedFromId: subOrder.id,
        patientId: patient.id,
        leftEye: eyes.leftEye,
        rightEye: eyes.rightEye,
        invoiceType,
      })

      toast.success(t('component.SwapDrawer.toasts.success'))

      // Stay open and clear the form: the new swap shows up in the list above,
      // and a second swap of the same original is one more patient away.
      clearReplacement()

      // The orders table is server-rendered, so react-query has no copy of it to
      // invalidate — this is what pulls the new suborder into the row behind the
      // drawer.
      router.refresh()
    } catch (error) {
      toast.error(t('component.SwapDrawer.toasts.error'), {
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <Drawer direction='right' open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className='!w-[42vw] !max-w-[42vw]'>
        <DrawerHeader className='border-b'>
          <DrawerTitle>{t('component.SwapDrawer.title')}</DrawerTitle>
          <DrawerDescription>{t('component.SwapDrawer.description')}</DrawerDescription>
        </DrawerHeader>

        {subOrder ? (
          <div className='flex-1 overflow-y-auto p-4'>
            <AvailabilityBox
              available={available}
              total={totalEyes}
              loading={swapsLoading}
            />

            <section className='mt-6 flex flex-col gap-3'>
              <h3 className='text-sm font-semibold'>{t('component.SwapDrawer.original')}</h3>
              <dl className='bg-muted/40 grid grid-cols-2 gap-4 rounded-lg border p-4'>
                <DetailRow
                  label={t('component.SwapDrawer.fields.patient')}
                  value={`${subOrder.patient.last_name} ${subOrder.patient.first_name}`}
                />
                <DetailRow
                  label={t('component.SwapDrawer.fields.dateOfBirth')}
                  value={formatDateFromString(subOrder.patient.date_of_birth)}
                />
                <DetailRow
                  label={t('component.SwapDrawer.fields.ikNumber')}
                  value={subOrder.patient.insurance_companies?.iknumber}
                />
                <DetailRow
                  label={t('component.SwapDrawer.fields.medicine')}
                  value={subOrder.order?.medicine?.name}
                />
                <DetailRow
                  label={t('component.SwapDrawer.fields.applicationDate')}
                  value={formatDateFromString(subOrder.order?.application_date)}
                />
                <DetailRow
                  label={t('component.SwapDrawer.fields.invoice')}
                  value={subOrder.invoice_type}
                />
                <div className='col-span-2'>
                  <DetailRow
                    label={t('component.SwapDrawer.fields.eyes')}
                    value={
                      <EyePair leftEye={!!subOrder.left_eye} rightEye={!!subOrder.right_eye} />
                    }
                  />
                </div>
              </dl>
            </section>

            <section className='mt-6 flex flex-col gap-3'>
              <h3 className='flex items-center gap-2 text-sm font-semibold'>
                <ArrowLeftRight size={16} />
                {t('component.SwapDrawer.swaps.title')}
              </h3>
              <ExistingSwaps swaps={swaps} isLoading={swapsLoading} />
            </section>

            <section className='mt-6 flex flex-col gap-3'>
              <h3 className='text-sm font-semibold'>{t('component.SwapDrawer.replacement')}</h3>

              {swapsLoaded && available === 0 ? (
                /*
                  Nothing left to swap, so the picker is not offered at all —
                  picking a patient you could not then submit is worse than not
                  being asked. The box above says why; this only says so short.
                */
                <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-sm'>
                  {t('component.SwapDrawer.availability.blocked')}
                </div>
              ) : patient ? (
                <div className='flex flex-col gap-4 rounded-lg border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <PatientLine patient={patient} />
                    {/* Back to the search, so a mis-click doesn't mean closing the drawer. */}
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      disabled={isPending}
                      onClick={() => setPatient(null)}
                    >
                      <X size={16} />
                      {t('component.SwapDrawer.selected.change')}
                    </Button>
                  </div>

                  <div className='flex flex-col gap-2'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('component.SwapDrawer.fields.eyes')}
                    </span>
                    {/*
                      No handler at all once nothing is available: the pair then
                      renders read-only, which says "nothing to pick" better
                      than a click that gets ignored.
                    */}
                    <EyePair
                      leftEye={eyes.leftEye}
                      rightEye={eyes.rightEye}
                      onToggle={available > 0 && !isPending ? handleEyeToggle : undefined}
                    />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <span className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                      {t('component.SwapDrawer.fields.invoice')}
                    </span>
                    <SelectInput
                      name='invoice'
                      label={t('component.SwapDrawer.fields.invoice')}
                      listValues={INVOICE_TYPES}
                      value={invoiceType}
                      setValue={(value) => setInvoiceType(value as InvoiceType)}
                    />
                  </div>
                </div>
              ) : (
                <PatientSearch doctorOfficeId={doctorOfficeId} onSelect={setPatient} />
              )}
            </section>
          </div>
        ) : null}

        <DrawerFooter className='flex-row justify-end border-t'>
          <Button
            type='button'
            variant='outline'
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            {t('component.SwapDrawer.cancel')}
          </Button>
          <Button type='button' disabled={!complete || isPending} onClick={handleCreate}>
            {isPending ? <Loader2 className='animate-spin' size={16} /> : null}
            {t('component.SwapDrawer.submit')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
