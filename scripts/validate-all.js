const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

function runScript(name, script) {
  console.log(`\n=== ${name} ===`);
  try {
    const scriptPath = path.join(PROJECT_ROOT, script);
    execSync(`node "${scriptPath}"`, { stdio: 'inherit', cwd: PROJECT_ROOT });
    console.log(`\n✅ ${name} PASSED`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${name} FAILED`);
    return false;
  }
}

function main() {
  console.log('🔍 Running all validations...\n');
  
  const results = [
    runScript('JSX Syntax Validation', 'scripts/validate-jsx.js'),
    runScript('HTML Structure Validation', 'scripts/validate-html.js')
  ];
  
  const allPassed = results.every(r => r);
  
  console.log('\n========== SUMMARY ==========');
  if (allPassed) {
    console.log('✅ ALL VALIDATIONS PASSED');
    process.exit(0);
  } else {
    console.error('❌ SOME VALIDATIONS FAILED');
    process.exit(1);
  }
}

main();