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
      const filePath = path.join(this.extractedDocsPath, htmlFile);
      
      if (!fs.existsSync(filePath)) {
        console.error(`HTML file not found: ${filePath}`);
        return null;
      }

      const htmlContent = fs.readFileSync(filePath, 'utf-8');
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;

      // Extract basic information
      const titleElement = document.querySelector('h1');
      const className = this.cleanText(titleElement?.textContent || 'Unknown Class');
      
      // Find namespace by looking for the pattern
      let namespace = 'Unknown';
      const strongElements = Array.from(document.querySelectorAll('strong'));
      for (const strongEl of strongElements) {
        if (strongEl.textContent?.includes('Namespace:')) {
          const namespaceLink = strongEl.parentElement?.querySelector('a');
          if (namespaceLink) {
            namespace = this.cleanText(namespaceLink.textContent || 'Unknown');
          }
          break;
        }
      }

      // Extract description from summary div
      const summaryDiv = document.querySelector('.summary, div.summary');
      const description = this.cleanText(summaryDiv?.textContent || 'No description available');

      // Extract syntax
      const syntax = this.extractSyntax(document);

      // Extract inheritance hierarchy
      const inheritance = this.extractInheritance(document);

      // Extract constructors
      const constructors = this.extractConstructors(document);

      // Extract properties
      const properties = this.extractProperties(document);

      // Extract methods
      const methods = this.extractMethods(document);

      // Extract examples
      const examples = this.extractExamples(document);

      return {
        name: className,
        namespace,
        description,
        syntax,
        inheritance,
        constructors,
        properties,
        methods,
        examples
      };

    } catch (error) {
      console.error(`Error parsing HTML file ${htmlFile}:`, error);
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