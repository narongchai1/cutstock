// Application Configuration
export const CONFIG = {
    // App Info
    APP: {
        NAME: 'Product Management System',
        VERSION: '2.0.0',
        DESCRIPTION: 'ระบบจัดการสินค้าและสต็อก',
        COMPANY: 'Your Company Name',
        COPYRIGHT: '© 2024 All Rights Reserved'
    },

    // GraphQL Configuration
    GRAPHQL: {
        ENDPOINT: process.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
        WS_ENDPOINT: process.env.VITE_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql',
        RETRY_ATTEMPTS: 3,
        TIMEOUT: 10000,
        CACHE_TTL: 300000, // 5 minutes
        BATCH_SIZE: 50,
        AUTO_RECONNECT: true,
        RECONNECT_DELAY: 3000
    },

    // Local Storage Configuration
    STORAGE: {
        PREFIX: 'pms_',
        VERSION: '1.0',
        ENCRYPTION_KEY: process.env.VITE_STORAGE_KEY || 'default-secret-key',
        BACKUP_INTERVAL: 3600000, // 1 hour
        MAX_BACKUPS: 10
    },

    // Sync Configuration
    SYNC: {
        ENABLED: true,
        AUTO_SYNC: true,
        SYNC_INTERVAL: 300000, // 5 minutes
        BATCH_SIZE: 20,
        RETRY_DELAY: 5000,
        MAX_RETRIES: 3,
        CONFLICT_RESOLUTION: 'server' // 'server', 'client', 'newer'
    },

    // Feature Flags
    FEATURES: {
        OFFLINE_MODE: true,
        REALTIME_UPDATES: true,
        PUSH_NOTIFICATIONS: true,
        FILE_UPLOAD: true,
        EXPORT_DATA: true,
        MULTI_LANGUAGE: false,
        DARK_MODE: true
    },

    // UI Configuration
    UI: {
        THEME: 'light', // 'light', 'dark', 'auto'
        LANGUAGE: 'th',
        DATE_FORMAT: 'DD/MM/YYYY',
        TIME_FORMAT: 'HH:mm',
        CURRENCY: 'THB',
        DECIMAL_PLACES: 2,
        PAGE_SIZE: 20,
        ANIMATION_ENABLED: true,
        TOAST_DURATION: 3000
    },

    // Security Configuration
    SECURITY: {
        SESSION_TIMEOUT: 1800000, // 30 minutes
        AUTO_LOGOUT: true,
        PASSWORD_MIN_LENGTH: 6,
        PASSWORD_REQUIREMENTS: {
            UPPERCASE: true,
            LOWERCASE: true,
            NUMBERS: true,
            SPECIAL: false
        },
        ENCRYPT_LOCAL_DATA: true,
        ALLOW_REMEMBER_ME: true
    },

    // API Configuration (สำหรับ REST fallback)
    API: {
        BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
        VERSION: 'v1',
        TIMEOUT: 15000,
        RETRY_ATTEMPTS: 2,
        CACHE_ENABLED: true
    },

    // Database Configuration (สำหรับ IndexedDB)
    DATABASE: {
        NAME: 'product_db',
        VERSION: 2,
        STORES: {
            PRODUCTS: 'products',
            USERS: 'users',
            STOCK_MOVEMENTS: 'stock_movements',
            SYNC_QUEUE: 'sync_queue',
            SETTINGS: 'settings',
            CACHE: 'cache',
            LOGS: 'logs'
        },
        MIGRATIONS: [
            {
                version: 1,
                stores: ['products', 'users']
            },
            {
                version: 2,
                stores: ['products', 'users', 'stock_movements', 'sync_queue', 'settings']
            }
        ]
    },

    // Notification Configuration
    NOTIFICATIONS: {
        ENABLED: true,
        PERMISSION_REQUEST: true,
        LOW_STOCK_ALERT: true,
        SYNC_COMPLETE: true,
        ERROR_ALERT: true,
        SOUND_ENABLED: false,
        VIBRATION_ENABLED: false
    },

    // Export Configuration
    EXPORT: {
        FORMATS: ['csv', 'excel', 'pdf', 'json'],
        MAX_ROWS: 10000,
        INCLUDE_IMAGES: false,
        COMPRESS: true
    },

    // Upload Configuration
    UPLOAD: {
        MAX_FILE_SIZE: 10485760, // 10MB
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        MAX_FILES: 5,
        COMPRESS_IMAGES: true,
        QUALITY: 0.8
    },

    // Performance Configuration
    PERFORMANCE: {
        LAZY_LOADING: true,
        VIRTUAL_SCROLLING: true,
        DEBOUNCE_DELAY: 300,
        THROTTLE_DELAY: 100,
        CACHE_IMAGES: true,
        PRELOAD_DATA: true
    },

    // Analytics Configuration
    ANALYTICS: {
        ENABLED: true,
        PROVIDER: 'custom', // 'google', 'mixpanel', 'custom'
        TRACK_EVENTS: true,
        TRACK_ERRORS: true,
        TRACK_PERFORMANCE: true,
        ANONYMIZE_IP: true
    },

    // Development Configuration
    DEVELOPMENT: {
        DEBUG: process.env.NODE_ENV !== 'production',
        LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
        SHOW_DEV_TOOLS: process.env.NODE_ENV !== 'production',
        MOCK_API: false,
        PROFILING: false
    }
};

// Environment-specific overrides
const environment = process.env.NODE_ENV || 'development';

const environmentConfigs = {
    development: {
        GRAPHQL: {
            ENDPOINT: 'http://localhost:4000/graphql',
            WS_ENDPOINT: 'ws://localhost:4000/graphql'
        },
        DEVELOPMENT: {
            DEBUG: true,
            LOG_LEVEL: 'debug'
        }
    },
    production: {
        GRAPHQL: {
            ENDPOINT: 'https://api.yourdomain.com/graphql',
            WS_ENDPOINT: 'wss://api.yourdomain.com/graphql'
        },
        DEVELOPMENT: {
            DEBUG: false,
            LOG_LEVEL: 'error'
        }
    },
    staging: {
        GRAPHQL: {
            ENDPOINT: 'https://staging-api.yourdomain.com/graphql',
            WS_ENDPOINT: 'wss://staging-api.yourdomain.com/graphql'
        }
    }
};

// Merge environment config
const envConfig = environmentConfigs[environment] || {};
Object.keys(envConfig).forEach(key => {
    if (CONFIG[key]) {
        CONFIG[key] = { ...CONFIG[key], ...envConfig[key] };
    }
});

// Export configuration
export default CONFIG;

// Helper function to get config value with fallback
export function getConfig(path, defaultValue = null) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
}

// Helper function to update config (runtime changes)
export function updateConfig(path, value) {
    const keys = path.split('.');
    let config = CONFIG;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in config)) {
            config[keys[i]] = {};
        }
        config = config[keys[i]];
    }
    
    config[keys[keys.length - 1]] = value;
    return true;
}