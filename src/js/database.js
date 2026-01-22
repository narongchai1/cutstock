// database.js (สำหรับ Electron)
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dataPath = path.join(app.getPath('userData'), 'stock-data.json');
        this.products = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = fs.readFileSync(this.dataPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
        return [];
    }

    saveData() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.products, null, 2));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    getAllProducts() {
        return this.products;
    }

    getProductById(id) {
        return this.products.find(p => p.id === id);
    }

    addProduct(product) {
        this.products.push(product);
        this.saveData();
        return product;
    }

    updateProduct(id, updates) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updates };
            this.saveData();
            return this.products[index];
        }
        return null;
    }

    deleteProduct(id) {
        const index = this.products.findIndex(p => p.id === id);
        if (index !== -1) {
            const deleted = this.products.splice(index, 1);
            this.saveData();
            return deleted[0];
        }
        return null;
    }

    // สำหรับ reports
    getStockSummary() {
        const totalProducts = this.products.length;
        const totalValue = this.products.reduce((sum, p) => 
            sum + (p.stock * (p.cost || 0)), 0);
        const lowStock = this.products.filter(p => p.stock > 0 && p.stock <= (p.minStock || 10)).length;
        const outOfStock = this.products.filter(p => p.stock === 0).length;
        
        return {
            totalProducts,
            totalValue,
            lowStock,
            outOfStock,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = Database;