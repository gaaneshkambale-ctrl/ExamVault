import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import AdminLayout from '../../layouts/AdminLayout';
import SectionHeader from '../../components/SectionHeader';
import { useGroup } from '../../hooks/useGroups';
import { useUsers } from '../../hooks/useUsers';
import { addGroupMember, removeGroupMember } from '../../api/groupApi';
import { RemoveIcon } from '../../components/icons/ActionIcons';

function PersonAddIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function extractError(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  return 'Something went wrong. Please try again.';
}

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: group, isLoading, isError } = useGroup(id);
  const { data: users } = useUsers();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [error, setError] = useState('');

  const students = (users ?? []).filter((u) => u.role === 'Student');
  const memberIds = new Set(group?.memberUserIds ?? []);
  const availableStudents = students.filter((s) => !memberIds.has(s.id));
  const members = students.filter((s) => memberIds.has(s.id));

  const invalidateGroup = () => {
    queryClient.invalidateQueries({ queryKey: ['groups', id] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const addMutation = useMutation({
    mutationFn: (userId: string) => addGroupMember(id!, { userId }),
    onSuccess: () => {
      setError('');
      setSelectedUserId('');
      invalidateGroup();
    },
    onError: (err) => setError(extractError(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeGroupMember(id!, userId),
    onSuccess: () => {
      setError('');
      invalidateGroup();
    },
    onError: (err) => setError(extractError(err)),
  });

  return (
    <AdminLayout active="User Groups">
      <Link to="/admin/users/groups" className="text-decoration-none small d-inline-block mb-3">
        &larr; Back to Groups
      </Link>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && (
        <div className="text-center text-danger py-5">Couldn't load this group. Please try again.</div>
      )}

      {!isLoading && !isError && group && (
        <>
          <h1 className="h4 fw-bold mb-4 text-primary">{group.name}</h1>

          {error && <Alert variant="danger">{error}</Alert>}

          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <SectionHeader icon={<PersonAddIcon />} title="Add Student" />
              <Row className="g-2">
                <Col md={8}>
                  <Form.Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                    <option value="">
                      {availableStudents.length === 0 ? 'No more students to add' : 'Select a student...'}
                    </option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} ({student.email})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Button
                    variant="primary"
                    className="w-100"
                    disabled={!selectedUserId || addMutation.isPending}
                    onClick={() => addMutation.mutate(selectedUserId)}
                  >
                    {addMutation.isPending ? 'Adding...' : 'Add to Group'}
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm">
            <Card.Body className={members.length === 0 ? '' : 'p-0'}>
              <div className="p-4 pb-0">
                <SectionHeader icon={<PeopleIcon />} title={`Members (${members.length})`} />
              </div>

              {members.length === 0 && (
                <div className="text-center text-muted py-5">No students in this group yet.</div>
              )}

              {members.length > 0 && (
                <Table responsive hover className="mb-0 align-middle">
                  <thead className="text-muted small text-uppercase bg-body-tertiary">
                    <tr>
                      <th className="ps-4">Name</th>
                      <th>Email</th>
                      <th className="pe-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="ps-4 fw-medium">{member.fullName}</td>
                        <td>{member.email}</td>
                        <td className="pe-4">
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="d-inline-flex align-items-center justify-content-center"
                            style={{ width: 32, height: 32 }}
                            title="Remove"
                            aria-label={`Remove ${member.fullName}`}
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate(member.id)}
                          >
                            <RemoveIcon />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}
