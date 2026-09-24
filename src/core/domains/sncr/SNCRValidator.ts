export enum SignatureType {
  ICP_BRASIL = 'ICP_BRASIL',
  GOV_BR_PRATA_OURO = 'GOV_BR_PRATA_OURO',
  INVALID = 'INVALID'
}

export enum PrescriptionType {
  AMARELA_A = 'AMARELA_A',
  AZUL_B_B2 = 'AZUL_B_B2',
  BRANCA_ESPECIAL = 'BRANCA_ESPECIAL',
  BRANCA_2_VIAS = 'BRANCA_2_VIAS',
  ANTIMICROBIANO = 'ANTIMICROBIANO',
  GLP1 = 'GLP1'
}

export class SNCRValidator {
  /**
   * Regra de Ouro RDC 1.000/2025 e 1.028/2026
   */
  static isSignatureValidForPrescription(
    prescriptionType: PrescriptionType, 
    signatureType: SignatureType
  ): boolean {
    if (signatureType === SignatureType.INVALID) return false;

    // Receituários de Alto Controle exigem OBRIGATORIAMENTE ICP-Brasil
    const requiresIcpBrasil = [
      PrescriptionType.AMARELA_A,
      PrescriptionType.AZUL_B_B2,
      PrescriptionType.BRANCA_ESPECIAL,
      PrescriptionType.BRANCA_2_VIAS
    ];

    if (requiresIcpBrasil.includes(prescriptionType)) {
      return signatureType === SignatureType.ICP_BRASIL;
    }

    // Receituários de Controle Comum aceitam ICP-Brasil OU Gov.br
    const acceptsGovBr = [
      PrescriptionType.ANTIMICROBIANO,
      PrescriptionType.GLP1
    ];

    if (acceptsGovBr.includes(prescriptionType)) {
      return signatureType === SignatureType.ICP_BRASIL || signatureType === SignatureType.GOV_BR_PRATA_OURO;
    }

    return false;
  }
}
