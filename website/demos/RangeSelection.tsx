import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@linaria/core';
import { faker } from '@faker-js/faker';

import DataGrid, {SelectColumn, textEditor, SelectCellFormatter} from '../../src';
import type { Column, SortColumn } from '../../src';
import { exportToCsv, exportToPdf } from './exportUtils';
import { textEditorClassname } from '../../src/editors/textEditor';
import type { Props } from './types';
import type {CellsRange, Direction} from '../../src/types';

const toolbarClassname = css`
  text-align: end;
  margin-block-end: 8px;
`;

const dialogContainerClassname = css`
  position: absolute;
  inset: 0;
  display: flex;
  place-items: center;
  background: rgba(0, 0, 0, 0.1);

  > dialog {
    width: 300px;
    > input {
      width: 100%;
    }

    > menu {
      text-align: end;
    }
  }
`;

const dateFormatter = new Intl.DateTimeFormat(navigator.language);
const currencyFormatter = new Intl.NumberFormat(navigator.language, {
  style: 'currency',
  currency: 'eur'
});

function TimestampFormatter({ timestamp }: { timestamp: number }) {
  return <>{dateFormatter.format(timestamp)}</>;
}

function CurrencyFormatter({ value }: { value: number }) {
  return <>{currencyFormatter.format(value)}</>;
}

interface SummaryRow {
  id: string;
  totalCount: number;
  yesCount: number;
}

interface Row {
  id: number;
  title: string;
  client: string;
  area: string;
  country: string;
  contact: string;
  assignee: string;
  progress: number;
  startTimestamp: number;
  endTimestamp: number;
  budget: number;
  transaction: string;
  account: string;
  version: string;
  available: boolean;
}

function getColumns(countries: string[], direction: Direction): readonly Column<Row, SummaryRow>[] {
  return [
    SelectColumn,
    {
      key: 'id',
      name: 'ID',
      width: 60,
      frozen: true,
      resizable: false,
      renderSummaryCell() {
        return <strong>Total</strong>;
      }
    },
    {
      key: 'title',
      name: 'Task',
      width: 120,
      frozen: true,
      renderEditCell: textEditor,
      renderSummaryCell({ row }) {
        return <>{row.totalCount} records</>;
      }
    },
    {
      key: 'client',
      name: 'Client',
      width: 220,
      renderEditCell: textEditor
    },
    {
      key: 'area',
      name: 'Area',
      width: 120,
      renderEditCell: textEditor
    },
    {
      key: 'country',
      name: 'Country',
      width: 180,
      renderEditCell: (p) => (
        <select
          autoFocus
          className={textEditorClassname}
          value={p.row.country}
          onChange={(e) => p.onRowChange({ ...p.row, country: e.target.value }, true)}
        >
          {countries.map((country) => (
            <option key={country}>{country}</option>
          ))}
        </select>
      ),
    },
    {
      key: 'contact',
      name: 'Contact',
      width: 160,
      renderEditCell: textEditor
    },
    {
      key: 'assignee',
      name: 'Assignee',
      width: 150,
      renderEditCell: textEditor
    },
    {
      key: 'progress',
      name: 'Completion',
      width: 110,
      renderCell(props) {
        const value = props.row.progress;
        return (
          <>
            <progress max={100} value={value} style={{ inlineSize: 50 }} /> {Math.round(value)}%
          </>
        );
      },
      renderEditCell({ row, onRowChange, onClose }) {
        return createPortal(
          <div
            dir={direction}
            className={dialogContainerClassname}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onClose();
              }
            }}
          >
            <dialog open>
              <input
                autoFocus
                type="range"
                min="0"
                max="100"
                value={row.progress}
                onChange={(e) => onRowChange({ ...row, progress: e.target.valueAsNumber })}
              />
              <menu>
                <button onClick={() => onClose()}>Cancel</button>
                <button onClick={() => onClose(true)}>Save</button>
              </menu>
            </dialog>
          </div>,
          document.body
        );
      },
    },
    {
      key: 'startTimestamp',
      name: 'Start date',
      width: 100,
      renderCell(props) {
        return <TimestampFormatter timestamp={props.row.startTimestamp} />;
      }
    },
    {
      key: 'endTimestamp',
      name: 'Deadline',
      width: 100,
      renderCell(props) {
        return <TimestampFormatter timestamp={props.row.endTimestamp} />;
      }
    },
    {
      key: 'budget',
      name: 'Budget',
      width: 100,
      renderCell(props) {
        return <CurrencyFormatter value={props.row.budget} />;
      }
    },
    {
      key: 'transaction',
      name: 'Transaction type'
    },
    {
      key: 'account',
      name: 'Account',
      width: 150
    },
    {
      key: 'version',
      name: 'Version',
      renderEditCell: textEditor
    },
    {
      key: 'available',
      name: 'Available',
      width: 80,
      renderEditCell({ row, onRowChange }) {
        return (
          <SelectCellFormatter
            value={row.available}
            onChange={() => {
              onRowChange({ ...row, available: !row.available });
            }}
          />
        );
      },
      renderSummaryCell({ row: { yesCount, totalCount } }) {
        return `${Math.floor((100 * yesCount) / totalCount)}% ✔️`
      }
    }
  ];
}

function rowKeyGetter(row: Row) {
  return row.id;
}

function createRows(): readonly Row[] {
  const now = Date.now();
  const rows: Row[] = [];

  for (let i = 0; i < 1000; i++) {
    rows.push({
      id: i,
      title: `Task #${i + 1}`,
      client: faker.company.name(),
      area: faker.person.jobArea(),
      country: faker.location.country(),
      contact: faker.internet.exampleEmail(),
      assignee: faker.person.fullName(),
      progress: Math.random() * 100,
      startTimestamp: now - Math.round(Math.random() * 1e10),
      endTimestamp: now + Math.round(Math.random() * 1e10),
      budget: 500 + Math.random() * 10500,
      transaction: faker.finance.transactionType(),
      account: faker.finance.iban(),
      version: faker.system.semver(),
      available: Math.random() > 0.5
    });
  }

  return rows;
}

type Comparator = (a: Row, b: Row) => number;

function getComparator(sortColumn: string): Comparator {
  switch (sortColumn) {
    case 'assignee':
    case 'title':
    case 'client':
    case 'area':
    case 'country':
    case 'contact':
    case 'transaction':
    case 'account':
    case 'version':
      return (a, b) => {
        return a[sortColumn].localeCompare(b[sortColumn]);
      };
    case 'available':
      return (a, b) => {
        return a[sortColumn] === b[sortColumn] ? 0 : a[sortColumn] ? 1 : -1;
      };
    case 'id':
    case 'progress':
    case 'startTimestamp':
    case 'endTimestamp':
    case 'budget':
      return (a, b) => {
        return a[sortColumn] - b[sortColumn];
      };
    default:
      throw new Error(`unsupported sortColumn: "${sortColumn}"`);
  }
}

export default function RangeSelection({ direction }: Props) {
  const [rows, setRows] = useState(createRows);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<number>>(() => new Set());

  const countries = useMemo(() => {
    return [...new Set(rows.map((r) => r.country))].sort(new Intl.Collator().compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const columns = useMemo(() => getColumns(countries, direction), [countries, direction]);

  const summaryRows = useMemo(() => {
    const summaryRow: SummaryRow = {
      id: 'total_0',
      totalCount: rows.length,
      yesCount: rows.filter((r) => r.available).length
    };
    return [summaryRow];
  }, [rows]);

  const sortedRows = useMemo((): readonly Row[] => {
    if (sortColumns.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const sort of sortColumns) {
        const comparator = getComparator(sort.columnKey);
        const compResult = comparator(a, b);
        if (compResult !== 0) {
          return sort.direction === 'ASC' ? compResult : -compResult;
        }
      }
      return 0;
    });
  }, [rows, sortColumns]);

  const [selectedRanges, setSelectedRanges] = useState<CellsRange[]>([]);

  function handleSelectedRangesChange(newSelectedRanges: CellsRange[]) {
    setSelectedRanges(newSelectedRanges)
  }

  function updateSelectedRanges (newValue: string) {
    const newRows = [...sortedRows];
    selectedRanges.forEach(({endColumnIdx, endRowIdx, startColumnIdx, startRowIdx}) => {
      for (let rowIdx = Math.min(startRowIdx, endRowIdx); rowIdx <= Math.max(startRowIdx, endRowIdx); rowIdx++) {
        const newRow = {...newRows[rowIdx]};
        for (let columnIdx = Math.min(startColumnIdx, endColumnIdx); columnIdx <= Math.max(startColumnIdx, endColumnIdx); columnIdx++) {
          const column = columns[columnIdx];
          // @ts-expect-error
          newRow[column.key] = newValue;
        }
        newRows[rowIdx] = newRow;
      }
    })
    setRows(newRows);
  }

  const gridElement = (
    <DataGrid
      rowKeyGetter={rowKeyGetter}
      columns={columns}
      rows={sortedRows}
      defaultColumnOptions={{
        sortable: true,
        resizable: true
      }}
      selectedRows={selectedRows}
      onSelectedRowsChange={setSelectedRows}
      onRowsChange={setRows}
      sortColumns={sortColumns}
      onSortColumnsChange={setSortColumns}
      topSummaryRows={summaryRows}
      className="fill-grid"
      direction={direction}
      enableRangeSelection
      onSelectedRangesChange={handleSelectedRangesChange}
      onMultiPaste={() => {
        navigator.clipboard
          .readText()
          .then((clipText) => {
            updateSelectedRanges(clipText)
          })
          .catch();
      }}
    />
  );

  return (
    <>
      <div className={toolbarClassname}>
        <ExportButton onExport={() => exportToCsv(gridElement, 'CommonFeatures.csv')}>
          Export to CSV
        </ExportButton>
        <ExportButton onExport={() => exportToPdf(gridElement, 'CommonFeatures.pdf')}>
          Export to PDF
        </ExportButton>
      </div>
      {gridElement}
    </>
  );
}

function ExportButton({
  onExport,
  children
}: {
  onExport: () => Promise<unknown>;
  children: React.ReactChild;
}) {
  const [exporting, setExporting] = useState(false);
  return (
    <button
      disabled={exporting}
      onClick={async () => {
        setExporting(true);
        await onExport();
        setExporting(false);
      }}
    >
      {exporting ? 'Exporting' : children}
    </button>
  );
}
