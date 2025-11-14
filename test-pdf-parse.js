// Test if pdf-parse works with canvas installed
const fs = require('fs');
const pdf = require('pdf-parse');

async function testPdfParse() {
  try {
    console.log('Testing pdf-parse with canvas...\n');
    
    // Find a PDF file to test
    const files = fs.readdirSync('uploads').filter(f => f.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('No PDF files found in uploads/');
      return;
    }
    
    const testFile = files[0];
    console.log(`Testing with: ${testFile}`);
    
    const dataBuffer = fs.readFileSync(`uploads/${testFile}`);
    console.log(`File size: ${dataBuffer.length} bytes`);
    
    const data = await pdf(dataBuffer);
    
    console.log('\n✓ PDF parsing successful!');
    console.log(`Pages: ${data.numpages}`);
    console.log(`Text length: ${data.text.length} characters`);
    console.log(`First 100 chars: ${data.text.substring(0, 100).replace(/\n/g, ' ')}`);
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
  }
}

testPdfParse();

