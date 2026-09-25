const fs = require('fs');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // AdminPage
    content = content.replace(/Novo Usu.rio/g, 'Novo Usuário');
    content = content.replace(/infraestrutura de preserva..o/g, 'infraestrutura de preservação');
    content = content.replace(/Permiss.es de Cofre/g, 'Permissões de Cofre');
    content = content.replace(/T.cnico/g, 'Técnico');
    content = content.replace(/A..es/g, 'Ações');
    content = content.replace(/V.lido at./g, 'Válido até');
    
    // IntegrationsPage
    content = content.replace(/Integra..es \(API\)/g, 'Integrações (API)');
    
    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('src/pages/AdminPage.tsx');
fixFile('src/pages/IntegrationsPage.tsx');

console.log('Arquivos corrigidos com sucesso!');
