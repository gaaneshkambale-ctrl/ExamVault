import { useEffect, useRef, useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { useLiveWatch } from '../../hooks/useLiveWatch';

interface LiveCameraCellProps {
  attemptId: string;
  enabled: boolean;
  studentName: string;
  size: number;
  // Stop watching without leaving the grid - flips the card's "Live" switch
  // off (same authority toggle, just reachable from the thumbnail itself).
  // Omitted where there's no toggle to drive (list view keeps its own).
  onClose?: () => void;
}

function VideoStreamView({ stream, className }: { stream: MediaStream; className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
}

// "No feed" placeholder for the idle/connecting/waiting/unavailable states -
// a crossed-out camera reads as "no live video" at a glance, unlike the
// student's avatar (which is about identity, not feed status, and is
// already shown right below the card in every layout that uses this cell).
function VideoOffIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted"
    >
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Grid/list cards' video slot: shows a "no feed" placeholder until
// live-watch authority is granted and a track actually arrives, then swaps
// to a small inline preview of the same feed the old WatchRecordingModal
// used to show only after an explicit click. An expand button on the live
// thumbnail opens a bigger view of the *same* stream (no second Metered
// join).
export default function LiveCameraCell({
  attemptId,
  enabled,
  studentName,
  size,
  onClose,
}: LiveCameraCellProps) {
  const { state, stream } = useLiveWatch(attemptId, enabled);
  const [expanded, setExpanded] = useState(false);

  if (state !== 'live' || !stream) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center gap-1 bg-dark bg-opacity-10"
        style={{ width: '100%', height: '100%' }}
      >
        <VideoOffIcon size={Math.round(size * 0.6)} />
        {state === 'connecting' && <div className="text-muted" style={{ fontSize: 11 }}>Connecting…</div>}
        {state === 'waiting' && <div className="text-muted" style={{ fontSize: 11 }}>Waiting for camera…</div>}
        {state === 'idle' && <div className="text-muted" style={{ fontSize: 11 }}>Live off</div>}
        {state === 'unavailable' && <div className="text-muted" style={{ fontSize: 11 }}>No feed</div>}
      </div>
    );
  }

  return (
    <>
      <div
        className="position-relative rounded overflow-hidden"
        style={{ width: '100%', height: '100%', cursor: 'pointer', background: '#000' }}
        onClick={() => setExpanded(true)}
        title="Click to enlarge"
      >
        <VideoStreamView stream={stream} className="w-100 h-100" />
        {onClose && (
          <button
            type="button"
            className="position-absolute top-0 start-0 m-1 p-0 d-flex align-items-center justify-content-center border-0 rounded-circle text-white"
            style={{ width: 20, height: 20, fontSize: 12, lineHeight: 1, background: 'rgba(0,0,0,0.6)' }}
            title="Stop watching"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ✕
          </button>
        )}
        {size >= 60 && (
          <span
            className="position-absolute top-0 end-0 m-1 px-1 rounded text-white"
            style={{ fontSize: 10, background: 'rgba(0,0,0,0.6)' }}
          >
            ⤢ Expand
          </span>
        )}
      </div>

      <Modal show={expanded} onHide={() => setExpanded(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Live Camera - {studentName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex align-items-center justify-content-center bg-dark rounded" style={{ minHeight: 360 }}>
            {stream ? (
              <VideoStreamView stream={stream} className="w-100 rounded" />
            ) : (
              <Spinner animation="border" size="sm" variant="light" />
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
