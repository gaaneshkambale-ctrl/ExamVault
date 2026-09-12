import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateQuestionModal from './CreateQuestionModal';
import * as questionApi from '../api/questionApi';

vi.mock('../api/questionApi', () => ({
  createQuestion: vi.fn(),
}));

function renderModal(onClose = vi.fn(), onCreated = vi.fn()) {
  render(
    <CreateQuestionModal examId="exam-1" sectionName="Section A" show onClose={onClose} onCreated={onCreated} />,
  );
  return { onClose, onCreated };
}

// react-bootstrap's Modal treats a mousedown+mouseup both landing directly
// on the outer `.modal` wrapper (not inside `.modal-dialog`) as a backdrop
// click - this is what backdrop="static" is meant to suppress.
function clickBackdrop() {
  const dialogWrapper = document.querySelector('.modal') as HTMLElement;
  fireEvent.mouseDown(dialogWrapper);
  fireEvent.mouseUp(dialogWrapper);
  fireEvent.click(dialogWrapper);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateQuestionModal dismissal behavior', () => {
  it('does not close when the backdrop is clicked', async () => {
    const { onClose } = renderModal();
    expect(await screen.findByText('Create Question')).toBeInTheDocument();

    clickBackdrop();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Create Question')).toBeInTheDocument();
  });

  it('does not close when the backdrop is clicked even with unsaved text entered', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');

    clickBackdrop();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('What is 2+2?')).toBeInTheDocument();
  });

  it('closes immediately via Cancel when nothing has been entered', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });

  it('closes immediately via the header X button when nothing has been entered', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows a discard-confirmation instead of closing via Cancel when there are unsaved changes', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
  });

  it('shows a discard-confirmation instead of closing via the header X when there are unsaved changes', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Discard changes?')).toBeInTheDocument();
  });

  it('actually closes and discards once "Discard Changes" is confirmed', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Discard changes?');

    await user.click(screen.getByRole('button', { name: 'Discard Changes' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the modal open with entered text intact when "Keep Editing" is chosen', async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Discard changes?');

    await user.click(screen.getByRole('button', { name: 'Keep Editing' }));

    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('What is 2+2?')).toBeInTheDocument();
  });

  it('does not prompt for discard when submitting successfully creates the question', async () => {
    vi.mocked(questionApi.createQuestion).mockResolvedValue({ id: 'q-1' } as never);
    const { onCreated } = renderModal();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Enter your question here'), 'What is 2+2?');
    await user.type(screen.getByPlaceholderText('Option 1'), '4');
    await user.type(screen.getByPlaceholderText('Option 2'), '5');
    await user.selectOptions(screen.getByLabelText('Correct Answer'), 'A - 4');

    await user.click(screen.getByRole('button', { name: /save question/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Discard changes?')).not.toBeInTheDocument();
  });
});
