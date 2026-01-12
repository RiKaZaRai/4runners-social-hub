/**
 * File upload validation utilities
 */

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'application/pdf'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp4',
  '.mov',
  '.avi',
  '.pdf'
];

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate uploaded file
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check if file size is 0
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty'
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(extension.toLowerCase())) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // Validate filename
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.valid) {
    return filenameValidation;
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = filename.replace(/^.*[\\\/]/, '');

  // Remove any characters that aren't alphanumeric, dash, underscore, or dot
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure the filename doesn't start with a dot (hidden files)
  const withoutLeadingDot = sanitized.replace(/^\.+/, '');

  // Limit filename length
  const maxLength = 255;
  if (withoutLeadingDot.length > maxLength) {
    const extension = getFileExtension(withoutLeadingDot);
    const nameWithoutExt = withoutLeadingDot.slice(0, -(extension.length));
    return nameWithoutExt.slice(0, maxLength - extension.length) + extension;
  }

  return withoutLeadingDot || 'unnamed';
}

/**
 * Validate filename for security issues
 */
function validateFilename(filename: string): FileValidationResult {
  // Check for null bytes
  if (filename.includes('\0')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters'
    };
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return {
      valid: false,
      error: 'Filename contains path traversal characters'
    };
  }

  // Check filename length
  if (filename.length > 255) {
    return {
      valid: false,
      error: 'Filename is too long (maximum 255 characters)'
    };
  }

  // Check if filename is empty after sanitization
  const sanitized = sanitizeFilename(filename);
  if (!sanitized || sanitized === 'unnamed') {
    return {
      valid: false,
      error: 'Invalid filename'
    };
  }

  return { valid: true };
}

/**
 * Get file extension including the dot
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return '';
  }
  return filename.slice(lastDot);
}

/**
 * Verify file signature (magic bytes) matches the declared MIME type
 * This is a basic check for common file types
 */
export async function verifyFileSignature(file: File): Promise<FileValidationResult> {
  try {
    // Read the first few bytes of the file
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check common file signatures
    const signatures: Record<string, number[][]> = {
      'image/jpeg': [[0xFF, 0xD8, 0xFF]],
      'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
      'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (need to check WEBP later in file)
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]]
    };

    const expectedSignatures = signatures[file.type];
    if (!expectedSignatures) {
      // If we don't have a signature check for this type, allow it
      return { valid: true };
    }

    const matches = expectedSignatures.some(signature =>
      signature.every((byte, index) => bytes[index] === byte)
    );

    if (!matches) {
      return {
        valid: false,
        error: 'File content does not match declared file type'
      };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error verifying file signature:', error);
    return {
      valid: false,
      error: 'Could not verify file signature'
    };
  }
}

/**
 * Generate a safe storage key for the file
 */
export function generateStorageKey(tenantId: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const uuid = crypto.randomUUID();
  const timestamp = Date.now();
  return `${tenantId}/${timestamp}-${uuid}-${sanitized}`;
}
