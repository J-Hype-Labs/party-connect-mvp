const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

function extractJSXFromHTML(html) {
  const scriptRegex = /<script type="text\/babel">([\s\S]*?)<\/script>/;
  const match = html.match(scriptRegex);
  if (!match) {
    throw new Error('No <script type="text/babel"> found in HTML');
  }
  return match[1];
}

function validateJSX(jsxCode) {
  try {
    parser.parse(jsxCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      strictMode: false
    });
    return { valid: true, errors: [] };
  } catch (error) {
    return { 
      valid: false, 
      errors: [{
        message: error.message,
        line: error.loc?.line,
        column: error.loc?.column
      }]
    };
  }
}

function main() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  console.log('Extracting JSX from index.html...');
  const jsxCode = extractJSXFromHTML(html);
  console.log(`Extracted ${jsxCode.length} characters of JSX code`);
  
  console.log('Validating JSX syntax with @babel/parser...');
  const result = validateJSX(jsxCode);
  
  if (result.valid) {
    console.log('✅ JSX syntax validation PASSED');
    process.exit(0);
  } else {
    console.error('❌ JSX syntax validation FAILED');
    result.errors.forEach(err => {
      console.error(`  Line ${err.line}, Column ${err.column}: ${err.message}`);
    });
    process.exit(1);
  }
}

main();