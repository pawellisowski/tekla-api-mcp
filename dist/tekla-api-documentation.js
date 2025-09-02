import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';
export class TeklaApiDocumentation {
    apiData = [];
    searchIndex = null;
    classes = [];
    methods = [];
    properties = [];
    namespaces = [];
    enums = [];
    interfaces = [];
    examples = [];
    constructor() {
        this.loadApiData();
    }
    loadApiData() {
        try {
            const parsedApiDir = path.join(process.cwd(), 'parsed-api');
            // Load main API data
            const fullApiPath = path.join(parsedApiDir, 'full-api.json');
            if (fs.existsSync(fullApiPath)) {
                this.apiData = JSON.parse(fs.readFileSync(fullApiPath, 'utf-8'));
            }
            // Load search index
            const searchIndexPath = path.join(parsedApiDir, 'search-index.json');
            if (fs.existsSync(searchIndexPath)) {
                const searchData = JSON.parse(fs.readFileSync(searchIndexPath, 'utf-8'));
                // Initialize Fuse.js for fuzzy search
                this.searchIndex = new Fuse(searchData, {
                    keys: [
                        { name: 'title', weight: 0.4 },
                        { name: 'namespace', weight: 0.3 },
                        { name: 'summary', weight: 0.2 },
                        { name: 'description', weight: 0.1 }
                    ],
                    threshold: 0.4, // Adjust for search sensitivity
                    includeScore: true,
                    minMatchCharLength: 2
                });
            }
            // Load type-specific data
            this.loadTypeSpecificData(parsedApiDir);
            // Load examples
            this.loadExamples(parsedApiDir);
            console.error(`Loaded ${this.apiData.length} API items and ${this.examples.length} examples for Tekla Open API`);
        }
        catch (error) {
            console.error('Error loading API data:', error);
        }
    }
    loadTypeSpecificData(parsedApiDir) {
        const typeFiles = [
            { file: 'classes.json', property: 'classes' },
            { file: 'methods.json', property: 'methods' },
            { file: 'properties.json', property: 'properties' },
            { file: 'namespaces.json', property: 'namespaces' },
            { file: 'enums.json', property: 'enums' },
            { file: 'interfaces.json', property: 'interfaces' }
        ];
        for (const { file, property } of typeFiles) {
            const filePath = path.join(parsedApiDir, file);
            if (fs.existsSync(filePath)) {
                try {
                    this[property] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                }
                catch (error) {
                    console.error(`Error loading ${file}:`, error);
                    this[property] = [];
                }
            }
        }
    }
    loadExamples(parsedApiDir) {
        const examplesPath = path.join(parsedApiDir, 'examples.json');
        if (fs.existsSync(examplesPath)) {
            try {
                this.examples = JSON.parse(fs.readFileSync(examplesPath, 'utf-8'));
                console.error(`Loaded ${this.examples.length} code examples`);
            }
            catch (error) {
                console.error('Error loading examples:', error);
                this.examples = [];
            }
        }
    }
    async search(query, type = 'all', limit = 10) {
        if (!this.searchIndex) {
            return [];
        }
        try {
            const results = this.searchIndex.search(query);
            let filteredResults = results.map(result => result.item);
            // Filter by type if specified
            if (type !== 'all') {
                filteredResults = filteredResults.filter(item => item.type === type);
            }
            return filteredResults.slice(0, limit);
        }
        catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    async getClassDetails(className, includeMembers = true) {
        try {
            // Find the class
            const classItem = this.classes.find(item => item.title.toLowerCase().includes(className.toLowerCase()) ||
                item.title.endsWith(` ${className}`));
            if (!classItem) {
                return null;
            }
            if (!includeMembers) {
                return classItem;
            }
            // Find related members (methods, properties) if available
            const classMembers = this.apiData.filter(item => item.namespace === classItem.namespace &&
                (item.type === 'method' || item.type === 'property') &&
                item.title.toLowerCase().includes(className.toLowerCase()));
            return {
                ...classItem,
                members: classMembers
            };
        }
        catch (error) {
            console.error('Error getting class details:', error);
            return null;
        }
    }
    async getMethodDetails(methodName, className) {
        try {
            let methodItem = this.methods.find(item => {
                const titleMatch = item.title.toLowerCase().includes(methodName.toLowerCase());
                const classMatch = !className || item.title.toLowerCase().includes(className.toLowerCase());
                return titleMatch && classMatch;
            });
            if (!methodItem) {
                // Fallback: search in all API data
                methodItem = this.apiData.find(item => item.type === 'method' &&
                    item.title.toLowerCase().includes(methodName.toLowerCase()) &&
                    (!className || item.title.toLowerCase().includes(className.toLowerCase())));
            }
            return methodItem || null;
        }
        catch (error) {
            console.error('Error getting method details:', error);
            return null;
        }
    }
    async browseNamespace(namespace, includeMembers = false) {
        try {
            const namespaceItems = this.apiData.filter(item => item.namespace &&
                item.namespace.toLowerCase().startsWith(namespace.toLowerCase()));
            if (!includeMembers) {
                // Return only top-level items (classes, interfaces, enums)
                return namespaceItems.filter(item => ['class', 'interface', 'enum', 'delegate'].includes(item.type));
            }
            return namespaceItems;
        }
        catch (error) {
            console.error('Error browsing namespace:', error);
            return [];
        }
    }
    async getCodeExamples(element, language = 'csharp') {
        try {
            // Search for examples that use the specified element
            const matchingExamples = this.examples.filter(example => example.name.toLowerCase().includes(element.toLowerCase()) ||
                example.apiElements.some(apiEl => apiEl.toLowerCase().includes(element.toLowerCase())) ||
                example.description.toLowerCase().includes(element.toLowerCase()));
            // Return code snippets from matching examples
            const codeExamples = [];
            for (const example of matchingExamples.slice(0, 5)) { // Limit to 5 examples
                // Add example overview
                codeExamples.push({
                    title: `${example.name} Example`,
                    description: `${example.description}\n\nCategory: ${example.category}\nAPI Elements: ${example.apiElements.join(', ')}`,
                    code: '', // No code for overview
                    language: 'text',
                    type: 'overview'
                });
                // Add code snippets from this example
                for (const snippet of example.codeSnippets.slice(0, 3)) { // Limit snippets
                    if (language === 'all' || snippet.language === language) {
                        codeExamples.push({
                            title: snippet.title,
                            description: snippet.description,
                            code: snippet.code,
                            language: snippet.language,
                            type: 'snippet',
                            example: example.name
                        });
                    }
                }
            }
            return codeExamples;
        }
        catch (error) {
            console.error('Error getting code examples:', error);
            return [];
        }
    }
    // Additional utility methods specific to Tekla API
    async getNamespaces() {
        const uniqueNamespaces = new Set(this.apiData
            .map(item => item.namespace)
            .filter(ns => ns && ns.startsWith('Tekla.')));
        return Array.from(uniqueNamespaces).sort();
    }
    async getStatistics() {
        return {
            totalItems: this.apiData.length,
            classes: this.classes.length,
            methods: this.methods.length,
            properties: this.properties.length,
            namespaces: this.namespaces.length,
            enums: this.enums.length,
            interfaces: this.interfaces.length,
            examples: this.examples.length,
            codeSnippets: this.examples.reduce((total, ex) => total + ex.codeSnippets.length, 0)
        };
    }
    async getRandomExamples(count = 5) {
        const shuffled = [...this.apiData].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    // New methods for code examples
    async searchExamples(query, limit = 10) {
        const queryLower = query.toLowerCase();
        return this.examples
            .filter(example => example.name.toLowerCase().includes(queryLower) ||
            example.description.toLowerCase().includes(queryLower) ||
            example.category.toLowerCase().includes(queryLower) ||
            example.apiElements.some(el => el.toLowerCase().includes(queryLower)))
            .slice(0, limit);
    }
    async getExamplesByCategory(category) {
        if (!category) {
            return this.examples;
        }
        return this.examples.filter(example => example.category.toLowerCase().includes(category.toLowerCase()));
    }
    async getExampleDetails(exampleName) {
        return this.examples.find(example => example.name.toLowerCase() === exampleName.toLowerCase()) || null;
    }
    async getExampleCategories() {
        const categories = new Set(this.examples.map(ex => ex.category));
        return Array.from(categories).sort();
    }
}
