/**
 * Metrology Helper Utilities for Spektrum Kalibrasi Digital KAN ISO/IEC 17025
 */

export function translateToIndonesian(text: string): string {
  if (!text) return "";
  let translated = text;

  const mapping: { [key: string]: string } = {
    "Infusion Pump": "Pompa Infus",
    "Syringe Pump": "Pompa Syringe",
    "Defibrillator": "Defibrilator",
    "Electrocardiograph": "Elektrokardiograf (EKG)",
    "Patient Monitor": "Monitor Pasien",
    "Baby Incubator": "Inkubator Bayi",
    "Fetal Monitor": "Monitor Janin (CTG)",
    "Anesthesia Machine": "Mesin Anestesi",
    "Ventilator": "Ventilator",
    "Pulse Oximeter": "Oksimeter Denyut",
    "Suction Pump": "Pompa Hisap",
    "Baby Warmer": "Penghangat Bayi",
    "Infant Warmer": "Penghangat Bayi",
    "Centrifuge": "Sentrifus",
    "Autoclave": "Autoklaf",
    "Thermometer": "Termometer",
    "Hygrometer": "Higrometer",
    "Sphygmomanometer": "Tensimeter",
    "Traction": "Alat Traksi",
    "Oxygen Concentrator": "Konsentrator Oksigen",
    "Electrosurgical Unit": "ESU (Electrosurgical Unit)",
    "Nebulizer": "Nebuliser",
    "Dental Unit": "Dental Unit",
    "Phototherapy": "Fototerapi",
    "X-Ray": "Sinar-X / Rontgen",
    "General Standard": "Standar Umum"
  };

  for (const [english, indonesian] of Object.entries(mapping)) {
    const regex = new RegExp(english, "gi");
    if (regex.test(translated)) {
      translated = translated.replace(regex, indonesian);
    }
  }

  translated = translated.replace(/Calibration\s+Method\s+for\s+/gi, "Metode Kerja Kalibrasi ");
  translated = translated.replace(/Calibration\s+Procedure\s+for\s+/gi, "Prosedur Kalibrasi ");
  translated = translated.replace(/Method\s+of\s+Calibration\s+for\s+/gi, "Metode Kerja Kalibrasi ");
  translated = translated.replace(/Method\s+for\s+/gi, "Metode Kerja ");

  return translated;
}

export function getDeviceNameFromMethodTitle(title: string): string {
  if (!title) return "";
  let clean = title;

  const prefixes = [
    /Calibration\s+Method\s+for\s+/gi,
    /Calibration\s+Procedure\s+for\s+/gi,
    /Method\s+of\s+Calibration\s+for\s+/gi,
    /Method\s+for\s+/gi,
    /Calibration\s+of\s+/gi,
    /Metode\s+Kerja\s+Kalibrasi\s+/gi,
    /Prosedur\s+Kalibrasi\s+/gi,
    /Metode\s+Kerja\s+/gi,
    /Metode\s+Kalibrasi\s+/gi,
    /Metode\s+Kalibrasi\s+/gi,
    /Metodologi\s+Kalibrasi\s+/gi,
    /Metologi\s+Kalibrasi\s+/gi,
    /Metrologi\s+Kalibrasi\s+/gi,
    /Metrologi\s+/gi,
    /Metologi\s+/gi,
    /Pelayanan\s+Kalibrasi\s+/gi,
    /Instruksi\s+Kerja\s+Kalibrasi\s+/gi,
    /Instruksi\s+Kerja\s+/gi
  ];

  for (const regex of prefixes) {
    clean = clean.replace(regex, "");
  }

  clean = clean.trim();
  clean = clean.replace(/\s*-\s*V\d+.*$/i, "");

  return translateToIndonesian(clean).trim();
}
