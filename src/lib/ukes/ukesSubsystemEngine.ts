// Ukes Subsystem Engine — Universal BAPETEN Radiology Platform v2
// Manages subsystem relationships: Equipment -> Generator, Tube, Detector, Acquisition System, Console, Accessories

export type SubsystemType = 
  | 'GENERATOR'
  | 'XRAY_TUBE'
  | 'DETECTOR'
  | 'ACQUISITION_SYSTEM'
  | 'CONTROL_CONSOLE'
  | 'COLLIMATOR'
  | 'COMPRESSION_SYSTEM'
  | 'GANTRY'
  | 'PATIENT_TABLE'
  | 'DOSIMETER_SYSTEM'
  | 'ACCESSORIES';

export interface EquipmentSubsystemRecord {
  id: string;
  subsystemType: SubsystemType;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate?: string;
  firmwareVersion?: string;
  softwareVersion?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'CALIBRATED' | 'FAULTY' | 'REPLACED';
  notes?: string;
}

export function getDefaultSubsystemsForModality(modalityId: string): EquipmentSubsystemRecord[] {
  const baseTimestamp = '2022-06-15';

  if (modalityId === 'ct-scan') {
    return [
      {
        id: 'sub-ct-gantry',
        subsystemType: 'GANTRY',
        name: 'CT Gantry Subsystem',
        manufacturer: 'Siemens Healthineers',
        model: 'SOMATOM Definition AS',
        serialNumber: 'GAN-99201',
        installationDate: baseTimestamp,
        softwareVersion: 'syngo CT VA48A',
        status: 'ACTIVE'
      },
      {
        id: 'sub-ct-tube',
        subsystemType: 'XRAY_TUBE',
        name: 'Straton High-Heat X-Ray Tube',
        manufacturer: 'Siemens',
        model: 'Straton MX P',
        serialNumber: 'TB-88419-CT',
        installationDate: '2023-01-10',
        status: 'ACTIVE'
      },
      {
        id: 'sub-ct-detector',
        subsystemType: 'DETECTOR',
        name: 'UFC Multi-slice Detector Array',
        manufacturer: 'Siemens',
        model: '64-Slice Stellar',
        serialNumber: 'DET-11029',
        status: 'ACTIVE'
      },
      {
        id: 'sub-ct-console',
        subsystemType: 'CONTROL_CONSOLE',
        name: 'Acquisition Workstation Console',
        manufacturer: 'Siemens',
        model: 'syngo Acquisition Workplace',
        serialNumber: 'CNS-4401',
        softwareVersion: 'v4.8.1',
        status: 'ACTIVE'
      }
    ];
  }

  if (modalityId === 'mammography') {
    return [
      {
        id: 'sub-mam-gen',
        subsystemType: 'GENERATOR',
        name: 'High Frequency Mammo Generator',
        manufacturer: 'Hologic',
        model: 'Selenia Dimensions Gen',
        serialNumber: 'GEN-MAM-102',
        status: 'ACTIVE'
      },
      {
        id: 'sub-mam-tube',
        subsystemType: 'XRAY_TUBE',
        name: 'Bi-Angular Molybdenum/Tungsten Tube',
        manufacturer: 'Varian',
        model: 'M-113T',
        serialNumber: 'TB-MAM-991',
        status: 'ACTIVE'
      },
      {
        id: 'sub-mam-comp',
        subsystemType: 'COMPRESSION_SYSTEM',
        name: 'Automatic Motorized Compression Paddle',
        manufacturer: 'Hologic',
        model: 'SmartCurve System',
        serialNumber: 'CMP-7712',
        status: 'ACTIVE'
      },
      {
        id: 'sub-mam-det',
        subsystemType: 'DETECTOR',
        name: 'a-Se Direct Digital Mammo Detector',
        manufacturer: 'Hologic',
        model: 'FFDM 24x29cm',
        serialNumber: 'DET-MAM-501',
        status: 'ACTIVE'
      }
    ];
  }

  // Default General X-Ray / Standard Radiography
  return [
    {
      id: 'sub-gen-01',
      subsystemType: 'GENERATOR',
      name: 'High Frequency X-Ray Generator',
      manufacturer: 'Siemens',
      model: 'Polydoros IT 80',
      serialNumber: 'GEN-8831-X',
      status: 'ACTIVE'
    },
    {
      id: 'sub-tube-01',
      subsystemType: 'XRAY_TUBE',
      name: 'Dual Focus Rotating Anode Tube',
      manufacturer: 'Siemens',
      model: 'OPTITOP 150/40/80',
      serialNumber: 'TB-9941-A',
      status: 'ACTIVE'
    },
    {
      id: 'sub-collimator-01',
      subsystemType: 'COLLIMATOR',
      name: 'Manual Light Beam Collimator',
      manufacturer: 'Ralco',
      model: 'R 302/A',
      serialNumber: 'COL-3310',
      status: 'ACTIVE'
    },
    {
      id: 'sub-detector-01',
      subsystemType: 'DETECTOR',
      name: 'Flat Panel Wireless DR Detector',
      manufacturer: 'Varex Imaging',
      model: 'PaxScan 4336W',
      serialNumber: 'DET-77291',
      status: 'ACTIVE'
    }
  ];
}
