export interface OrganizationSettings {
  name: string;
  shortName: string | null;
  organizationType: string | null;
  establishedYear: number | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  alternatePhone: string | null;
  registrationNumber: string | null;
  taxIdentificationNumber: string | null;
  timeZone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  showLogoOnPdfReports: boolean;
  includeAddressInPdfFooter: boolean;
  showMottoTagline: boolean;
  enableMultiCampus: boolean;
  showQrCodeForVerification: boolean;
  showContactDetails: boolean;
  showPageNumbers: boolean;
  useBrandColorsInReportHeader: boolean;
  enableWatermark: boolean;
  mottoTagline: string | null;
  defaultAcademicYear: string | null;
  defaultLanguage: string | null;
  dateFormat: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
  hasSignature: boolean;
  organizationCode: string | null;
}

export type UpdateOrganizationSettingsRequest = Omit<
  OrganizationSettings,
  'hasLogo' | 'hasFavicon' | 'hasSignature' | 'organizationCode'
>;

export const DEFAULT_BRANDING_COLORS = {
  primaryColor: '#4F46E5',
  secondaryColor: '#7C3AED',
  accentColor: '#059669',
  textColor: '#1F2937',
};

export const TIME_ZONES = [
  '(UTC-05:00) America/New_York',
  '(UTC-06:00) America/Chicago',
  '(UTC-07:00) America/Denver',
  '(UTC-08:00) America/Los_Angeles',
  '(UTC+00:00) Europe/London',
  '(UTC+01:00) Europe/Berlin',
  '(UTC+05:30) Asia/Kolkata',
  '(UTC+08:00) Asia/Singapore',
  '(UTC+10:00) Australia/Sydney',
];

export const LANGUAGES = ['English (US)', 'English (UK)', 'Hindi', 'Spanish', 'French'];

export const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
