/**
 * Largest document the CRM uploads through its own server. Vercel rejects request bodies over 4.5 MB before the code
 * runs, so the limit is 4 MB. (The DOCUMENTS bucket itself allows 10 MB, which the mobile app uses by uploading directly.)
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
