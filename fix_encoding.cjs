const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Common broken combinations from Windows-1252 to UTF-8
  const fixes = {
    'Polticas': 'Políticas',
    'Políticas': 'Políticas', // If already fixed but just in case
    'Reteno': 'Retenção',
    'reteno': 'retenção',
    'Viso': 'Visão',
    'Gesto': 'Gestão',
    'gesto': 'gestão',
    'Integraes': 'Integrações',
    'Configuraes': 'Configurações',
    'Preservao': 'Preservação',
    'Polticas de Reteno': 'Políticas de Retenção',
    'Pol?ticas': 'Políticas',
    'Reten??o': 'Retenção',
    'Vis?o': 'Visão',
    'Gest?o': 'Gestão',
    'Integra??es': 'Integrações',
    'Configura??es': 'Configurações',
    'Preserva??o': 'Preservação',
    'Ordens de Preserva..o': 'Ordens de Preservação'
  };

  for (const [bad, good] of Object.entries(fixes)) {
    content = content.split(bad).join(good);
  }

  // Also fix regex-based common issues if they appear as `
  content = content.replace(/Pol.ticas/g, 'Políticas');
  content = content.replace(/Reten..o/g, 'Retenção');
  content = content.replace(/Gest.o/g, 'Gestão');
  content = content.replace(/Vis.o/g, 'Visão');
  content = content.replace(/Integra..es/g, 'Integrações');
  content = content.replace(/Configura..es/g, 'Configurações');
  content = content.replace(/Preserva..o/g, 'Preservação');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

walkDir('./src');
