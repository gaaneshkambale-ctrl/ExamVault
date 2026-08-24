import { Badge, Card, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PlatformLayout from '../../../layouts/PlatformLayout';
import OrgAvatar from '../../../components/OrgAvatar';
import { useTenants } from '../../../hooks/useTenants';

export default function ActiveOrganizations() {
  const { data: tenants, isLoading, isError } = useTenants();

  const activeTenants = tenants?.filter((t) => t.isActive) ?? [];

  return (
    <PlatformLayout active="mon-active-orgs">
      <p className="text-muted small mb-1">Platform Admin / System Monitoring / Active Organizations</p>
      <h1 className="h4 fw-bold mb-1 text-primary">Active Organizations</h1>
      <p className="text-muted mb-3">Organizations currently active on the platform.</p>

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {isError && <div className="text-center text-danger py-5">Couldn't load organizations. Please try again.</div>}

      {!isLoading && !isError && (
        <Card className="border-0 shadow-sm">
          <Card.Body className={activeTenants.length === 0 ? '' : 'p-0'}>
            {activeTenants.length === 0 ? (
              <div className="text-center text-muted py-5">No active organizations.</div>
            ) : (
              <Table responsive hover className="mb-0 align-middle">
                <thead className="text-muted small text-uppercase bg-light">
                  <tr>
                    <th className="ps-4">Organization</th>
                    <th>Status</th>
                    <th className="pe-4">Created On</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="ps-4">
                        <Link to={`/platform/organizations/${tenant.id}`} className="d-flex align-items-center gap-2 text-decoration-none">
                          <OrgAvatar name={tenant.name} size={32} />
                          <div>
                            <div className="fw-medium text-body">{tenant.name}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {tenant.slug}.examvault.com
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <Badge bg="success">Active</Badge>
                      </td>
                      <td className="pe-4">{new Date(tenant.createdAtUtc).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </PlatformLayout>
  );
}
