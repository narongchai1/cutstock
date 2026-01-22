// Product Mutations
export const productMutations = {
    CREATE_PRODUCT: `
        mutation CreateProduct($input: ProductInput!) {
            createProduct(input: $input) {
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

    UPDATE_PRODUCT: `
        mutation UpdateProduct($id: ID!, $input: ProductInput!) {
            updateProduct(id: $id, input: $input) {
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

    DELETE_PRODUCT: `
        mutation DeleteProduct($id: ID!) {
            deleteProduct(id: $id) {
                success
                message
                deletedId
            }
        }
    `,

    BULK_UPDATE_PRODUCTS: `
        mutation BulkUpdateProducts($updates: [ProductUpdateInput!]!) {
            bulkUpdateProducts(updates: $updates) {
                id
                barcode
                name
                price
                stock
                updated
            }
        }
    `,

    ADJUST_STOCK: `
        mutation AdjustStock($productId: ID!, $quantity: Int!, $notes: String) {
            adjustStock(productId: $productId, quantity: $quantity, notes: $notes) {
                id
                productId
                productName
                type
                quantity
                previousStock
                newStock
                reference
                notes
                created
            }
        }
    `
};

// Stock Mutations
export const stockMutations = {
    CREATE_STOCK_MOVEMENT: `
        mutation CreateStockMovement($input: StockMovementInput!) {
            createStockMovement(input: $input) {
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

    UPDATE_STOCK: `
        mutation UpdateStock($productId: ID!, $quantity: Int!, $type: StockMovementType!) {
            updateStock(productId: $productId, quantity: $quantity, type: $type) {
                id
                productId
                productName
                type
                quantity
                previousStock
                newStock
                reference
                created
            }
        }
    `,

    BULK_STOCK_UPDATE: `
        mutation BulkStockUpdate($inputs: [StockMovementInput!]!) {
            bulkStockUpdate(inputs: $inputs) {
                id
                productId
                productName
                type
                quantity
                previousStock
                newStock
                created
            }
        }
    `,

    IMPORT_STOCK: `
        mutation ImportStock($fileUrl: String!, $type: String!) {
            importStock(fileUrl: $fileUrl, type: $type) {
                success
                message
                importedCount
                failedCount
                errors
            }
        }
    `
};

// User Mutations
export const userMutations = {
    CREATE_USER: `
        mutation CreateUser($input: UserInput!) {
            createUser(input: $input) {
                id
                username
                name
                role
                email
                isActive
                created
            }
        }
    `,

    UPDATE_USER: `
        mutation UpdateUser($id: ID!, $input: UserInput!) {
            updateUser(id: $id, input: $input) {
                id
                username
                name
                role
                email
                isActive
                updated
            }
        }
    `,

    DELETE_USER: `
        mutation DeleteUser($id: ID!) {
            deleteUser(id: $id) {
                success
                message
                deletedId
            }
        }
    `,

    CHANGE_PASSWORD: `
        mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
            changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
                success
                message
            }
        }
    `,

    UPDATE_PROFILE: `
        mutation UpdateProfile($input: ProfileInput!) {
            updateProfile(input: $input) {
                id
                username
                name
                email
                preferences
                updated
            }
        }
    `
};

// System Mutations
export const systemMutations = {
    SYNC_DATA: `
        mutation SyncData($type: String!) {
            syncData(type: $type) {
                success
                message
                syncedCount
                failedCount
            }
        }
    `,

    CLEAR_CACHE: `
        mutation ClearCache($type: String) {
            clearCache(type: $type) {
                success
                message
                cleared
            }
        }
    `,

    BACKUP_DATA: `
        mutation BackupData($type: String = "FULL") {
            backupData(type: $type) {
                success
                message
                backupId
                downloadUrl
                timestamp
            }
        }
    `,

    RESTORE_DATA: `
        mutation RestoreData($backupId: ID!) {
            restoreData(backupId: $backupId) {
                success
                message
                restoredCount
                timestamp
            }
        }
    `
};

// Auth Mutations
export const authMutations = {
    LOGIN: `
        mutation Login($username: String!, $password: String!) {
            login(username: $username, password: $password) {
                success
                message
                token
                user {
                    id
                    username
                    name
                    role
                    email
                    permissions
                    preferences
                }
            }
        }
    `,

    LOGOUT: `
        mutation Logout {
            logout {
                success
                message
            }
        }
    `,

    REFRESH_TOKEN: `
        mutation RefreshToken($token: String!) {
            refreshToken(token: $token) {
                success
                message
                token
                expiresAt
            }
        }
    `,

    VALIDATE_TOKEN: `
        mutation ValidateToken($token: String!) {
            validateToken(token: $token) {
                valid
                user {
                    id
                    username
                    role
                    permissions
                }
                expiresAt
            }
        }
    `
};