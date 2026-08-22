import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap';
import { getMyPreferences, updateMyPreferences } from '../../api/userApi';
import type { TimeFormat } from '../../types/user';

const LANGUAGES = ['English (United States)', 'English (United Kingdom)', 'Hindi', 'Spanish', 'French'];
const TIMEZONES = ['UTC', '(GMT+05:30) Asia/Kolkata', '(GMT-05:00) America/New_York', '(GMT+00:00) Europe/London'];
const DATE_FORMATS = ['DD MMM YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

// Per-user preferences, genuinely distinct from the global Settings > General
// page built for the Settings hub - that's one org-wide row, this is the
// signed-in user's own.
export default function AccountPreferencesPanel() {
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0]);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('Hour12');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    getMyPreferences()
      .then((prefs) => {
        setLanguage(prefs.language);
        setTimezone(prefs.timezone);
        setDateFormat(prefs.dateFormat);
        setTimeFormat(prefs.timeFormat);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => setStatus('idle'), 3500);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSave = async () => {
    setStatus('saving');
    try {
      const updated = await updateMyPreferences({ language, timezone, dateFormat, timeFormat });
      setLanguage(updated.language);
      setTimezone(updated.timezone);
      setDateFormat(updated.dateFormat);
      setTimeFormat(updated.timeFormat);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <Card className="border-0 shadow-sm h-100">
      <Card.Body className="p-4">
        <h2 className="h6 fw-bold mb-3">Account Preferences</h2>

        {status === 'success' && (
          <Alert variant="success" className="py-2">
            Preferences saved.
          </Alert>
        )}
        {status === 'error' && (
          <Alert variant="danger" className="py-2">
            Couldn't save preferences. Please try again.
          </Alert>
        )}

        {status === 'loading' ? (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="small text-muted">Language</Form.Label>
              <Form.Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small text-muted">Timezone</Form.Label>
              <Form.Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small text-muted">Date Format</Form.Label>
              <Form.Select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small text-muted">Time Format</Form.Label>
              <Form.Select value={timeFormat} onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}>
                <option value="Hour12">12 Hour (AM/PM)</option>
                <option value="Hour24">24 Hour</option>
              </Form.Select>
            </Form.Group>

            <div className="d-flex justify-content-end">
              <Button variant="primary" onClick={handleSave} disabled={status === 'saving'}>
                {status === 'saving' ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
