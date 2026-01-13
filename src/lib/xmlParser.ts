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

    // Fallback for when dest/CNPJ is not present (e.g. testing), but user requested strict check.
    // We pass empty string if missing.

    detElements.forEach(det => {
      const prod = det.querySelector('prod');
      if (!prod) return;

      const item: NFeItem = {
        name: prod.querySelector('xProd')?.textContent || '',
        ean: prod.querySelector('cEAN')?.textContent || '',
        ncm: prod.querySelector('NCM')?.textContent || '',
        quantity: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
        unitPrice: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
        manufacturer: prod.querySelector('xProd')?.textContent?.split(' ')[0] || '',
      };

      // Tentar extrair lote e validade (campos opcionais)
      const infAdProd = det.querySelector('infAdProd')?.textContent || '';
      const loteMatch = infAdProd.match(/LOTE:?\s*(\S+)/i);
      const validadeMatch = infAdProd.match(/VAL(?:IDADE)?:?\s*(\d{2}\/\d{2}\/\d{4})/i);

      if (loteMatch) {
        item.lote = loteMatch[1];
      }

      if (validadeMatch) {
        // Converter DD/MM/YYYY para YYYY-MM-DD
        const [day, month, year] = validadeMatch[1].split('/');
        item.expirationDate = `${year}-${month}-${day}`;
      }

      items.push(item);
    });

    return {
      number: nfeNumber,
      date: nfeDate.split('T')[0],
      supplier: supplierName,
      cnpj: supplierCNPJ,
      recipientCnpj: recipientCNPJ,
      items,
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
      <det nItem="1">
        <prod>
          <cProd>001</cProd>
          <xProd>Ibuprofeno 600mg - EMS</xProd>
          <cEAN>7891234567895</cEAN>
          <NCM>30049099</NCM>
          <qCom>200.0000</qCom>
          <vUnCom>15.5000</vUnCom>
        </prod>
        <infAdProd>LOTE: L006J2026 VALIDADE: 15/08/2027</infAdProd>
      </det>
      <det nItem="2">
        <prod>
          <cProd>002</cProd>
          <xProd>Azitromicina 500mg - Neo Química</xProd>
          <cEAN>7891234567896</cEAN>
          <NCM>30042019</NCM>
          <qCom>100.0000</qCom>
          <vUnCom>32.0000</vUnCom>
        </prod>
        <infAdProd>LOTE: L007K2026 VALIDADE: 20/10/2027</infAdProd>
      </det>
      <det nItem="3">
        <prod>
          <cProd>003</cProd>
          <xProd>Atorvastatina 20mg - Eurofarma</xProd>
          <cEAN>7891234567897</cEAN>
          <NCM>30049099</NCM>
          <qCom>150.0000</qCom>
          <vUnCom>28.5000</vUnCom>
        </prod>
        <infAdProd>LOTE: L008L2026 VALIDADE: 30/06/2026</infAdProd>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
