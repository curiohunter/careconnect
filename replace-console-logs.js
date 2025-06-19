#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File patterns to search
const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];
const excludePatterns = ['node_modules', '.git', 'dist', 'build'];

// Logger replacement mappings
const replacements = [
  // console.log patterns
  { 
    pattern: /console\.log\(/g, 
    replacement: 'logger.info(',
    description: 'Replace console.log with logger.info'
  },
  // console.error patterns  
  { 
    pattern: /console\.error\(/g, 
    replacement: 'logger.error(',
    description: 'Replace console.error with logger.error (needs manual Error object creation)'
  },
  // console.warn patterns
  { 
    pattern: /console\.warn\(/g, 
    replacement: 'logger.warn(',
    description: 'Replace console.warn with logger.warn'
  },
  // console.debug patterns
  { 
    pattern: /console\.debug\(/g, 
    replacement: 'logger.debug(',
    description: 'Replace console.debug with logger.debug'
  }
];

// Logger import statement
const loggerImport = "import { logger } from '../errorMonitor';";

function shouldProcessFile(filePath) {
  // Check if file has valid extension
  if (!fileExtensions.some(ext => filePath.endsWith(ext))) {
    return false;
  }
  
  // Check if file is in excluded directory
  if (excludePatterns.some(pattern => filePath.includes(pattern))) {
    return false;
  }
  
  return true;
}

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findFiles(filePath, fileList);
    } else if (shouldProcessFile(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function hasLoggerImport(content) {
  return content.includes("import { logger } from") || 
         content.includes("import { logger,") ||
         content.includes("logger } from");
}

function addLoggerImport(content, filePath) {
  const lines = content.split('\n');
  let insertIndex = -1;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      insertIndex = i;
    }
  }
  
  if (insertIndex !== -1) {
    // Calculate relative path to errorMonitor.ts
    const relativePath = path.relative(path.dirname(filePath), path.dirname(filePath)).replace(/\\/g, '/');
    const importPath = relativePath ? `${relativePath}/errorMonitor` : '../errorMonitor';
    const importStatement = `import { logger } from '${importPath}';`;
    
    lines.splice(insertIndex + 1, 0, importStatement);
    return lines.join('\n');
  }
  
  return content;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let hasConsoleStatements = false;
    
    // Check if file has console statements
    replacements.forEach(({ pattern }) => {
      if (pattern.test(content)) {
        hasConsoleStatements = true;
      }
    });
    
    if (!hasConsoleStatements) {
      return { processed: false, reason: 'No console statements found' };
    }
    
    // Add logger import if not present
    if (!hasLoggerImport(content)) {
      modifiedContent = addLoggerImport(modifiedContent, filePath);
    }
    
    // Apply replacements
    let changesMade = 0;
    replacements.forEach(({ pattern, replacement }) => {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        changesMade += matches.length;
        modifiedContent = modifiedContent.replace(pattern, replacement);
      }
    });
    
    // Write back to file
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    
    return { 
      processed: true, 
      changes: changesMade,
      path: filePath.replace(process.cwd(), '.')
    };
    
  } catch (error) {
    return { 
      processed: false, 
      error: error.message,
      path: filePath.replace(process.cwd(), '.')
    };
  }
}

function main() {
  const startDir = process.cwd();
  console.log(`🔍 Searching for TypeScript/JavaScript files in: ${startDir}`);
  
  const files = findFiles(startDir);
  console.log(`📁 Found ${files.length} files to check`);
  
  let processedCount = 0;
  let totalChanges = 0;
  const results = [];
  
  files.forEach(filePath => {
    const result = processFile(filePath);
    results.push(result);
    
    if (result.processed) {
      processedCount++;
      totalChanges += result.changes || 0;
      console.log(`✅ ${result.path}: ${result.changes} changes`);
    } else if (result.error) {
      console.log(`❌ ${result.path}: ${result.error}`);
    }
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${processedCount}/${files.length}`);
  console.log(`   Total console statements replaced: ${totalChanges}`);
  
  // Show files that had errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.log(`\n❌ Files with errors:`);
    errors.forEach(({ path, error }) => {
      console.log(`   ${path}: ${error}`);
    });
  }
  
  console.log(`\n⚠️  Important Notes:`);
  console.log(`   1. Review all logger.error() calls - they may need Error objects instead of strings`);
  console.log(`   2. Test the application to ensure logging works correctly`);
  console.log(`   3. Check that import paths are correct in all files`);
}

if (require.main === module) {
  main();
}