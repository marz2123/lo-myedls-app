import * as XLSX from 'xlsx';

export interface TaxonomyRow {
  familyCode: string;
  familyName: string;
  categoryCode: string;
  categoryName: string;
  subcategoryCode: string;
  subcategoryName: string;
  taskCount: string;
}

export function parseTaxonomyCSV(text: string): TaxonomyRow[] {
  const lines = text.split('\n');
  
  // Map to count tasks per subcategory
  const subcategoryTaskCounts = new Map<string, number>();
  const subcategoryData = new Map<string, {
    familyCode: string;
    familyName: string;
    categoryCode: string;
    categoryName: string;
    subcategoryCode: string;
    subcategoryName: string;
  }>();
  
  // Skip header line and count tasks
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by semicolon (CSV separator)
    const parts = line.split(';').map(p => p.trim());
    
    if (parts.length >= 8) {
      const familyCode = parts[1]; // Famille Code
      const familyName = parts[2]; // Famille
      const categoryCode = parts[4]; // Catégorie Code
      const categoryName = parts[5]; // Catégorie
      const subcategoryCode = parts[6]; // Sous-catégorie Code
      const subcategoryName = parts[7]; // Sous-catégorie
      
      // Only count if we have valid data
      if (familyCode && familyName && categoryCode && categoryName && subcategoryCode && subcategoryName) {
        // Store subcategory data
        if (!subcategoryData.has(subcategoryCode)) {
          subcategoryData.set(subcategoryCode, {
            familyCode,
            familyName,
            categoryCode,
            categoryName,
            subcategoryCode,
            subcategoryName
          });
        }
        
        // Count tasks per subcategory
        subcategoryTaskCounts.set(
          subcategoryCode,
          (subcategoryTaskCounts.get(subcategoryCode) || 0) + 1
        );
      }
    }
  }

  // Build final rows with task counts
  const rows: TaxonomyRow[] = [];
  for (const [subcategoryCode, data] of subcategoryData) {
    rows.push({
      ...data,
      taskCount: (subcategoryTaskCounts.get(subcategoryCode) || 0).toString()
    });
  }

  return rows;
}

export function parseTaxonomyText(text: string): TaxonomyRow[] {
  const rows: TaxonomyRow[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip header and separator lines
    if (line.includes('Famille Code') || line.includes('|-|') || !line.includes('|')) {
      continue;
    }

    const parts = line.split('|').map(p => p.trim()).filter(p => p);
    
    if (parts.length >= 7) {
      // Clean and validate taskCount - use '0' if invalid
      const taskCountRaw = parts[6].trim();
      const taskCountNum = parseInt(taskCountRaw);
      const taskCount = !isNaN(taskCountNum) && taskCountNum >= 0 ? taskCountRaw : '0';
      
      rows.push({
        familyCode: parts[0],
        familyName: parts[1],
        categoryCode: parts[2],
        categoryName: parts[3],
        subcategoryCode: parts[4],
        subcategoryName: parts[5],
        taskCount: taskCount
      });
    }
  }

  return rows;
}

export function parseTaxonomyExcel(file: File): Promise<TaxonomyRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Map to count tasks per subcategory
        const subcategoryTaskCounts = new Map<string, number>();
        const subcategoryData = new Map<string, {
          familyCode: string;
          familyName: string;
          categoryCode: string;
          categoryName: string;
          subcategoryCode: string;
          subcategoryName: string;
        }>();
        
        // Skip header row (index 0) and process data
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 8) continue;
          
          const familyCode = String(row[1] || '').trim();
          const familyName = String(row[2] || '').trim();
          const categoryCode = String(row[4] || '').trim();
          const categoryName = String(row[5] || '').trim();
          const subcategoryCode = String(row[6] || '').trim();
          const subcategoryName = String(row[7] || '').trim();
          
          if (familyCode && familyName && categoryCode && categoryName && subcategoryCode && subcategoryName) {
            if (!subcategoryData.has(subcategoryCode)) {
              subcategoryData.set(subcategoryCode, {
                familyCode,
                familyName,
                categoryCode,
                categoryName,
                subcategoryCode,
                subcategoryName
              });
            }
            
            subcategoryTaskCounts.set(
              subcategoryCode,
              (subcategoryTaskCounts.get(subcategoryCode) || 0) + 1
            );
          }
        }
        
        const rows: TaxonomyRow[] = [];
        for (const [subcategoryCode, data] of subcategoryData) {
          rows.push({
            ...data,
            taskCount: (subcategoryTaskCounts.get(subcategoryCode) || 0).toString()
          });
        }
        
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}
