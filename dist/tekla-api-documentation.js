import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';
import { OnlineApiFallback } from './online-api-fallback.js';
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
    onlineFallback;
    constructor() {
        this.loadApiData();
        this.onlineFallback = new OnlineApiFallback();
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
                        { name: 'name', weight: 0.4 },
                        { name: 'namespace', weight: 0.3 },
                        { name: 'summary', weight: 0.2 },
                        { name: 'id', weight: 0.1 }
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
            console.error('Search index not available, attempting online fallback');
            const onlineResults = await this.onlineFallback.searchOnline(query, type, limit);
            return this.convertOnlineResults(onlineResults);
        }
        try {
            const results = this.searchIndex.search(query);
            let filteredResults = results.map(result => {
                const item = result.item;
                // Find the corresponding item in full API data to get correct namespace
                const fullItem = this.apiData.find(apiItem => apiItem.id === item.id || apiItem.name === item.name);
                return {
                    ...item,
                    normalizedNamespace: fullItem?.normalizedNamespace || item.namespace || ''
                };
            });
            // Filter by type if specified
            if (type !== 'all') {
                filteredResults = filteredResults.filter(item => item.type === type);
            }
            const localResults = filteredResults.slice(0, limit);
            // Check if we should use online fallback
            if (this.onlineFallback.shouldUseFallback(localResults, query)) {
                console.log(`[Fallback] Local results insufficient for "${query}", trying online fallback`);
                const onlineResults = await this.onlineFallback.searchOnline(query, type, limit);
                // Combine and deduplicate results
                const combinedResults = [...localResults];
                const existingTitles = new Set(localResults.map(r => r.title.toLowerCase()));
                for (const onlineResult of this.convertOnlineResults(onlineResults)) {
                    if (!existingTitles.has(onlineResult.title.toLowerCase()) && combinedResults.length < limit) {
                        combinedResults.push(onlineResult);
                        existingTitles.add(onlineResult.title.toLowerCase());
                    }
                }
                return combinedResults;
            }
            return localResults;
        }
        catch (error) {
            console.error('Search error:', error);
            // Fallback to online search on error
            console.log(`[Fallback] Search error, trying online fallback for "${query}"`);
            const onlineResults = await this.onlineFallback.searchOnline(query, type, limit);
            return this.convertOnlineResults(onlineResults);
        }
    }
    convertOnlineResults(onlineResults) {
        return onlineResults.map(result => ({
            id: result.title,
            title: result.title,
            name: result.title, // Use title as name for consistency
            type: result.type,
            namespace: result.namespace,
            normalizedNamespace: result.namespace,
            summary: result.description,
            description: result.description,
            htmlFile: result.url // Use URL as htmlFile for online results
        }));
    }
    async getClassDetails(className, includeMembers = true) {
        try {
            // Find the class - prioritize exact matches first
            let classItem = this.classes.find(item => item.name.toLowerCase() === `${className.toLowerCase()} class` ||
                item.name.toLowerCase() === className.toLowerCase() ||
                item.id.toLowerCase() === `${className.toLowerCase()} class`);
            // If no exact match, look for exact word matches (not just contains)
            if (!classItem) {
                classItem = this.classes.find(item => {
                    const name = item.name.toLowerCase();
                    const id = item.id.toLowerCase();
                    const searchTerm = className.toLowerCase();
                    // Check for "Beam Class" when searching for "Beam"
                    return name === `${searchTerm} class` ||
                        id === `${searchTerm} class` ||
                        name.startsWith(`${searchTerm} `) ||
                        name.endsWith(` ${searchTerm}`) ||
                        // Only match if it's a word boundary to avoid "AnalysisCompositeBeam" matching "Beam"
                        (name.includes(` ${searchTerm} `) || name.includes(` ${searchTerm}class`));
                });
            }
            // If still no match, try broader search as last resort
            if (!classItem) {
                classItem = this.classes.find(item => item.name.toLowerCase().includes(className.toLowerCase()) ||
                    item.id.toLowerCase().includes(className.toLowerCase()));
            }
            if (!classItem) {
                // Try online fallback
                console.log(`[Fallback] Class "${className}" not found locally, trying online fallback`);
                const onlineResult = await this.onlineFallback.getClassDetailsOnline(className);
                if (onlineResult) {
                    return {
                        id: onlineResult.title,
                        name: onlineResult.title,
                        description: onlineResult.description,
                        summary: onlineResult.description,
                        namespace: onlineResult.namespace,
                        normalizedNamespace: onlineResult.namespace,
                        type: onlineResult.type,
                        level: 0,
                        htmlFile: onlineResult.url
                    };
                }
                return null;
            }
            // Check if local result has poor quality
            const hasPoorQuality = !classItem.namespace ||
                classItem.namespace === 'N/A' ||
                (classItem.summary && classItem.summary.includes('Copyright ©'));
            if (hasPoorQuality) {
                console.log(`[Fallback] Local class details for "${className}" have poor quality, trying online fallback`);
                const onlineResult = await this.onlineFallback.getClassDetailsOnline(className);
                if (onlineResult) {
                    // Use online result but keep local members if available
                    const classMembers = includeMembers ? this.apiData.filter(item => item.namespace === classItem.namespace &&
                        (item.type === 'method' || item.type === 'property') &&
                        item.name.toLowerCase().includes(className.toLowerCase())) : [];
                    return {
                        title: onlineResult.title,
                        description: onlineResult.description,
                        summary: onlineResult.description,
                        namespace: onlineResult.namespace,
                        type: onlineResult.type,
                        level: classItem.level,
                        htmlFile: onlineResult.url,
                        members: classMembers
                    };
                }
            }
            if (!includeMembers) {
                return classItem;
            }
            // Find related members (methods, properties) if available
            const classMembers = this.apiData.filter(item => item.namespace === classItem.namespace &&
                (item.type === 'method' || item.type === 'property') &&
                item.name.toLowerCase().includes(className.toLowerCase()));
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
                const nameMatch = item.name.toLowerCase().includes(methodName.toLowerCase());
                const classMatch = !className || item.name.toLowerCase().includes(className.toLowerCase());
                return nameMatch && classMatch;
            });
            if (!methodItem) {
                // Fallback: search in all API data
                methodItem = this.apiData.find(item => item.type === 'method' &&
                    item.name.toLowerCase().includes(methodName.toLowerCase()) &&
                    (!className || item.name.toLowerCase().includes(className.toLowerCase())));
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
