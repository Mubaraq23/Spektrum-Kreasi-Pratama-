// Gemini Service handles AI-powered calibration logic via server proxy

export async function extractCertificateData(base64Data: string) {
  const response = await fetch('/api/extract-certificate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data })
  });
  
  if (!response.ok) {
    let errorMessage = 'An unknown error occurred';
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || errorMessage;
    } catch (e) {
      console.error('Non-JSON error response:', text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function recommendWorkMethod(deviceName: string, category: string) {
  const response = await fetch('/api/recommend-work-method', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceName, category })
  });
  
  if (!response.ok) {
    let errorMessage = 'An unknown error occurred';
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || errorMessage;
    } catch (e) {
      console.error('Non-JSON error response:', text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function analyzeWorksheet(worksheetData: any) {
  const response = await fetch('/api/analyze-worksheet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ worksheetData })
  });
  
  if (!response.ok) {
    let errorMessage = 'An unknown error occurred';
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || errorMessage;
    } catch (e) {
      console.error('Non-JSON error response:', text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function generateCertificateNarrative(lkResults: any) {
  const response = await fetch('/api/generate-certificate-narrative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lkResults })
  });
  
  if (!response.ok) {
    let errorMessage = 'An unknown error occurred';
    const text = await response.text();
    try {
      const error = JSON.parse(text);
      errorMessage = error.error || errorMessage;
    } catch (e) {
      console.error('Non-JSON error response:', text);
      errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}`;
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return data.result;
}

