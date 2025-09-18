#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { TeklaApiDocumentation } from './tekla-api-documentation.js';

class TeklaApiMcpServer {
  private server: Server;
  private apiDocs: TeklaApiDocumentation;

  constructor() {
    this.server = new Server(
      {
        name: 'tekla-api-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiDocs = new TeklaApiDocumentation();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_api',
            description: 'Search Tekla Open API documentation for classes, methods, properties, and other members',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query - can be class names, method names, keywords, etc.',
                },
                type: {
                  type: 'string',
                  enum: ['class', 'method', 'property', 'interface', 'enum', 'delegate', 'all'],
                  description: 'Filter results by type (optional)',
                  default: 'all',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_class_details',
            description: 'Get detailed information about a specific Tekla Open API class',
            inputSchema: {
              type: 'object',
              properties: {
                className: {
                  type: 'string',
                  description: 'Name of the class to get details for',
                },
                includeMembers: {
                  type: 'boolean',
                  description: 'Whether to include class members (methods, properties)',
                  default: true,
                },
              },
              required: ['className'],
            },
          },
          {
            name: 'get_method_details',
            description: 'Get detailed information about a specific Tekla Open API method',
            inputSchema: {
              type: 'object',
              properties: {
                methodName: {
                  type: 'string',
                  description: 'Name of the method to get details for',
                },
                className: {
                  type: 'string',
                  description: 'Name of the class containing the method (optional for better filtering)',
                },
              },
              required: ['methodName'],
            },
          },
          {
            name: 'browse_namespace',
            description: 'Browse Tekla Open API by namespace to understand the structure',
            inputSchema: {
              type: 'object',
              properties: {
                namespace: {
                  type: 'string',
                  description: 'Namespace to browse (e.g., "Tekla.Structures.Model")',
                },
                includeMembers: {
                  type: 'boolean',
                  description: 'Whether to include details about namespace members',
                  default: false,
                },
              },
              required: ['namespace'],
            },
          },
          {
            name: 'get_code_examples',
            description: 'Get code examples and usage patterns for specific API elements',
            inputSchema: {
              type: 'object',
              properties: {
                element: {
                  type: 'string',
                  description: 'API element name (class, method, etc.) to get examples for',
                },
                language: {
                  type: 'string',
                  enum: ['csharp', 'vb', 'all'],
                  description: 'Programming language for examples',
                  default: 'csharp',
                },
              },
              required: ['element'],
            },
          },
          {
            name: 'get_namespaces',
            description: 'Get a list of all available namespaces in the Tekla Open API',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_statistics',
            description: 'Get statistics about the loaded Tekla Open API documentation',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'search_examples',
            description: 'Search through Tekla Open API code examples',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for examples (name, description, API elements)',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of examples to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_example_details',
            description: 'Get detailed information about a specific code example',
            inputSchema: {
              type: 'object',
              properties: {
                exampleName: {
                  type: 'string',
                  description: 'Name of the example to get details for',
                },
              },
              required: ['exampleName'],
            },
          },
          {
            name: 'get_examples_by_category',
            description: 'Get examples filtered by category (Model/Applications, Model/Plugins, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Category to filter by (optional)',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_example_categories',
            description: 'Get all available example categories',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_api':
            return await this.handleSearchApi(args);

          case 'get_class_details':
            return await this.handleGetClassDetails(args);

          case 'get_method_details':
            return await this.handleGetMethodDetails(args);

          case 'browse_namespace':
            return await this.handleBrowseNamespace(args);

          case 'get_code_examples':
            return await this.handleGetCodeExamples(args);

          case 'get_namespaces':
            return await this.handleGetNamespaces();

          case 'get_statistics':
            return await this.handleGetStatistics();

          case 'search_examples':
            return await this.handleSearchExamples(args);

          case 'get_example_details':
            return await this.handleGetExampleDetails(args);

          case 'get_examples_by_category':
            return await this.handleGetExamplesByCategory(args);

          case 'get_example_categories':
            return await this.handleGetExampleCategories();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`[MCP Server] Tool execution failed for "${name}":`, error);

        let errorMessage = 'Unknown error occurred';
        let errorDetails = '';

        if (error instanceof Error) {
          errorMessage = error.message;
          errorDetails = error.stack || '';
          console.error(`[MCP Server] Error stack:`, error.stack);
        } else {
          errorMessage = String(error);
          console.error(`[MCP Server] Non-Error object thrown:`, error);
        }

        // Log the arguments for debugging
        console.error(`[MCP Server] Tool arguments:`, JSON.stringify(args, null, 2));

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed for "${name}": ${errorMessage}`
        );
      }
    });
  }

  private async handleSearchApi(args: any) {
    const { query, type = 'all', limit = 10 } = args;
    
    if (!query || typeof query !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required and must be a string');
    }

    const results = await this.apiDocs.search(query, type, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} results for "${query}":

${results.map(result => 
  `**${result.name || result.title}** (${result.type})
  ${result.summary || result.description || 'No description available'}
  Namespace: ${(result as any).normalizedNamespace || result.namespace || 'N/A'}
  
`).join('')}`,
        },
      ],
    };
  }

  private async handleGetClassDetails(args: any) {
    console.log(`[handleGetClassDetails] Called with args:`, JSON.stringify(args, null, 2));

    const { className, includeMembers = true } = args;

    if (!className || typeof className !== 'string') {
      console.error(`[handleGetClassDetails] Invalid className parameter:`, className);
      throw new McpError(ErrorCode.InvalidParams, 'className parameter is required and must be a string');
    }

    console.log(`[handleGetClassDetails] Calling getClassDetails for "${className}"`);
    const classDetails = await this.apiDocs.getClassDetails(className, includeMembers);

    if (!classDetails) {
      console.error(`[handleGetClassDetails] No class details found for "${className}"`);
      throw new McpError(ErrorCode.InvalidParams, `Class "${className}" not found in API documentation`);
    }

    console.log(`[handleGetClassDetails] Class details found, formatting response for "${className}"`);
    try {
      const formattedText = this.formatClassDetails(classDetails);
      console.log(`[handleGetClassDetails] Successfully formatted class details for "${className}"`);

      return {
        content: [
          {
            type: 'text',
            text: formattedText,
          },
        ],
      };
    } catch (formatError) {
      console.error(`[handleGetClassDetails] Error formatting class details for "${className}":`, formatError);
      throw new McpError(ErrorCode.InternalError, `Failed to format class details for "${className}": ${formatError instanceof Error ? formatError.message : String(formatError)}`);
    }
  }

  private async handleGetMethodDetails(args: any) {
    const { methodName, className } = args;
    
    if (!methodName || typeof methodName !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'methodName parameter is required and must be a string');
    }

    const methodDetails = await this.apiDocs.getMethodDetails(methodName, className);
    
    if (!methodDetails) {
      throw new McpError(ErrorCode.InvalidParams, `Method "${methodName}" not found in API documentation`);
    }

    return {
      content: [
        {
          type: 'text',
          text: this.formatMethodDetails(methodDetails),
        },
      ],
    };
  }

  private async handleBrowseNamespace(args: any) {
    const { namespace, includeMembers = false } = args;
    
    if (!namespace || typeof namespace !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'namespace parameter is required and must be a string');
    }

    const namespaceInfo = await this.apiDocs.browseNamespace(namespace, includeMembers);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatNamespaceInfo(namespaceInfo),
        },
      ],
    };
  }

  private async handleGetCodeExamples(args: any) {
    const { element, language = 'csharp' } = args;
    
    if (!element || typeof element !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'element parameter is required and must be a string');
    }

    const examples = await this.apiDocs.getCodeExamples(element, language);
    
    return {
      content: [
        {
          type: 'text',
          text: this.formatCodeExamples(examples),
        },
      ],
    };
  }

  private async handleGetNamespaces() {
    const namespaces = await this.apiDocs.getNamespaces();
    
    return {
      content: [
        {
          type: 'text',
          text: `# Available Tekla Open API Namespaces

${namespaces.map(ns => `- ${ns}`).join('\n')}

Total: ${namespaces.length} namespaces`,
        },
      ],
    };
  }

  private async handleGetStatistics() {
    const stats = await this.apiDocs.getStatistics();
    
    return {
      content: [
        {
          type: 'text',
          text: `# Tekla Open API Documentation Statistics

- **Total Items**: ${stats.totalItems}
- **Classes**: ${stats.classes}
- **Methods**: ${stats.methods}  
- **Properties**: ${stats.properties}
- **Enums**: ${stats.enums}
- **Interfaces**: ${stats.interfaces}
- **Namespaces**: ${stats.namespaces}
- **Examples**: ${stats.examples}
- **Code Snippets**: ${stats.codeSnippets}`,
        },
      ],
    };
  }

  private formatClassDetails(classDetails: any): string {
    let output = `# ${classDetails.name || classDetails.title || 'Unnamed Class'}

**Namespace:** ${classDetails.normalizedNamespace || classDetails.namespace}
**Type:** ${classDetails.type}

## Description
${classDetails.summary || classDetails.description || 'No description available'}

`;

    // Use detailed information from HTML parsing if available
    if (classDetails.detailedInfo) {
      const detailed = classDetails.detailedInfo;

      // Add syntax if available with null safety
      try {
        if (detailed.syntax && typeof detailed.syntax === 'string' && detailed.syntax.trim()) {
          output += `## Syntax
\`\`\`csharp
${detailed.syntax}
\`\`\`

`;
        }
      } catch (error) {
        console.error('Error formatting syntax:', error);
        output += `## Syntax\n*Error formatting syntax information*\n\n`;
      }

      // Add inheritance hierarchy with null safety
      try {
        if (detailed.inheritance &&
            detailed.inheritance.hierarchy &&
            Array.isArray(detailed.inheritance.hierarchy) &&
            detailed.inheritance.hierarchy.length > 0) {
          const validHierarchy = detailed.inheritance.hierarchy.filter((item: any) =>
            item && typeof item === 'string' && item.trim()
          );
          if (validHierarchy.length > 0) {
            output += `## Inheritance Hierarchy
${validHierarchy.join(' → ')}

`;
          }
        }
      } catch (error) {
        console.error('Error formatting inheritance hierarchy:', error);
        output += `## Inheritance Hierarchy\n*Error formatting inheritance information*\n\n`;
      }

      // Add constructors with null safety
      try {
        if (detailed.constructors && Array.isArray(detailed.constructors) && detailed.constructors.length > 0) {
          const validConstructors = detailed.constructors.filter((ctor: any) => ctor && typeof ctor === 'object');
          if (validConstructors.length > 0) {
            output += `## Constructors

| Name | Description |
|------|-------------|
${validConstructors.map((ctor: any) =>
  `| **${ctor.name || 'Unknown'}** | ${ctor.description || 'No description available'} |`
).join('\n')}

`;
          }
        }
      } catch (error) {
        console.error('Error formatting constructors:', error);
        output += `## Constructors\n*Error formatting constructor information*\n\n`;
      }

      // Add properties with inheritance info and null safety
      try {
        if (detailed.properties && Array.isArray(detailed.properties) && detailed.properties.length > 0) {
          const validProperties = detailed.properties.filter((prop: any) => prop && typeof prop === 'object');
          if (validProperties.length > 0) {
            output += `## Properties

| Name | Description | Inherited |
|------|-------------|-----------|
${validProperties.map((prop: any) =>
  `| **${prop.name || 'Unknown'}** | ${prop.description || 'No description available'} | ${prop.inherited ? `Yes (from ${prop.inheritedFrom || 'Unknown'})` : 'No'} |`
).join('\n')}

`;
          }
        }
      } catch (error) {
        console.error('Error formatting properties:', error);
        output += `## Properties\n*Error formatting property information*\n\n`;
      }

      // Add methods with inheritance info and null safety
      try {
        if (detailed.methods && Array.isArray(detailed.methods) && detailed.methods.length > 0) {
          const validMethods = detailed.methods.filter((method: any) => method && typeof method === 'object');
          if (validMethods.length > 0) {
            output += `## Methods

| Name | Description | Inherited |
|------|-------------|-----------|
${validMethods.map((method: any) =>
  `| **${method.name || 'Unknown'}** | ${method.description || 'No description available'} | ${method.inherited ? `Yes (from ${method.inheritedFrom || 'Unknown'})` : 'No'} |`
).join('\n')}

`;
          }
        }
      } catch (error) {
        console.error('Error formatting methods:', error);
        output += `## Methods\n*Error formatting method information*\n\n`;
      }

      // Add examples if available with null safety
      try {
        if (detailed.examples && Array.isArray(detailed.examples) && detailed.examples.length > 0) {
          const validExamples = detailed.examples.filter((example: any) => example);
          if (validExamples.length > 0) {
            output += `## Examples

${validExamples.map((example: any, index: number) =>
`### Example ${index + 1}
\`\`\`csharp
${typeof example === 'string' ? example : JSON.stringify(example, null, 2)}
\`\`\`
`).join('\n')}

`;
          }
        }
      } catch (error) {
        console.error('Error formatting examples:', error);
        output += `## Examples\n*Error formatting example information*\n\n`;
      }
    } else {
      // Fallback to old format if detailed info not available
      if (classDetails.members && classDetails.members.length > 0) {
        const properties = classDetails.members.filter((m: any) => m.type === 'property');
        const methods = classDetails.members.filter((m: any) => m.type === 'method');
        
        if (properties.length > 0) {
          output += `## Properties
${properties.map((prop: any) => `- **${prop.title}**: ${prop.summary || 'No description'}`).join('\n')}

`;
        }
        
        if (methods.length > 0) {
          output += `## Methods
${methods.map((method: any) => `- **${method.title}**: ${method.summary || 'No description'}`).join('\n')}

`;
        }
      }
    }

    return output;
  }

  private formatMethodDetails(methodDetails: any): string {
    return `# ${methodDetails.title}

**Type:** ${methodDetails.type}
**Namespace:** ${methodDetails.namespace}

## Description
${methodDetails.summary || methodDetails.description || 'No description available'}`;
  }

  private formatNamespaceInfo(namespaceInfo: any[]): string {
    if (!namespaceInfo || namespaceInfo.length === 0) {
      return 'No items found in the specified namespace.';
    }

    const classes = namespaceInfo.filter((item: any) => item.type === 'class');
    const interfaces = namespaceInfo.filter((item: any) => item.type === 'interface');
    const enums = namespaceInfo.filter((item: any) => item.type === 'enum');
    const delegates = namespaceInfo.filter((item: any) => item.type === 'delegate');

    let output = `# Namespace Contents

`;

    if (classes.length > 0) {
      output += `## Classes (${classes.length})
${classes.map((cls: any) => `- **${cls.title}**: ${cls.summary || 'No description'}`).join('\n')}

`;
    }

    if (interfaces.length > 0) {
      output += `## Interfaces (${interfaces.length})
${interfaces.map((iface: any) => `- **${iface.title}**: ${iface.summary || 'No description'}`).join('\n')}

`;
    }

    if (enums.length > 0) {
      output += `## Enums (${enums.length})
${enums.map((enm: any) => `- **${enm.title}**: ${enm.summary || 'No description'}`).join('\n')}

`;
    }

    if (delegates.length > 0) {
      output += `## Delegates (${delegates.length})
${delegates.map((del: any) => `- **${del.title}**: ${del.summary || 'No description'}`).join('\n')}

`;
    }

    return output;
  }

  private formatCodeExamples(examples: any[]): string {
    if (!examples || examples.length === 0) {
      return 'No code examples found for the specified element.';
    }

    return `# Code Examples

${examples.map((example: any) => {
      if (example.type === 'overview') {
        return `## ${example.title}\n${example.description}`;
      } else {
        return `## ${example.title}
${example.description ? `${example.description}\n` : ''}
\`\`\`${example.language || 'csharp'}
${example.code}
\`\`\``;
      }
    }).join('\n\n')}`;
  }

  private async handleSearchExamples(args: any) {
    const { query, limit = 10 } = args;
    
    if (!query || typeof query !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Query parameter is required and must be a string');
    }

    const examples = await this.apiDocs.searchExamples(query, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${examples.length} examples for "${query}":

${examples.map(example => 
  `**${example.name}** (${example.category})
  ${example.description.substring(0, 200)}${example.description.length > 200 ? '...' : ''}
  API Elements: ${example.apiElements.join(', ')}
  Code Snippets: ${example.codeSnippets.length}
  
`).join('')}`,
        },
      ],
    };
  }

  private async handleGetExampleDetails(args: any) {
    const { exampleName } = args;
    
    if (!exampleName || typeof exampleName !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'exampleName parameter is required and must be a string');
    }

    const example = await this.apiDocs.getExampleDetails(exampleName);
    
    if (!example) {
      throw new McpError(ErrorCode.InvalidParams, `Example "${exampleName}" not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `# ${example.name} Example

**Category:** ${example.category}

## Description
${example.description}

## API Elements Used
${example.apiElements.map(el => `- ${el}`).join('\n')}

## Files
${example.files.map(file => `- ${file}`).join('\n')}

## Code Snippets
${example.codeSnippets.map((snippet, index) => `
### ${index + 1}. ${snippet.title}
${snippet.description}

\`\`\`${snippet.language}
${snippet.code}
\`\`\`
`).join('\n')}`,
        },
      ],
    };
  }

  private async handleGetExamplesByCategory(args: any) {
    const { category } = args;
    
    const examples = await this.apiDocs.getExamplesByCategory(category);
    
    return {
      content: [
        {
          type: 'text',
          text: `# Examples${category ? ` in ${category}` : ''}

Found ${examples.length} examples:

${examples.map(example => 
  `**${example.name}**
  Category: ${example.category}
  ${example.description.substring(0, 150)}${example.description.length > 150 ? '...' : ''}
  API Elements: ${example.apiElements.slice(0, 3).join(', ')}${example.apiElements.length > 3 ? '...' : ''}
  
`).join('')}`,
        },
      ],
    };
  }

  private async handleGetExampleCategories() {
    const categories = await this.apiDocs.getExampleCategories();
    
    return {
      content: [
        {
          type: 'text',
          text: `# Available Example Categories

${categories.map(category => `- ${category}`).join('\n')}

Total: ${categories.length} categories`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tekla Open API MCP Server running on stdio');
  }
}

const server = new TeklaApiMcpServer();
server.run().catch(console.error);