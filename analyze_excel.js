const XLSX = require('xlsx');
const fs = require('fs');

// Function to analyze Excel file structure
function analyzeExcelFile(filename) {
    console.log(`\n=== Analyzing ${filename} ===`);
    
    try {
        const workbook = XLSX.readFile(`Historical Data Files/${filename}`);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON to get headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
            const headers = jsonData[0];
            console.log(`Columns: ${headers.length}`);
            console.log(`Records: ${jsonData.length - 1}`);
            console.log('First 10 headers:');
            headers.slice(0, 10).forEach((header, i) => {
                console.log(`  ${i + 1}. ${header}`);
            });
            
            if (headers.length > 10) {
                console.log(`  ... and ${headers.length - 10} more columns`);
            }
        }
    } catch (error) {
        console.error(`Error reading ${filename}:`, error.message);
    }
}

// Analyze a few key years
const filesToAnalyze = [
    'datadotgov_ais13.xlsx',
    'datadotgov_ais16.xlsx', 
    'datadotgov_ais18.xlsx'
];

filesToAnalyze.forEach(analyzeExcelFile);
