const fs = require('fs');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the specific known mangled sequences containing 
    content = content.replace(/Pol.ticas de Reten..o/g, 'Políticas de Retenção');
    content = content.replace(/Pol.ticas/g, 'Políticas');
    content = content.replace(/Reten..o/g, 'Retenção');
    
    content = content.replace(/Gest.o de Backups/g, 'Gestão de Backups');
    content = content.replace(/Gest.o/g, 'Gestão');
    
    content = content.replace(/Configura..es/g, 'Configurações');
    content = content.replace(/Configura.es/g, 'Configurações');
    
    content = content.replace(/Integra..es/g, 'Integrações');
    content = content.replace(/Integra.es/g, 'Integrações');
    
    content = content.replace(/Vis.o Geral/g, 'Visão Geral');
    content = content.replace(/Vis.o/g, 'Visão');
    
    content = content.replace(/Usu.rios Autorizados/g, 'Usuários Autorizados');
    content = content.replace(/Usu.rios/g, 'Usuários');
    
    content = content.replace(/preserva..o/g, 'preservação');
    
    content = content.replace(/Jo.o Dono/g, 'João Dono');
    
    content = content.replace(/Farmac.utica/g, 'Farmacêutica');
    
    content = content.replace(/A..es/g, 'Ações');
    
    content = content.replace(/comunica..o/g, 'comunicação');
    
    content = content.replace(/Ordens de Preserva..o/g, 'Ordens de Preservação');
    
    // In DocumentsPage: "TIPO / RETENO"
    content = content.replace(/TIPO \/ RETEN..O/g, 'TIPO / RETENÇÃO');
    content = content.replace(/TIPO \/ RETEN.O/g, 'TIPO / RETENÇÃO');
    
    // AdminPage specific titles
    content = content.replace(/Configura..es & Usu.rios/g, 'Configurações & Usuários');
    
    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/components/layout/Sidebar.tsx');
fixFile('src/App.tsx');
fixFile('src/pages/AdminPage.tsx');
fixFile('src/pages/DocumentsPage.tsx');
fixFile('src/pages/PlaceholderPage.tsx');
fixFile('src/pages/DashboardPage.tsx');

console.log('Arquivos corrigidos com sucesso!');
