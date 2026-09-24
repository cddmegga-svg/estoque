const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sidebar
    content = content.replace(/Pol.ticas de Reten.o/g, 'Políticas de Retenção');
    content = content.replace(/Gesto de Backups/g, 'Gestão de Backups');
    content = content.replace(/Gest.o de Backups/g, 'Gestão de Backups');
    content = content.replace(/Configuraes/g, 'Configurações');
    content = content.replace(/Configura.es/g, 'Configurações');
    content = content.replace(/Integraes/g, 'Integrações');
    content = content.replace(/Integra.es/g, 'Integrações');
    content = content.replace(/Vis.o Geral/g, 'Visão Geral');
    content = content.replace(/Gest.o SaaS/g, 'Gestão SaaS');

    // App.tsx
    content = content.replace(/Ordens de Preserva..o/g, 'Ordens de Preservação');
    content = content.replace(/Ordens de Preserva.o/g, 'Ordens de Preservação');
    
    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/components/layout/Sidebar.tsx');
fixFile('src/App.tsx');
