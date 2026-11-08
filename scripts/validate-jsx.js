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

function validateJSX(jsxCode, sourceName) {
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

function validateJS(jsCode, sourceName) {
  try {
    // Check if file contains JSX (React components)
    const hasJSX = jsCode.includes('jsx') || (jsCode.includes('<') && jsCode.includes('>') && jsCode.includes('className='));
    const plugins = ['typescript'];
    if (hasJSX) {
      plugins.push('jsx');
    }
    parser.parse(jsCode, {
      sourceType: 'module',
      plugins,
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

function validateHTMLFile(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  console.log(`Extracting JSX from ${path.basename(htmlPath)}...`);
  const jsxCode = extractJSXFromHTML(html);
  console.log(`Extracted ${jsxCode.length} characters of JSX code`);
  
  console.log('Validating JSX syntax with @babel/parser...');
  const result = validateJSX(jsxCode, path.basename(htmlPath));
  
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

function validateJSFile(jsPath) {
  const jsCode = fs.readFileSync(jsPath, 'utf-8');
  
  console.log(`Validating JS syntax for ${path.basename(jsPath)}...`);
  const result = validateJS(jsCode, path.basename(jsPath));
  
  if (result.valid) {
    console.log(`✅ JS syntax validation PASSED for ${path.basename(jsPath)}`);
    return true;
  } else {
    console.error(`❌ JS syntax validation FAILED for ${path.basename(jsPath)}`);
    result.errors.forEach(err => {
      console.error(`  Line ${err.line}, Column ${err.column}: ${err.message}`);
    });
    return false;
  }
}

function main() {
  const htmlFiles = [
    path.join(__dirname, '..', 'index.html'),
    path.join(__dirname, '..', 'party-connect', 'index.html')
  ];
  
  const jsFiles = [
    path.join(__dirname, '..', 'js', 'auth-client.js'),
    path.join(__dirname, '..', 'js', 'auth-service.js'),
    path.join(__dirname, '..', 'js', 'auth-ui.js'),
    path.join(__dirname, '..', 'js', 'party-api.js'),
    path.join(__dirname, '..', 'js', 'party-data.js')
  ];
  
  let allPassed = true;
  
  console.log('\n========== HTML/JSX Validation ==========\n');
  for (const file of htmlFiles) {
    const passed = validateHTMLFile(file);
    if (!passed) allPassed = false;
  }
  
  console.log('\n========== JS Module Validation ==========\n');
  for (const file of jsFiles) {
    const passed = validateJSFile(file);
    if (!passed) allPassed = false;
  }
  
  if (allPassed) {
    console.log('\n✅ All syntax validations PASSED');
    process.exit(0);
  } else {
    console.error('\n❌ Some syntax validations FAILED');
    process.exit(1);
  }
}

main();