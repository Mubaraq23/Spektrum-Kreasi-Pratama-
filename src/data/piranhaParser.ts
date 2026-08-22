// Piranha / Multi-meter Measurement File Parser & Column Auto-Mapper

export interface ParsedPiranhaRecord {
  pointIndex: number;
  setKvp?: number;
  measuredKvp?: number;
  setTimeMs?: number;
  measuredTimeMs?: number;
  setMas?: number;
  measuredMas?: number;
  doseMgy?: number;
  doseRateMgyMin?: number;
  hvlMmAl?: number;
  pulseCount?: number;
  rawLineData: Record<string, string>;
}

export interface PiranhaParseResult {
  fileName: string;
  fileType: string;
  totalRecords: number;
  detectedColumns: string[];
  records: ParsedPiranhaRecord[];
  rawText: string;
}

export function parsePiranhaFile(fileContent: string, fileName: string): PiranhaParseResult {
  const lines = fileContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    return {
      fileName,
      fileType: 'empty',
      totalRecords: 0,
      detectedColumns: [],
      records: [],
      rawText: fileContent
    };
  }

  // Find header line (looking for kV, mAs, ms, Dose, etc.)
  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    const isHeaderCandidate = cols.some(c => 
      /kv/i.test(c) || /mas/i.test(c) || /dose/i.test(c) || /time/i.test(c) || /hvl/i.test(c)
    );
    if (isHeaderCandidate) {
      headerIndex = i;
      headers = cols;
      break;
    }
  }

  if (headerIndex === -1 && lines.length > 0) {
    headerIndex = 0;
    headers = lines[0].split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ''));
  }

  const records: ParsedPiranhaRecord[] = [];
  let recordIdx = 1;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const vals = rawLine.split(/[,;\t]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (vals.length === 0 || (vals.length === 1 && !vals[0])) continue;

    const rawMap: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rawMap[h || `Col_${colIdx + 1}`] = vals[colIdx] || '';
    });

    let kvp: number | undefined;
    let timeMs: number | undefined;
    let mas: number | undefined;
    let dose: number | undefined;
    let doseRate: number | undefined;
    let hvl: number | undefined;

    headers.forEach((h, colIdx) => {
      const valNum = parseFloat(vals[colIdx]);
      if (isNaN(valNum)) return;

      const hLower = h.toLowerCase();
      if (/kvp|kv/i.test(hLower) && kvp === undefined) kvp = valNum;
      else if (/time|ms|sec/i.test(hLower) && timeMs === undefined) timeMs = hLower.includes('sec') && valNum < 50 ? valNum * 1000 : valNum;
      else if (/mas/i.test(hLower) && mas === undefined) mas = valNum;
      else if (/dose|kerma|mgy/i.test(hLower) && !hLower.includes('rate') && dose === undefined) dose = valNum;
      else if (/rate|mgy\/min/i.test(hLower) && doseRate === undefined) doseRate = valNum;
      else if (/hvl|al/i.test(hLower) && hvl === undefined) hvl = valNum;
    });

    // Fallback if headers were numeric or unrecognized
    if (kvp === undefined && vals[0] && !isNaN(parseFloat(vals[0]))) kvp = parseFloat(vals[0]);
    if (timeMs === undefined && vals[1] && !isNaN(parseFloat(vals[1]))) timeMs = parseFloat(vals[1]);
    if (dose === undefined && vals[2] && !isNaN(parseFloat(vals[2]))) dose = parseFloat(vals[2]);

    records.push({
      pointIndex: recordIdx++,
      measuredKvp: kvp,
      measuredTimeMs: timeMs,
      measuredMas: mas,
      doseMgy: dose,
      doseRateMgyMin: doseRate,
      hvlMmAl: hvl,
      rawLineData: rawMap
    });
  }

  return {
    fileName,
    fileType: fileName.endsWith('.csv') ? 'CSV' : fileName.endsWith('.xlsx') ? 'XLSX' : 'TXT',
    totalRecords: records.length,
    detectedColumns: headers,
    records,
    rawText: fileContent
  };
}
