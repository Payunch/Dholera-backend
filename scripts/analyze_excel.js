const ExcelJS = require('exceljs');

async function analyzeExcel() {
    const workbook = new ExcelJS.Workbook();
    // Try both paths just in case
    const path1 = 'c:/Desktop/JR/Dholera/RiTe Account FR 1.xlsx';
    const path2 = 'c:/Desktop/JR/Dholera/Dholera-backend/RiTe Account FR 1.xlsx';
    
    let loaded = false;
    try {
        await workbook.xlsx.readFile(path1);
        console.log('Loaded from path1:', path1);
        loaded = true;
    } catch (e) {
        try {
            await workbook.xlsx.readFile(path2);
            console.log('Loaded from path2:', path2);
            loaded = true;
        } catch (e2) {
            console.error('Could not load Excel file');
        }
    }
    
    if (loaded) {
        workbook.eachSheet((worksheet, sheetId) => {
            console.log(`Sheet ${sheetId}: ${worksheet.name}`);
            const row1 = worksheet.getRow(1).values;
            const row2 = worksheet.getRow(2).values;
            console.log(`  Row 1 (Headers): ${JSON.stringify(row1)}`);
            console.log(`  Row 2 (Data): ${JSON.stringify(row2)}`);
        });
    }
}

analyzeExcel();
