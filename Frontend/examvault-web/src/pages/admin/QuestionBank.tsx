import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Nav,
  Pagination,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import AdminLayout from '../../layouts/AdminLayout';
import DeleteQuestionButton from '../../components/DeleteQuestionButton';
import { useExams } from '../../hooks/useExams';
import { listQuestions } from '../../api/questionApi';
import type { QuestionDifficulty, QuestionResponse, QuestionType } from '../../types/question';

interface QuestionRow extends QuestionResponse {
  examTitle: string;
}

const difficultyVariant: Record<QuestionDifficulty, string> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'danger',
};

const questionTypeLabel: Record<QuestionType, string> = {
  MultipleChoice: 'Multiple Choice',
  TrueFalse: 'True/False',
};

const tabs = ['All', 'Multiple Choice', 'True/False'] as const;
type Tab = (typeof tabs)[number];

const PAGE_SIZE = 5;

export default function QuestionBank() {
  const navigate = useNavigate();
  const { data: exams, isLoading: isLoadingExams } = useExams();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [searchText, setSearchText] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | QuestionDifficulty>('All');
  const [page, setPage] = useState(1);

  const questionQueries = useQueries({
    queries: (exams ?? []).map((exam) => ({
      queryKey: ['questions', 'byExam', exam.id],
      queryFn: () => listQuestions(exam.id),
      enabled: !!exams,
    })),
  });

  const isLoadingQuestions = exams ? questionQueries.some((q) => q.isLoading) : false;

  const allQuestions: QuestionRow[] = useMemo(() => {
    if (!exams) {
      return [];
    }
    return exams.flatMap((exam, index) =>
      (questionQueries[index]?.data ?? []).map((question) => ({
        ...question,
        examTitle: exam.title,
      })),
    );
  }, [exams, questionQueries]);

  const filteredQuestions = allQuestions.filter((question) => {
    if (activeTab !== 'All' && questionTypeLabel[question.questionType] !== activeTab) {
      return false;
    }
    if (examFilter !== 'All' && question.examId !== examFilter) {
      return false;
    }
    if (difficultyFilter !== 'All' && question.difficulty !== difficultyFilter) {
      return false;
    }
    if (searchText.trim() && !question.questionText.toLowerCase().includes(searchText.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    setPage(1);
  }, [activeTab, examFilter, difficultyFilter, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedQuestions = filteredQuestions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = filteredQuestions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filteredQuestions.length);

  const countsByTab: Record<Tab, number> = {
    All: allQuestions.length,
    'Multiple Choice': allQuestions.filter((q) => q.questionType === 'MultipleChoice').length,
    'True/False': allQuestions.filter((q) => q.questionType === 'TrueFalse').length,
  };

  const openPicker = () => {
    setSelectedExamId(exams?.[0]?.id ?? '');
    setShowPicker(true);
  };

  const goToAddQuestion = () => {
    if (selectedExamId) {
      navigate(`/admin/exams/${selectedExamId}/questions/create`);
    }
  };

  return (
    <AdminLayout active="Questions">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h4 fw-bold mb-0 text-primary">Questions</h1>
        <Button variant="primary" onClick={openPicker}>
          + Add Question
        </Button>
      </div>

      <Modal show={showPicker} onHide={() => setShowPicker(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add Question</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoadingExams && <p className="text-muted mb-0">Loading exams...</p>}
          {!isLoadingExams && exams?.length === 0 && (
            <p className="text-muted mb-0">
              No exams yet. Create an exam first, then add questions to it.
            </p>
          )}
          {!isLoadingExams && exams && exams.length > 0 && (
            <Form.Group controlId="pickExamForQuestion">
              <Form.Label>Which exam is this question for?</Form.Label>
              <Form.Select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowPicker(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selectedExamId} onClick={goToAddQuestion}>
            Continue
          </Button>
        </Modal.Footer>
      </Modal>

      <Nav
        variant="tabs"
        activeKey={activeTab}
        onSelect={(key) => setActiveTab((key as Tab) ?? 'All')}
        className="mb-3"
      >
        {tabs.map((tab) => (
          <Nav.Item key={tab}>
            <Nav.Link eventKey={tab}>
              {tab} <span className="text-muted">({countsByTab[tab]})</span>
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <Row className="g-2 mb-3">
        <Col md={5}>
          <Form.Control
            type="search"
            placeholder="Search questions..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            <option value="All">All Exams</option>
            {(exams ?? []).map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as 'All' | QuestionDifficulty)}
          >
            <option value="All">All Difficulty</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </Form.Select>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {(isLoadingExams || isLoadingQuestions) && (
            <div className="d-flex justify-content-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          )}

          {!isLoadingExams && !isLoadingQuestions && filteredQuestions.length === 0 && (
            <div className="text-center text-muted py-4">
              No questions yet. Click "+ Add Question" above to add one.
            </div>
          )}

          {!isLoadingExams && !isLoadingQuestions && filteredQuestions.length > 0 && (
            <Table responsive hover className="mb-0 align-middle">
              <thead className="text-muted small text-uppercase">
                <tr>
                  <th className="ps-4">Question</th>
                  <th>Type</th>
                  <th>Exam</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th className="pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedQuestions.map((question) => (
                  <tr key={question.id}>
                    <td className="ps-4 fw-medium" style={{ maxWidth: 360 }}>
                      {question.questionText}
                    </td>
                    <td>{questionTypeLabel[question.questionType]}</td>
                    <td>{question.examTitle}</td>
                    <td>
                      <Badge bg={difficultyVariant[question.difficulty]}>
                        {question.difficulty}
                      </Badge>
                    </td>
                    <td>{question.marks}</td>
                    <td className="pe-4">
                      <div className="d-flex gap-2">
                        <Link
                          to={`/admin/questions/${question.id}`}
                          className="btn btn-outline-secondary btn-sm"
                        >
                          View
                        </Link>
                        <Link
                          to={`/admin/questions/${question.id}/edit`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          Edit
                        </Link>
                        <DeleteQuestionButton questionId={question.id} examId={question.examId} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {!isLoadingExams && !isLoadingQuestions && filteredQuestions.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="text-muted small">
            Showing {rangeStart} to {rangeEnd} of {filteredQuestions.length} entries
          </div>
          <Pagination className="mb-0">
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
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
