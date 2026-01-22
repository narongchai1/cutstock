// Product Queries
export const productQueries = {
    GET_PRODUCTS: `
        query GetProducts(
            $search: String
            $category: String
            $lowStock: Boolean
            $outOfStock: Boolean
            $limit: Int = 20
            $offset: Int = 0
            $sortBy: String = "created"
            $sortOrder: String = "DESC"
        ) {
            products(
                search: $search
                category: $category
                lowStock: $lowStock
                outOfStock: $outOfStock
                limit: $limit
                offset: $offset
                sortBy: $sortBy
                sortOrder: $sortOrder
            ) {
                id
                barcode
                name
                price
                cost
                stock
                category
                subcategory
                status
                created
                updated
                synced
            }
        }
    `,

    GET_PRODUCT_BY_ID: `
        query GetProduct($id: ID!) {
            product(id: $id) {
                id
                barcode
                name
                price
                cost
                stock
                category
                subcategory
                status
                created
                updated
                synced
            }
        }
    `,

    GET_PRODUCT_BY_BARCODE: `
        query GetProductByBarcode($barcode: String!) {
            productByBarcode(barcode: $barcode) {
                id
                barcode
                name
                price
                cost
                stock
                category
                subcategory
                status
                created
                updated
                synced
            }
        }
    `,

    GET_LOW_STOCK_PRODUCTS: `
        query GetLowStockProducts($threshold: Int = 10) {
            lowStockProducts(threshold: $threshold) {
                id
                barcode
                name
                price
                stock
                category
                status
                created
                updated
            }
        }
    `,

    GET_PRODUCT_CATEGORIES: `
        query GetProductCategories {
            productCategories {
                category
                subcategories
                count
            }
        }
    `,

    GET_PRODUCT_STATS: `
        query GetProductStats {
            productStats {
                totalProducts
                totalValue
                averagePrice
                averageStock
                categoryDistribution {
                    category
                    count
                    percentage
                }
            }
        }
    `
};

// Stock Queries
export const stockQueries = {
    GET_STOCK_MOVEMENTS: `
        query GetStockMovements(
            $productId: ID
            $startDate: String
            $endDate: String
            $limit: Int = 50
            $offset: Int = 0
        ) {
            stockMovements(
                productId: $productId
                startDate: $startDate
                endDate: $endDate
                limit: $limit
                offset: $offset
            ) {
                id
                productId
                productName
                type
                quantity
                previousStock
                newStock
                reference
                notes
                userId
                userName
                created
            }
        }
    `,

    GET_STOCK_HISTORY: `
        query GetStockHistory($productId: ID!, $days: Int = 30) {
            stockHistory(productId: $productId, days: $days) {
                date
                openingStock
                closingStock
                movements
                netChange
            }
        }
    `,

    GET_STOCK_ALERTS: `
        query GetStockAlerts {
            stockAlerts {
                productId
                productName
                currentStock
                minStock
                maxStock
                alertType
                severity
                createdAt
            }
        }
    `
};

// Dashboard Queries
export const dashboardQueries = {
    GET_DASHBOARD_STATS: `
        query GetDashboardStats {
            dashboardStats {
                totalProducts
                lowStockProducts
                outOfStockProducts
                totalValue
                todaySales
                todayStockMovements
                todayNewProducts
                pendingSyncs
            }
        }
    `,

    GET_RECENT_ACTIVITIES: `
        query GetRecentActivities($limit: Int = 10) {
            recentActivities(limit: $limit) {
                id
                type
                description
                userId
                userName
                timestamp
                metadata
            }
        }
    `,

    GET_SALES_TREND: `
        query GetSalesTrend($days: Int = 30) {
            salesTrend(days: $days) {
                date
                sales
                transactions
                averageTicket
            }
        }
    `,

    GET_TOP_PRODUCTS: `
        query GetTopProducts($limit: Int = 10, $period: String = "month") {
            topProducts(limit: $limit, period: $period) {
                productId
                productName
                quantitySold
                revenue
                profit
                percentage
            }
        }
    `
};

// User Queries
export const userQueries = {
    GET_USERS: `
        query GetUsers {
            users {
                id
                username
                name
                role
                email
                isActive
                lastLogin
                created
            }
        }
    `,

    GET_USER_PROFILE: `
        query GetUserProfile($id: ID!) {
            user(id: $id) {
                id
                username
                name
                role
                email
                permissions
                preferences
                lastLogin
                created
                updated
            }
        }
    `,

    GET_USER_ACTIVITY: `
        query GetUserActivity($userId: ID!, $limit: Int = 20) {
            userActivity(userId: $userId, limit: $limit) {
                id
                type
                description
                timestamp
                metadata
            }
        }
    `
};

// Report Queries
export const reportQueries = {
    GENERATE_STOCK_REPORT: `
        query GenerateStockReport(
            $category: String
            $lowStockOnly: Boolean
            $outOfStockOnly: Boolean
            $format: String = "JSON"
        ) {
            generateStockReport(
                category: $category
                lowStockOnly: $lowStockOnly
                outOfStockOnly: $outOfStockOnly
                format: $format
            ) {
                id
                title
                generatedAt
                data
                summary
                downloadUrl
            }
        }
    `,

    GENERATE_SALES_REPORT: `
        query GenerateSalesReport(
            $startDate: String!
            $endDate: String!
            $category: String
            $format: String = "JSON"
        ) {
            generateSalesReport(
                startDate: $startDate
                endDate: $endDate
                category: $category
                format: $format
            ) {
                id
                title
                generatedAt
                data
                summary
                downloadUrl
            }
        }
    `,

    GET_REPORT_HISTORY: `
        query GetReportHistory($limit: Int = 20) {
            reportHistory(limit: $limit) {
                id
                type
                title
                generatedBy
                generatedAt
                parameters
                downloadUrl
            }
        }
    `
};