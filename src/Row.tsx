import { forwardRef, memo, type RefAttributes } from 'react';
import clsx from 'clsx';

import { RowSelectionProvider, useLatestFunc } from './hooks';
import { getColSpan, getRowStyle, isCellInSelectionRange1D } from './utils';
import type { CalculatedColumn, RenderRowProps } from './types';
import Cell from './Cell';
import { rowClassname, rowSelectedClassname } from './style/row';

function Row<R, SR>(
  {
    className,
    rowIdx,
    gridRowStart,
    height,
    selectedCellIdx,
    selectedCellRangeIdx,
    isRowSelected,
    copiedCellIdx,
    draggedOverCellIdx,
    lastFrozenColumnIndex,
    row,
    viewportColumns,
    selectedCellEditor,
    selectedCellDragHandle,
    onCellClick,
    onCellDoubleClick,
    onCellContextMenu,
    rowClass,
    setDraggedOverRowIdx,
    onMouseEnter,
    onRowChange,
    onCellMouseDown,
    onCellMouseUp,
    onCellMouseEnter,
    selectCell,
    ...props
  }: RenderRowProps<R, SR>,
  ref: React.Ref<HTMLDivElement>
) {
  const handleRowChange = useLatestFunc((column: CalculatedColumn<R, SR>, newRow: R) => {
    onRowChange(column, rowIdx, newRow);
  });

  function handleDragEnter(event: React.MouseEvent<HTMLDivElement>) {
    setDraggedOverRowIdx?.(rowIdx);
    onMouseEnter?.(event);
  }

  className = clsx(
    rowClassname,
    `rdg-row-${rowIdx % 2 === 0 ? 'even' : 'odd'}`,
    {
      [rowSelectedClassname]: selectedCellIdx === -1
    },
    rowClass?.(row, rowIdx),
    className
  );

  const cells = [];

  for (let index = 0; index < viewportColumns.length; index++) {
    const column = viewportColumns[index];
    const { idx } = column;
    const colSpan = getColSpan(column, lastFrozenColumnIndex, { type: 'ROW', row });
    if (colSpan !== undefined) {
      index += colSpan - 1;
    }

    const isCellSelected = selectedCellRangeIdx
      ? isCellInSelectionRange1D(idx, selectedCellRangeIdx.startIdx, selectedCellRangeIdx.endIdx)
      : false;

    if (isCellSelected && selectedCellEditor) {
      cells.push(selectedCellEditor);
    } else {
      cells.push(
        <Cell
          key={column.key}
          column={column}
          colSpan={colSpan}
          row={row}
          rowIdx={rowIdx}
          isCopied={copiedCellIdx === idx}
          isDraggedOver={draggedOverCellIdx === idx}
          isCellSelected={isCellSelected}
          dragHandle={isCellSelected ? selectedCellDragHandle : undefined}
          onClick={onCellClick}
          onDoubleClick={onCellDoubleClick}
          onContextMenu={onCellContextMenu}
          onRowChange={handleRowChange}
          onMouseDownCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCellMouseDown?.(e, idx);
          }}
          onMouseUpCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCellMouseUp?.(e, idx);
          }}
          onMouseEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCellMouseEnter?.(e, idx);
          }}
          selectCell={selectCell}
        />
      );
    }
  }

  return (
    <RowSelectionProvider value={isRowSelected}>
      <div
        role="row"
        ref={ref}
        className={className}
        onMouseEnter={handleDragEnter}
        style={getRowStyle(gridRowStart, height)}
        {...props}
      >
        {cells}
      </div>
    </RowSelectionProvider>
  );
}

const RowComponent = memo(forwardRef(Row)) as <R, SR>(
  props: RenderRowProps<R, SR> & RefAttributes<HTMLDivElement>
) => JSX.Element;

export default RowComponent;

export function defaultRenderRow<R, SR>(key: React.Key, props: RenderRowProps<R, SR>) {
  return <RowComponent key={key} {...props} />;
}
