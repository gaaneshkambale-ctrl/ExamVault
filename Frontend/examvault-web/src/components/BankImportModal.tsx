import { useEffect, useState } from 'react';
import { Alert, Col, Form, Modal, Row } from 'react-bootstrap';
import { useQueryClient } from '@tanstack/react-query';
import CsvImportPanel from './CsvImportPanel';
import { useBankSubjects, useBankTopics } from '../hooks/useQuestionBank';
import type { BankQuestionStatus } from '../types/questionBank';

interface BankImportModalProps {
  show: boolean;
  onHide: () => void;
  defaultSubjectId?: string;
}

// Import many questions from a CSV or Excel file into the Question Bank. The
// file itself carries no subject/topic/status, so those are chosen once here
// and applied to every imported question. Defaults to Draft so imported
// questions can be reviewed before they can be added to an exam.
export default function BankImportModal({ show, onHide, defaultSubjectId }: BankImportModalProps) {
  const queryClient = useQueryClient();
  const { data: subjects = [] } = useBankSubjects();
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [status, setStatus] = useState<BankQuestionStatus>('Draft');
  const [importedTotal, setImportedTotal] = useState(0);
  const { data: topics = [] } = useBankTopics(subjectId || undefined);

  useEffect(() => {
    if (show) {
      setSubjectId(defaultSubjectId ?? '');
      setTopicId('');
      setStatus('Draft');
      setImportedTotal(0);
    }
  }, [show, defaultSubjectId]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Import Questions into the Bank</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="g-3 mb-3">
          <Col md={4}>
            <Form.Group controlId="bank-import-subject">
              <Form.Label className="fw-bold">Subject *</Form.Label>
              <Form.Select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setTopicId('');
                }}
              >
                <option value="">Select subject...</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="bank-import-topic">
              <Form.Label className="fw-bold">Topic</Form.Label>
              <Form.Select value={topicId} disabled={!subjectId} onChange={(e) => setTopicId(e.target.value)}>
                <option value="">No topic</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <Form.Group controlId="bank-import-status">
              <Form.Label className="fw-bold">Import as</Form.Label>
              <Form.Select value={status} onChange={(e) => setStatus(e.target.value as BankQuestionStatus)}>
                <option value="Draft">Draft (review first)</option>
                <option value="Active">Active (ready for exams)</option>
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {importedTotal > 0 && (
          <Alert variant="success">
            {importedTotal} question(s) imported into the bank. Close this dialog to see them, or import another file.
          </Alert>
        )}

        {subjectId ? (
          <CsvImportPanel
            key={`${subjectId}|${topicId}|${status}`}
            bank={{
              destination: { subjectId, topicId: topicId || null, status },
              onImported: (count) => {
                setImportedTotal((total) => total + count);
                void queryClient.invalidateQueries({ queryKey: ['questionBank'] });
              },
            }}
          />
        ) : (
          <div className="text-center text-muted py-4">
            Choose a subject first. {subjects.length === 0 && 'Create one under Subjects & Topics.'}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
