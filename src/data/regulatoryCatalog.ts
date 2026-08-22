export interface RegulatoryDocumentEntry {
  id: string;
  documentNumber: string;
  title: string;
  documentType: 'PERBA' | 'PERKA' | 'KEPKA' | 'SURAT_EDARAN' | 'TECHNICAL_GUIDELINE';
  year: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'HISTORICAL' | 'GUIDELINE';
  effectiveDate: string;
  supersededBy?: string;
  notes: string;
}

export const REGULATORY_DOCUMENT_CATALOG: RegulatoryDocumentEntry[] = [
  {
    id: 'REG-PERBA-1-2025',
    documentNumber: 'Perba BAPETEN No. 1 Tahun 2025',
    title: 'Penilaian Kesesuaian Pesawat Sinar-X Radiologi Diagnostik dan Intervensional',
    documentType: 'PERBA',
    year: 2025,
    status: 'ACTIVE',
    effectiveDate: '2025-01-01',
    notes: 'Regulasi utama yang berlaku untuk seluruh pengujian kesesuaian radiologi.'
  },
  {
    id: 'REG-KEPKA-3051-2024',
    documentNumber: 'Kepka BAPETEN No. 3051 Tahun 2024',
    title: 'Tata Cara Penerbitan Sertifikat Uji Kesesuaian & Pelaporan Mandiri oleh LUK',
    documentType: 'KEPKA',
    year: 2024,
    status: 'ACTIVE',
    effectiveDate: '2024-06-01',
    notes: 'Pedoman penerbitan sertifikat digital dan format pelaporan mandiri.'
  },
  {
    id: 'REG-PERKA-2-2018',
    documentNumber: 'Perka BAPETEN No. 2 Tahun 2018',
    title: 'Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik dan Intervensional (Historis)',
    documentType: 'PERKA',
    year: 2018,
    status: 'SUPERSEDED',
    effectiveDate: '2018-03-15',
    supersededBy: 'Perba BAPETEN No. 1 Tahun 2025',
    notes: 'Disimpan untuk penelusuran sejarah pengujian masa lalu (Traceability Versioning).'
  }
];
