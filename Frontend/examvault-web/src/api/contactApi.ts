import apiClient from './axiosClient';

export interface ContactMessageRequest {
  name: string;
  email: string;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
}

// Public marketing-site form - no auth token needed (none exists yet on
// this page), same as registerUser/loginUser.
export async function sendContactMessage(request: ContactMessageRequest): Promise<ContactMessageResponse> {
  const { data } = await apiClient.post<ContactMessageResponse>('/api/contact', request);
  return data;
}
