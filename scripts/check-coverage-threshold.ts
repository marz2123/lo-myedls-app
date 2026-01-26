/**
 * Coverage Threshold Checker
 * Fails CI if coverage falls below the specified threshold
 */

interface CoverageMetrics {
  lines: { found: number; hit: number; percentage: number };
}

function parseLcov(lcovContent: string): CoverageMetrics {
  let linesFound = 0;
  let linesHit = 0;
  
  const lines = lcovContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('LF:')) {
      linesFound += parseInt(line.substring(3));
    } else if (line.startsWith('LH:')) {
      linesHit += parseInt(line.substring(3));
    }
  }
  
  const percentage = linesFound > 0 ? (linesHit / linesFound) * 100 : 0;
  
  return {
    lines: {
      found: linesFound,
      hit: linesHit,
      percentage
    }
  };
}

async function main() {
  const args = Deno.args;
  
  if (args.length < 2) {
    console.error('Usage: deno run --allow-read check-coverage-threshold.ts <lcov-file> <threshold>');
    Deno.exit(1);
  }
  
  const lcovFile = args[0];
  const threshold = parseFloat(args[1]);
  
  if (isNaN(threshold) || threshold < 0 || threshold > 100) {
    console.error('Threshold must be a number between 0 and 100');
    Deno.exit(1);
  }
  
  try {
    const lcovContent = await Deno.readTextFile(lcovFile);
    const metrics = parseLcov(lcovContent);
    
    console.log('\n📊 Coverage Threshold Check');
    console.log('─'.repeat(50));
    console.log(`Current Coverage: ${metrics.lines.percentage.toFixed(2)}%`);
    console.log(`Required Threshold: ${threshold}%`);
    console.log(`Lines Covered: ${metrics.lines.hit}/${metrics.lines.found}`);
    console.log('─'.repeat(50));
    
    if (metrics.lines.percentage >= threshold) {
      console.log(`✅ Coverage threshold met! (${metrics.lines.percentage.toFixed(2)}% >= ${threshold}%)`);
      Deno.exit(0);
    } else {
      const deficit = threshold - metrics.lines.percentage;
      console.error(`❌ Coverage threshold not met! (${metrics.lines.percentage.toFixed(2)}% < ${threshold}%)`);
      console.error(`   Need ${deficit.toFixed(2)}% more coverage to pass`);
      
      // Calculate how many more lines need to be covered
      const totalLines = metrics.lines.found;
      const requiredHitLines = Math.ceil((threshold / 100) * totalLines);
      const additionalLinesNeeded = requiredHitLines - metrics.lines.hit;
      
      console.error(`   Cover ${additionalLinesNeeded} more line(s) to reach threshold`);
      Deno.exit(1);
    }
    
  } catch (error) {
    console.error('Error processing coverage report:', error);
    Deno.exit(1);
  }
}

main();
