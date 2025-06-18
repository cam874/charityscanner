const XLSX = require('xlsx');

console.log('=== Comparing 2013 vs 2016 vs 2019 data structures ===');

// Check 2013 Excel
try {
    const workbook2013 = XLSX.readFile('Historical Data Files/datadotgov_ais13.xlsx');
    const data2013 = XLSX.utils.sheet_to_json(workbook2013.Sheets[workbook2013.SheetNames[0]], { header: 1 });
    const headers2013 = data2013[0] || [];
    
    console.log('\n=== 2013 Excel file ===');
    console.log(`Columns: ${headers2013.length}`);
    const financial2013 = headers2013.filter(h => h && (
        h.toLowerCase().includes('revenue') ||
        h.toLowerCase().includes('income') ||
        h.toLowerCase().includes('expense') ||
        h.toLowerCase().includes('total') ||
        h.toLowerCase().includes('asset') ||
        h.toLowerCase().includes('donation')
    ));
    console.log('Financial-related columns:', financial2013);
    
} catch (e) {
    console.error('Error reading 2013 file:', e.message);
}

// Check 2016 Excel
try {
    const workbook2016 = XLSX.readFile('Historical Data Files/datadotgov_ais16.xlsx');
    const data2016 = XLSX.utils.sheet_to_json(workbook2016.Sheets[workbook2016.SheetNames[0]], { header: 1 });
    const headers2016 = data2016[0] || [];
    
    console.log('\n=== 2016 Excel file ===');
    console.log(`Columns: ${headers2016.length}`);
    const financial2016 = headers2016.filter(h => h && (
        h.toLowerCase().includes('revenue') ||
        h.toLowerCase().includes('income') ||
        h.toLowerCase().includes('expense') ||
        h.toLowerCase().includes('total') ||
        h.toLowerCase().includes('asset') ||
        h.toLowerCase().includes('donation')
    ));
    console.log('Financial-related columns:', financial2016);
    
} catch (e) {
    console.error('Error reading 2016 file:', e.message);
}

// Check 2019 CSV (we already know this structure)
console.log('\n=== 2019 CSV file ===');
console.log('Has comprehensive financial data including:');
console.log('- revenue from government');
console.log('- donations and bequests');
console.log('- total revenue');
console.log('- total expenses');
console.log('- total assets');
console.log('- net surplus/deficit');
