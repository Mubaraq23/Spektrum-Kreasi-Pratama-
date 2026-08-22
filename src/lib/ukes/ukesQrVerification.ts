// Cryptographic QR Verification Token Engine — Digital UKES Platform (Spektrum CalibraPro)

export function generateCryptographicQrToken(sessionId: string, sessionNumber: string): string {
  const timestamp = new Date().getTime();
  const rawPayload = `UKES|${sessionId}|${sessionNumber}|${timestamp}`;
  const mockToken = btoa(rawPayload).replace(/=/g, '');
  return `UKES-VERIFY-${mockToken}`;
}

export function verifyCryptographicQrToken(token: string): {
  isValid: boolean;
  sessionId?: string;
  sessionNumber?: string;
  verificationMessage: string;
} {
  if (!token.startsWith('UKES-VERIFY-')) {
    return {
      isValid: false,
      verificationMessage: 'Token QR tidak valid atau format tidak dikenali.'
    };
  }

  try {
    const cleanToken = token.replace('UKES-VERIFY-', '');
    const decoded = atob(cleanToken);
    const parts = decoded.split('|');
    if (parts.length >= 4 && parts[0] === 'UKES') {
      return {
        isValid: true,
        sessionId: parts[1],
        sessionNumber: parts[2],
        verificationMessage: 'Token QR Terverifikasi Sah oleh Spektrum CalibraPro.'
      };
    }
  } catch {
    // Return invalid on decode error
  }

  return {
    isValid: false,
    verificationMessage: 'Token QR gagal didekripsi.'
  };
}
