#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { TeklaApiDocumentation } from './tekla-api-documentation.js';
class TeklaApiMcpServer {
    server;
    apiDocs;
    constructor() {
        this.server = new Server({
            name: 'tekla-api-mcp',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.apiDocs = new TeklaApiDocumentation();
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
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
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
            }
        });
    }
    async handleSearchApi(args) {
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

${results.map(result => `**${result.title}** (${result.type})
  ${result.summary || result.description || 'No description available'}
  Namespace: ${result.namespace || 'N/A'}
  
`).join('')}`,
                },
            ],
        };
    }
    async handleGetClassDetails(args) {
        const { className, includeMembers = true } = args;
        if (!className || typeof className !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'className parameter is required and must be a string');
        }
        const classDetails = await this.apiDocs.getClassDetails(className, includeMembers);
        if (!classDetails) {
            throw new McpError(ErrorCode.InvalidParams, `Class "${className}" not found in API documentation`);
        }
        return {
            content: [
                {
                    type: 'text',
                    text: this.formatClassDetails(classDetails),
                },
            ],
        };
    }
    async handleGetMethodDetails(args) {
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
    async handleBrowseNamespace(args) {
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
    async handleGetCodeExamples(args) {
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
    async handleGetNamespaces() {
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
    async handleGetStatistics() {
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
    formatClassDetails(classDetails) {
        let output = `# ${classDetails.title}

**Namespace:** ${classDetails.namespace}
**Type:** ${classDetails.type}

## Description
${classDetails.summary || classDetails.description || 'No description available'}

`;
        if (classDetails.members && classDetails.members.length > 0) {
            const properties = classDetails.members.filter((m) => m.type === 'property');
            const methods = classDetails.members.filter((m) => m.type === 'method');
            if (properties.length > 0) {
                output += `## Properties
${properties.map((prop) => `- **${prop.title}**: ${prop.summary || 'No description'}`).join('\n')}

`;
            }
            if (methods.length > 0) {
                output += `## Methods
${methods.map((method) => `- **${method.title}**: ${method.summary || 'No description'}`).join('\n')}

`;
            }
        }
        return output;
    }
    formatMethodDetails(methodDetails) {
        return `# ${methodDetails.title}

**Type:** ${methodDetails.type}
**Namespace:** ${methodDetails.namespace}

## Description
${methodDetails.summary || methodDetails.description || 'No description available'}`;
    }
    formatNamespaceInfo(namespaceInfo) {
        if (!namespaceInfo || namespaceInfo.length === 0) {
            return 'No items found in the specified namespace.';
        }
        const classes = namespaceInfo.filter((item) => item.type === 'class');
        const interfaces = namespaceInfo.filter((item) => item.type === 'interface');
        const enums = namespaceInfo.filter((item) => item.type === 'enum');
        const delegates = namespaceInfo.filter((item) => item.type === 'delegate');
        let output = `# Namespace Contents

`;
        if (classes.length > 0) {
            output += `## Classes (${classes.length})
${classes.map((cls) => `- **${cls.title}**: ${cls.summary || 'No description'}`).join('\n')}

`;
        }
        if (interfaces.length > 0) {
            output += `## Interfaces (${interfaces.length})
${interfaces.map((iface) => `- **${iface.title}**: ${iface.summary || 'No description'}`).join('\n')}

`;
        }
        if (enums.length > 0) {
            output += `## Enums (${enums.length})
${enums.map((enm) => `- **${enm.title}**: ${enm.summary || 'No description'}`).join('\n')}

`;
        }
        if (delegates.length > 0) {
            output += `## Delegates (${delegates.length})
${delegates.map((del) => `- **${del.title}**: ${del.summary || 'No description'}`).join('\n')}

`;
        }
        return output;
    }
    formatCodeExamples(examples) {
        if (!examples || examples.length === 0) {
            return 'No code examples found for the specified element.';
        }
        return `# Code Examples

${examples.map((example) => {
            if (example.type === 'overview') {
                return `## ${example.title}\n${example.description}`;
            }
            else {
                return `## ${example.title}
${example.description ? `${example.description}\n` : ''}
\`\`\`${example.language || 'csharp'}
${example.code}
\`\`\``;
            }
        }).join('\n\n')}`;
    }
    async handleSearchExamples(args) {
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

${examples.map(example => `**${example.name}** (${example.category})
  ${example.description.substring(0, 200)}${example.description.length > 200 ? '...' : ''}
  API Elements: ${example.apiElements.join(', ')}
  Code Snippets: ${example.codeSnippets.length}
  
`).join('')}`,
                },
            ],
        };
    }
    async handleGetExampleDetails(args) {
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
    async handleGetExamplesByCategory(args) {
        const { category } = args;
        const examples = await this.apiDocs.getExamplesByCategory(category);
        return {
            content: [
                {
                    type: 'text',
                    text: `# Examples${category ? ` in ${category}` : ''}

Found ${examples.length} examples:

${examples.map(example => `**${example.name}**
  Category: ${example.category}
  ${example.description.substring(0, 150)}${example.description.length > 150 ? '...' : ''}
  API Elements: ${example.apiElements.slice(0, 3).join(', ')}${example.apiElements.length > 3 ? '...' : ''}
  
`).join('')}`,
                },
            ],
        };
    }
    async handleGetExampleCategories() {
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
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Tekla Open API MCP Server running on stdio');
    }
}
const server = new TeklaApiMcpServer();
server.run().catch(console.error);
