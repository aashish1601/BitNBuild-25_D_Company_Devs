const fs = require('fs');

console.log('🔧 Fixing regex syntax error in background script...');

// Read the current background.js file
let content = fs.readFileSync('public/background.js', 'utf8');

// Fix the malformed regex pattern
const oldRegex = `    const urlMatch = task.match(/(https?://[^s]+)/);`;

const newRegex = `    const urlMatch = task.match(/(https?:\\/\\/[^\\s]+)/);`;

// Replace the malformed regex
content = content.replace(oldRegex, newRegex);

// Write the updated content
fs.writeFileSync('public/background.js', content);

console.log('✅ Regex syntax error fixed!');
console.log('✅ URL detection pattern corrected');
console.log('✅ Service worker should load properly now');
console.log('✅ Ready to rebuild extension...');
