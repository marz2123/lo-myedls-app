/**
 * Coverage Badge Generator
 * Generates a coverage badge SVG for README
 */

function getBadgeColor(percentage: number): string {
  if (percentage >= 80) return 'brightgreen';
  if (percentage >= 60) return 'yellow';
  if (percentage >= 40) return 'orange';
  return 'red';
}

function parseLcov(lcovContent: string): number {
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
  
  return linesFound > 0 ? (linesHit / linesFound) * 100 : 0;
}

function generateBadgeSvg(percentage: number): string {
  const color = getBadgeColor(percentage);
  const percentageText = `${percentage.toFixed(1)}%`;
  
  // Calculate text widths (approximate)
  const labelWidth = 55;
  const valueWidth = 40;
  const totalWidth = labelWidth + valueWidth;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="coverage: ${percentageText}">
  <title>coverage: ${percentageText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="#${color === 'brightgreen' ? '4c1' : color === 'yellow' ? 'dfb317' : color === 'orange' ? 'fe7d37' : 'e05d44'}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth / 2 * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelWidth * 10 - 100}">coverage</text>
    <text x="${labelWidth / 2 * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${labelWidth * 10 - 100}">coverage</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${valueWidth * 10 - 100}">${percentageText}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${valueWidth * 10 - 100}">${percentageText}</text>
  </g>
</svg>`;
}

async function main() {
  const args = Deno.args;
  
  if (args.length === 0) {
    console.error('Usage: deno run --allow-read --allow-write generate-coverage-badge.ts <lcov-file>');
    Deno.exit(1);
  }
  
  const lcovFile = args[0];
  
  try {
    const lcovContent = await Deno.readTextFile(lcovFile);
    const percentage = parseLcov(lcovContent);
    const svg = generateBadgeSvg(percentage);
    
    // Save badge to file
    await Deno.writeTextFile('coverage-badge.svg', svg);
    
    console.log(`✅ Coverage badge generated: ${percentage.toFixed(1)}%`);
    console.log(`   Badge saved to: coverage-badge.svg`);
    
    // Generate markdown for README
    const markdown = `![Coverage](./coverage-badge.svg)`;
    console.log(`\nAdd to README.md:\n${markdown}`);
    
  } catch (error) {
    console.error('Error generating coverage badge:', error);
    Deno.exit(1);
  }
}

main();
