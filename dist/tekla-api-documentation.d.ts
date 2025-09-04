interface ApiItem {
    id: string;
    name: string;
    description: string;
    summary: string;
    namespace: string;
    normalizedNamespace: string;
    type: string;
    level: number;
    htmlFile: string;
}
interface SearchResult {
    id: string;
    title: string;
    name: string;
    type: string;
    namespace: string;
    normalizedNamespace?: string;
    summary: string;
    description?: string;
    htmlFile?: string;
}
interface CodeExample {
    name: string;
    category: string;
    path: string;
    description: string;
    files: string[];
    codeSnippets: Array<{
        title: string;
        code: string;
        language: string;
        description: string;
    }>;
    apiElements: string[];
}
export declare class TeklaApiDocumentation {
    private apiData;
    private searchIndex;
    private classes;
    private methods;
    private properties;
    private namespaces;
    private enums;
    private interfaces;
    private examples;
    private onlineFallback;
    constructor();
    private loadApiData;
    private loadTypeSpecificData;
    private loadExamples;
    search(query: string, type?: string, limit?: number): Promise<SearchResult[]>;
    private convertOnlineResults;
    getClassDetails(className: string, includeMembers?: boolean): Promise<ApiItem | null>;
    getMethodDetails(methodName: string, className?: string): Promise<ApiItem | null>;
    browseNamespace(namespace: string, includeMembers?: boolean): Promise<ApiItem[]>;
    getCodeExamples(element: string, language?: string): Promise<any[]>;
    getNamespaces(): Promise<string[]>;
    getStatistics(): Promise<{
        totalItems: number;
        classes: number;
        methods: number;
        properties: number;
        namespaces: number;
        enums: number;
        interfaces: number;
        examples: number;
        codeSnippets: number;
    }>;
    getRandomExamples(count?: number): Promise<ApiItem[]>;
    searchExamples(query: string, limit?: number): Promise<CodeExample[]>;
    getExamplesByCategory(category?: string): Promise<CodeExample[]>;
    getExampleDetails(exampleName: string): Promise<CodeExample | null>;
    getExampleCategories(): Promise<string[]>;
}
export {};
