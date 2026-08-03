import { clsx, type ClassValue } from 'clsx'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDateFromString = (date?: string | null) => {
  try {
    return date
      ? format(parseISO(date), 'dd.MM.yyyy ', {
          locale: de,
        })
      : ''
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

export const formatDateFromDate = (date?: Date) => {
  try {
    return date
      ? format(date, 'dd.MM.yyyy ', {
          locale: de,
        })
      : ''
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}
export function capitalize(str?: string) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
