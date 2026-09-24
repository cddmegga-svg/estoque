const fs = require('fs');
let sidebar = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

// The file currently contains weird chars like Polaticas
// We will just replace that exact block with clean UTF-8
const newBlock = 
        // Módulos de Compliance
        menuItems.push({ id: 'audit', label: 'Auditoria de Logs', icon: ClipboardList, path: '/audit' });
        menuItems.push({ id: 'retention', label: 'Políticas de Retenção', icon: FileText, path: '/retention' });
        menuItems.push({ id: 'legal-holds', label: 'Legal Holds', icon: Shield, path: '/legal-holds' });
        
        // Integração (SNCR e Alpha7/Lotus)
        if (hasPermission('admin_access')) {
            menuItems.push({ id: 'integrations', label: 'Connectors & SNCR', icon: ArrowLeftRight, path: '/integrations' });
            menuItems.push({ id: 'backups', label: 'Gestão de Backups', icon: RefreshCw, path: '/backups' });
        }

        // Configurações
        if (hasPermission('manage_users') || user?.role === 'admin') {
            menuItems.push({ id: 'admin', label: 'Configurações', icon: Shield, path: '/admin' });
        }
;

// regex to match the block between "Módulos de Compliance" and the end of Configurações block
const regex = /\/\/\s*M[^]*?path:\s*'\/admin'\s*}\);\s*}/m;
if (regex.test(sidebar)) {
  sidebar = sidebar.replace(regex, newBlock.trim());
  fs.writeFileSync('src/components/layout/Sidebar.tsx', sidebar, 'utf8');
}
