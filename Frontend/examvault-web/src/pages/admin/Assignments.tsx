import { useMemo, useState } from 'react';
import { Badge, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteAssignmentButton from '../../components/DeleteAssignmentButton';
import { useAssignments } from '../../hooks/useAssignments';
import { useGroups } from '../../hooks/useGroups';
import { getAssignmentStatus, type AssignmentStatus } from '../../types/assignment';

const statusVariant: Record<AssignmentStatus, string> = {
  Upcoming: 'info',
  Active: 'success',
  Expired: 'secondary',
};

function targetTypeLabel(targetType: string): string {
  if (targetType === 'AllStudents') return 'All Students';
  if (targetType === 'Batch') return 'Batch';
  return 'Students';
}

export default function Assignments() {
  const { data: assignments, isLoading, isError } = useAssignments();
  const { data: groups } = useGroups();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | AssignmentStatus>('All');

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of groups ?? []) {
      map.set(group.id, group.name);
    }
    return map;
  }, [groups]);

  const rows = (assignments ?? []).map((a) => ({
    ...a,
    status: getAssignmentStatus(a.startAtUtc, a.endAtUtc),
  }));

  const filteredRows = rows.filter((row) => {
    const matchesSearch = row.examTitle.toLowerCase().includes(searchText.trim().toLowerCase());
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.status === 'Active').length,
    upcoming: rows.filter((r) => r.status === 'Upcoming').length,
    expired: rows.filter((r) => r.status === 'Expired').length,
  };

  return (
    <AdminLayout active="Assignments">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0 text-primary">Assigned Exams</h1>
          <p className="text-muted mb-0">View and manage all assigned exams.</p>
        </div>
        <Link to="/admin/assignments/new" className="btn btn-primary">
          + Assign New Exam
        </Link>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Total Assignments</div>
              <div className="h4 fw-bold mb-0">{stats.total}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Active</div>
              <div className="h4 fw-bold mb-0 text-success">{stats.active}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Upcoming</div>
              <div className="h4 fw-bold mb-0 text-info">{stats.upcoming}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small mb-1">Expired</div>
              <div className="h4 fw-bold mb-0 text-secondary">{stats.expired}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-2 mb-3">
        <Col md={6}>
          <Form.Control
            type="search"
            placeholder="Search by exam..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | AssignmentStatus)}
          >
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Active">Active</option>
            <option value="Expired">Expired</option>
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredRows.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && (
            <div className="text-center text-danger py-5">Couldn't load assignments. Please try again.</div>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <div className="text-center text-muted py-5">
              No exams assigned yet. Click "+ Assign New Exam" to get started.
            </div>
          )}

          {!isLoading && !isError && rows.length > 0 && filteredRows.length === 0 && (
            <div className="text-center text-muted py-5">No assignments match your filters.</div>
          )}

          {!isLoading && !isError && filteredRows.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Assignment ID</th>
                  <th>Exam</th>
                  <th>Assigned To</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="ps-4 fw-medium">ASG-{row.assignmentNumber}</td>
                    <td>{row.examTitle}</td>
                    <td>
                      {row.targetType === 'Batch'
                        ? groupNameById.get(row.groupId ?? '') ?? 'Batch'
                        : `${targetTypeLabel(row.targetType)} (${row.targetCount})`}
                    </td>
                    <td>{new Date(row.startAtUtc).toLocaleString()}</td>
                    <td>{new Date(row.endAtUtc).toLocaleString()}</td>
                    <td>
                      <Badge bg={statusVariant[row.status]}>{row.status}</Badge>
                    </td>
                    <td className="pe-4">
                      <DeleteAssignmentButton assignmentId={row.id} />
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
