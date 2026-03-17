const Tesseract = require('tesseract.js');
const path = require('path');

const filePath = path.join(__dirname, 'uploads', 'reports', 'report-1773507049820-27918020.png');

console.log('Starting Tesseract test on:', filePath);

Tesseract.recognize(filePath, 'eng', {
    logger: m => console.log(m)
}).then(({ data: { text } }) => {
    console.log('OCR Success!');
    console.log('Text preview:', text.substring(0, 100));
    process.exit(0);
}).catch(err => {
    console.error('OCR Error:', err);
    process.exit(1);
});
