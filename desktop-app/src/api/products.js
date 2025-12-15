const { getDatabase } = require('../database/wrapper');

function register(ipcMain) {
  ipcMain.handle('products:list', async (event, { token, search } = {}) => {
    try {
      const db = await getDatabase();
      let query = 'SELECT * FROM products WHERE is_active = 1';
      let params = [];
      
      if (search) {
        query += ' AND (name LIKE ? OR sku LIKE ? OR brand LIKE ?)';
        const searchPattern = `%${search}%`;
        params = [searchPattern, searchPattern, searchPattern];
      }
      
      query += ' ORDER BY name';
      
      const products = params.length > 0 
        ? db.prepare(query).all(...params)
        : db.prepare(query).all();
        
      return { success: true, data: products };
    } catch (error) {
      console.error('Get products error:', error);
      return { success: false, error: 'Failed to fetch products' };
    }
  });

  ipcMain.handle('products:create', async (event, { token, product }) => {
    try {
      const db = await getDatabase();
      
      const result = db.prepare(`
        INSERT INTO products (
          sku, name, brand, category,
          cost_price, sale_price, sale_price_afn,
          quantity_on_hand, location, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        product.sku,
        product.name,
        product.brand || '',
        product.category || '',
        product.costPrice,
        product.salePrice,
        product.salePriceAFN || null,
        product.quantityOnHand || 0,
        product.location || ''
      );
      
      return { success: true, data: { id: result.lastInsertRowid, ...product } };
    } catch (error) {
      console.error('Create product error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:update', async (event, { token, id, product }) => {
    try {
      const db = await getDatabase();
      
      db.prepare(`
        UPDATE products SET
          sku = ?, name = ?, brand = ?, category = ?,
          cost_price = ?, sale_price = ?, sale_price_afn = ?,
          quantity_on_hand = ?, location = ?
        WHERE id = ?
      `).run(
        product.sku, product.name, product.brand || '', product.category || '',
        product.costPrice, product.salePrice, product.salePriceAFN || null,
        product.quantityOnHand, product.location || '', id
      );
      
      return { success: true, data: { id, ...product } };
    } catch (error) {
      console.error('Update product error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('products:delete', async (event, { token, id }) => {
    try {
      const db = await getDatabase();
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Delete product error:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
