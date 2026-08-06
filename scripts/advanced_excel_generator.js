const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const backendDir = 'c:/Desktop/JR/Dholera/Dholera-backend';
const outputFile = path.join(backendDir, 'Dholera mng FR Advanced.xlsx');

function parseRoutesAndControllers() {
    const routesDir = path.join(backendDir, 'routes');
    const controllersDir = path.join(backendDir, 'controllers');
    const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
    
    let endpoints = [];
    let idCounter = 1;

    for (const rf of routeFiles) {
        const rfPath = path.join(routesDir, rf);
        const rfContent = fs.readFileSync(rfPath, 'utf8');
        
        // Find all router.METHOD('PATH', ... handler)
        // This regex is simplified, it captures METHOD, PATH, and the entire line
        const routeRegex = /router\.(get|post|put|delete|patch)\('([^']+)'/g;
        let match;
        
        while ((match = routeRegex.exec(rfContent)) !== null) {
            const method = match[1].toUpperCase();
            const urlPath = match[2];
            
            // Get the line to figure out the controller function
            const lineEnd = rfContent.indexOf('\n', match.index);
            const line = rfContent.substring(match.index, lineEnd);
            
            let controllerFile = '';
            let functionName = '';
            let params = [];
            
            // Check if it's refactored to a controller (e.g., leadsController.onboardLead)
            const handlerMatch = line.match(/([a-zA-Z0-9_]+Controller)\.([a-zA-Z0-9_]+)/);
            if (handlerMatch) {
                controllerFile = handlerMatch[1] + '.js';
                functionName = handlerMatch[2];
                
                // Try to find the params in the controller file
                try {
                    const cPath = path.join(controllersDir, controllerFile);
                    if (fs.existsSync(cPath)) {
                        const cContent = fs.readFileSync(cPath, 'utf8');
                        const fnRegex = new RegExp(`exports\.${functionName}\\s*=\\s*async?\\s*\\([^)]+\\)\\s*=>\\s*\\{([\\s\\S]*?)(?:exports\\.|^})`, 'm');
                        const fnMatch = cContent.match(fnRegex);
                        
                        if (fnMatch) {
                            const fnBody = fnMatch[1];
                            // Extract req.body, req.params, req.query
                            const paramRegex = /req\.(body|params|query)\?\.([a-zA-Z0-9_]+)/g;
                            let pMatch;
                            while ((pMatch = paramRegex.exec(fnBody)) !== null) {
                                params.push(`${pMatch[1]}.${pMatch[2]}`);
                            }
                        }
                    }
                } catch(e) {}
            } else {
                // Inline handler
                controllerFile = rf; // It's handled in the route file itself
                functionName = 'Inline Handler';
                
                // Extract params from inline body roughly
                const paramRegex = /req\.(body|params|query)\?\.([a-zA-Z0-9_]+)/g;
                let pMatch;
                while ((pMatch = paramRegex.exec(line)) !== null) {
                    params.push(`${pMatch[1]}.${pMatch[2]}`);
                }
            }
            
            endpoints.push({
                srNo: idCounter++,
                module: rf.replace('.js', '').toUpperCase(),
                apiCallFileName: `/api/${rf.replace('.js', '')}${urlPath} [${method}]`,
                apiCallParameterList: [...new Set(params)].join(', ') || 'None',
                apiResponse: 'JSON Response',
                blFileName: controllerFile,
                functionName: functionName,
                devStrategy: `Handles ${method} for ${urlPath}`
            });
        }
    }
    return endpoints;
}

async function createAdvancedExcel() {
    const endpoints = parseRoutesAndControllers();
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 9: Backend Details
    const beSheet = workbook.addWorksheet('Backend Details');
    beSheet.columns = [
        { header: 'Developer', key: 'dev', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'API Call File Name / Route', key: 'api_route', width: 40 },
        { header: 'API Call Parameter List', key: 'api_params', width: 40 },
        { header: 'API Response', key: 'api_resp', width: 20 },
        { header: 'BL File Name (Controller)', key: 'bl_file', width: 25 },
        { header: 'Function Name', key: 'func_name', width: 25 },
        { header: 'BE BL Development Strategy', key: 'strategy', width: 40 },
    ];
    beSheet.getRow(1).font = { bold: true };
    
    endpoints.forEach(ep => {
        beSheet.addRow({
            dev: 'AI Agent',
            status: ep.functionName === 'Inline Handler' ? 'Needs Refactor' : 'Refactored',
            api_route: ep.apiCallFileName,
            api_params: ep.apiCallParameterList,
            api_resp: ep.apiResponse,
            bl_file: ep.blFileName,
            func_name: ep.functionName,
            strategy: ep.devStrategy
        });
    });

    // Sheet 6: Module Detail
    const modSheet = workbook.addWorksheet('Module Detail');
    modSheet.columns = [
        { header: 'Sr No', key: 'sr', width: 10 },
        { header: 'Module Name', key: 'module', width: 20 },
        { header: 'API Count', key: 'api_count', width: 15 },
        { header: 'Fields (Parameters extracted)', key: 'fields', width: 40 },
        { header: 'DB Field Name (Guessed)', key: 'db_field', width: 25 },
        { header: 'Developer Status', key: 'dev_status', width: 20 },
    ];
    modSheet.getRow(1).font = { bold: true };

    const grouped = {};
    endpoints.forEach(ep => {
        if (!grouped[ep.module]) {
            grouped[ep.module] = { count: 0, fields: new Set() };
        }
        grouped[ep.module].count++;
        if (ep.apiCallParameterList !== 'None') {
            ep.apiCallParameterList.split(', ').forEach(f => grouped[ep.module].fields.add(f));
        }
    });

    let modSr = 1;
    for (const [mod, data] of Object.entries(grouped)) {
        modSheet.addRow({
            sr: modSr++,
            module: mod,
            api_count: data.count,
            fields: Array.from(data.fields).join(', '),
            db_field: `tbl${mod.toLowerCase()}`,
            dev_status: 'Mapped'
        });
    }

    await workbook.xlsx.writeFile(outputFile);
    console.log('Successfully created', outputFile);
}

createAdvancedExcel().catch(console.error);
