import { useEffect, useState } from 'react';
import { Alert, Button, Card, ListGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import { reorderSections } from '../../api/sectionApi';
import { useSections } from '../../hooks/useSections';
import type { SectionResponse } from '../../types/section';
import { extractServerError } from '../../utils/apiError';

export default function ReorderSections() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sections, isLoading } = useSections(examId);
  const [searchParams] = useSearchParams();
  const fromWizard = searchParams.get('wizard') === 'true';
  const backTo = fromWizard ? `/admin/exams/${examId}/wizard/sections` : `/admin/exams/${examId}/sections`;

  const [ordered, setOrdered] = useState<SectionResponse[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sections) {
      setOrdered(sections);
    }
  }, [sections]);

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await reorderSections(
        examId!,
        ordered.map((section, index) => ({ sectionId: section.id, displayOrder: index })),
      );
      queryClient.invalidateQueries({ queryKey: ['sections', examId] });
      navigate(backTo);
    } catch (err) {
      setError(extractServerError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout active="Exams">
      <div className="mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Reorder Sections</h1>
        <p className="text-muted mb-0">Use the arrows to change the order sections appear in for students.</p>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {!isLoading && ordered.length === 0 && (
            <div className="text-center text-muted py-4">No sections to reorder yet.</div>
          )}

          {!isLoading && ordered.length > 0 && (
            <ListGroup>
              {ordered.map((section, index) => (
                <ListGroup.Item
                  key={section.id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <span className="text-muted me-2">{index + 1}.</span>
                    <span className="fw-medium">{section.name}</span>
                    <span className="text-muted small ms-2">
                      {section.questionCount} Q | {section.marks} Marks | {section.durationMinutes} mins
                    </span>
                  </div>
                  <div className="d-flex gap-1">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={index === ordered.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end gap-2 mt-3">
        <Link to={backTo} className="btn btn-outline-secondary">
          Cancel
        </Link>
        <Button variant="primary" disabled={saving || ordered.length === 0} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Order'}
        </Button>
      </div>
    </AdminLayout>
  );
}
