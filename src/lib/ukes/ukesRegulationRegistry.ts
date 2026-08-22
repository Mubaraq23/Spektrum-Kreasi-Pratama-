// Digital UKES BAPETEN Regulatory Registry — Versioned & Auditable
// Legal Basis: Perba 1/2025, Perba 2/2022, Perka 2/2018, Perba 4/2020, PP 45/2023, Kepka 3051/2024

import { BapetenRegulationReference, AcceptanceCriterion, ModalityType } from './ukesTypes';

export const BAPETEN_REGULATIONS: BapetenRegulationReference[] = [
  {
    regulationId: 'BAPETEN-PERBA-1-2025',
    regulationNumber: 'Perba BAPETEN No. 1 Tahun 2025',
    title: 'Penilaian Kesesuaian Pesawat Sinar-X dalam Radiologi Diagnostik dan Intervensional',
    version: '2025.1',
    effectiveDate: '2025-01-01',
    status: 'ACTIVE',
    sourceDocument: 'Berita Negara Republik Indonesia Tahun 2025',
    legalBasis: ['PP No. 45 Tahun 2023', 'Perba BAPETEN No. 1 Tahun 2025'],
    officialDisclaimer:
      'Dokumen digital ini merupakan alat bantu dokumentasi dan kalkulasi teknis internal LUK, bukan dokumen persetujuan resmi BAPETEN.'
  },
  {
    regulationId: 'BAPETEN-PERBA-2-2022',
    regulationNumber: 'Perba BAPETEN No. 2 Tahun 2022',
    title: 'Perubahan atas Peraturan Kepala BAPETEN Nomor 2 Tahun 2018 tentang Uji Kesesuaian Pesawat Sinar-X',
    version: '2022.1',
    effectiveDate: '2022-06-15',
    status: 'ACTIVE',
    sourceDocument: 'Berita Negara Republik Indonesia Tahun 2022 No. 580',
    legalBasis: ['Perka BAPETEN No. 2 Tahun 2018', 'Perba BAPETEN No. 2 Tahun 2022'],
    officialDisclaimer:
      'Acuan kriteria penerimaan teknis berdasarkan Perba 2/2022.'
  },
  {
    regulationId: 'BAPETEN-PERKA-2-2018',
    regulationNumber: 'Perka BAPETEN No. 2 Tahun 2018',
    title: 'Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik dan Intervensional',
    version: '2018.1',
    effectiveDate: '2018-04-10',
    status: 'SUPERSEDED',
    sourceDocument: 'Berita Negara Republik Indonesia Tahun 2018 No. 512',
    legalBasis: ['Perka BAPETEN No. 2 Tahun 2018'],
    officialDisclaimer:
      'Dokumen regulasi terdahulu untuk keperluan verifikasi rekor historis.'
  },
  {
    regulationId: 'BAPETEN-KEPKA-3051-2024',
    regulationNumber: 'Kepka BAPETEN No. 3051 Tahun 2024',
    title: 'Panduan Teknis Penerbitan Sertifikat Uji Kesesuaian dan Pelaporan Mandiri Lembaga Uji Kesesuaian (LUK)',
    version: '2024.1',
    effectiveDate: '2024-09-01',
    status: 'ACTIVE',
    sourceDocument: 'Keputusan Kepala BAPETEN No. 3051/SK/K/IX/2024',
    legalBasis: ['Kepka BAPETEN No. 3051/2024'],
    officialDisclaimer:
      'Panduan teknis pelaporan dan kewenangan Tenaga Ahli (TA) LUK.'
  }
];

export const ACCEPTANCE_CRITERIA_CATALOG: AcceptanceCriterion[] = [
  // Radiografi Umum
  {
    criterionId: 'crit-rad-kvp-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'RADIOGRAFI_UMUM',
    parameterCode: 'KVP_ACCURACY',
    parameterName: 'Akurasi Tegangan Tabung (kVp)',
    isCritical: true,
    unit: '%',
    operator: '<=',
    thresholdValue: 10.0,
    articleReference: 'Pasal 8 ayat (2) huruf a',
    annexReference: 'Lampiran I Tabel 1.1',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },
  {
    criterionId: 'crit-rad-time-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'RADIOGRAFI_UMUM',
    parameterCode: 'TIME_ACCURACY',
    parameterName: 'Akurasi Waktu Penyinaran',
    isCritical: true,
    unit: '%',
    operator: '<=',
    thresholdValue: 10.0,
    articleReference: 'Pasal 8 ayat (2) huruf b',
    annexReference: 'Lampiran I Tabel 1.2',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },
  {
    criterionId: 'crit-rad-cv-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'RADIOGRAFI_UMUM',
    parameterCode: 'DOSE_REPRODUCIBILITY',
    parameterName: 'Reproduksibilitas Dosis (CV)',
    isCritical: true,
    unit: 'ratio',
    operator: 'CV_LESS_EQUAL',
    thresholdValue: 0.05,
    articleReference: 'Pasal 8 ayat (2) huruf c',
    annexReference: 'Lampiran I Tabel 1.3',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },
  {
    criterionId: 'crit-rad-hvl-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'RADIOGRAFI_UMUM',
    parameterCode: 'HVL_ALUMINUM',
    parameterName: 'Kualitas Berkas Radiasi (HVL Al)',
    isCritical: false,
    unit: 'mm Al',
    operator: '>=',
    thresholdValue: 2.3,
    articleReference: 'Pasal 9 ayat (1)',
    annexReference: 'Lampiran I Tabel 1.4',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },
  {
    criterionId: 'crit-rad-leakage-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'RADIOGRAFI_UMUM',
    parameterCode: 'TUBE_LEAKAGE',
    parameterName: 'Kebocoran Wadah Tabung Sinar-X',
    isCritical: true,
    unit: 'mGy/h',
    operator: '<=',
    thresholdValue: 1.0,
    articleReference: 'Pasal 10 ayat (3)',
    annexReference: 'Lampiran I Tabel 1.5',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },

  // Mammografi
  {
    criterionId: 'crit-mam-kvp-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'MAMMOGRAFI',
    parameterCode: 'KVP_ACCURACY',
    parameterName: 'Akurasi Tegangan Tabung Mammografi',
    isCritical: true,
    unit: '%',
    operator: '<=',
    thresholdValue: 5.0, // Strict 5% for Mammography
    articleReference: 'Pasal 14 ayat (1)',
    annexReference: 'Lampiran III Tabel 3.1',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  },

  // CT Scan
  {
    criterionId: 'crit-ct-ctdivol-01',
    regulationId: 'BAPETEN-PERBA-1-2025',
    version: '2025.1',
    modality: 'CT_SCAN',
    parameterCode: 'CTDI_VOL_ACCURACY',
    parameterName: 'Akurasi Dosis CTDIvol',
    isCritical: true,
    unit: '%',
    operator: '<=',
    thresholdValue: 20.0,
    articleReference: 'Pasal 18 ayat (2)',
    annexReference: 'Lampiran V Tabel 5.1',
    sourceDocument: 'Perba BAPETEN No. 1 Tahun 2025'
  }
];

export function getAcceptanceCriterion(
  regulationId: string,
  modality: ModalityType,
  parameterCode: string
): AcceptanceCriterion | undefined {
  return ACCEPTANCE_CRITERIA_CATALOG.find(
    c => c.regulationId === regulationId && c.modality === modality && c.parameterCode === parameterCode
  );
}
