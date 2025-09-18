import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

interface Constructor {
  name: string;
  description: string;
  parameters?: string[];
}

interface Property {
  name: string;
  type: string;
  description: string;
  inherited?: boolean;
  inheritedFrom?: string;
}

interface Method {
  name: string;
  description: string;
  returnType?: string;
  parameters?: string[];
  inherited?: boolean;
  inheritedFrom?: string;
}

interface InheritanceInfo {
  baseClasses: string[];
  hierarchy: string[];
}

export interface DetailedClassInfo {
  name: string;
  namespace: string;
  description: string;
  syntax?: string;
  inheritance?: InheritanceInfo;
  constructors: Constructor[];
  properties: Property[];
  methods: Method[];
  examples?: string[];
}

export class HtmlParser {
  private extractedDocsPath: string;

  constructor() {
    this.extractedDocsPath = path.join(process.cwd(), 'extracted-docs', 'html');
  }

  private cleanText(text: string): string {
    // Remove JavaScript function calls and other artifacts
    return text
      .replace(/AddLanguageSpecificTextSet\([^)]+\)/g, '')
      .replace(/\|[^"]*\"\);?/g, '') // Remove |vb=|cpp=()|nu=()|fs=()");
      .replace(/;[^;]*Object$/, '') // Remove ;Object at end
      .replace(/<[^>]+>/g, '') // Remove any HTML tags
      .replace(/\s+/g, ' ')
      .trim();
  }

  async parseClassDetails(htmlFile: string): Promise<DetailedClassInfo | null> {
    try {
      console.log(`[HTML Parser] Starting to parse: ${htmlFile}`);
      const filePath = path.join(this.extractedDocsPath, htmlFile);

      if (!fs.existsSync(filePath)) {
        console.error(`[HTML Parser] HTML file not found: ${filePath}`);
        return null;
      }

      // Check file size for potential issues
      const stats = fs.statSync(filePath);
      console.log(`[HTML Parser] File size: ${stats.size} bytes`);

      if (stats.size === 0) {
        console.error(`[HTML Parser] HTML file is empty: ${filePath}`);
        return null;
      }

      if (stats.size > 10 * 1024 * 1024) { // 10MB limit
        console.warn(`[HTML Parser] Large HTML file detected (${stats.size} bytes): ${filePath}`);
      }

      const htmlContent = fs.readFileSync(filePath, 'utf-8');

      if (!htmlContent || htmlContent.trim().length === 0) {
        console.error(`[HTML Parser] HTML content is empty after reading: ${filePath}`);
        return null;
      }

      console.log(`[HTML Parser] Creating JSDOM for ${htmlFile}`);
      const dom = new JSDOM(htmlContent, {
        // Add some options for better compatibility
        contentType: "text/html",
        includeNodeLocations: false,
        storageQuota: 10000000
      });
      const document = dom.window.document;

      if (!document) {
        console.error(`[HTML Parser] Failed to create document from HTML: ${filePath}`);
        return null;
      }

      console.log(`[HTML Parser] Document created successfully, extracting content`);


      // Extract basic information with error handling
      let className = 'Unknown Class';
      try {
        const titleElement = document.querySelector('h1');
        if (titleElement?.textContent) {
          className = this.cleanText(titleElement.textContent);
          console.log(`[HTML Parser] Extracted class name: ${className}`);
        } else {
          console.warn(`[HTML Parser] No h1 title element found in ${htmlFile}`);
        }
      } catch (error) {
        console.error(`[HTML Parser] Error extracting class name:`, error);
      }

      // Find namespace by looking for the pattern
      let namespace = 'Unknown';
      try {
        const strongElements = Array.from(document.querySelectorAll('strong'));
        for (const strongEl of strongElements) {
          if (strongEl.textContent?.includes('Namespace:')) {
            const namespaceLink = strongEl.parentElement?.querySelector('a');
            if (namespaceLink) {
              namespace = this.cleanText(namespaceLink.textContent || 'Unknown');
              console.log(`[HTML Parser] Extracted namespace: ${namespace}`);
              break;
            }
          }
        }
      } catch (error) {
        console.error(`[HTML Parser] Error extracting namespace:`, error);
      }

      // Extract description from summary div
      let description = 'No description available';
      try {
        const summaryDiv = document.querySelector('.summary, div.summary');
        if (summaryDiv?.textContent) {
          description = this.cleanText(summaryDiv.textContent);
          console.log(`[HTML Parser] Extracted description length: ${description.length} chars`);
        }
      } catch (error) {
        console.error(`[HTML Parser] Error extracting description:`, error);
      }

      // Extract content sections with individual error handling
      let syntax: string | undefined;
      let inheritance: InheritanceInfo;
      let constructors: Constructor[];
      let properties: Property[];
      let methods: Method[];
      let examples: string[];

      try {
        syntax = this.extractSyntax(document);
        console.log(`[HTML Parser] Syntax extraction: ${syntax ? 'SUCCESS' : 'NONE'}`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting syntax:`, error);
        syntax = undefined;
      }

      try {
        const inheritanceResult = this.extractInheritance(document);
        inheritance = inheritanceResult || { baseClasses: [], hierarchy: [] };
        console.log(`[HTML Parser] Inheritance extraction: ${inheritance.hierarchy?.length || 0} levels`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting inheritance:`, error);
        inheritance = { baseClasses: [], hierarchy: [] };
      }

      try {
        const constructorsResult = this.extractConstructors(document);
        constructors = constructorsResult || [];
        console.log(`[HTML Parser] Constructors extraction: ${constructors.length} found`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting constructors:`, error);
        constructors = [];
      }

      try {
        const propertiesResult = this.extractProperties(document);
        properties = propertiesResult || [];
        console.log(`[HTML Parser] Properties extraction: ${properties.length} found`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting properties:`, error);
        properties = [];
      }

      try {
        const methodsResult = this.extractMethods(document);
        methods = methodsResult || [];
        console.log(`[HTML Parser] Methods extraction: ${methods.length} found`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting methods:`, error);
        methods = [];
      }

      try {
        const examplesResult = this.extractExamples(document);
        examples = examplesResult || [];
        console.log(`[HTML Parser] Examples extraction: ${examples.length} found`);
      } catch (error) {
        console.error(`[HTML Parser] Error extracting examples:`, error);
        examples = [];
      }

      console.log(`[HTML Parser] Successfully parsed ${htmlFile}:`);
      console.log(`  - Class: ${className}`);
      console.log(`  - Namespace: ${namespace}`);
      console.log(`  - Description: ${description.length} chars`);
      console.log(`  - Syntax: ${syntax ? 'present' : 'none'}`);
      console.log(`  - Inheritance: ${inheritance?.hierarchy?.length || 0} levels`);
      console.log(`  - Constructors: ${constructors?.length || 0}`);
      console.log(`  - Properties: ${properties?.length || 0}`);
      console.log(`  - Methods: ${methods?.length || 0}`);
      console.log(`  - Examples: ${examples?.length || 0}`);

      // Ensure all arrays are properly initialized
      const result = {
        name: className || 'Unknown Class',
        namespace: namespace || 'Unknown',
        description: description || 'No description available',
        syntax: syntax || undefined,
        inheritance: inheritance || { baseClasses: [], hierarchy: [] },
        constructors: Array.isArray(constructors) ? constructors : [],
        properties: Array.isArray(properties) ? properties : [],
        methods: Array.isArray(methods) ? methods : [],
        examples: Array.isArray(examples) ? examples : []
      };

      return result;

    } catch (error) {
      console.error(`[HTML Parser] Fatal error parsing HTML file ${htmlFile}:`, error);
      if (error instanceof Error) {
        console.error(`[HTML Parser] Error stack:`, error.stack);
      }
      console.error(`[HTML Parser] File path:`, path.join(this.extractedDocsPath, htmlFile));
      return null;
    }
  }

  private extractSyntax(document: Document): string | undefined {
    // Look for syntax section
    const syntaxSection = document.querySelector('#ID2RBSection, div[id*="Syntax"]');
    if (syntaxSection) {
      const codeElement = syntaxSection.querySelector('pre, code');
      if (codeElement) {
        return codeElement.textContent?.trim();
      }
    }
    return undefined;
  }

  private extractInheritance(document: Document): InheritanceInfo | undefined {
    // Look for inheritance hierarchy section
    const inheritanceSection = document.querySelector('#ID0RBSection, div[id*="Inheritance"]');
    if (!inheritanceSection) return undefined;

    const hierarchy: string[] = [];
    const baseClasses: string[] = [];
    
    // Extract hierarchy links
    const links = inheritanceSection.querySelectorAll('a');
    links.forEach(link => {
      const text = link.textContent?.trim();
      if (text && !text.includes('System.Object')) {
        hierarchy.push(text);
        if (text !== 'Object' && text !== 'ModelObject') {
          baseClasses.push(text);
        }
      }
    });

    // Also extract plain text hierarchy
    const hierarchyText = inheritanceSection.textContent || '';
    const hierarchyMatches = hierarchyText.match(/Tekla\.Structures\.\w+\.\w+/g);
    if (hierarchyMatches) {
      hierarchyMatches.forEach(match => {
        const className = match.split('.').pop();
        if (className && !hierarchy.includes(className)) {
          hierarchy.push(className);
          baseClasses.push(className);
        }
      });
    }

    return hierarchy.length > 0 ? { baseClasses, hierarchy } : undefined;
  }

  private extractConstructors(document: Document): Constructor[] {
    const constructors: Constructor[] = [];
    
    // Look for constructors section
    const constructorsSection = document.querySelector('#ID3RBSection, div[id*="Constructor"]');
    if (!constructorsSection) return constructors;

    const constructorRows = constructorsSection.querySelectorAll('tr[data*="public"]');
    constructorRows.forEach(row => {
      const nameCell = row.querySelector('td:nth-child(2) a');
      const descCell = row.querySelector('td:nth-child(3) .summary, td:nth-child(3) div');
      
      if (nameCell && descCell) {
        const name = this.cleanText(nameCell.textContent || '');
        const description = this.cleanText(descCell.textContent || '');
        
        constructors.push({
          name,
          description
        });
      }
    });

    return constructors;
  }

  private extractProperties(document: Document): Property[] {
    const properties: Property[] = [];
    
    // Look for properties section
    const propertiesSection = document.querySelector('#ID4RBSection, div[id*="Properties"]');
    if (!propertiesSection) return properties;

    const propertyRows = propertiesSection.querySelectorAll('tr[data*="public"]');
    propertyRows.forEach(row => {
      const nameCell = row.querySelector('td:nth-child(2) a');
      const descCell = row.querySelector('td:nth-child(3)');
      
      if (nameCell && descCell) {
        const name = this.cleanText(nameCell.textContent || '');
        const fullDescription = this.cleanText(descCell.textContent || '');
        
        // Check if inherited
        const isInherited = fullDescription.includes('(Inherited from');
        const inheritedFrom = isInherited ? this.extractInheritedFrom(fullDescription) : undefined;
        
        // Extract just the main description (without inherited info)
        const description = fullDescription.split('(Inherited from')[0].trim();
        
        properties.push({
          name,
          type: 'property', // Could be enhanced to extract actual type
          description,
          inherited: isInherited,
          inheritedFrom
        });
      }
    });

    return properties;
  }

  private extractMethods(document: Document): Method[] {
    const methods: Method[] = [];
    
    // Look for methods section
    const methodsSection = document.querySelector('#ID5RBSection, div[id*="Methods"]');
    if (!methodsSection) return methods;

    const methodRows = methodsSection.querySelectorAll('tr[data*="public"]');
    methodRows.forEach(row => {
      const nameCell = row.querySelector('td:nth-child(2) a');
      const descCell = row.querySelector('td:nth-child(3)');
      
      if (nameCell && descCell) {
        const name = this.cleanText(nameCell.textContent || '');
        const fullDescription = this.cleanText(descCell.textContent || '');
        
        // Check if inherited
        const isInherited = fullDescription.includes('(Inherited from');
        const inheritedFrom = isInherited ? this.extractInheritedFrom(fullDescription) : undefined;
        
        // Extract just the main description (without inherited info)
        const description = fullDescription.split('(Inherited from')[0].trim();
        
        methods.push({
          name,
          description,
          inherited: isInherited,
          inheritedFrom
        });
      }
    });

    return methods;
  }

  private extractInheritedFrom(text: string): string | undefined {
    const match = text.match(/\(Inherited from ([^)]+)\)/);
    if (match && match[1]) {
      // Extract just the class name, removing any link markup
      return match[1].trim();
    }
    return undefined;
  }

  private extractExamples(document: Document): string[] {
    const examples: string[] = [];
    
    // Look for examples section
    const examplesSection = document.querySelector('#ID6RBSection, div[id*="Examples"]');
    if (!examplesSection) return examples;

    const codeBlocks = examplesSection.querySelectorAll('pre, code');
    codeBlocks.forEach(block => {
      const code = block.textContent?.trim();
      if (code && code.length > 10) { // Filter out very short snippets
        examples.push(code);
      }
    });

    return examples;
  }
}