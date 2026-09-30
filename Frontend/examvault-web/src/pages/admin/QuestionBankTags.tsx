import { useState } from 'react';
import { Badge, Button, Card, Spinner, Table } from 'react-bootstrap';
import RoleAwareLayout from '../../layouts/RoleAwareLayout';
import BankNameModal from '../../components/BankNameModal';
import BankConfirmDeleteModal from '../../components/BankConfirmDeleteModal';
import { TrashIcon } from '../../components/icons/ActionIcons';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { useBankTags, useCreateBankTag, useDeleteBankTag } from '../../hooks/useQuestionBank';
import type { BankTag } from '../../types/questionBank';

export default function QuestionBankTags() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin = user?.role !== 'Instructor';
  const canCreate = isAdmin || hasPermission('Questions - Create');

  const { data: tags = [], isLoading, isError } = useBankTags();
  const createTag = useCreateBankTag();
  const deleteTag = useDeleteBankTag();
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<BankTag | null>(null);

  return (
    <RoleAwareLayout active="Tags">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <p className="text-muted small mb-1">Question Bank / Tags</p>
          <h1 className="h4 fw-bold mb-0 text-primary">Tags</h1>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowAdd(true)}>
            + Add Tag
          </Button>
        )}
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || tags.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}
          {isError && <div className="text-center text-danger py-5">Couldn't load tags. Please try again.</div>}
          {!isLoading && !isError && tags.length === 0 && (
            <div className="text-center text-muted py-5">No tags yet. Tags (for example "midterm" or "previous-year") let you slice the bank across subjects.</div>
          )}
          {!isLoading && !isError && tags.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-body-tertiary">
                <tr>
                  <th className="ps-4">Tag</th>
                  <th>Questions</th>
                  {isAdmin && <th className="pe-4">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    <td className="ps-4">
                      <Badge bg="light" text="dark" className="border px-3 py-2">
                        {tag.name}
                      </Badge>
                    </td>
                    <td>{tag.questionCount}</td>
                    {isAdmin && (
                      <td className="pe-4">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Delete tag"
                          aria-label={`Delete ${tag.name}`}
                          onClick={() => setDeleting(tag)}
                        >
                          <TrashIcon />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <BankNameModal
        show={showAdd}
        title="Add Tag"
        submitLabel="Add Tag"
        onHide={() => setShowAdd(false)}
        onSubmit={(name) => createTag.mutateAsync({ name })}
      />
      <BankConfirmDeleteModal
        show={deleting !== null}
        title="Delete Tag"
        message={deleting ? `Delete "${deleting.name}"? It is removed from ${deleting.questionCount} question(s); the questions themselves stay.` : ''}
        onHide={() => setDeleting(null)}
        onConfirm={() => deleteTag.mutateAsync(deleting!.id)}
      />
    </RoleAwareLayout>
  );
}
