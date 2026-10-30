/**
 * The shape the swap marks need from a suborder row — not the full `SubOrder`,
 * so the patients page's narrower row type fits too.
 *
 * `patient` is optional and used for one thing only: naming the original in a
 * mark's tooltip. A list whose rows don't carry it still gets every mark, just
 * without that name.
 */
export interface SwapRow {
  id: string
  left_eye: boolean
  right_eye: boolean
  swapped_from_id: string | null
  patient?: { first_name: string | null; last_name: string | null } | null
}

/**
 * A suborder's eye count: one per treated eye, so both eyes count as two. The
 * same arithmetic `createOrder` uses to derive an order's quantity, which is
 * what makes "available amount" comparable to it.
 */
export const eyeCount = ({
  left_eye,
  right_eye,
}: {
  left_eye: boolean
  right_eye: boolean
}) => (left_eye ? 1 : 0) + (right_eye ? 1 : 0)

/**
 * How many eyes of an original are still un-swapped: its own eye count less the
 * eyes already claimed by its swaps. A one-eye suborder can therefore be swapped
 * once with one eye, and a two-eye one either once with both or twice with one
 * each.
 *
 * Nothing in the database enforces this — it is a rule across sibling rows, not
 * something a check constraint can see — so it is the UI's to keep. Returns 0
 * rather than a negative number if the data ever says otherwise.
 */
export const availableEyes = (
  original: { left_eye: boolean; right_eye: boolean },
  swaps: { left_eye: boolean; right_eye: boolean }[]
) =>
  Math.max(
    0,
    eyeCount(original) - swaps.reduce((total, swap) => total + eyeCount(swap), 0)
  )

/**
 * What a suborder row has to say about swapping. The two facets are independent,
 * because a swap can itself be swapped: a row may both replace another suborder
 * and have replacements of its own, and then carries both marks.
 */
export interface SwapMarking {
  /** This suborder replaces another one — `swapped_from_id` is set. */
  isSwap: boolean
  /**
   * The patient of the suborder it replaced, for the mark's tooltip. Set only
   * when that row is in the list the markings were built from and carries a
   * patient; the mark itself does not depend on it.
   */
  swappedFromName?: string
  /** How many swaps have been made out of this suborder. */
  swapCount: number
  /**
   * Eyes claimed by those swaps, out of this suborder's own eye count. The real
   * sum, not `totalEyes - availableEyes`: if the data ever holds more swapped
   * eyes than the original has, the mark reads "3/2" and says so rather than
   * rounding the anomaly away.
   */
  usedEyes: number
  totalEyes: number
  /** Eyes still to be swapped; 0 means this original is fully swapped. */
  availableEyes: number
}

/**
 * Builds the marking for every row in `rows`, keyed by suborder id.
 *
 * Everything comes out of the one list, so what the marks can see is exactly
 * what is in it. On the orders page that is enough on its own — a swap is
 * created on its original's own order, so every parent and child of a row is
 * already there. A list that spans orders (one patient's suborders) has to be
 * handed its relations as well, which is what `listSwapRelations` fetches:
 * pass the union, and read back only the rows being rendered.
 */
export const swapMarkings = (rows: SwapRow[]): Map<string, SwapMarking> => {
  // Deduplicated by id first, because the lists handed in can overlap: swapping
  // a patient's suborder for another of *their own* puts the same row in both
  // the rendered list and the fetched relations, and counting its eyes twice
  // would take an original's available amount down by two instead of one. A row
  // carrying a patient wins, so the name for the tooltip survives the merge.
  const byId = new Map<string, SwapRow>()
  for (const row of rows) {
    if (!byId.has(row.id) || row.patient) byId.set(row.id, row)
  }
  const unique = [...byId.values()]

  const swapsByOriginal = new Map<string, SwapRow[]>()
  for (const row of unique) {
    if (!row.swapped_from_id) continue
    const siblings = swapsByOriginal.get(row.swapped_from_id)
    if (siblings) siblings.push(row)
    else swapsByOriginal.set(row.swapped_from_id, [row])
  }

  return new Map(
    unique.map((row) => {
      const swaps = swapsByOriginal.get(row.id) ?? []
      const original = row.swapped_from_id ? byId.get(row.swapped_from_id) : undefined
      const originalPatient = original?.patient

      return [
        row.id,
        {
          isSwap: !!row.swapped_from_id,
          swappedFromName: originalPatient
            ? [originalPatient.last_name, originalPatient.first_name]
                .filter(Boolean)
                .join(' ')
            : undefined,
          swapCount: swaps.length,
          usedEyes: swaps.reduce((total, swap) => total + eyeCount(swap), 0),
          totalEyes: eyeCount(row),
          availableEyes: availableEyes(row, swaps),
        },
      ]
    })
  )
}
