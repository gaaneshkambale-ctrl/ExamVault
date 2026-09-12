import apiClient from './axiosClient';

// Public marketing-site form (Footer.tsx's "Stay Updated") - no auth token
// needed, same as sendContactMessage.
export async function subscribeToNewsletter(email: string): Promise<void> {
  await apiClient.post('/api/newsletter/subscribe', { email });
}
