const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "NexFarmaPro - Compliance Vault",
        icon: path.join(__dirname, '../public/vite.svg'), // We can change this later
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // Remove the default Windows menu bar
    Menu.setApplicationMenu(null);

    // In development, load the Vite dev server
    // In production, load the built index.html
    const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
    
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // Start our internal Express API server in the background
    const serverPath = path.join(__dirname, '../server/server.js');
    serverProcess = spawn('node', [serverPath], {
        stdio: 'inherit'
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Clean up the background server when Electron closes
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
