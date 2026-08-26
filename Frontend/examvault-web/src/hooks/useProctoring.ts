import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { joinRecording, recordProctoringViolation } from '../api/submissionApi';
import { loadMeteredSdk, type MeteredMeeting } from '../utils/meteredSdk';
import type { ProctoringViolationType } from '../types/submission';

const FACE_CHECK_INTERVAL_MS = 3000;
// Absorbs single-frame flakiness (bad angle/lighting/momentary occlusion) -
// only counts a violation once a bad reading is seen this many checks in a row.
const CONSECUTIVE_BAD_READINGS_REQUIRED = 3;
const MODEL_URL = '/models';
const MONITOR_CHECK_INTERVAL_MS = 5000;

export interface ProctoringSettingsFlags {
  faceDetectionEnabled: boolean;
  multiPersonDetectionEnabled: boolean;
  screenMonitoringEnabled: boolean;
  multipleTabsEnabled: boolean;
  copyPasteBlockingEnabled: boolean;
  rightClickBlockingEnabled: boolean;
  multipleMonitorsEnabled: boolean;
}

export interface ProctoringStatus {
  cameraReady: boolean;
  faceStatus: 'ok' | 'no-face' | 'multiple-faces' | 'unknown';
  violationCounts: Record<ProctoringViolationType, number>;
  // Exposed so the exam screen can show a small live preview - lets the
  // student see exactly what the camera sees, same stream as detection runs
  // on (a MediaStream can back more than one <video> element at once).
  stream: MediaStream | null;
}

const emptyCounts: Record<ProctoringViolationType, number> = {
  NoFaceDetected: 0,
  MultipleFacesDetected: 0,
  TabSwitch: 0,
  MultipleTabs: 0,
  CopyPaste: 0,
  RightClick: 0,
  MultipleMonitors: 0,
};

// Runs the whole client-side proctoring layer for an active exam attempt:
// webcam face-count checks (face-api.js, model weights self-hosted under
// public/models - no video frame ever leaves the browser, only violation
// events), tab-switch/minimize detection, same-attempt-in-another-tab
// detection, and copy/paste + right-click blocking. Every detector is
// individually gated by `settings` so an admin can turn each one off.
export function useProctoring(
  enabled: boolean,
  attemptId: string | null,
  settings: ProctoringSettingsFlags,
): ProctoringStatus {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meetingRef = useRef<MeteredMeeting | null>(null);
  const modelsLoadedRef = useRef(false);
  const consecutiveNoFaceRef = useRef(0);
  const consecutiveMultiFaceRef = useRef(0);
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;

  const [cameraReady, setCameraReady] = useState(false);
  const [faceStatus, setFaceStatus] = useState<ProctoringStatus['faceStatus']>('unknown');
  const [violationCounts, setViolationCounts] = useState(emptyCounts);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const reportViolation = (type: ProctoringViolationType) => {
    setViolationCounts((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    const id = attemptIdRef.current;
    if (id) {
      void recordProctoringViolation(id, type).catch(() => {});
    }
  };

  useEffect(() => {
    if (!enabled || (!settings.faceDetectionEnabled && !settings.multiPersonDetectionEnabled)) {
      return;
    }
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const start = async () => {
      try {
        if (!modelsLoadedRef.current) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          modelsLoadedRef.current = true;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        videoRef.current = video;
        setCameraReady(true);
        setStream(stream);

        const checkFace = async () => {
          const currentVideo = videoRef.current;
          if (!currentVideo) {
            return;
          }
          try {
            const detections = await faceapi.detectAllFaces(currentVideo, new faceapi.TinyFaceDetectorOptions());
            const count = detections.length;
            if (count === 0) {
              consecutiveNoFaceRef.current += 1;
              consecutiveMultiFaceRef.current = 0;
              if (
                settings.faceDetectionEnabled &&
                consecutiveNoFaceRef.current === CONSECUTIVE_BAD_READINGS_REQUIRED
              ) {
                setFaceStatus('no-face');
                reportViolation('NoFaceDetected');
              }
            } else if (count > 1) {
              consecutiveMultiFaceRef.current += 1;
              consecutiveNoFaceRef.current = 0;
              if (
                settings.multiPersonDetectionEnabled &&
                consecutiveMultiFaceRef.current === CONSECUTIVE_BAD_READINGS_REQUIRED
              ) {
                setFaceStatus('multiple-faces');
                reportViolation('MultipleFacesDetected');
              }
            } else {
              consecutiveNoFaceRef.current = 0;
              consecutiveMultiFaceRef.current = 0;
              setFaceStatus('ok');
            }
          } catch {
            // Transient detection failure - skip this tick, don't count it as evidence either way.
          }
        };

        intervalId = setInterval(() => void checkFace(), FACE_CHECK_INTERVAL_MS);
      } catch {
        setCameraReady(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (intervalId) {
        clearInterval(intervalId);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      videoRef.current = null;
      setCameraReady(false);
      setFaceStatus('unknown');
      setStream(null);
    };
  }, [enabled, settings.faceDetectionEnabled, settings.multiPersonDetectionEnabled]);

  // Video recording (Metered.ca) - joins using the SAME camera stream
  // face-api.js already opened above, via shareCustomVideoStream, rather
  // than letting the SDK make its own getUserMedia call (one permission
  // prompt, one active-camera indicator, not two). No npm package exists
  // for this SDK - it's loaded from Metered's CDN on demand. roomUrl/token
  // both come back null from the backend whenever proctoring isn't enabled
  // for this student's assignment or Metered isn't configured server-side -
  // this effect just no-ops in that case, same as every detector above.
  useEffect(() => {
    if (!enabled || !attemptId || !stream) {
      return;
    }
    let cancelled = false;

    const start = async () => {
      try {
        const { roomUrl, token } = await joinRecording(attemptId);
        if (cancelled || !roomUrl || !token) {
          return;
        }
        const Metered = await loadMeteredSdk();
        if (cancelled || !Metered) {
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
        await meeting.shareCustomVideoStream(stream);
        meetingRef.current = meeting;
      } catch {
        // Best-effort - a recording failure must never interrupt the exam itself.
      }
    };

    void start();

    return () => {
      cancelled = true;
      meetingRef.current?.leaveMeeting();
      meetingRef.current = null;
    };
  }, [enabled, attemptId, stream]);

  // Tab switch / browser minimize / switching to another application.
  // document.hidden alone misses one real case: alt-tabbing to another app
  // while this browser window would otherwise stay "restored" on screen -
  // some browser/OS combinations don't reliably flip document.hidden for
  // that, but always fire window.blur. Both signals funnel through the same
  // isAway check so a single real event (which can fire both) only ever
  // counts once, edge-triggered on the away->back transition the same way
  // the multi-monitor detector is.
  useEffect(() => {
    if (!enabled || !settings.screenMonitoringEnabled) {
      return;
    }
    let wasAway = document.hidden || !document.hasFocus();
    const checkAway = () => {
      const isAway = document.hidden || !document.hasFocus();
      if (isAway && !wasAway) {
        reportViolation('TabSwitch');
      }
      wasAway = isAway;
    };
    document.addEventListener('visibilitychange', checkAway);
    window.addEventListener('blur', checkAway);
    window.addEventListener('focus', checkAway);
    return () => {
      document.removeEventListener('visibilitychange', checkAway);
      window.removeEventListener('blur', checkAway);
      window.removeEventListener('focus', checkAway);
    };
  }, [enabled, settings.screenMonitoringEnabled]);

  useEffect(() => {
    if (!enabled || !settings.copyPasteBlockingEnabled) {
      return;
    }
    const block = (event: Event) => {
      event.preventDefault();
      reportViolation('CopyPaste');
    };
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
    };
  }, [enabled, settings.copyPasteBlockingEnabled]);

  useEffect(() => {
    if (!enabled || !settings.rightClickBlockingEnabled) {
      return;
    }
    const block = (event: MouseEvent) => {
      event.preventDefault();
      reportViolation('RightClick');
    };
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [enabled, settings.rightClickBlockingEnabled]);

  // Same attempt open in a second tab on this device: every tab announces
  // itself on a per-attempt BroadcastChannel; any other announce it hears
  // means a duplicate tab exists, so both sides flag a violation.
  useEffect(() => {
    if (!enabled || !settings.multipleTabsEnabled || !attemptId || typeof BroadcastChannel === 'undefined') {
      return;
    }
    const channel = new BroadcastChannel(`examvault-attempt-${attemptId}`);
    const tabId = `${Date.now()}-${Math.random()}`;
    channel.postMessage({ type: 'announce', tabId });
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'announce' && event.data.tabId !== tabId) {
        reportViolation('MultipleTabs');
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [enabled, settings.multipleTabsEnabled, attemptId]);

  // Second physical monitor connected: window.screen.isExtended is a plain
  // boolean with no permission prompt (unlike the fuller getScreenDetails()
  // API). Unsupported browsers (Firefox, Safari) get undefined back - fails
  // open silently rather than false-flagging every exam taken there. Polled
  // rather than event-driven (no "display config changed" event exists) and
  // only reports on the false->true transition, not on every poll while a
  // second monitor stays connected.
  useEffect(() => {
    if (!enabled || !settings.multipleMonitorsEnabled) {
      return;
    }
    const screenWithIsExtended = window.screen as Screen & { isExtended?: boolean };
    if (typeof screenWithIsExtended.isExtended !== 'boolean') {
      return;
    }
    let wasExtended = false;
    const checkMonitors = () => {
      const isExtended = screenWithIsExtended.isExtended === true;
      if (isExtended && !wasExtended) {
        reportViolation('MultipleMonitors');
      }
      wasExtended = isExtended;
    };
    checkMonitors();
    const intervalId = setInterval(checkMonitors, MONITOR_CHECK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, settings.multipleMonitorsEnabled]);

  return { cameraReady, faceStatus, violationCounts, stream };
}
