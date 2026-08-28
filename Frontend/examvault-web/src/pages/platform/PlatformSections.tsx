import { useMemo, useState } from 'react';
import { Card, Form, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import PlatformLayout from '../../layouts/PlatformLayout';
import { useTenants } from '../../hooks/useTenants';
import { listAllSections } from '../../api/sectionApi';

// Real, cross-tenant - new GET /api/exams/sections (SuperAdmin only),
// relying on ExamDbContext's existing IsSuperAdmin query-filter bypass on
// Section (same one the per-exam Sections endpoint already sits on top of).
export default function PlatformSections() {
  const { data: sections, isLoading, isError } = useQuery({ queryKey: ['platform-sections'], queryFn: listAllSections });
  const { data: tenants } = useTenants();

  const [searchText, setSearchText] = useState('');

  const tenantNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tenants ?? []).forEach((t) => map.set(t.id, t.name));
    return map;
  }, [tenants]);

  const searchQuery = searchText.trim().toLowerCase();
  const filteredSections = (sections ?? []).filter((section) => {
    if (!searchQuery) return true;
    const orgName = tenantNameById.get(section.tenantId) ?? '';
    return (
      section.name.toLowerCase().includes(searchQuery) ||
      section.examTitle.toLowerCase().includes(searchQuery) ||
      orgName.toLowerCase().includes(searchQuery)
    );
  });

  return (
    <PlatformLayout active="exams-sections">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <p className="text-muted small mb-1">Platform Admin / Exams / Sections</p>
          <h1 className="h4 fw-bold mb-1 text-primary">Sections</h1>
          <p className="text-muted mb-0">Every exam section across every organization on the platform.</p>
        </div>
        <Form.Control
          type="search"
          placeholder="Search sections, exam, organization..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className={isLoading || isError || filteredSections.length === 0 ? '' : 'p-0'}>
          {isLoading && (
            <div className="d-flex justify-content-center py-5">
              <Spinner animation="border" />
            </div>
          )}

          {isError && <div className="text-center text-danger py-5">Couldn't load sections. Please try again.</div>}

          {!isLoading && !isError && filteredSections.length === 0 && (
            <div className="text-center text-muted py-5">No sections match your search.</div>
          )}

          {!isLoading && !isError && filteredSections.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase bg-light">
                <tr>
                  <th className="ps-4">Section</th>
                  <th>Exam</th>
                  <th>Organization</th>
                  <th>Questions</th>
                  <th>Marks</th>
                  <th className="pe-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section) => (
                  <tr key={section.id}>
                    <td className="ps-4 fw-medium">{section.name}</td>
                    <td className="text-muted">{section.examTitle}</td>
                    <td className="text-muted">{tenantNameById.get(section.tenantId) ?? '—'}</td>
                    <td className="text-muted">{section.questionCount}</td>
                    <td className="text-muted">{section.marks}</td>
                    <td className="pe-4 text-muted">{section.durationMinutes} min</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </PlatformLayout>
  );
}
