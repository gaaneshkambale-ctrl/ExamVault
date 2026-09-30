import { useState } from 'react';
import { Badge, Button, Card, Collapse, Spinner } from 'react-bootstrap';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import BankNameModal from '../../components/BankNameModal';
import BankConfirmDeleteModal from '../../components/BankConfirmDeleteModal';
import { EditIcon, TrashIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  useBankSubjects,
  useBankTopics,
  useCreateBankSubject,
  useCreateBankTopic,
  useDeleteBankSubject,
  useDeleteBankTopic,
  useRenameBankTopic,
  useUpdateBankSubject,
} from '../../hooks/useQuestionBank';
import type { BankSubject, BankTopic } from '../../types/questionBank';

type Dialog =
  | { kind: 'addSubject' }
  | { kind: 'editSubject'; subject: BankSubject }
  | { kind: 'deleteSubject'; subject: BankSubject }
  | { kind: 'addTopic'; subject: BankSubject }
  | { kind: 'renameTopic'; topic: BankTopic }
  | { kind: 'deleteTopic'; topic: BankTopic }
  | null;

const iconButton = { width: 32, height: 32 };

export default function QuestionBankSubjects() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin = user?.role !== 'Instructor';
  const canCreate = isAdmin || hasPermission('Questions - Create');
  const canEdit = isAdmin || hasPermission('Questions - Edit');

  const { data: subjects = [], isLoading, isError } = useBankSubjects();
  const { data: topics = [] } = useBankTopics();
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const createSubject = useCreateBankSubject();
  const updateSubject = useUpdateBankSubject();
  const deleteSubject = useDeleteBankSubject();
  const createTopic = useCreateBankTopic();
  const renameTopic = useRenameBankTopic();
  const deleteTopic = useDeleteBankTopic();

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <RoleAwareLayout active="Subjects & Topics">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Question Bank / Subjects &amp; Topics</p>
          <h1 className="h4 fw-bold mb-0 text-primary">Subjects &amp; Topics</h1>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setDialog({ kind: 'addSubject' })}>
            + Add Subject
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}
      {isError && <div className="text-center text-danger py-5">Couldn't load subjects. Please try again.</div>}
      {!isLoading && !isError && subjects.length === 0 && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center text-muted py-5">
            No subjects yet. A subject (for example "Database Management") groups the questions you reuse across exams.
          </Card.Body>
        </Card>
      )}

      <div className="d-flex flex-column gap-3">
        {subjects.map((subject) => {
          const open = openIds.has(subject.id);
          const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
          return (
            <Card key={subject.id} className="border-0 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none text-start p-0 flex-grow-1"
                    aria-expanded={open}
                    onClick={() => toggle(subject.id)}
                  >
                    <span className="fw-bold text-body">{subject.name}</span>
                    {subject.description && <span className="text-muted small ms-2">{subject.description}</span>}
                    <div className="mt-1">
                      <Badge bg="light" text="dark" className="border me-2">
                        {subject.topicCount} topic(s)
                      </Badge>
                      <Badge bg="light" text="dark" className="border">
                        {subject.questionCount} question(s)
                      </Badge>
                    </div>
                  </button>
                  <div className="d-flex gap-2">
                    {canEdit && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="d-inline-flex align-items-center justify-content-center"
                        style={iconButton}
                        title="Edit subject"
                        aria-label={`Edit ${subject.name}`}
                        onClick={() => setDialog({ kind: 'editSubject', subject })}
                      >
                        <EditIcon />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="d-inline-flex align-items-center justify-content-center"
                        style={iconButton}
                        title="Delete subject"
                        aria-label={`Delete ${subject.name}`}
                        onClick={() => setDialog({ kind: 'deleteSubject', subject })}
                      >
                        <TrashIcon />
                      </Button>
                    )}
                  </div>
                </div>

                <Collapse in={open}>
                  <div>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted small text-uppercase fw-semibold">Topics</span>
                      {canCreate && (
                        <Button variant="outline-primary" size="sm" onClick={() => setDialog({ kind: 'addTopic', subject })}>
                          + Add Topic
                        </Button>
                      )}
                    </div>
                    {subjectTopics.length === 0 && <div className="text-muted small">No topics yet - topics are optional.</div>}
                    {subjectTopics.map((topic) => (
                      <div key={topic.id} className="d-flex justify-content-between align-items-center py-1">
                        <span>
                          {topic.name} <span className="text-muted small">({topic.questionCount})</span>
                        </span>
                        <div className="d-flex gap-2">
                          {canEdit && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center"
                              style={iconButton}
                              title="Rename topic"
                              aria-label={`Rename ${topic.name}`}
                              onClick={() => setDialog({ kind: 'renameTopic', topic })}
                            >
                              <EditIcon />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="d-inline-flex align-items-center justify-content-center"
                              style={iconButton}
                              title="Delete topic"
                              aria-label={`Delete ${topic.name}`}
                              onClick={() => setDialog({ kind: 'deleteTopic', topic })}
                            >
                              <TrashIcon />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Collapse>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      <BankNameModal
        show={dialog?.kind === 'addSubject'}
        title="Add Subject"
        withDescription
        submitLabel="Add Subject"
        onHide={close}
        onSubmit={(name, description) => createSubject.mutateAsync({ name, description })}
      />
      <BankNameModal
        show={dialog?.kind === 'editSubject'}
        title="Edit Subject"
        withDescription
        initialName={dialog?.kind === 'editSubject' ? dialog.subject.name : ''}
        initialDescription={dialog?.kind === 'editSubject' ? dialog.subject.description : null}
        onHide={close}
        onSubmit={(name, description) =>
          updateSubject.mutateAsync({ id: (dialog as { subject: BankSubject }).subject.id, name, description })
        }
      />
      <BankNameModal
        show={dialog?.kind === 'addTopic'}
        title={dialog?.kind === 'addTopic' ? `Add Topic to ${dialog.subject.name}` : 'Add Topic'}
        submitLabel="Add Topic"
        onHide={close}
        onSubmit={async (name) => {
          const subject = (dialog as { subject: BankSubject }).subject;
          await createTopic.mutateAsync({ subjectId: subject.id, name });
          setOpenIds((prev) => new Set(prev).add(subject.id));
        }}
      />
      <BankNameModal
        show={dialog?.kind === 'renameTopic'}
        title="Rename Topic"
        initialName={dialog?.kind === 'renameTopic' ? dialog.topic.name : ''}
        onHide={close}
        onSubmit={(name) => {
          const topic = (dialog as { topic: BankTopic }).topic;
          return renameTopic.mutateAsync({ id: topic.id, subjectId: topic.subjectId, name });
        }}
      />
      <BankConfirmDeleteModal
        show={dialog?.kind === 'deleteSubject'}
        title="Delete Subject"
        message={
          dialog?.kind === 'deleteSubject'
            ? `Delete "${dialog.subject.name}"? A subject that still has topics or questions can't be deleted.`
            : ''
        }
        onHide={close}
        onConfirm={() => deleteSubject.mutateAsync((dialog as { subject: BankSubject }).subject.id)}
      />
      <BankConfirmDeleteModal
        show={dialog?.kind === 'deleteTopic'}
        title="Delete Topic"
        message={
          dialog?.kind === 'deleteTopic'
            ? `Delete "${dialog.topic.name}"? A topic that still has questions can't be deleted.`
            : ''
        }
        onHide={close}
        onConfirm={() => deleteTopic.mutateAsync((dialog as { topic: BankTopic }).topic.id)}
      />
    </RoleAwareLayout>
  );
}
