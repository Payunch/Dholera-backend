const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const backendDir = 'c:/Desktop/JR/Dholera/Dholera-backend';
const outputFile = path.join(backendDir, 'Dholera mng FR.xlsx');

async function createExcel() {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Directory Structure
    const dirSheet = workbook.addWorksheet('Directory Structure');
    dirSheet.columns = [
        { header: 'Folder', key: 'folder', width: 25 },
        { header: 'Subfolder', key: 'subfolder', width: 25 },
        { header: 'File Name', key: 'filename', width: 40 },
        { header: 'Type', key: 'type', width: 15 },
    ];
    
    // Style the header
    dirSheet.getRow(1).font = { bold: true };
    
    function walkDir(dir, folder = '', subfolder = '') {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            // Skip node_modules and hidden folders
            if (file === 'node_modules' || file.startsWith('.') || file === 'data' || file === 'uploads') {
                continue;
            }
            
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                let nextFolder = folder;
                let nextSub = subfolder;
                
                if (!folder) {
                    nextFolder = file;
                } else if (!subfolder) {
                    nextSub = file;
                } else {
                    nextSub = subfolder + '/' + file;
                }
                
                dirSheet.addRow({
                    folder: nextFolder,
                    subfolder: nextSub,
                    filename: '',
                    type: 'Directory'
                });
                
                walkDir(fullPath, nextFolder, nextSub);
            } else {
                dirSheet.addRow({
                    folder: folder || 'Root',
                    subfolder: subfolder || '',
                    filename: file,
                    type: path.extname(file) || 'File'
                });
            }
        }
    }
    
    walkDir(backendDir);
    
    // Sheet 2: Backend Details (MVC mapping)
    const mvcSheet = workbook.addWorksheet('Backend Details');
    mvcSheet.columns = [
        { header: 'Module Name', key: 'module', width: 20 },
        { header: 'API Route File', key: 'route', width: 25 },
        { header: 'Controller File', key: 'controller', width: 25 },
        { header: 'Model File', key: 'model', width: 25 },
        { header: 'Service File', key: 'service', width: 30 },
    ];
    mvcSheet.getRow(1).font = { bold: true };
    
    // Manually mapping some based on the structure provided by the user
    mvcSheet.addRows([
        { module: 'Authentication', route: 'auth.js', controller: 'authController.js', model: 'UserSession.js', service: 'adminSecurity.js' },
        { module: 'Leads', route: 'leads.js', controller: 'leadsController.js', model: 'Lead.js', service: 'leadIntelligence.js' },
        { module: 'Updates', route: 'updates.js', controller: 'updatesController.js', model: 'Update.js', service: '' },
        { module: 'Blogs/Content', route: 'content.js', controller: '', model: '', service: 'autoBlogService.js' },
        { module: 'PDF/Media', route: 'pdf.js', controller: '', model: 'PdfDocument.js, PdfView.js', service: 'cloudinary.js' },
        { module: 'WhatsApp', route: 'whatsapp.js', controller: '', model: 'WhatsAppLog.js', service: 'whatsapp.js' },
        { module: 'Analytics', route: 'analytics.js', controller: '', model: 'Analytics.js', service: '' },
        { module: 'System/Settings', route: 'settings.js', controller: '', model: 'Setting.js', service: 'settingsService.js' }
    ]);
    
    // Sheet 3: Module Detail (based on RiTe Account FR 1.xlsx format)
    const detailSheet = workbook.addWorksheet('Module Detail');
    detailSheet.columns = [
        { header: 'Sr No', key: 'sr', width: 10 },
        { header: 'Module Name', key: 'module', width: 20 },
        { header: 'DB Field Name (Table)', key: 'table', width: 25 },
        { header: 'Developer Status', key: 'status', width: 20 },
    ];
    detailSheet.getRow(1).font = { bold: true };
    
    detailSheet.addRows([
        { sr: 1, module: 'Authentication', table: 'UserSessions', status: 'Refactored' },
        { sr: 2, module: 'Leads', table: 'Leads', status: 'Refactored' },
        { sr: 3, module: 'Updates', table: 'Updates', status: 'Refactored' },
        { sr: 4, module: 'PDF Engine', table: 'PdfDocuments, PdfViews', status: 'Stable' },
        { sr: 5, module: 'Content/Blogs', table: 'Blogs (Translation)', status: 'Stable' },
        { sr: 6, module: 'WhatsApp Int.', table: 'WhatsAppLogs', status: 'Stable' }
    ]);

    await workbook.xlsx.writeFile(outputFile);
    console.log('Successfully created', outputFile);
}

createExcel().catch(console.error);
