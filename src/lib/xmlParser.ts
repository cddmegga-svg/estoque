import { NFe, NFeItem } from '@/types';

export const parseNFeXML = (xmlString: string): NFe | null => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Verificar se há erros de parsing
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Erro ao fazer parsing do XML');
    }

    // Extrair dados da NFe
    const ide = xmlDoc.querySelector('ide');
    const emit = xmlDoc.querySelector('emit');
    const detElements = xmlDoc.querySelectorAll('det');

    if (!ide || !emit || detElements.length === 0) {
      throw new Error('XML NFe inválido ou incompleto');
    }

    const nfeNumber = ide.querySelector('nNF')?.textContent || '';
    const nfeDate = ide.querySelector('dhEmi')?.textContent || '';
    const supplierName = emit.querySelector('xNome')?.textContent || '';
    const supplierCNPJ = emit.querySelector('CNPJ')?.textContent || '';

    const items: NFeItem[] = [];

    // Extract Recipient Info
    const dest = xmlDoc.querySelector('dest');
    const recipientCNPJ = dest?.querySelector('CNPJ')?.textContent || '';

    detElements.forEach(det => {
      const prod = det.querySelector('prod');
      if (!prod) return;

      // Extrair CFOP
      const cfop = prod.querySelector('CFOP')?.textContent || '';

      // Tentar extrair dados de Rastreabilidade (O Padrão Ouro para Lote/Validade)
      const rastro = det.querySelector('prod > rastro');
      let lote = '';
      let validade = '';
      let fabricacao = '';

      if (rastro) {
        lote = rastro.querySelector('nLote')?.textContent || '';
        validade = rastro.querySelector('dVal')?.textContent || ''; // Format: YYYY-MM-DD
        fabricacao = rastro.querySelector('dFab')?.textContent || ''; // Format: YYYY-MM-DD
      }

      // Fallback: Se não achou no rastro, tenta no infAdProd (Método antigo/Legacy)
      if (!lote || !validade) {
        const infAdProd = det.querySelector('infAdProd')?.textContent || '';
        const loteMatch = infAdProd.match(/LOTE:?\s*(\S+)/i);
        const validadeMatch = infAdProd.match(/VAL(?:IDADE)?:?\s*(\d{2}\/\d{2}\/\d{4})/i);

        if (!lote && loteMatch) lote = loteMatch[1];
        if (!validade && validadeMatch) {
          // Converter DD/MM/YYYY para YYYY-MM-DD
          const [day, month, year] = validadeMatch[1].split('/');
          validade = `${year}-${month}-${day}`;
        }
      }

      // Extrair Impostos (Simples Nacional vs Regime Normal varia muito a estrutura, tentaremos pegar o valor genérico)
      const imposto = det.querySelector('imposto');
      let icmsRate = 0;
      let pisRate = 0;
      let cofinsRate = 0;
      let ipiRate = 0;

      if (imposto) {
        // ICMS
        const pICMS = imposto.querySelector('pICMS')?.textContent;
        if (pICMS) icmsRate = parseFloat(pICMS);

        // PIS
        const pPIS = imposto.querySelector('PIS pPIS')?.textContent || imposto.querySelector('PISAliq pPIS')?.textContent;
        if (pPIS) pisRate = parseFloat(pPIS);

        // COFINS
        const pCOFINS = imposto.querySelector('COFINS pCOFINS')?.textContent || imposto.querySelector('COFINSAliq pCOFINS')?.textContent;
        if (pCOFINS) cofinsRate = parseFloat(pCOFINS);

        // IPI
        const pIPI = imposto.querySelector('IPI pIPI')?.textContent;
        if (pIPI) ipiRate = parseFloat(pIPI);
      }

      const item: NFeItem = {
        name: prod.querySelector('xProd')?.textContent || '',
        ean: prod.querySelector('cEAN')?.textContent || '',
        ncm: prod.querySelector('NCM')?.textContent || '',
        quantity: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
        unitPrice: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
        manufacturer: prod.querySelector('xProd')?.textContent?.split(' ')[0] || '',
        lote: lote,
        expirationDate: validade,
        manufacturingDate: fabricacao,
        cfop: cfop,
        taxes: {
          icms: icmsRate,
          pis: pisRate,
          cofins: cofinsRate,
          ipi: ipiRate
        }
      };

      items.push(item);
    });

    // Extract Duplicates (Cobrança)
    const duplicates: any[] = [];
    // Try multiple selectors for nested duplicatas
    let dupElements = xmlDoc.querySelectorAll('dup');
    if (dupElements.length === 0) dupElements = xmlDoc.querySelectorAll('cobr dup');
    if (dupElements.length === 0) dupElements = xmlDoc.querySelectorAll('cobr > dup');

    dupElements.forEach(dup => {
      duplicates.push({
        number: dup.querySelector('nDup')?.textContent || '',
        dueDate: dup.querySelector('dVenc')?.textContent || '',
        value: parseFloat(dup.querySelector('vDup')?.textContent || '0')
      });
    });

    return {
      number: nfeNumber,
      date: nfeDate.split('T')[0],
      supplier: supplierName,
      cnpj: supplierCNPJ,
      recipientCnpj: recipientCNPJ,
      items,
      duplicates
    };
  } catch (error) {
    console.error('Erro ao processar XML:', error);
    return null;
  }
};

// XML de exemplo para demonstração
export const SAMPLE_NFE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe>
      <ide>
        <nNF>000456</nNF>
        <dhEmi>2026-01-10T10:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>98765432000123</CNPJ>
        <xNome>Distribuidora Farmacêutica XYZ Ltda</xNome>
      </emit>
      <dest>
        <CNPJ>00000000000191</CNPJ>
        <xNome>Minha Filial</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>Ibuprofeno 600mg - EMS</xProd>
          <cEAN>7891234567895</cEAN>
          <NCM>30049099</NCM>
          <qCom>200.0000</qCom>
          <vUnCom>15.5000</vUnCom>
          <rastro>
            <nLote>L006J2026</nLote>
            <dFab>2024-08-15</dFab>
            <dVal>2027-08-15</dVal>
          </rastro>
        </prod>
        <imposto>
             <ICMS>
                <ICMS00>
                    <pICMS>18.00</pICMS>
                </ICMS00>
             </ICMS>
             <PIS>
                <PISAliq>
                    <pPIS>1.65</pPIS>
                </PISAliq>
             </PIS>
             <COFINS>
                <COFINSAliq>
                    <pCOFINS>7.60</pCOFINS>
                </COFINSAliq>
             </COFINS>
        </imposto>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
