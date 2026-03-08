const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const products = [
  "POWER STRIP 4+1 6AMP (SMART)",
  "POWER STRIP 4+1 (MAGIC)",
  "POWER STRIP 4+4 (MAGIC)",
  "POWER STRIP 4+1 6AMP (CUBA)",
  "POWER STRIP 4+1 6AMP (ROCKER)",
  "CORD PUSH BUTTON",
  "WATER ALARAM",
  "MCB SINGLE POLE 32AMP",
  "MCB SINGLE POLE 40AMP",
  "MCB SINGLE POLE 63AMP",
  "MCB DOUBLE POLE 32AMP",
  "MCB DOUBLE POLE 40AMP",
  "MCB DOUBLE POLE 63AMP",
  "MCB DP CHANGOVER 32 AMP",
  "MCB DP CHANGOVER 40AMP",
  "MCB DP CHANGOVER 63AMP",
  "MCB THREE POLE 32AMP",
  "MCB THREE POLE 40AMP",
  "MCB THREE POLE 63AMP",
  "MCB FOUR POLE 32AMP",
  "MCB FOUR POLE 40AMP",
  "MCB FOUR POLE 63AMP",
  "MCB FOUR POLE ISOLATOR 25AMP",
  "MCB FOUR POLE ISOLATOR 32AMP",
  "MCB FOUR POLE ISOLATOR 40AMP",
  "MCB FOUR POLE ISOLATOR 63AMP",
  "MCB SPN 32AMP",
  "MCB SPN 40AMP",
  "MCB SPN 63AMP",
  "MCB DP ISOLATOR 32AMP",
  "MCB DP ISOLATOR 40AMP",
  "MCB DP ISOLATOR 63AMP",
  "MCB TPN 32AMP",
  "MCB TPN 40AMP",
  "MCB TPN 63AMP",
  "MUSICAL DOOR BELL (ARTI)",
  "MUSICAL DOOR BELL (KDK)",
  "MUSICAL DOOR BELL (POD)",
  "MUSICAL DOOR BELL (ASALAAM)",
  "MUSICAL DOOR BELL (GAYATRI)",
  "MUSICAL DOOR BELL (10*1)",
  "MUSICAL DOOR BELL (DING DONG)",
  "SQUARE PANEL (15WATT)",
  "ROUND PANEL (15WATT)",
  "FLOOD LIGHT (50WATT)",
  "FLOOD LIGHT (100WATT)",
  "ROUND PANEL (8WATT)",
  "COMBINED BOX WITH INDICATOR",
  "COMBINED BOX +2 PIN",
  "DOUBLE COMBINED CIRCLE",
  "DOUBLE COMBINED FLAT",
  "DOUBLE COMBINED 6*12",
  "COMBINED BOX 2+4",
  "COMBINED BOX 4+5",
  "MCB COMBINED BOX",
  "SMALL COMBINED BOX 1+2",
  "SHUTTER COMBINED BOX",
  "RED ROUND INDICATOR",
  "OVAL BLUE INDICTOR",
  "OVAL RED INDICATOR",
  "BATTEN HOLDER",
  "BATTEN ANGLES HOLDER",
  "SOCKET",
  "PUSH BELL",
  "FLAT SWITCH",
  "ROCKER SWITCH",
  "TAPE",
  "4 WAY",
  "6 WAY",
  "8 WAY",
  "10 WAY",
  "12 WAY",
  "3 X 3 (2M) 20g",
  "4 X 3 (3M) 20g",
  "5 X 3 (4M) 20g",
  "8 X 3 (6M) 20g",
  "8X 6 (12M) 20g",
  "5 X 5 (8MS) 20g",
  "9 X 3 (8MH) 20g",
  "3 X 3 (2M) 18g",
  "4 X 3 (3M) 18g",
  "5 X 3 (4M) 18g",
  "8 X 3 (6M) 18g",
  "8X 6 (12M) 18g",
  "5 X 5 (8MS) 18g",
  "9 X 3 (8MH) 18g",
];

function getCategory(name) {
  if (name.startsWith('MCB')) return 'MCB';
  if (name.startsWith('POWER STRIP')) return 'Power Strip';
  if (name.startsWith('MUSICAL DOOR BELL')) return 'Door Bell';
  if (name.includes('PANEL') || name.includes('FLOOD LIGHT')) return 'Lighting';
  if (name.includes('COMBINED BOX') || name.includes('SHUTTER COMBINED')) return 'Combined Box';
  if (name.includes('INDICATOR')) return 'Indicator';
  if (name.includes('WAY')) return 'Multi-Way';
  if (name.match(/\d+ X \d+/)) return 'Extension Wire';
  return 'Accessories';
}

const now = new Date().toISOString();
const data = {
  products: products.map((name) => ({
    id: uuidv4(),
    name: name.trim(),
    sku: '',
    description: '',
    totalQty: 0,
    availableQty: 0,
    unitPrice: 0,
    category: getCategory(name),
    createdAt: now,
    updatedAt: now,
  })),
};

const filePath = path.join(__dirname, 'data', 'products.json');
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`✅ Seeded ${data.products.length} products into products.json`);
