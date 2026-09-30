import { useState } from 'react';
import { Card } from 'react-bootstrap';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );
}

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface MiniCalendarProps {
  selectedDate?: Date | null;
  onSelectDate?: (date: Date) => void;
}

// Plain client-side month grid - no events data of its own, just "what day
// is it" at a glance plus month navigation and day selection. Deliberately
// dependency-free (no date-picker library) to match this codebase's
// existing hand-rolled-widget convention. The caller owns what "selected"
// means (e.g. driving an "exams on this day" panel) via selectedDate/
// onSelectDate - this component only renders the grid and reports clicks.
export default function MiniCalendar({ selectedDate = null, onSelectDate }: MiniCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState((selectedDate ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selectedDate ?? today).getMonth());

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    !!selectedDate && isSameDate(selectedDate, new Date(viewYear, viewMonth, day));

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="fw-bold small">
            {MONTH_LABELS[viewMonth]} {viewYear}
          </span>
          <div className="d-flex gap-1">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0"
              style={{ width: 24, height: 24 }}
              aria-label="Previous month"
              onClick={goToPreviousMonth}
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0"
              style={{ width: 24, height: 24 }}
              aria-label="Next month"
              onClick={goToNextMonth}
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
        </div>
        <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center text-muted small fw-medium">
              {label[0]}
            </div>
          ))}
          {cells.map((day, i) => {
            const selected = day !== null && isSelected(day);
            const todayCell = day !== null && isToday(day);
            return (
              <button
                key={i}
                type="button"
                disabled={day === null}
                onClick={() => day !== null && onSelectDate?.(new Date(viewYear, viewMonth, day))}
                className={`btn p-0 border-0 text-center small rounded-circle mx-auto d-flex align-items-center justify-content-center ${
                  selected
                    ? 'bg-primary text-white fw-bold'
                    : todayCell
                      ? 'border border-primary text-primary fw-bold'
                      : day === null
                        ? 'bg-transparent'
                        : 'bg-transparent'
                }`}
                style={{ width: 26, height: 26 }}
              >
                {day ?? ''}
              </button>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
}
