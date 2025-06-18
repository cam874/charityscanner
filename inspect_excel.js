const XLSX = require('xlsx');

console.log('=== Analyzing Excel file column structure ===');

try {
    const workbook = XLSX.readFile('Historical Data Files/datadotgov_ais13.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get first row as sample data
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 1, header: 1 });
    const headers = data[0] || [];
    
    console.log(`Found ${headers.length} columns`);
    console.log('\nAll column headers:');
    headers.forEach((header, index) => {
        if (header) {
            console.log(`  ${index + 1}. ${header}`);
        }
    });
    
} catch (error) {
    console.error('Error:', error.message);
}
