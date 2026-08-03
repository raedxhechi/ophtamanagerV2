import * as React from 'react'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ValueWithLablel {
  label: string
  value: string
}

interface SelectInputProps {
  listValues?: string[]
  name: string
  setValue?: (value: string) => void
  label?: string
  listValuesWithLabels?: ValueWithLablel[]
  disabled?: boolean
  value?: string | undefined
}

export function SelectInput({
  listValues,
  name,
  setValue,
  label,
  listValuesWithLabels,
  disabled,
  value,
}: SelectInputProps) {
  return (
    <Select onValueChange={setValue} disabled={disabled} value={value}>
      <SelectTrigger className='w-[180px] bg-white'>
        <SelectValue placeholder={`${label || `${name}`}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {!!listValuesWithLabels
            ? listValuesWithLabels.map((item) => (
                <SelectItem value={item.value} key={item.value}>
                  {item.label}
                </SelectItem>
              ))
            : listValues &&
              listValues.map((item) => (
                <SelectItem value={item} key={item}>
                  {item}
                </SelectItem>
              ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
