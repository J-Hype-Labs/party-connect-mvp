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

function validateFile(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  console.log(`Extracting JSX from ${path.basename(htmlPath)}...`);
  const jsxCode = extractJSXFromHTML(html);
  console.log(`Extracted ${jsxCode.length} characters of JSX code`);
  
  console.log('Validating JSX syntax with @babel/parser...');
  const result = validateJSX(jsxCode);
  
  if (result.valid) {
    console.log(`✅ JSX syntax validation PASSED for ${path.basename(htmlPath)}`);
    return true;
  } else {
    console.error(`❌ JSX syntax validation FAILED for ${path.basename(htmlPath)}`);
    result.errors.forEach(err => {
      console.error(`  Line ${err.line}, Column ${err.column}: ${err.message}`);
    });
    return false;
  }
}

function main() {
  const files = [
    path.join(__dirname, '..', 'index.html'),
    path.join(__dirname, '..', 'party-connect', 'index.html')
  ];
  
  let allPassed = true;
  for (const file of files) {
    const passed = validateFile(file);
    if (!passed) allPassed = false;
  }
  
  if (allPassed) {
    console.log('\n✅ All JSX syntax validations PASSED');
    process.exit(0);
  } else {
    console.error('\n❌ Some JSX syntax validations FAILED');
    process.exit(1);
  }
}

main();