import type { ReactNode } from 'react';
import { Col, Dropdown, Form, Row } from 'react-bootstrap';
import { DownloadIcon } from '../icons/ActionIcons';
import { exportRowsToCsv } from '../../utils/exportCsv';
import type { DateRange } from '../../utils/dateRange';

interface ReportFiltersProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  onReset: () => void;
  exportFilename: string;
  exportHeaders: string[];
  exportRows: () => unknown[][];
  children?: ReactNode;
}

export default function ReportFilters({
  range,
  onRangeChange,
  onReset,
  exportFilename,
  exportHeaders,
  exportRows,
  children,
}: ReportFiltersProps) {
  return (
    <Row className="g-2 mb-4 align-items-center">
      <Col xs="auto">
        <div className="d-flex align-items-center gap-1">
          <Form.Control
            type="date"
            size="sm"
            value={range.from}
            max={range.to}
            onChange={(e) => onRangeChange({ ...range, from: e.target.value })}
            style={{ width: 150 }}
          />
          <span className="text-muted small">to</span>
          <Form.Control
            type="date"
            size="sm"
            value={range.to}
            min={range.from}
            onChange={(e) => onRangeChange({ ...range, to: e.target.value })}
            style={{ width: 150 }}
          />
        </div>
      </Col>

      {children}

      <Col xs="auto">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onReset}>
          Reset Filters
        </button>
      </Col>

      <Col xs="auto" className="ms-md-auto">
        <Dropdown>
          <Dropdown.Toggle variant="primary" size="sm" className="d-inline-flex align-items-center gap-2">
            <DownloadIcon size={14} /> Export
          </Dropdown.Toggle>
          <Dropdown.Menu align="end">
            <Dropdown.Item onClick={() => exportRowsToCsv(exportFilename, exportHeaders, exportRows())}>
              Export as CSV
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Col>
    </Row>
  );
}
