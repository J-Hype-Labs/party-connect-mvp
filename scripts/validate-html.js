const fs = require('fs');
const path = require('path');

function main() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');
  
  console.log('Validating HTML structure...');
  
  const checks = [
    { name: 'Root element', pattern: /id="root"/, required: true },
    { name: 'Babel script type', pattern: /type="text\/babel"/, required: true },
    { name: 'ReactDOM.createRoot', pattern: /ReactDOM\.createRoot/, required: true },
    { name: 'App component render', pattern: /<App \/>/, required: true },
    { name: 'Tailwind CDN', pattern: /cdn\.tailwindcss\.com/, required: true },
    { name: 'React CDN', pattern: /unpkg\.com\/react@18/, required: true },
    { name: 'ReactDOM CDN', pattern: /unpkg\.com\/react-dom@18/, required: true },
    { name: 'Babel CDN', pattern: /unpkg\.com\/@babel\/standalone/, required: true },
    { name: 'Pretendard CDN', pattern: /cdn\.jsdelivr\.net.*pretendard/, required: true },
    { name: 'Lucide CDN', pattern: /unpkg\.com\/lucide/, required: false }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const found = check.pattern.test(html);
    if (found) {
      console.log(`  ✅ ${check.name}`);
    } else if (check.required) {
      console.error(`  ❌ ${check.name} - MISSING (required)`);
      allPassed = false;
    } else {
      console.warn(`  ⚠️ ${check.name} - MISSING (optional)`);
    }
  }
  
  // Check for common JSX issues
  console.log('\nChecking for common JSX issues...');
  
  // Check for string concatenation in className (should use template literals)
  const classNameConcat = /className\s*=\s*["'][^"']*["']\s*\+\s*\(/.exec(html);
  if (classNameConcat) {
    console.error(`  ❌ Found string concatenation in className (use template literals instead)`);
    allPassed = false;
  } else {
    console.log(`  ✅ No string concatenation in className`);
  }
  
  // Check for z-60 (invalid in Tailwind CDN)
  const z60 = /z-60(?![0-9])/.exec(html);
  if (z60) {
    console.error(`  ❌ Found invalid z-60 class (use z-[60] instead)`);
    allPassed = false;
  } else {
    console.log(`  ✅ No invalid z-60 classes`);
  }
  
  // Check for component definitions
  const componentNames = ['AdminDashboardTab', 'AdminPartiesTab', 'AdminApplicationsTab', 'AdminReviewsTab', 'AdminStatsTab', 'StatCard'];
  for (const name of componentNames) {
    const defRegex = new RegExp(`const ${name}\\s*=`);
    const usageRegex = new RegExp(`<${name}[\\s>]`);
    const hasDef = defRegex.test(html);
    const hasUsage = usageRegex.test(html);
    if (hasUsage && !hasDef) {
      console.error(`  ❌ Component ${name} is used but not defined`);
      allPassed = false;
    } else if (hasDef && hasUsage) {
      console.log(`  ✅ Component ${name} defined and used`);
    }
  }
  
  if (allPassed) {
    console.log('\n✅ HTML validation PASSED');
    process.exit(0);
  } else {
    console.error('\n❌ HTML validation FAILED');
    process.exit(1);
  }
}

main();