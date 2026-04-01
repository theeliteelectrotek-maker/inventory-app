require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { User, Product, OnlineSale, OfflineSale, Shop, Return } = require('./models');

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function migrateData() {
  if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<db_password>')) {
    console.error('ERROR: You must define a valid MONGO_URI string in .env before migrating!');
    console.error('Make sure you have replaced <db_password> with your actual database user password.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    console.log('Migrating Users...');
    const usersData = readJSON('users.json');
    if (usersData && usersData.users) {
      for (const u of usersData.users) {
        await User.findOneAndUpdate({ id: u.id }, u, { upsert: true });
      }
      console.log(`Migrated ${usersData.users.length} users.`);
    }

    console.log('Migrating Products...');
    const productsData = readJSON('products.json');
    if (productsData && productsData.products) {
      for (const p of productsData.products) {
        await Product.findOneAndUpdate({ id: p.id }, p, { upsert: true });
      }
      console.log(`Migrated ${productsData.products.length} products.`);
    }

    console.log('Migrating Online Sales...');
    const onlineSalesData = readJSON('online-sales.json');
    if (onlineSalesData && onlineSalesData.sales) {
      for (const s of onlineSalesData.sales) {
        await OnlineSale.findOneAndUpdate({ id: s.id }, s, { upsert: true });
      }
      console.log(`Migrated ${onlineSalesData.sales.length} online sales.`);
    }

    console.log('Migrating Offline Sales...');
    const offlineSalesData = readJSON('offline-sales.json');
    if (offlineSalesData && offlineSalesData.sales) {
      for (let s of offlineSalesData.sales) {
        // Fix legacy single-item format during migration
        if (!s.items || s.items.length === 0) {
            s.items = [{
                productId: s.productId,
                productName: s.productName || 'Unknown Product',
                qty: s.qty || 1,
                amount: s.amount || 0,
                date: s.date
            }];
        }
        await OfflineSale.findOneAndUpdate({ id: s.id }, s, { upsert: true });
      }
      console.log(`Migrated ${offlineSalesData.sales.length} offline sales.`);
    }

    console.log('Migrating Shops...');
    const shopsData = readJSON('shops.json');
    if (shopsData && shopsData.shops) {
      for (const s of shopsData.shops) {
        await Shop.findOneAndUpdate({ id: s.id }, s, { upsert: true });
      }
      console.log(`Migrated ${shopsData.shops.length} shops.`);
    }

    console.log('Migrating Returns...');
    const returnsData = readJSON('returns.json');
    if (returnsData && returnsData.returns) {
      for (const r of returnsData.returns) {
        await Return.findOneAndUpdate({ id: r.id }, r, { upsert: true });
      }
      console.log(`Migrated ${returnsData.returns.length} returns.`);
    }

    console.log('✅ MIGRATION COMPLETE!');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
