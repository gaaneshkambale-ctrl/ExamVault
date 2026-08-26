export interface GroupResponse {
  id: string;
  name: string;
  memberCount: number;
  createdAtUtc: string;
}

export interface GroupDetailResponse {
  id: string;
  name: string;
  createdAtUtc: string;
  memberUserIds: string[];
}

export interface CreateGroupRequest {
  name: string;
}

export interface AddGroupMemberRequest {
  userId: string;
}
