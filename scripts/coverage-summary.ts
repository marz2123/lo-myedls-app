/**
 * Coverage Summary Generator
 * Parses LCOV coverage report and generates a summary with metrics
 */

interface CoverageMetrics {
  lines: { found: number; hit: number; percentage: number };
  functions: { found: number; hit: number; percentage: number };
  branches: { found: number; hit: number; percentage: number };
}

interface FileCoverage {
  file: string;
  metrics: CoverageMetrics;
}

function parseLcov(lcovContent: string): FileCoverage[] {
  const files: FileCoverage[] = [];
  const lines = lcovContent.split('\n');
  
  let currentFile: FileCoverage | null = null;
  
  for (const line of lines) {
    if (line.startsWith('SF:')) {
      // Start of a new file
      const filePath = line.substring(3);
      currentFile = {
        file: filePath,
        metrics: {
          lines: { found: 0, hit: 0, percentage: 0 },
          functions: { found: 0, hit: 0, percentage: 0 },
          branches: { found: 0, hit: 0, percentage: 0 },
        }
      };
    } else if (line.startsWith('LF:')) {
      // Lines found
      if (currentFile) {
        currentFile.metrics.lines.found = parseInt(line.substring(3));
      }
    } else if (line.startsWith('LH:')) {
      // Lines hit
      if (currentFile) {
        currentFile.metrics.lines.hit = parseInt(line.substring(3));
        if (currentFile.metrics.lines.found > 0) {
          currentFile.metrics.lines.percentage = 
            (currentFile.metrics.lines.hit / currentFile.metrics.lines.found) * 100;
        }
      }
    } else if (line.startsWith('FNF:')) {
      // Functions found
      if (currentFile) {
        currentFile.metrics.functions.found = parseInt(line.substring(4));
      }
    } else if (line.startsWith('FNH:')) {
      // Functions hit
      if (currentFile) {
        currentFile.metrics.functions.hit = parseInt(line.substring(4));
        if (currentFile.metrics.functions.found > 0) {
          currentFile.metrics.functions.percentage = 
            (currentFile.metrics.functions.hit / currentFile.metrics.functions.found) * 100;
        }
      }
    } else if (line.startsWith('BRF:')) {
      // Branches found
      if (currentFile) {
        currentFile.metrics.branches.found = parseInt(line.substring(4));
      }
    } else if (line.startsWith('BRH:')) {
      // Branches hit
      if (currentFile) {
        currentFile.metrics.branches.hit = parseInt(line.substring(4));
        if (currentFile.metrics.branches.found > 0) {
          currentFile.metrics.branches.percentage = 
            (currentFile.metrics.branches.hit / currentFile.metrics.branches.found) * 100;
        }
      }
    } else if (line === 'end_of_record') {
      // End of current file
      if (currentFile) {
        files.push(currentFile);
        currentFile = null;
      }
    }
  }
  
  return files;
}

function calculateOverallMetrics(files: FileCoverage[]): CoverageMetrics {
  const overall: CoverageMetrics = {
    lines: { found: 0, hit: 0, percentage: 0 },
    functions: { found: 0, hit: 0, percentage: 0 },
    branches: { found: 0, hit: 0, percentage: 0 },
  };
  
  for (const file of files) {
    overall.lines.found += file.metrics.lines.found;
    overall.lines.hit += file.metrics.lines.hit;
    overall.functions.found += file.metrics.functions.found;
    overall.functions.hit += file.metrics.functions.hit;
    overall.branches.found += file.metrics.branches.found;
    overall.branches.hit += file.metrics.branches.hit;
  }
  
  if (overall.lines.found > 0) {
    overall.lines.percentage = (overall.lines.hit / overall.lines.found) * 100;
  }
  if (overall.functions.found > 0) {
    overall.functions.percentage = (overall.functions.hit / overall.functions.found) * 100;
  }
  if (overall.branches.found > 0) {
    overall.branches.percentage = (overall.branches.hit / overall.branches.found) * 100;
  }
  
  return overall;
}

function getCoverageColor(percentage: number): string {
  if (percentage >= 80) return '🟢';
  if (percentage >= 60) return '🟡';
  return '🔴';
}

function getCoverageBadge(percentage: number): string {
  const color = percentage >= 80 ? 'brightgreen' : percentage >= 60 ? 'yellow' : 'red';
  return `![Coverage](https://img.shields.io/badge/coverage-${percentage.toFixed(1)}%25-${color})`;
}

function generateMarkdownSummary(files: FileCoverage[], overall: CoverageMetrics): string {
  const lines = [
    '## 📊 Code Coverage Report',
    '',
    '### Overall Coverage',
    '',
    '| Metric | Coverage | Hit | Total |',
    '|--------|----------|-----|-------|',
    `| Lines ${getCoverageColor(overall.lines.percentage)} | ${overall.lines.percentage.toFixed(2)}% | ${overall.lines.hit} | ${overall.lines.found} |`,
    `| Functions ${getCoverageColor(overall.functions.percentage)} | ${overall.functions.percentage.toFixed(2)}% | ${overall.functions.hit} | ${overall.functions.found} |`,
    `| Branches ${getCoverageColor(overall.branches.percentage)} | ${overall.branches.percentage.toFixed(2)}% | ${overall.branches.hit} | ${overall.branches.found} |`,
    '',
    `${getCoverageBadge(overall.lines.percentage)}`,
    '',
    '### Coverage by File',
    '',
    '| File | Lines | Functions | Branches |',
    '|------|-------|-----------|----------|',
  ];
  
  // Sort files by line coverage (lowest first) to highlight areas needing improvement
  const sortedFiles = [...files].sort((a, b) => 
    a.metrics.lines.percentage - b.metrics.lines.percentage
  );
  
  for (const file of sortedFiles) {
    const fileName = file.file.replace(/^.*\/supabase\/functions\//, '');
    const linesCov = `${getCoverageColor(file.metrics.lines.percentage)} ${file.metrics.lines.percentage.toFixed(1)}%`;
    const funcsCov = `${getCoverageColor(file.metrics.functions.percentage)} ${file.metrics.functions.percentage.toFixed(1)}%`;
    const branchesCov = `${getCoverageColor(file.metrics.branches.percentage)} ${file.metrics.branches.percentage.toFixed(1)}%`;
    
    lines.push(`| ${fileName} | ${linesCov} | ${funcsCov} | ${branchesCov} |`);
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('### Legend');
  lines.push('- 🟢 Excellent (≥80%)');
  lines.push('- 🟡 Good (60-79%)');
  lines.push('- 🔴 Needs Improvement (<60%)');
  
  return lines.join('\n');
}

async function main() {
  const args = Deno.args;
  
  if (args.length === 0) {
    console.error('Usage: deno run --allow-read coverage-summary.ts <lcov-file>');
    Deno.exit(1);
  }
  
  const lcovFile = args[0];
  
  try {
    const lcovContent = await Deno.readTextFile(lcovFile);
    const files = parseLcov(lcovContent);
    const overall = calculateOverallMetrics(files);
    
    const summary = generateMarkdownSummary(files, overall);
    
    // Write summary to file for GitHub Actions
    await Deno.writeTextFile('coverage-summary.md', summary);
    
    // Output to console
    console.log(summary);
    
    // Output for GitHub Actions step output
    console.log(`\n::set-output name=coverage::${overall.lines.percentage.toFixed(2)}`);
    console.log(`::set-output name=lines_hit::${overall.lines.hit}`);
    console.log(`::set-output name=lines_total::${overall.lines.found}`);
    
  } catch (error) {
    console.error('Error processing coverage report:', error);
    Deno.exit(1);
  }
}

main();
