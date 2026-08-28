import { useState } from 'react';
import type { FormEvent } from 'react';
import { Alert, Button, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation } from '@tanstack/react-query';
import { updateMyProfile } from '../../api/userApi';
import { useAuth } from '../../hooks/useAuth';
import { extractServerError } from '../../utils/apiError';
import { isValidEmail } from '../../utils/email';
import type { Gender } from '../../types/user';

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export default function PersonalInfoPanel() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [alternateEmail, setAlternateEmail] = useState(user?.alternateEmail ?? '');
  const [gender, setGender] = useState<Gender | ''>(user?.gender ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInputValue(user?.dateOfBirth ?? null));
  const [location, setLocation] = useState(user?.location ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        fullName,
        phoneNumber,
        username: username || null,
        alternateEmail: alternateEmail || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        location: location || null,
        department: department || null,
      }),
    onSuccess: async () => {
      await refreshUser();
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  if (!user) {
    return null;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    updateMutation.mutate();
  };

  return (
    <Form noValidate onSubmit={handleSubmit}>
      {saved && (
        <Alert variant="success" onClose={() => setSaved(false)} dismissible>
          Profile updated.
        </Alert>
      )}
      {updateMutation.isError && <Alert variant="danger">{extractServerError(updateMutation.error)}</Alert>}

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Full Name</Form.Label>
            <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Username</Form.Label>
            <Form.Control value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Email Address</Form.Label>
            <Form.Control value={user.email} readOnly />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Alternate Email</Form.Label>
            <Form.Control
              type="email"
              value={alternateEmail}
              onChange={(e) => setAlternateEmail(e.target.value)}
              placeholder="Optional"
              isInvalid={alternateEmail.trim().length > 0 && !isValidEmail(alternateEmail)}
            />
            <Form.Control.Feedback type="invalid">Enter a valid email address.</Form.Control.Feedback>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Phone Number</Form.Label>
            <Form.Control
              value={phoneNumber ?? ''}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Optional"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Gender</Form.Label>
            <Form.Select value={gender} onChange={(e) => setGender(e.target.value as Gender | '')}>
              <option value="">Prefer not to specify</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="PreferNotToSay">Prefer not to say</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Date of Birth</Form.Label>
            <Form.Control type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Location</Form.Label>
            <Form.Control
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State, Country"
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Role</Form.Label>
            <Form.Control value={user.role} readOnly />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-4">
            <Form.Label className="fw-bold">Department</Form.Label>
            <Form.Control value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
          </Form.Group>
        </Col>
      </Row>

      <div className="d-flex justify-content-end">
        <Button
          type="submit"
          variant="primary"
          disabled={updateMutation.isPending || (alternateEmail.trim().length > 0 && !isValidEmail(alternateEmail))}
        >
          {updateMutation.isPending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </Form>
  );
}
