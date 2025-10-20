#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directory containing the built application
const buildDir = '/usr/share/nginx/html';

// Environment variables to inject
const envVars = {
  'COLONIES_HOST': process.env.COLONIES_HOST || '',
  'COLONIES_PORT': process.env.COLONIES_PORT || '',
  'COLONIES_TLS': process.env.COLONIES_TLS || 'false',
  'COLONIES_SERVER_PRV_KEY': process.env.COLONIES_SERVER_PRV_KEY || '',
  'COLONIES_COLONY_PRV_KEY': process.env.COLONIES_COLONY_PRV_KEY || '',
  'COLONIES_PRV_KEY': process.env.COLONIES_PRV_KEY || '',
  'COLONIES_COLONY_NAME': process.env.COLONIES_COLONY_NAME || '',
  'COLONIES_EXECUTOR_ID': process.env.COLONIES_EXECUTOR_ID || '',
  'COLONIES_EXECUTOR_PRV_KEY': process.env.COLONIES_EXECUTOR_PRV_KEY || '',
  'COLONIES_SERVER_ID': process.env.COLONIES_SERVER_ID || '',
  'COLONIES_USERNAME': process.env.COLONIES_USERNAME || '',
  'COLONIES_FIRSTNAME': process.env.COLONIES_FIRSTNAME || '',
  'COLONIES_LASTNAME': process.env.COLONIES_LASTNAME || '',
  'COLONIES_EMAIL': process.env.COLONIES_EMAIL || '',
  'COLONIES_AWS_S3_ENDPOINT': process.env.COLONIES_AWS_S3_ENDPOINT || '',
  'COLONIES_AWS_S3_ACCESSKEY': process.env.COLONIES_AWS_S3_ACCESSKEY || '',
  'COLONIES_AWS_S3_SECRETKEY': process.env.COLONIES_AWS_S3_SECRETKEY || '',
  'COLONIES_AWS_S3_REGION': process.env.COLONIES_AWS_S3_REGION || '',
  'COLONIES_AWS_S3_BUCKET': process.env.COLONIES_AWS_S3_BUCKET || '',
  'COLONIES_AWS_S3_TLS': process.env.COLONIES_AWS_S3_TLS || 'false'
};

console.log('🔍 Searching for JavaScript files to inject environment variables...');

// Function to recursively find all .js files
function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findJsFiles(fullPath));
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to inject environment variables into a file
function injectEnvVars(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace placeholder environment variables with actual values
    for (const [key, value] of Object.entries(envVars)) {
      const placeholder = `__${key}__`;
      if (content.includes(placeholder)) {
        // Escape special characters for JSON string
        const escapedValue = JSON.stringify(value).slice(1, -1); // Remove surrounding quotes
        content = content.replace(new RegExp(placeholder, 'g'), escapedValue);
        modified = true;
        console.log(`  ✅ Replaced ${placeholder} with runtime value`);
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`📝 Updated: ${filePath}`);
    }

    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
try {
  const jsFiles = findJsFiles(buildDir);
  console.log(`📁 Found ${jsFiles.length} JavaScript files`);

  let totalModified = 0;

  for (const file of jsFiles) {
    if (injectEnvVars(file)) {
      totalModified++;
    }
  }

  console.log(`🎉 Environment injection complete! Modified ${totalModified} files.`);

  // Log environment variables being used (without sensitive values)
  console.log('\n📋 Environment configuration:');
  console.log(`  COLONIES_HOST: ${envVars.COLONIES_HOST || '(not set)'}`);
  console.log(`  COLONIES_PORT: ${envVars.COLONIES_PORT || '(not set)'}`);
  console.log(`  COLONIES_TLS: ${envVars.COLONIES_TLS}`);
  console.log(`  COLONIES_COLONY_NAME: ${envVars.COLONIES_COLONY_NAME || '(not set)'}`);
  console.log(`  COLONIES_USERNAME: ${envVars.COLONIES_USERNAME || '(not set)'}`);
  console.log(`  Keys configured: ${Object.entries(envVars).filter(([k, v]) => k.includes('KEY') && v).length}`);

} catch (error) {
  console.error('❌ Fatal error during environment injection:', error.message);
  process.exit(1);
}