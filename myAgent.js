require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: apiKey });

// Configuration
const ROOT_DIR = path.join(__dirname, '..'); // Points to C:\Desktop\JR\Dholera
const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'build', '.dart_tool', 'debug_logs'];

function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                walkDir(filePath, fileList);
            }
        } else {
            // Exclude common uninteresting files
            if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.lock') && file !== 'package-lock.json') {
                 fileList.push(filePath.replace(ROOT_DIR, '').replace(/\\/g, '/'));
            }
        }
    }
    return fileList;
}

async function analyzeFiles() {
    console.log('Agent starting... Scanning directories...');
    
    let allFiles = [];
    ['Dholera', 'Dholera-backend', 'Dholera-frontend', 'completed'].forEach(folder => {
        allFiles = allFiles.concat(walkDir(path.join(ROOT_DIR, folder)));
    });
    
    console.log(`Found ${allFiles.length} interesting files. Analyzing with Gemini...`);
    
    // We will chunk the files in case there are thousands, but usually source files are ~1000
    // Gemini 2.5 Pro has a 2M context window so it can handle 1000 paths easily.
    const fileListString = allFiles.join('\n');
    
    const prompt = `
You are a File Audit Agent. I will provide you a massive list of file paths from a monorepo containing a Flutter App (Dholera), a Node.js Backend (Dholera-backend), a Next.js Frontend (Dholera-frontend), and a 'completed' archive folder.

Your job is to categorize EVERY file by importance (Wanted/Needed):
- **Higher**: Critical source code files, configurations (package.json), server logic, core components.
- **Medium**: Standard UI widgets, translations, style utilities, markdown instructions.
- **Lowest**: Files that might be unwanted/temp (loose scripts in root, old text logs, generic .txt files, loose pdfs, archived backups in the 'completed' folder).

Respond strictly with a Markdown table with the following columns:
| File Path | Category (Higher/Medium/Lowest) | Reason |

Do your best to include all files, or group them by folder if there are too many to list individually (e.g. "/Dholera-frontend/src/components/* -> Higher").

Here are the files:
${fileListString}
`;

    try {
        console.log('Sending request to Gemini...');
        const result = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
        });
        const responseText = result.text;
        
        const outputPath = path.join(ROOT_DIR, 'AGENT_FILE_REPORT.md');
        fs.writeFileSync(outputPath, responseText);
        console.log(`Analysis complete! Report saved to ${outputPath}`);
    } catch (err) {
        console.error('Agent execution failed:', err);
    }
}

analyzeFiles();
