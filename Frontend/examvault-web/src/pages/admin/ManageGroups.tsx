import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteGroupButton from '../../components/DeleteGroupButton';
import { UsersIcon } from '../../components/icons/ActionIcons';
import { useGroups } from '../../hooks/useGroups';
import { createGroup } from '../../api/groupApi';

function extractError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

export default function ManageGroups() {
  const { data: groups, isLoading, isError } = useGroups();
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => createGroup({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setName('');
    },
  });

  const filteredGroups = (groups ?? []).filter((group) =>
    group.name.toLowerCase().includes(searchText.trim().toLowerCase()),
  );

  const openCreate = () => {
    createMutation.reset();
    setName('');
    setShowCreate(true);
  };

  return (
    <AdminLayout active="Groups">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Groups</h1>
          <p className="text-muted mb-0">Organize students into groups for exam assignment.</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Create Group
        </Button>
      </div>

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createMutation.isError && <Alert variant="danger">{extractError(createMutation.error)}</Alert>}
          <Form.Group controlId="groupName">
            <Form.Label>Group Name</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Batch 2026" />
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
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search groups..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredGroups.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load groups. Please try again.</div>
          )}

          {!isLoading && !isError && groups?.length === 0 && (
            <div className="text-center text-muted py-5">No groups yet. Click "+ Create Group" to add one.</div>
          )}

          {!isLoading && !isError && groups && groups.length > 0 && filteredGroups.length === 0 && (
            <div className="text-center text-muted py-5">No groups match your search.</div>
          )}

          {!isLoading && !isError && filteredGroups.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Group Name</th>
                  <th>Members</th>
                  <th>Created On</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.id}>
                    <td className="ps-4 fw-medium">{group.name}</td>
                    <td>{group.memberCount}</td>
                    <td>{new Date(group.createdAtUtc).toLocaleDateString()}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/users/groups/${group.id}`}
                          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center justify-content-center"
                          style={{ width: 32, height: 32 }}
                          title="Manage Members"
                          aria-label={`Manage members of ${group.name}`}
                        >
                          <UsersIcon />
                        </Link>
                        <DeleteGroupButton groupId={group.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </AdminLayout>
  );
}
