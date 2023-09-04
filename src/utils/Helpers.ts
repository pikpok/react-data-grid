import { type CellsRange } from "../types"

export const isValueInBetween = (colIdx: number, rowIdx: number, range: CellsRange[]) => {
  return range.some(({startRowIdx, endRowIdx, startColumnIdx, endColumnIdx}) => {
    const isWithinRow = rowIdx >= Math.min(startRowIdx, endRowIdx) && rowIdx <= Math.max(startRowIdx, endRowIdx);
    const isWithinColumn = colIdx >= Math.min(startColumnIdx, endColumnIdx) && colIdx <= Math.max(startColumnIdx, endColumnIdx);

    return isWithinRow && isWithinColumn;
  })
}
