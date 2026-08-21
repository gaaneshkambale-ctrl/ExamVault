import { useEffect, useRef, useState } from 'react';
import { watchRecording } from '../api/submissionApi';
import { loadMeteredSdk, type MeteredMeeting } from '../utils/meteredSdk';

export type LiveWatchState = 'idle' | 'connecting' | 'waiting' | 'live' | 'unavailable';

export interface LiveWatchStatus {
  state: LiveWatchState;
  stream: MediaStream | null;
}

// Admin's view-only side of the Metered room the student's own exam client
// (useProctoring.ts) publishes into. Never calls shareCustomVideoStream or
// requests the admin's own camera - only ever joins to *receive* the
// student's already-published track. Gated purely by `enabled` (the
// Proctoring page's per-card "Live" toggle reflected back from
// attempt.liveWatchEnabled) - the actual authorization is enforced
// server-side on every watchRecording call regardless of this flag.
//
// One connection per attempt regardless of how many places render it (grid
// thumbnail + expanded modal both call this with the same attemptId) isn't
// how this hook works today - each call opens its own room join. Callers
// that need the same live stream in two places (inline thumbnail + a bigger
// expanded view) should share one hook call's `stream` rather than calling
// this twice for the same attempt.
export function useLiveWatch(attemptId: string, enabled: boolean): LiveWatchStatus {
  const [state, setState] = useState<LiveWatchState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const meetingRef = useRef<MeteredMeeting | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      setStream(null);
      return;
    }

    let cancelled = false;
    setState('connecting');

    const start = async () => {
      try {
        const { roomUrl, token } = await watchRecording(attemptId);
        if (cancelled) {
          return;
        }
        if (!roomUrl || !token) {
          setState('unavailable');
          return;
        }

        const Metered = await loadMeteredSdk();
        if (cancelled || !Metered) {
          setState('unavailable');
          return;
        }

        const meeting = new Metered.Meeting();
        await meeting.join({
          roomURL: roomUrl,
          accessToken: token,
          joinWithVideo: false,
          joinWithAudio: false,
        });
        if (cancelled) {
          meeting.leaveMeeting();
          return;
        }
        meetingRef.current = meeting;
        setState('waiting');

        meeting.on('remoteTrackStarted', (event) => {
          if (event.type !== 'video') {
            return;
          }
          setStream(new MediaStream([event.track]));
          setState('live');
        });

        meeting.on('remoteTrackStopped', (event) => {
          if (event.type !== 'video') {
            return;
          }
          setStream(null);
          setState('waiting');
        });

        meeting.on('participantLeft', () => {
          setStream(null);
          setState('waiting');
        });
      } catch {
        if (!cancelled) {
          setState('unavailable');
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      meetingRef.current?.leaveMeeting();
      meetingRef.current = null;
      setStream(null);
    };
  }, [attemptId, enabled]);

  return { state, stream };
}
