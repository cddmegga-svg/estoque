export interface BoletoInfo {
    amount?: number;
    dueDate?: Date;
    bank?: string;
    type: 'bancario' | 'convenio' | 'unknown';
}

export const parseBoleto = (code: string): BoletoInfo => {
    const cleanCode = code.replace(/[^0-9]/g, '');

    if (cleanCode.length === 47) {
        return parseLinhaDigitavelBancaria(cleanCode);
    } else if (cleanCode.length === 48) {
        // Boleto de Convênio (Luz, Água, Tel)
        return parseLinhaDigitavelConvenio(cleanCode);
    } else if (cleanCode.length === 44) {
        // Código de Barras direto
        // TODO: Implement barcode direct parsing if needed (usually scanners emulate keyboard typing linha digitavel or send 44 chars)
        // For now assuming Linha Digitavel input
        return { type: 'unknown' };
    }

    return { type: 'unknown' };
};

const parseLinhaDigitavelBancaria = (code: string): BoletoInfo => {
    // Layout: AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV
    // Campo 1: AAABC.CCCCX (Positions 0-9)
    // Campo 2: DDDDD.DDDDDY (Positions 10-20)
    // Campo 3: EEEEE.EEEEEZ (Positions 21-31)
    // Campo 4: K (Position 32) - DV geral
    // Campo 5: UUUUVVVVVVVVVV (Positions 33-47) -> Fator Vencimento (4) + Valor (10)

    const bankCode = code.substring(0, 3);
    const factor = parseInt(code.substring(33, 37));
    const valueStr = code.substring(37); // Last 10 digits

    const amount = parseInt(valueStr) / 100;

    // Calculate Due Date based on Factor
    // Base Date: 07/10/1997 (Factor 1000? No, Factor starts counting from base date)
    // Standard base date is 1997-10-07.
    // Exception: After Feb 2025, factor resets/loops. We will implement basic logic.

    let dueDate: Date | undefined;
    if (factor >= 1000) {
        const baseDate = new Date('1997-10-07T12:00:00Z'); // Using noon to avoid timezone shift issues
        dueDate = new Date(baseDate.getTime() + (factor * 24 * 60 * 60 * 1000));
    }

    return {
        amount,
        dueDate,
        bank: bankCode,
        type: 'bancario'
    };
};

const parseLinhaDigitavelConvenio = (code: string): BoletoInfo => {
    // 4 Blocks of 12 digits (11 data + 1 DV)
    // Value is typically identifying by the "Moeda" digit (3rd digit)
    // 6 = Valor Real, 7 = Quantidade Moeda, 8 = Valor Real, 9 = Quantidade Moeda

    // Usually value is in chars 4-15 (but split across blocks)
    // It is complex. Let's try a simplified extraction for Amount.
    // Standard Convenio:
    // Pos 0: '8' (Product ID)
    // Pos 1: Segmento
    // Pos 2: Valor Real/Ref
    // Pos 3: DV Geral
    // Pos 4-15: Valor (11 digits + ?). Actually usually 4-14 (11 digits).

    // Let's strip the DVs from the blocks first? 
    // Block 1: 0-11 (DV at 11)
    // Block 2: 12-23 (DV at 23)
    // Block 3: 24-35 (DV at 35)
    // Block 4: 36-47 (DV at 47)

    const block1 = code.substring(0, 11);
    const block2 = code.substring(12, 23);
    const block3 = code.substring(24, 35);
    const block4 = code.substring(36, 47);

    const trueCode = block1 + block2 + block3 + block4; // 44 chars buffer

    // Value is usually pos 4 to 15 (11 chars) in the 44-char barcode
    const valStr = trueCode.substring(4, 15);
    const amount = parseInt(valStr) / 100;

    return {
        amount,
        type: 'convenio',
        // Date is not standard in Convenio bar codes, depends on company
    };
};
