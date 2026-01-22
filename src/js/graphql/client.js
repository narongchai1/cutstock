import { CONFIG } from '../core/config.js';

export class GraphQLClient {
    constructor() {
        this.endpoint = CONFIG.GRAPHQL.ENDPOINT;
        this.wsEndpoint = CONFIG.GRAPHQL.WS_ENDPOINT;
        this.cache = new Map();
        this.subscriptions = new Map();
    }

    async query(query, variables = {}, options = {}) {
        return await this.execute(query, variables, false, options);
    }

    async mutate(mutation, variables = {}, options = {}) {
        return await this.execute(mutation, variables, true, options);
    }

    async execute(operation, variables = {}, isMutation = false, options = {}) {
        const cacheKey = this.generateCacheKey(operation, variables);
        
        // Check cache for non-mutation operations
        if (!isMutation && options.cache !== false && this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const headers = {
                'Content-Type': 'application/json',
            };

            // Add authorization if token exists
            const token = localStorage.getItem('graphql_token') || sessionStorage.getItem('graphql_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    query: operation,
                    variables,
                }),
                signal: AbortSignal.timeout(options.timeout || 10000)
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            // Cache result for non-mutation operations
            if (!isMutation && options.cache !== false) {
                this.cache.set(cacheKey, result.data);
                // Auto-clear cache after TTL (default: 5 minutes)
                if (options.ttl !== 0) {
                    setTimeout(() => {
                        this.cache.delete(cacheKey);
                    }, options.ttl || 300000);
                }
            }

            // Invalidate related cache if specified
            if (options.invalidate) {
                this.invalidateCache(options.invalidate);
            }

            return result.data;
        } catch (error) {
            console.error('GraphQL execution failed:', error);
            
            // Fallback to local storage if offline
            if (!navigator.onLine && options.fallback) {
                return this.getFromLocalStorage(cacheKey) || null;
            }
            
            throw error;
        }
    }

    generateCacheKey(query, variables) {
        return btoa(JSON.stringify({ query, variables }));
    }

    invalidateCache(pattern) {
        for (const [key] of this.cache) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    setToken(token, persist = true) {
        if (persist) {
            localStorage.setItem('graphql_token', token);
        } else {
            sessionStorage.setItem('graphql_token', token);
        }
    }

    clearToken() {
        localStorage.removeItem('graphql_token');
        sessionStorage.removeItem('graphql_token');
    }

    // Local storage fallback methods
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`graphql_cache_${key}`, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    getFromLocalStorage(key) {
        try {
            const cached = localStorage.getItem(`graphql_cache_${key}`);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                // Check if cache is still valid (default: 1 hour)
                if (Date.now() - timestamp < 3600000) {
                    return data;
                }
            }
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
        }
        return null;
    }

    // WebSocket subscriptions (สำหรับ real-time updates)
    subscribe(subscription, variables = {}, callback) {
        if (!this.wsEndpoint) {
            throw new Error('WebSocket endpoint not configured');
        }

        const ws = new WebSocket(this.wsEndpoint);
        const subscriptionId = Date.now().toString();

        ws.onopen = () => {
            const payload = {
                type: 'start',
                id: subscriptionId,
                payload: {
                    query: subscription,
                    variables
                }
            };
            ws.send(JSON.stringify(payload));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'data' && data.id === subscriptionId) {
                callback(data.payload);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            callback({ error: 'Connection failed' });
        };

        this.subscriptions.set(subscriptionId, ws);
        return subscriptionId;
    }

    unsubscribe(subscriptionId) {
        const ws = this.subscriptions.get(subscriptionId);
        if (ws) {
            ws.close();
            this.subscriptions.delete(subscriptionId);
        }
    }
}

// Singleton instance
export const graphqlClient = new GraphQLClient();