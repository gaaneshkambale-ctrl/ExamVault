import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteExamTypeButton from '../../components/DeleteExamTypeButton';
import { useExamTypes } from '../../hooks/useExams';
import { createExamType } from '../../api/examApi';

function extractError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

const PAGE_SIZE = 8;

export default function ManageExamTypes() {
  const { data: examTypes, isLoading, isError } = useExamTypes();
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createExamType({ name, purpose: purpose.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-types'] });
      setShowCreate(false);
      setName('');
      setPurpose('');
    },
  });

  const filteredExamTypes = (examTypes ?? []).filter((type) =>
    type.name.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredExamTypes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExamTypes = filteredExamTypes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rangeStart = filteredExamTypes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredExamTypes.length);

  const openCreate = () => {
    createMutation.reset();
    setName('');
    setPurpose('');
    setShowCreate(true);
  };

  return (
    <AdminLayout active="Exam Types">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <div>
          <p className="text-muted small mb-1">Exams / Exam Types</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Exam Types</h1>
          <p className="text-muted mb-0">
            Purpose-based exam classification (Practice, Mock, Certification, etc.) - add or remove the
            options available when creating an exam.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Add Exam Type
        </Button>
      </div>

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Exam Type</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createMutation.isError && <Alert variant="danger">{extractError(createMutation.error)}</Alert>}
          <Form.Group className="mb-3" controlId="examTypeName">
            <Form.Label>Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Practice Exam" />
          </Form.Group>
          <Form.Group controlId="examTypePurpose">
            <Form.Label>Purpose (optional)</Form.Label>
            <Form.Control
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Student practice, usually unlimited/repeated attempts"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Adding...' : 'Add'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="g-2 mb-3 mt-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search exam types..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || pagedExamTypes.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load exam types. Please try again.</div>
          )}

          {!isLoading && !isError && examTypes?.length === 0 && (
            <div className="text-center text-muted py-5">
              No exam types yet. Click "+ Add Exam Type" to create one.
            </div>
          )}

          {!isLoading && !isError && examTypes && examTypes.length > 0 && filteredExamTypes.length === 0 && (
            <div className="text-center text-muted py-5">No exam types match your search.</div>
          )}

          {!isLoading && !isError && pagedExamTypes.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Name</th>
                  <th>Purpose</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedExamTypes.map((examType) => (
                  <tr key={examType.id}>
                    <td className="ps-4 fw-medium">{examType.name}</td>
                    <td className="text-muted">{examType.purpose || '-'}</td>
                    <td>{new Date(examType.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <DeleteExamTypeButton examTypeId={examType.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoading && !isError && filteredExamTypes.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredExamTypes.length} exam types
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Pagination.Item key={p} active={p === currentPage} onClick={() => setPage(p)}>
                {p}
              </Pagination.Item>
            ))}
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          </Pagination>
        </div>
      )}
    </AdminLayout>
  );
}
