import { useEffect, useState } from 'react';
import { fetchMyPhotoObjectUrl, fetchUserPhotoObjectUrl } from '../api/userApi';

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.[0] ?? '?';
  return initials.toUpperCase();
}

interface UserAvatarProps {
  fullName: string;
  hasPhoto: boolean;
  size?: number;
  // Fetches this user's photo (Admin-only endpoint) instead of the logged-in
  // user's own - used by admin screens rendering someone else's avatar (e.g.
  // Live Monitoring's student avatars). Omit to keep the original "my photo"
  // behavior NavBar/UserProfileMenu already rely on.
  userId?: string;
}

// Shared by NavBar and UserProfileMenu - both previously always rendered the
// initials circle, even for a user with an uploaded photo (only the Profile
// page itself ever fetched it). Same fetch-as-object-URL approach as
// Profile.tsx's ProfilePhoto: the endpoint needs the Bearer token, so a
// plain <img src> can't hit it directly.
export default function UserAvatar({ fullName, hasPhoto, size = 36, userId }: UserAvatarProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (hasPhoto) {
      const fetchPhoto = userId ? () => fetchUserPhotoObjectUrl(userId) : fetchMyPhotoObjectUrl;
      fetchPhoto().then((url) => {
        objectUrl = url;
        setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [hasPhoto, userId]);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={fullName}
        className="rounded-circle flex-shrink-0"
        style={{ width: size, height: size, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.39) }}
    >
      {getInitials(fullName)}
    </div>
  );
}
