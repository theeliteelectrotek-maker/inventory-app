const fs = require('fs');

const onlineSales = JSON.parse(fs.readFileSync('./backend/data/online-sales.json')).sales;
const offlineSales = JSON.parse(fs.readFileSync('./backend/data/offline-sales.json')).sales;
const returns = JSON.parse(fs.readFileSync('./backend/data/returns.json')).returns;

const year = 2026;
const month = 2; // March

function matchesFilter(dateStr, year, month) {
  if (!dateStr) return false;
  if (month !== null) return dateStr.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`;
  return dateStr.startsWith(String(year));
}

const filteredOnline = onlineSales.filter((s) => matchesFilter(s.date, year, month));
const filteredOffline = offlineSales.filter((s) => matchesFilter(s.date, year, month));
const filteredReturns = returns.filter((r) => matchesFilter(r.date, year, month));

console.log("Filtered Online Length:", filteredOnline.length);
console.log("Filtered Offline Length:", filteredOffline.length);
console.log("Filtered Returns Length:", filteredReturns.length);
console.log("Total Returns Qty:", filteredReturns.reduce((s, r) => s + (Number(r.qty) || 1), 0));

const offlineRevenue = filteredOffline.reduce((s, x) => s + (x.totalAmount || 0), 0);
console.log("Offline Revenue:", offlineRevenue);
