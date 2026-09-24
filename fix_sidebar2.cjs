const fs = require('fs');
let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(/M.*dulos de Compliance/, 'Módulos de Compliance');
sidebar = sidebar.replace(/Pol.*ticas de Reten.*o/, 'Políticas de Retenção');
sidebar = sidebar.replace(/Integra.*o \(SNCR/, 'Integrações (SNCR');
sidebar = sidebar.replace(/Gest.*o de Backups/, 'Gestão de Backups');
sidebar = sidebar.replace(/Configura.*es/, 'Configurações');

fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar, 'utf8');
