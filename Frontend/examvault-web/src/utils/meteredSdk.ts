// Metered.ca's web Video Calls SDK ships as a CDN script only - no npm
// package exists for it (confirmed by searching npm; the only "@metered.ca"
// package is an unrelated, years-stale React Native one). This loads it
// once and caches the promise so repeated calls (e.g. StrictMode double-
// invoke, or joining recording again after a page refresh) don't inject the
// script twice.
declare global {
  interface Window {
    Metered?: { Meeting: new () => MeteredMeeting };
  }
}

// Fired when a remote participant's audio/video track becomes available -
// the view-only (admin watch) side listens for this instead of publishing
// anything itself. `track` is a raw MediaStreamTrack - wrap it in
// `new MediaStream([track])` to attach it to a <video> element.
export interface MeteredRemoteTrackEvent {
  type: 'video' | 'audio';
  track: MediaStreamTrack;
  streamId: string;
  participantSessionId: string;
}

export interface MeteredParticipantEvent {
  participantSessionId: string;
}

export interface MeteredMeeting {
  join(options: { roomURL: string; accessToken: string; joinWithVideo?: boolean; joinWithAudio?: boolean }): Promise<unknown>;
  shareCustomVideoStream(stream: MediaStream): Promise<unknown>;
  leaveMeeting(): void;
  on(event: 'remoteTrackStarted', callback: (event: MeteredRemoteTrackEvent) => void): void;
  on(event: 'remoteTrackStopped', callback: (event: MeteredRemoteTrackEvent) => void): void;
  on(event: 'participantLeft', callback: (event: MeteredParticipantEvent) => void): void;
}

const SDK_URL = '//cdn.metered.ca/sdk/video/1.4.6/sdk.min.js';

let loadPromise: Promise<Window['Metered']> | null = null;

export function loadMeteredSdk(): Promise<Window['Metered']> {
  if (window.Metered) {
    return Promise.resolve(window.Metered);
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve(window.Metered);
      script.onerror = () => reject(new Error('Failed to load the Metered video SDK.'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
