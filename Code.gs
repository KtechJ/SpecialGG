/**
 * Mattress & Gadi Shop Manager — Google Apps Script backend.
 *
 * The Google Sheet is the database. The web app (Index.html) is the
 * phone screen that reads and writes it. See README.md for setup.
 */

// ===================== SETTINGS — edit these =====================
const SHOP_NAME = 'Special Gadi Ghar';
const SHOP_OWNER = 'Imran Khan';
const SHOP_ADDRESS = 'Mama Chowk, Jalna';
const SHOP_PHONE = '9822552403';  // shown on the WhatsApp bill
const REMIND_DAYS = 3;            // show orders on home screen this many days before delivery
const ALLOWED_EMAILS = [];        // e.g. ['owner@gmail.com', 'father@gmail.com']; empty = anyone with edit access to the sheet
const TZ = 'Asia/Kolkata';
// ================================================================

const SCHEMA = {
  Items: [
    ['id', 'ID'], ['name', 'Name / नाम'], ['type', 'Type / प्रकार'], ['size', 'Size / साइज़'],
    ['material', 'Material / मटेरियल'], ['thickness', 'Thickness / मोटाई'],
    ['cost', 'Cost Price / लागत'], ['price', 'Sell Price / बिक्री दाम'],
    ['stock', 'Stock / स्टॉक'], ['low', 'Low Alert / कम स्टॉक'], ['made', 'Made in Shop / खुद बनाते (Yes/No)'],
    ['track', 'Track stock (Yes/No) / स्टॉक गिनें']
  ],
  RawMaterial: [
    ['id', 'ID'], ['name', 'Name / नाम'], ['unit', 'Unit / इकाई'], ['rate', 'Rate per unit / दाम'],
    ['stock', 'Stock / स्टॉक'], ['low', 'Low Alert / कम स्टॉक']
  ],
  Recipe: [
    ['itemId', 'Item ID'], ['itemName', 'Item / आइटम'], ['rawId', 'Raw ID'],
    ['rawName', 'Raw Material / कच्चा माल'], ['qty', 'Qty per piece / प्रति पीस']
  ],
  Production: [
    ['date', 'Date / तारीख'], ['itemId', 'Item ID'], ['itemName', 'Item / आइटम'], ['qty', 'Qty / संख्या'],
    ['unitCost', 'Cost per piece / प्रति पीस लागत'], ['rawUsed', 'Raw used / इस्तेमाल'], ['by', 'By / किसने'],
    ['labour', 'Labour per piece / मजदूरी'], ['ref', 'Order Ref / ऑर्डर']
  ],
  Sales: [
    ['bill', 'Bill No / बिल'], ['date', 'Date / तारीख'], ['customer', 'Customer / ग्राहक'], ['phone', 'Phone / फ़ोन'],
    ['items', 'Items / सामान'], ['total', 'Total / कुल'], ['discount', 'Discount / छूट'], ['net', 'Net / देय'],
    ['paid', 'Paid / जमा'], ['balance', 'Balance / बाकी'], ['cost', 'Cost / लागत'], ['profit', 'Profit / मुनाफ़ा'],
    ['ref', 'Order Ref / ऑर्डर'], ['by', 'By / किसने'], ['mode', 'Mode / तरीका'],
    ['stockLines', 'Stock used (for undo)']
  ],
  Purchases: [
    ['date', 'Date / तारीख'], ['supplier', 'Supplier / सप्लायर'], ['phone', 'Phone / फ़ोन'], ['kind', 'Kind / प्रकार'],
    ['id', 'Item/Raw ID'], ['name', 'Name / नाम'], ['qty', 'Qty / मात्रा'], ['rate', 'Rate / दाम'],
    ['amount', 'Amount / रकम'], ['paid', 'Paid / दिया'], ['balance', 'Balance / बाकी'], ['by', 'By / किसने'],
    ['mode', 'Mode / तरीका']
  ],
  Orders: [
    ['no', 'Order No / ऑर्डर'], ['date', 'Date / तारीख'], ['customer', 'Customer / ग्राहक'], ['phone', 'Phone / फ़ोन'],
    ['details', 'Details / विवरण'], ['amount', 'Amount / रकम'], ['advance', 'Advance / एडवांस'],
    ['delivery', 'Delivery Date / डिलीवरी'], ['status', 'Status / स्थिति'], ['note', 'Note / नोट'],
    ['bill', 'Bill No / बिल'], ['by', 'By / किसने'], ['mode', 'Advance Mode / तरीका'],
    ['itemId', 'Item ID'], ['qty', 'Qty / संख्या'], ['rate', 'Rate / दाम'], ['weight', 'Weight kg / वज़न'],
    ['madeCost', 'Making cost / बनाने की लागत'], ['closed', 'Closed on / बंद तारीख']
  ],
  Customers: [
    ['id', 'ID'], ['name', 'Name / नाम'], ['phone', 'Mobile / मोबाइल'], ['address', 'Address / पता'],
    ['note', 'Note / नोट'], ['since', 'Since / कब से'], ['opening', 'Old Udhaar / पुराना उधार']
  ],
  Payments: [
    ['date', 'Date / तारीख'], ['partyType', 'Party Type / प्रकार'], ['party', 'Name / नाम'],
    ['amount', 'Amount / रकम'], ['mode', 'Mode / तरीका'], ['note', 'Note / नोट'], ['by', 'By / किसने'],
    ['ref', 'Ref / UPI-Cheque No'], ['id', 'Receipt No / रसीद'], ['orderNo', 'Order No / ऑर्डर']
  ],
  Vyapari: [
    ['id', 'ID'], ['name', 'Name / नाम'], ['phone', 'Phone / फ़ोन'], ['city', 'City / शहर'],
    ['opening', 'Old Due / पुराना बाकी'], ['note', 'Note / नोट']
  ],
  Cashbook: [
    ['id', 'ID'], ['date', 'Date / तारीख'], ['type', 'Type (In/Out/Transfer)'], ['category', 'Category / खाता'],
    ['amount', 'Amount / रकम'], ['mode', 'Mode / तरीका'], ['note', 'Note / नोट'], ['by', 'By / किसने']
  ],
  Deleted: [
    ['date', 'Deleted on / कब हटाया'], ['kind', 'What / क्या'], ['ref', 'No. / नंबर'], ['data', 'Full entry (for records)'], ['by', 'By / किसने']
  ],
  StockLog: [
    ['date', 'Date / तारीख'], ['kind', 'Kind / प्रकार'], ['id', 'ID'], ['name', 'Name / नाम'],
    ['old', 'Old / पुराना'], ['new', 'New / नया'], ['note', 'Reason / कारण'], ['by', 'By / किसने']
  ]
};

// Fields that must be stored as real dates (everything else that is text is stored as plain text).
const DATE_FIELDS = { delivery: true, date: true };

// Bahi khata categories for manual entries.
const IN_CATS = ['Opening balance / शुरुआती रकम', 'Other income / अन्य आमदनी', 'Owner added money / मालिक ने डाले', 'Loan taken / उधार लिया'];
const OUT_CATS = ['Rent / किराया', 'Electricity / बिजली', 'Staff salary / तनख्वाह', 'Karigar - gadi making / कारीगर', 'Transport / भाड़ा',
  'Tea & food / चाय-नाश्ता', 'Shop expense / दुकान खर्च', 'Repair / मरम्मत', 'Home / personal / घर खर्च', 'Loan repaid / उधार चुकाया', 'Other / अन्य'];
const OTHER_INCOME = 'Other income / अन्य आमदनी';
const HOME_CAT = 'Home / personal / घर खर्च';
// Money going out that is NOT a shop expense (karigar cost is already inside gadi cost; home & loans are not expenses).
const NOT_EXPENSE = { 'Karigar - gadi making / कारीगर': true, 'Home / personal / घर खर्च': true, 'Loan repaid / उधार चुकाया': true };

// ===================== Web app & menu =====================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(SHOP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Shop / दुकान')
    .addItem('Setup sheets / शीट बनाएं', 'setup')
    .addSeparator()
    .addItem('Set app PIN for a person / PIN बनाएं', 'menuSetPin')
    .addItem('Remove a person from the app / हटाएं', 'menuRemovePin')
    .addItem('Show app users / कौन-कौन', 'menuListPins')
    .addToUi();
}

/** Run once: creates all tabs with headers and some sample items (only if empty). */
function setup() {
  const ss = ss_();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(SCHEMA).forEach(function (name) {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    const headers = SCHEMA[name].map(function (c) { return c[1]; });
    s.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff').setWrap(true);
    s.setFrozenRows(1);
  });

  if (sh_('Items').getLastRow() < 2) {
    [
      ['I1', 'Cotton Gadi', 'Gadi', 'Single 6x3 ft', 'Cotton / Handloom', '4 inch', 1500, 2200, 0, 2, 'Yes'],
      ['I2', 'Cotton Gadi', 'Gadi', 'Double 6x4 ft', 'Cotton / Handloom', '4 inch', 2000, 2900, 0, 2, 'Yes'],
      ['I3', 'Cotton Gadi', 'Gadi', 'Queen 6x5 ft', 'Cotton / Handloom', '5 inch', 2600, 3700, 0, 2, 'Yes'],
      ['I4', 'Foam Mattress', 'Mattress', 'Queen 6x5 ft', 'Foam', '5 inch', 4500, 6500, 0, 2, 'No'],
      ['I5', 'Coir Mattress', 'Mattress', 'Double 6x4 ft', 'Coir', '4 inch', 3500, 5000, 0, 2, 'No'],
      ['I6', 'Cotton Pillow', 'Pillow', 'Standard', 'Cotton', '', 150, 250, 0, 5, 'Yes'],
      ['I7', 'Razai', 'Quilt', 'Double', 'Cotton', '', 900, 1400, 0, 3, 'Yes']
    ].forEach(function (r) { sh_('Items').appendRow(r); });
  }
  if (sh_('RawMaterial').getLastRow() < 2) {
    [
      ['R1', 'Cotton / रुई', 'kg', 120, 0, 20],
      ['R2', 'Handloom Fabric / कपड़ा', 'meter', 90, 0, 15],
      ['R3', 'Thread / धागा', 'roll', 30, 0, 5]
    ].forEach(function (r) { sh_('RawMaterial').appendRow(r); });
  }
  if (sh_('Recipe').getLastRow() < 2) {
    [
      ['I1', 'Cotton Gadi Single 6x3 ft', 'R1', 'Cotton / रुई', 7],
      ['I1', 'Cotton Gadi Single 6x3 ft', 'R2', 'Handloom Fabric / कपड़ा', 4],
      ['I2', 'Cotton Gadi Double 6x4 ft', 'R1', 'Cotton / रुई', 9],
      ['I2', 'Cotton Gadi Double 6x4 ft', 'R2', 'Handloom Fabric / कपड़ा', 5],
      ['I3', 'Cotton Gadi Queen 6x5 ft', 'R1', 'Cotton / रुई', 11],
      ['I3', 'Cotton Gadi Queen 6x5 ft', 'R2', 'Handloom Fabric / कपड़ा', 6],
      ['I6', 'Cotton Pillow Standard', 'R1', 'Cotton / रुई', 1],
      ['I6', 'Cotton Pillow Standard', 'R2', 'Handloom Fabric / कपड़ा', 0.8],
      ['I7', 'Razai Double', 'R1', 'Cotton / रुई', 3],
      ['I7', 'Razai Double', 'R2', 'Handloom Fabric / कपड़ा', 5]
    ].forEach(function (r) { sh_('Recipe').appendRow(r); });
  }
  backfillCustomers_();
  const def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  PropertiesService.getScriptProperties().setProperty('SCHEMA_KEY', schemaKey_());
}

// ===================== Sheet helpers =====================

function ss_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Run setup first / पहले setup चलाएं');
  return SpreadsheetApp.openById(id);
}

function sh_(name) {
  const s = ss_().getSheetByName(name);
  if (!s) throw new Error('Sheet "' + name + '" missing. Run setup / setup चलाएं');
  return s;
}

function fmt_(d, pattern) { return Utilities.formatDate(d, TZ, pattern); }

function cellOut_(v) {
  if (v instanceof Date) {
    const t = fmt_(v, 'yyyy-MM-dd HH:mm');
    return t.slice(11) === '00:00' ? t.slice(0, 10) : t;
  }
  return v;
}

/** Reads a tab as objects; each object has _row = its sheet row number. */
function readAll_(name) {
  const cols = SCHEMA[name];
  const values = sh_(name).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(function (c) { return c === '' || c === null; })) continue;
    const o = { _row: i + 1 };
    cols.forEach(function (c, j) { o[c[0]] = cellOut_(row[j] === undefined ? '' : row[j]); });
    out.push(o);
  }
  return out;
}

function cellIn_(key, v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && v !== '' && !DATE_FIELDS[key]) return "'" + v; // keep text as text (phones, sizes like 6/3)
  return v;
}

function append_(name, obj) {
  sh_(name).appendRow(SCHEMA[name].map(function (c) { return cellIn_(c[0], obj[c[0]]); }));
}

function setField_(name, row, key, value) {
  const idx = SCHEMA[name].findIndex(function (c) { return c[0] === key; });
  if (idx < 0) throw new Error('Unknown field ' + key);
  sh_(name).getRange(row, idx + 1).setValue(cellIn_(key, value));
}

function num_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function round2_(n) { return Math.round(n * 100) / 100; }
function str_(v) { return String(v === undefined || v === null ? '' : v).trim(); }
function key_(name) { return str_(name).toLowerCase().replace(/\s+/g, ' '); }
function label_(it) { return (str_(it.name) + ' ' + str_(it.size)).trim(); }
function byId_(list) { const m = {}; list.forEach(function (r) { m[str_(r.id)] = r; }); return m; }

function nextNo_(name, key, prefix) {
  let max = 0;
  readAll_(name).forEach(function (r) {
    const n = parseInt(str_(r[key]).replace(/\D/g, ''), 10);
    if (n > max) max = n;
  });
  if (prefix === 'B' || prefix === 'O') {   // never reuse the number of a deleted bill/order
    const re = new RegExp('^' + prefix + '(\\d+)$');
    const del = ss_().getSheetByName('Deleted') ? readAll_('Deleted') : [];
    del.forEach(function (r) { const m = str_(r.ref).match(re); if (m && +m[1] > max) max = +m[1]; });
  }
  return prefix + (max + 1);
}

function guard_() {
  if (API_USER) return API_USER;   // request from the Android app, PIN already checked in doPost
  let email = '';
  try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { /* not available */ }
  // Without a Google login (e.g. the PIN deployment opened in a browser) nothing is allowed here.
  if (!email) throw new Error('Access denied: please sign in with Google / अनुमति नहीं');
  if (ALLOWED_EMAILS.length) {
    const ok = ALLOWED_EMAILS.some(function (a) { return a.toLowerCase() === email.toLowerCase(); });
    if (!ok) throw new Error('Access denied / अनुमति नहीं: ' + email);
  }
  return email ? email.split('@')[0] : '';
}

/** Runs a write under a lock, then returns the result plus fresh data for the app. */
function run_(fn) {
  const by = guard_();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const result = fn(by) || {};
    SpreadsheetApp.flush();
    result.ok = true;
    result.data = getData_(by);
    return result;
  } finally {
    lock.releaseLock();
  }
}

// ===================== Read API =====================

function getData() {
  const user = guard_();
  ensureSetup_();
  const d = getData_(user);
  // 'हिंदी' written with escapes (always correct) vs. as text (broken if Code.gs was pasted with the wrong encoding).
  d.encodingOk = ENCODING_CHECK === '\u0939\u093f\u0902\u0926\u0940';
  return d;
}
const ENCODING_CHECK = 'हिंदी';

/** Creates missing tabs/columns automatically (first open, or after a code update), so running setup by hand is optional. */
function schemaKey_() { return Object.keys(SCHEMA).map(function (k) { return k + ':' + SCHEMA[k].length; }).join(','); }
function ensureSetup_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA_KEY') === schemaKey_() && ss_().getSheetByName('Items')) return;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (props.getProperty('SCHEMA_KEY') === schemaKey_() && ss_().getSheetByName('Items')) return;
    setup();
  } finally {
    lock.releaseLock();
  }
}

function getData_(user) {
  const items = readAll_('Items').filter(function (r) { return str_(r.id); });
  const raw = readAll_('RawMaterial').filter(function (r) { return str_(r.id); });
  const recipes = readAll_('Recipe');
  const src = readSrc_();
  const sales = src.sales, purchases = src.purchases, orders = src.orders, payments = src.payments;

  const today = fmt_(new Date(), 'yyyy-MM-dd');
  const month = today.slice(0, 7);
  const orderAdv = orderPaid_(orders, payments);
  orders.forEach(function (o) { o.paid = orderAdv[str_(o.no)] || 0; });

  const dash = { todaySales: 0, todayBills: 0, todayCollect: 0, monthSales: 0, monthProfit: 0, toTake: 0, toPay: 0, cash: 0, bank: 0 };
  ledger_(src).forEach(function (e) { dash.cash += e.cash; dash.bank += e.bank; });
  sales.forEach(function (s) {
    const d = str_(s.date).slice(0, 10);
    if (d === today) {
      dash.todaySales += num_(s.net);
      dash.todayBills++;
      dash.todayCollect += num_(s.paid) - (str_(s.ref) ? (orderAdv[str_(s.ref)] || 0) : 0);
    }
    if (d.slice(0, 7) === month) { dash.monthSales += num_(s.net); dash.monthProfit += num_(s.profit); }
  });
  payments.forEach(function (p) {
    if (str_(p.date).slice(0, 10) !== today || p.partyType === 'Supplier') return;
    dash.todayCollect += p.partyType === 'Refund' ? -num_(p.amount) : num_(p.amount);
  });
  orders.forEach(function (o) {
    if (str_(o.date).slice(0, 10) === today) dash.todayCollect += num_(o.advance);
  });

  const parties = parties_(sales, purchases, payments, src.vyapari, src.customers);
  parties.customers.forEach(function (c) { if (c.balance > 0) dash.toTake += c.balance; });
  parties.suppliers.forEach(function (c) { if (c.balance > 0) dash.toPay += c.balance; });
  Object.keys(dash).forEach(function (k) { dash[k] = round2_(dash[k]); });

  const openOrders = orders.filter(function (o) { return o.status !== 'Delivered' && o.status !== 'Cancelled'; });
  const doneOrders = orders.filter(function (o) { return o.status === 'Delivered' || o.status === 'Cancelled'; }).slice(-15).reverse();

  return {
    shop: { name: SHOP_NAME, owner: SHOP_OWNER, address: SHOP_ADDRESS, phone: SHOP_PHONE },
    remindDays: REMIND_DAYS,
    labour: lastLabour_(),
    clients: clients_(src, parties.customers),
    cats: { in: IN_CATS, out: OUT_CATS },
    user: user || '',
    today: today,
    items: items, raw: raw, recipes: recipes,
    orders: openOrders.concat(doneOrders),
    customers: parties.customers, suppliers: parties.suppliers,
    recentSales: sales.slice(-15).reverse(),
    recentPurchases: purchases.slice(-15).reverse(),
    dash: dash
  };
}

function parties_(sales, purchases, payments, vyapari, customers) {
  const cust = {}, supp = {};
  function ensure(map, name) {
    const k = key_(name);
    if (!k) return null;
    if (!map[k]) map[k] = { name: str_(name), phone: '', city: '', id: '', balance: 0, opening: 0, purchased: 0, paid: 0 };
    return map[k];
  }
  (vyapari || []).forEach(function (v) {
    const e = ensure(supp, v.name);
    if (!e) return;
    e.id = str_(v.id); e.city = str_(v.city); e.phone = str_(v.phone);
    e.opening = num_(v.opening); e.balance += num_(v.opening);
  });
  (customers || []).forEach(function (c) {   // old udhaar from before the app
    if (!num_(c.opening)) return;
    const e = ensure(cust, c.name);
    if (!e) return;
    if (str_(c.phone)) e.phone = str_(c.phone);
    e.balance += num_(c.opening);
  });
  sales.forEach(function (s) {
    const e = ensure(cust, s.customer);
    if (!e) return;
    if (str_(s.phone)) e.phone = str_(s.phone);
    e.balance += num_(s.balance);
  });
  purchases.forEach(function (p) {
    const e = ensure(supp, p.supplier);
    if (!e) return;
    if (!e.phone && str_(p.phone)) e.phone = str_(p.phone);
    e.purchased += num_(p.amount); e.paid += num_(p.paid); e.balance += num_(p.balance);
  });
  payments.forEach(function (p) {
    if (p.partyType === 'Order' || p.partyType === 'Refund') return; // order money, not udhaar
    const e = ensure(p.partyType === 'Supplier' ? supp : cust, p.party);
    if (!e) return;
    e.paid += num_(p.amount); e.balance -= num_(p.amount);
  });
  function list(map) {
    return Object.keys(map).map(function (k) {
      ['balance', 'purchased', 'paid'].forEach(function (f) { map[k][f] = round2_(map[k][f]); });
      return map[k];
    }).sort(function (a, b) { return b.balance - a.balance || a.name.localeCompare(b.name); });
  }
  return { customers: list(cust), suppliers: list(supp) };
}

/** Ledger of one customer or supplier, newest first. */
function partyHistory(p) {
  guard_();
  const k = key_(p.party);
  const isSupp = p.partyType === 'Supplier';
  const rows = [];
  if (isSupp) {
    readAll_('Purchases').forEach(function (r) {
      if (key_(r.supplier) !== k) return;
      rows.push({ date: r.date, text: 'Purchase / खरीद: ' + r.name + ' x' + r.qty, debit: num_(r.amount), credit: num_(r.paid) });
    });
  } else {
    readAll_('Sales').forEach(function (r) {
      if (key_(r.customer) !== k) return;
      rows.push({ date: r.date, text: 'Bill ' + r.bill + ': ' + r.items, debit: num_(r.net), credit: num_(r.paid) });
    });
  }
  readAll_('Payments').forEach(function (r) {
    if (key_(r.party) !== k || r.partyType === 'Order' || r.partyType === 'Refund' || (r.partyType === 'Supplier') !== isSupp) return;
    rows.push({ date: r.date, text: (isSupp ? 'Paid / दिया' : 'Received / मिला') + ' (' + r.mode + ') ' + str_(r.note), debit: 0, credit: num_(r.amount) });
  });
  rows.sort(function (a, b) { return str_(b.date).localeCompare(str_(a.date)); });
  return rows.slice(0, 60);
}

// ===================== Write API =====================

function saveSale(p) {
  return run_(function (by) {
    // A line is a listed item (id) or a typed item (name). A typed item is added to the item list
    // (stock not tracked) so next time it can be picked from the list.
    const lines = (p.lines || []).filter(function (l) { return (str_(l.id) || str_(l.name)) && num_(l.qty) > 0; });
    if (!lines.length) throw new Error('Add at least one item / कम से कम एक आइटम डालें');
    const added = [];
    lines.forEach(function (l) {
      if (str_(l.id)) return;
      const r = ensureItem_(l.name, { price: num_(l.price), cost: num_(l.cost), made: 'No', track: 'No' });
      l.id = r.id;
      if (r.created) added.push(str_(l.name));
    });
    const items = byId_(readAll_('Items'));
    const need = {};
    lines.forEach(function (l) {
      if (!items[str_(l.id)]) throw new Error('Item not found / आइटम नहीं मिला: ' + l.id);
      if (!tracked_(items[str_(l.id)])) return;
      need[str_(l.id)] = (need[str_(l.id)] || 0) + num_(l.qty);
    });
    Object.keys(need).forEach(function (id) {
      const it = items[id];
      if (num_(it.stock) < need[id] && !p.allowShort) {
        // The app catches STOCK_SHORT and asks "sell anyway?" (stock may simply not be entered yet).
        throw new Error('STOCK_SHORT: ' + label_(it) + ' — stock shows ' + num_(it.stock) + ', selling ' + need[id]);
      }
    });
    let total = 0, cost = 0;
    const billLines = [];
    lines.forEach(function (l) {
      const it = str_(l.id) ? items[str_(l.id)] : null, q = num_(l.qty), pr = num_(l.price);
      total += q * pr;
      cost += q * (num_(it.cost) || num_(l.cost));
      billLines.push({ name: it ? label_(it) : str_(l.name), qty: q, price: pr });
    });
    const discount = num_(p.discount), net = total - discount, paid = num_(p.paid), balance = net - paid;
    if (net < 0 || paid < 0) throw new Error('Check amounts / रकम जांचें');
    const customer = str_(p.customer), phone = str_(p.phone);
    if (balance > 0.001 && !customer) throw new Error('Customer name needed for udhaar / उधार के लिए ग्राहक का नाम ज़रूरी');

    Object.keys(need).forEach(function (id) { setField_('Items', items[id]._row, 'stock', num_(items[id].stock) - need[id]); });
    if (customer) ensureCustomer_(customer, phone, '');
    const bill = nextNo_('Sales', 'bill', 'B');
    append_('Sales', {
      bill: bill, date: new Date(), customer: customer, phone: phone,
      items: billLines.map(function (b) { return b.name + ' x' + b.qty + ' @' + b.price; }).join('; '),
      total: total, discount: discount, net: net, paid: paid, balance: round2_(balance),
      cost: round2_(cost), profit: round2_(net - cost), ref: '', by: by, mode: mode_(p.mode),
      stockLines: JSON.stringify(Object.keys(need).map(function (id) { return { id: id, qty: need[id] }; }))
    });
    return {
      msg: 'Bill ' + bill + ' saved / सेव हुआ' + (added.length ? ' · added to item list: ' + added.join(', ') : ''),
      bill: { bill: bill, date: fmt_(new Date(), 'dd-MM-yyyy'), customer: customer, phone: phone, lines: billLines,
        total: total, discount: discount, net: net, paid: paid, balance: round2_(balance) }
    };
  });
}

function savePurchase(p) {
  return run_(function (by) {
    const kind = p.kind === 'Item' ? 'Item' : 'Raw';
    const sheet = kind === 'Item' ? 'Items' : 'RawMaterial';
    const it = byId_(readAll_(sheet))[str_(p.id)];
    if (!it) throw new Error('Select an item / आइटम चुनें');
    const qty = num_(p.qty), rate = num_(p.rate), paid = num_(p.paid);
    if (qty <= 0) throw new Error('Enter quantity / मात्रा डालें');
    const amount = round2_(qty * rate), balance = round2_(amount - paid);
    const supplier = str_(p.supplier);
    if (balance > 0.001 && !supplier) throw new Error('Supplier name needed when amount is due / बाकी हो तो सप्लायर का नाम ज़रूरी');

    if (supplier) ensureVyapari_(supplier, str_(p.phone));
    setField_(sheet, it._row, 'stock', round2_(num_(it.stock) + qty));
    if (rate > 0) setField_(sheet, it._row, kind === 'Item' ? 'cost' : 'rate', rate);
    append_('Purchases', {
      date: new Date(), supplier: supplier, phone: str_(p.phone), kind: kind, id: str_(it.id),
      name: kind === 'Item' ? label_(it) : str_(it.name), qty: qty, rate: rate, amount: amount,
      paid: paid, balance: balance, by: by, mode: mode_(p.mode)
    });
    return { msg: 'Purchase saved, stock +' + qty + ' / खरीद सेव हुई' };
  });
}

/** Make gadi (or any item with a recipe): uses raw material, adds finished stock. */
function makeGadi(p) {
  return run_(function (by) {
    let it = str_(p.id) ? byId_(readAll_('Items'))[str_(p.id)] : null, added = false;
    if (!it && str_(p.name)) {   // typed item that is not in the list: add it (made in shop, stock counted)
      const r = ensureItem_(p.name, { price: num_(p.price), cost: 0, made: 'Yes', track: 'Yes' });
      it = byId_(readAll_('Items'))[r.id]; added = r.created;
    }
    if (!it) throw new Error('Select an item / आइटम चुनें');
    const qty = num_(p.qty);
    if (qty <= 0) throw new Error('Enter quantity / संख्या डालें');
    let per = partsMap_(p.parts);
    if (!Object.keys(per).length) per = recipeOf_(it.id);
    if (!Object.keys(per).length) throw new Error('No recipe for this item. Set recipe first / पहले रेसिपी डालें');
    // Blank labour = same as last time for this item (so a forgotten field doesn't drop cost to material only).
    const labour = str_(p.labour) === '' ? (lastLabour_()[str_(it.id)] || 0) : num_(p.labour);
    make_(by, it, qty, per, labour, '', !!p.allowShort);
    keepRecipe_(it, per);
    return { msg: qty + ' x ' + label_(it) + ' made / बन गई' + (added ? ' · added to item list' : '') };
  });
}

/** [{rawId, qty}] → {rawId: qty per piece} */
function partsMap_(parts) {
  const per = {};
  (parts || []).forEach(function (pt) {
    if (str_(pt.rawId) && num_(pt.qty) > 0) per[str_(pt.rawId)] = (per[str_(pt.rawId)] || 0) + num_(pt.qty);
  });
  return per;
}

/** First time an item is made, remember what it used as its recipe. */
function keepRecipe_(it, per) {
  if (Object.keys(recipeOf_(it.id)).length) return;
  const raw = byId_(readAll_('RawMaterial'));
  Object.keys(per).forEach(function (rid) {
    append_('Recipe', { itemId: str_(it.id), itemName: label_(it), rawId: rid, rawName: str_((raw[rid] || {}).name), qty: per[rid] });
  });
}

/** Raw material per piece for an item: {rawId: qty}. */
function recipeOf_(itemId) {
  const per = {};
  readAll_('Recipe').forEach(function (r) {
    if (str_(r.itemId) === str_(itemId) && num_(r.qty) > 0) per[str_(r.rawId)] = (per[str_(r.rawId)] || 0) + num_(r.qty);
  });
  return per;
}

/**
 * Uses raw material (per = {rawId: qty per piece}) for qty pieces. If `it` is given, the pieces are added to
 * that item's stock and its cost is updated. Returns cost per piece (material + labour).
 */
function make_(by, it, qty, per, labour, ref, allowShort) {
  const raw = byId_(readAll_('RawMaterial'));
  const rawIds = Object.keys(per);
  const short = [];
  let materialCost = 0;
  rawIds.forEach(function (rid) {
    const rm = raw[rid];
    if (!rm) throw new Error('Raw material ' + rid + ' not found in RawMaterial tab');
    const needQty = round2_(per[rid] * qty);
    if (num_(rm.stock) < needQty) short.push(rm.name + ': need ' + needQty + ', have ' + num_(rm.stock));
    materialCost += per[rid] * num_(rm.rate);
  });
  // The app catches RAW_SHORT and asks "make anyway?" (raw stock may simply not be entered yet).
  if (short.length && !allowShort) throw new Error('RAW_SHORT: ' + short.join('; '));
  const used = [];
  rawIds.forEach(function (rid) {
    const rm = raw[rid], needQty = round2_(per[rid] * qty);
    setField_('RawMaterial', rm._row, 'stock', round2_(num_(rm.stock) - needQty));
    used.push(rm.name + ' ' + needQty + ' ' + str_(rm.unit));
  });
  const unitCost = round2_(materialCost + labour);
  if (it) {
    setField_('Items', it._row, 'stock', num_(it.stock) + qty);
    if (unitCost > 0) setField_('Items', it._row, 'cost', unitCost);
  }
  append_('Production', {
    date: new Date(), itemId: it ? str_(it.id) : '', itemName: it ? label_(it) : 'Custom (order ' + ref + ')', qty: qty,
    unitCost: unitCost, rawUsed: used.join('; '), by: by, labour: labour, ref: ref
  });
  return unitCost;
}

/**
 * Make the gadis for one order: uses raw material for the order's qty, records the making cost
 * on the order and marks it Ready. p.parts = [{rawId, qty per piece}] (defaults to the item's recipe).
 */
function makeForOrder(p) {
  return run_(function (by) {
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    if (o.status !== 'Pending') throw new Error('Order is already ' + o.status + ' / ऑर्डर पहले से ' + o.status);
    const it = str_(p.itemId) ? byId_(readAll_('Items'))[str_(p.itemId)] : null;
    if (str_(p.itemId) && !it) throw new Error('Item not found');
    const qty = num_(o.qty) || 1;
    let per = {};
    (p.parts || []).forEach(function (pt) {
      if (str_(pt.rawId) && num_(pt.qty) > 0) per[str_(pt.rawId)] = (per[str_(pt.rawId)] || 0) + num_(pt.qty);
    });
    if (!Object.keys(per).length && it) per = recipeOf_(it.id);
    if (!Object.keys(per).length) throw new Error('Enter raw material used / कच्चा माल लिखें');
    const labour = str_(p.labour) === '' ? (it ? (lastLabour_()[str_(it.id)] || 0) : 0) : num_(p.labour);
    const unitCost = make_(by, it, qty, per, labour, str_(o.no), !!p.allowShort);
    if (it) keepRecipe_(it, per);
    setField_('Orders', o._row, 'status', 'Ready');
    setField_('Orders', o._row, 'madeCost', round2_(unitCost * qty));
    setField_('Orders', o._row, 'itemId', it ? str_(it.id) : '');
    return { msg: 'Made ' + qty + ', order ready / ऑर्डर तैयार', orderNo: str_(o.no) };
  });
}

/** Replaces the recipe of one item. parts = [{rawId, qty}] */
function saveRecipe(p) {
  return run_(function () {
    const it = byId_(readAll_('Items'))[str_(p.itemId)];
    if (!it) throw new Error('Select an item / आइटम चुनें');
    const raw = byId_(readAll_('RawMaterial'));
    const old = readAll_('Recipe').filter(function (r) { return str_(r.itemId) === str_(it.id); })
      .map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
    old.forEach(function (row) { sh_('Recipe').deleteRow(row); });
    (p.parts || []).forEach(function (pt) {
      const rm = raw[str_(pt.rawId)];
      if (!rm || num_(pt.qty) <= 0) return;
      append_('Recipe', { itemId: str_(it.id), itemName: label_(it), rawId: str_(rm.id), rawName: str_(rm.name), qty: num_(pt.qty) });
    });
    return { msg: 'Recipe saved / रेसिपी सेव हुई' };
  });
}

function saveOrder(p) {
  return run_(function (by) {
    const customer = str_(p.customer), phone = str_(p.phone);
    if (!customer) throw new Error('Customer name needed / ग्राहक का नाम ज़रूरी');
    const qty = num_(p.qty) || 1, rate = num_(p.rate), weight = str_(p.weight);
    let itemId = str_(p.itemId), details = str_(p.details);
    if (!itemId && str_(p.what)) {   // custom order: add "what to make" to the item list for next time
      itemId = ensureItem_(p.what, { price: rate, cost: 0, made: 'Yes', track: 'Yes' }).id;
    }
    (Array.isArray(p.lines) ? p.lines : []).forEach(function (l) {   // order with several items
      if (!str_(l.itemId) && str_(l.name)) ensureItem_(l.name, { price: num_(l.rate), cost: 0, made: 'Yes', track: 'Yes' });
    });
    if (itemId) {
      const it = byId_(readAll_('Items'))[itemId];
      if (!it) throw new Error('Item not found');
      if (!details) details = qty + ' x ' + label_(it) + (weight ? ', ' + weight + ' kg' : '');
    }
    if (!details) throw new Error('Write order details / ऑर्डर का विवरण लिखें');
    const amount = str_(p.amount) !== '' ? num_(p.amount) : qty * rate;
    const advance = num_(p.advance);
    if (amount < 0 || advance < 0) throw new Error('Check amounts / रकम जांचें');
    if (amount > 0 && advance > amount) throw new Error('Advance is more than total / एडवांस कुल से ज़्यादा है');
    const delivery = str_(p.delivery);
    if (!delivery) throw new Error('Choose delivery date / डिलीवरी की तारीख चुनें');
    ensureCustomer_(customer, phone, str_(p.address));
    const no = nextNo_('Orders', 'no', 'O');
    append_('Orders', {
      no: no, date: new Date(), customer: customer, phone: phone, details: details,
      amount: amount, advance: advance, delivery: delivery,
      status: 'Pending', note: str_(p.note), bill: '', by: by, mode: mode_(p.mode),
      itemId: itemId, qty: qty, rate: rate, weight: weight
    });
    return { msg: 'Order ' + no + ' saved / ऑर्डर सेव हुआ', orderNo: no };
  });
}

/**
 * Fix a wrong entry in an open (Pending / Ready) order: delivery date, customer, details, total, advance, note.
 * Payments received later stay as they are; the total cannot go below what is already paid.
 */
function updateOrder(p) {
  return run_(function () {
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    if (o.status !== 'Pending' && o.status !== 'Ready') throw new Error('Only open orders can be edited / सिर्फ़ चालू ऑर्डर बदल सकते हैं');
    const customer = str_(p.customer), details = str_(p.details), delivery = str_(p.delivery);
    if (!customer) throw new Error('Customer name needed / ग्राहक का नाम ज़रूरी');
    if (!details) throw new Error('Write order details / ऑर्डर का विवरण लिखें');
    if (!delivery) throw new Error('Choose delivery date / डिलीवरी की तारीख चुनें');
    const amount = num_(p.amount), advance = num_(p.advance);
    if (amount < 0 || advance < 0) throw new Error('Check amounts / रकम जांचें');
    const payments = readAll_('Payments');
    const later = (orderPaid_([o], payments)[str_(o.no)] || 0) - num_(o.advance);
    if (amount > 0 && advance + later > amount + 0.5) {
      throw new Error('Total is less than already paid (₹' + round2_(advance + later) + ') / कुल रकम जमा से कम है');
    }
    ensureCustomer_(customer, p.phone, p.address);
    const f = { customer: customer, phone: str_(p.phone), details: details, amount: amount, advance: advance,
      mode: mode_(p.mode), delivery: delivery, note: str_(p.note) };
    if (str_(p.qty) !== '') f.qty = num_(p.qty) || 1;
    if (str_(p.rate) !== '') f.rate = num_(p.rate);
    if (p.weight !== undefined) f.weight = str_(p.weight);
    Object.keys(f).forEach(function (k) { setField_('Orders', o._row, k, f[k]); });
    if (key_(customer) !== key_(o.customer)) {   // keep this order's payments under the corrected name
      payments.forEach(function (r) {
        if (str_(r.orderNo) === str_(o.no) && (r.partyType === 'Order' || r.partyType === 'Refund')) setField_('Payments', r._row, 'party', customer);
      });
    }
    return { msg: 'Order ' + o.no + ' updated / ऑर्डर बदल गया', orderNo: str_(o.no) };
  });
}

function setOrderStatus(p) {
  return run_(function (by) {
    if (['Pending', 'Ready', 'Cancelled'].indexOf(p.status) < 0) throw new Error('Bad status');
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    if (o.status === 'Delivered' || o.status === 'Cancelled') throw new Error('Order is already ' + o.status);
    let msg = 'Order ' + o.no + ': ' + p.status;
    if (p.status === 'Cancelled') {
      const paid = orderPaid_([o], readAll_('Payments'))[str_(o.no)] || 0;
      const refund = num_(p.refund);
      if (refund < 0 || refund > paid + 0.5) throw new Error('Refund can be at most ₹' + paid + ' / वापसी ज़्यादा है');
      if (refund > 0) {
        append_('Payments', {
          date: new Date(), partyType: 'Refund', party: str_(o.customer), amount: refund, mode: mode_(p.mode),
          note: 'Order cancelled / ऑर्डर रद्द', by: by, ref: '', id: nextNo_('Payments', 'id', 'P'), orderNo: str_(o.no)
        });
        msg += ', refunded ₹' + refund + ' / वापस किए';
      } else if (paid > 0) msg += ', advance kept ₹' + paid + ' / एडवांस रखा';
      setField_('Orders', o._row, 'closed', new Date());
    }
    setField_('Orders', o._row, 'status', p.status);
    return { msg: msg };
  });
}

/** Delivers an order: creates a sale (advance counts as paid), optionally takes one item from stock. */
function deliverOrder(p) {
  return run_(function (by) {
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    if (o.status === 'Delivered' || o.status === 'Cancelled') throw new Error('Order is ' + o.status);
    let cost = num_(o.madeCost), itemText = '', stockLines = []; // cost recorded by "Make for this order" (custom gadi)
    // Take from stock: one item (itemId + qty) or several (lines: [{itemId, qty}])
    const take = (Array.isArray(p.lines) ? p.lines : [{ itemId: p.itemId, qty: p.qty }])
      .filter(function (l) { return str_(l.itemId); });
    if (take.length) {
      const items = byId_(readAll_('Items')), need = {};
      take.forEach(function (l) {
        if (!items[str_(l.itemId)]) throw new Error('Item not found');
        need[str_(l.itemId)] = (need[str_(l.itemId)] || 0) + (num_(l.qty) || 1);
      });
      Object.keys(need).forEach(function (id) {
        const it = items[id];
        if (tracked_(it) && num_(it.stock) < need[id]) throw new Error('Not enough stock / स्टॉक कम है: ' + label_(it) + ' (have ' + num_(it.stock) + ')');
      });
      cost = 0;
      const texts = [];
      Object.keys(need).forEach(function (id) {
        const it = items[id], q = need[id];
        cost += q * num_(it.cost);
        texts.push(label_(it) + ' x' + q);
        if (tracked_(it)) {
          setField_('Items', it._row, 'stock', num_(it.stock) - q);
          stockLines.push({ id: str_(it.id), qty: q });
        }
      });
      if (num_(o.madeCost) > 0 && !str_(o.itemId)) cost += num_(o.madeCost);
      itemText = ' [' + texts.join(', ') + ']';
    }
    const net = num_(o.amount), paidNow = num_(p.paidNow);
    const advance = orderPaid_([o], readAll_('Payments'))[str_(o.no)] || 0; // advance + payments before delivery
    const paid = advance + paidNow, balance = round2_(net - paid);
    const bill = nextNo_('Sales', 'bill', 'B');
    append_('Sales', {
      bill: bill, date: new Date(), customer: str_(o.customer), phone: str_(o.phone),
      items: 'Order ' + o.no + ': ' + str_(o.details) + itemText, total: net, discount: 0, net: net,
      paid: paid, balance: balance, cost: round2_(cost), profit: round2_(net - cost), ref: str_(o.no), by: by, mode: mode_(p.mode),
      stockLines: JSON.stringify(stockLines)
    });
    setField_('Orders', o._row, 'status', 'Delivered');
    setField_('Orders', o._row, 'closed', new Date());
    setField_('Orders', o._row, 'bill', bill);
    return {
      msg: 'Delivered, bill ' + bill + ' / डिलीवर हुआ',
      bill: { bill: bill, date: fmt_(new Date(), 'dd-MM-yyyy'), customer: str_(o.customer), phone: str_(o.phone),
        lines: orderBillLines_(o, net),
        total: net, discount: 0, net: net,
        paid: paid, balance: balance, advance: advance }
    };
  });
}

/** Bill lines for a delivered order. Several-item orders are stored as "2 x Pillow @ ₹200 = ₹400 | ...". */
function orderBillLines_(o, net) {
  const re = /^([\d.]+) x (.+?) @ ₹([\d,.]+)/;
  const parts = str_(o.details).split(' | '), lines = [];
  parts.forEach(function (t) {
    const m = t.match(re);
    if (m) lines.push({ name: m[2], qty: Number(m[1]), price: Number(m[3].replace(/,/g, '')) });
  });
  if (lines.length > 1) {
    const sum = lines.reduce(function (a, l) { return a + l.qty * l.price; }, 0);
    if (Math.abs(sum - net) > 0.01) lines.push({ name: 'Adjustment / बदलाव', qty: 1, price: round2_(net - sum) });
    return lines;
  }
  return (num_(o.qty) > 1 && Math.abs(num_(o.qty) * num_(o.rate) - net) < 0.01)
    ? [{ name: str_(o.details), qty: num_(o.qty), price: num_(o.rate) }]
    : [{ name: str_(o.details), qty: 1, price: net }];
}

function savePayment(p) {
  return run_(function (by) {
    const party = str_(p.party), amount = num_(p.amount);
    if (!party) throw new Error('Name needed / नाम ज़रूरी');
    if (amount <= 0) throw new Error('Enter amount / रकम डालें');
    const partyType = p.partyType === 'Supplier' ? 'Supplier' : 'Customer';
    const today = fmt_(new Date(), 'yyyy-MM-dd'), d = str_(p.date);
    if (d && d > today) throw new Error('Date cannot be in future / आगे की तारीख नहीं');
    if (partyType === 'Supplier') ensureVyapari_(party, ''); else ensureCustomer_(party, '', '');
    const id = nextNo_('Payments', 'id', 'P');
    append_('Payments', {
      date: (!d || d === today) ? new Date() : d, partyType: partyType, party: party, amount: amount,
      mode: mode_(p.mode), note: str_(p.note), by: by, ref: str_(p.ref), id: id
    });
    const out = { msg: 'Payment saved / भुगतान सेव हुआ' };
    if (partyType === 'Supplier') {
      SpreadsheetApp.flush();
      const st = vyapariStatement({ name: party });
      const row = st.rows.filter(function (r) { return r.receipt && r.receipt.no === id; })[0];
      if (row) out.receipt = row.receipt;
    }
    return out;
  });
}

/** Stock correction after counting (logged in StockLog). */
function adjustStock(p) {
  return run_(function (by) {
    const sheet = p.kind === 'Item' ? 'Items' : 'RawMaterial';
    const it = byId_(readAll_(sheet))[str_(p.id)];
    if (!it) throw new Error('Not found');
    const val = Number(p.stock);
    if (!isFinite(val) || val < 0 || str_(p.stock) === '') throw new Error('Enter correct stock / सही स्टॉक डालें');
    setField_(sheet, it._row, 'stock', val);
    append_('StockLog', { date: new Date(), kind: p.kind === 'Item' ? 'Item' : 'Raw', id: str_(it.id), name: p.kind === 'Item' ? label_(it) : str_(it.name), old: num_(it.stock), new: val, note: str_(p.note), by: by });
    return { msg: 'Stock updated / स्टॉक अपडेट हुआ' };
  });
}

/** Add a new item, or edit one when p.id is given (stock is changed only via purchase/make/correction). */
function saveItem(p) {
  return run_(function () {
    if (!str_(p.name)) throw new Error('Name needed / नाम ज़रूरी');
    const fields = {
      name: str_(p.name), type: str_(p.type), size: str_(p.size), material: str_(p.material),
      thickness: str_(p.thickness), cost: num_(p.cost), price: num_(p.price), low: num_(p.low),
      made: p.made === 'Yes' ? 'Yes' : 'No', track: p.track === 'No' ? 'No' : 'Yes'
    };
    if (str_(p.id)) {
      const it = byId_(readAll_('Items'))[str_(p.id)];
      if (!it) throw new Error('Item not found');
      Object.keys(fields).forEach(function (k) { setField_('Items', it._row, k, fields[k]); });
      return { msg: 'Item updated / आइटम अपडेट हुआ' };
    }
    fields.id = nextNo_('Items', 'id', 'I');
    fields.stock = num_(p.stock);
    append_('Items', fields);
    return { msg: 'Item added / आइटम जुड़ गया' };
  });
}

function saveRaw(p) {
  return run_(function () {
    if (!str_(p.name)) throw new Error('Name needed / नाम ज़रूरी');
    const fields = { name: str_(p.name), unit: str_(p.unit) || 'kg', rate: num_(p.rate), low: num_(p.low) };
    if (str_(p.id)) {
      const it = byId_(readAll_('RawMaterial'))[str_(p.id)];
      if (!it) throw new Error('Not found');
      Object.keys(fields).forEach(function (k) { setField_('RawMaterial', it._row, k, fields[k]); });
      return { msg: 'Updated / अपडेट हुआ' };
    }
    fields.id = nextNo_('RawMaterial', 'id', 'R');
    fields.stock = num_(p.stock);
    append_('RawMaterial', fields);
    return { msg: 'Raw material added / कच्चा माल जुड़ गया' };
  });
}

// ===================== Bahi Khata (cash book) =====================

function mode_(m) { return ['Cash', 'UPI', 'Bank', 'Cheque'].indexOf(str_(m)) >= 0 ? str_(m) : 'Cash'; }
/** Which balance a payment mode goes to: Cash = galla, everything else = bank/UPI. */
function acct_(m) { return (!str_(m) || str_(m) === 'Cash') ? 'Cash' : 'Bank'; }

function readSrc_() {
  return {
    sales: readAll_('Sales'), purchases: readAll_('Purchases'), orders: readAll_('Orders'),
    payments: readAll_('Payments'), cashbook: readAll_('Cashbook'), vyapari: readAll_('Vyapari'),
    customers: readAll_('Customers')
  };
}

/** Every rupee in/out from all tabs, oldest first. Each entry has cash/bank deltas. */
function ledger_(src) {
  const orderAdv = orderPaid_(src.orders, src.payments);
  const L = [];
  function add(date, text, cat, amt, dir, mode) {
    amt = round2_(amt);
    if (!(amt > 0)) return null;
    const e = { date: str_(date), text: text, cat: cat, amt: amt, dir: dir, mode: str_(mode) || 'Cash', cash: 0, bank: 0 };
    e[acct_(mode) === 'Cash' ? 'cash' : 'bank'] = dir === 'in' ? amt : -amt;
    L.push(e);
    return e;
  }
  src.sales.forEach(function (s) {
    const ref = str_(s.ref);
    add(s.date, (ref ? 'Delivery ' + ref + ' · ' : 'Sale ' + s.bill + ' · ') + (str_(s.customer) || 'Cash customer'),
      'Sale / बिक्री', num_(s.paid) - (ref ? (orderAdv[ref] || 0) : 0), 'in', s.mode);
  });
  src.orders.forEach(function (o) {
    add(o.date, 'Advance ' + o.no + ' · ' + o.customer, 'Order advance / एडवांस', num_(o.advance), 'in', o.mode);
  });
  src.purchases.forEach(function (p) {
    add(p.date, 'Purchase · ' + p.name + ' x' + p.qty + (str_(p.supplier) ? ' · ' + p.supplier : ''), 'Purchase / खरीद', num_(p.paid), 'out', p.mode);
  });
  src.payments.forEach(function (p) {
    if (p.partyType === 'Refund') {
      add(p.date, 'Refund ' + p.orderNo + ' · ' + p.party, 'Order refund / वापसी', num_(p.amount), 'out', p.mode);
      return;
    }
    if (p.partyType === 'Order') {
      add(p.date, 'Order payment ' + p.orderNo + ' · ' + p.party + (str_(p.ref) ? ' · Ref ' + p.ref : ''), 'Order payment / ऑर्डर भुगतान', num_(p.amount), 'in', p.mode);
      return;
    }
    const s = p.partyType === 'Supplier';
    add(p.date, (s ? 'Paid to ' : 'Received from ') + p.party + (str_(p.ref) ? ' · Ref ' + p.ref : '') + (str_(p.note) ? ' · ' + p.note : ''),
      s ? 'Supplier payment / सप्लायर भुगतान' : 'Udhaar received / उधार वसूली', num_(p.amount), s ? 'out' : 'in', p.mode);
  });
  src.cashbook.forEach(function (c) {
    const amt = round2_(num_(c.amount));
    if (!(amt > 0)) return;
    if (c.type === 'Transfer') {
      const toBank = str_(c.mode) !== 'Bank→Cash';
      L.push({ id: str_(c.id), manual: true, date: str_(c.date), text: (toBank ? 'Cash → Bank' : 'Bank → Cash') + (str_(c.note) ? ' · ' + c.note : ''),
        cat: 'Transfer', amt: amt, dir: 'transfer', mode: str_(c.mode), cash: toBank ? -amt : amt, bank: toBank ? amt : -amt });
      return;
    }
    const e = add(c.date, str_(c.category) + (str_(c.note) ? ' · ' + c.note : ''), str_(c.category), amt, c.type === 'In' ? 'in' : 'out', c.mode);
    if (e) { e.id = str_(c.id); e.manual = true; }
  });
  L.sort(function (a, b) { return a.date.localeCompare(b.date); });
  return L;
}

/** Day book for p.date and month summary for p.month. */
function getBahi(p) {
  guard_();
  p = p || {};
  const today = fmt_(new Date(), 'yyyy-MM-dd');
  const date = str_(p.date) || today, month = str_(p.month) || date.slice(0, 7);
  const src = readSrc_();
  const L = ledger_(src);
  const r = { date: date, month: month, cash: 0, bank: 0, openCash: 0, openBank: 0, closeCash: 0, closeBank: 0, dayIn: 0, dayOut: 0, day: [] };
  const m = { sales: 0, grossProfit: 0, otherIncome: 0, kept: 0, expenses: 0, home: 0, moneyIn: 0, moneyOut: 0, net: 0 };
  // Advance kept from orders cancelled this month counts as income.
  const paidMap = orderPaid_(src.orders, src.payments);
  src.orders.forEach(function (o) {
    if (o.status === 'Cancelled' && str_(o.closed).slice(0, 7) === month) m.kept += Math.max(0, paidMap[str_(o.no)] || 0);
  });
  const byCat = {};
  L.forEach(function (e) {
    const d = e.date.slice(0, 10);
    r.cash += e.cash; r.bank += e.bank;
    if (d < date) { r.openCash += e.cash; r.openBank += e.bank; }
    else if (d === date) {
      r.day.push(e);
      if (e.dir === 'in') r.dayIn += e.amt;
      if (e.dir === 'out') r.dayOut += e.amt;
    }
    if (d.slice(0, 7) === month) {
      if (e.dir === 'in') m.moneyIn += e.amt;
      if (e.dir === 'out') m.moneyOut += e.amt;
      if (e.manual && e.dir === 'in' && e.cat === OTHER_INCOME) m.otherIncome += e.amt;
      if (e.manual && e.dir === 'out') {
        if (e.cat === HOME_CAT) m.home += e.amt;
        if (!NOT_EXPENSE[e.cat]) { m.expenses += e.amt; byCat[e.cat] = (byCat[e.cat] || 0) + e.amt; }
      }
    }
  });
  src.sales.forEach(function (s) {
    if (str_(s.date).slice(0, 7) === month) { m.sales += num_(s.net); m.grossProfit += num_(s.profit); }
  });
  m.net = m.grossProfit + m.otherIncome + m.kept - m.expenses;
  r.closeCash = r.openCash; r.closeBank = r.openBank;
  r.day.forEach(function (e) { r.closeCash += e.cash; r.closeBank += e.bank; });
  ['cash', 'bank', 'openCash', 'openBank', 'closeCash', 'closeBank', 'dayIn', 'dayOut'].forEach(function (k) { r[k] = round2_(r[k]); });
  Object.keys(m).forEach(function (k) { m[k] = round2_(m[k]); });
  m.byCat = Object.keys(byCat).map(function (k) { return { cat: k, amt: round2_(byCat[k]) }; })
    .sort(function (a, b) { return b.amt - a.amt; });
  r.month_ = m;
  return r;
}

/** Manual bahi entry: p.type = In | Out | Transfer. */
function saveCashEntry(p) {
  return run_(function (by) {
    const type = ['In', 'Out', 'Transfer'].indexOf(p.type) >= 0 ? p.type : '';
    if (!type) throw new Error('Bad entry type');
    const amount = num_(p.amount);
    if (amount <= 0) throw new Error('Enter amount / रकम डालें');
    let category = str_(p.category), mode = mode_(p.mode);
    if (type === 'Transfer') { category = 'Transfer'; mode = str_(p.mode) === 'Bank→Cash' ? 'Bank→Cash' : 'Cash→Bank'; }
    else if ((type === 'In' ? IN_CATS : OUT_CATS).indexOf(category) < 0) throw new Error('Choose a category / खाता चुनें');
    const today = fmt_(new Date(), 'yyyy-MM-dd'), d = str_(p.date);
    if (d && d > today) throw new Error('Date cannot be in future / आगे की तारीख नहीं');
    append_('Cashbook', {
      id: nextNo_('Cashbook', 'id', 'C'), date: (!d || d === today) ? new Date() : d, type: type, category: category,
      amount: amount, mode: mode, note: str_(p.note), by: by
    });
    return { msg: 'Saved in bahi / बही में दर्ज' };
  });
}

function deleteCashEntry(p) {
  return run_(function () {
    const row = readAll_('Cashbook').filter(function (r) { return str_(r.id) === str_(p.id); })[0];
    if (!row) throw new Error('Entry not found');
    sh_('Cashbook').deleteRow(row._row);
    return { msg: 'Entry deleted / एंट्री हटाई' };
  });
}

// ===================== Vyapari (suppliers) =====================

/** Adds the vyapari to the master list if new; fills a missing phone. */
function ensureVyapari_(name, phone) {
  const k = key_(name);
  if (!k) return;
  const v = readAll_('Vyapari').filter(function (r) { return key_(r.name) === k; })[0];
  if (!v) {
    append_('Vyapari', { id: nextNo_('Vyapari', 'id', 'V'), name: str_(name), phone: str_(phone), city: '', opening: 0, note: '' });
  } else if (!str_(v.phone) && str_(phone)) {
    setField_('Vyapari', v._row, 'phone', str_(phone));
  }
}

/** Add a vyapari, or edit one when p.id is given (name stays the same so old entries stay linked). */
function saveVyapari(p) {
  return run_(function () {
    const list = readAll_('Vyapari');
    if (str_(p.id)) {
      const v = list.filter(function (r) { return str_(r.id) === str_(p.id); })[0];
      if (!v) throw new Error('Vyapari not found');
      setField_('Vyapari', v._row, 'phone', str_(p.phone));
      setField_('Vyapari', v._row, 'city', str_(p.city));
      setField_('Vyapari', v._row, 'opening', num_(p.opening));
      setField_('Vyapari', v._row, 'note', str_(p.note));
      return { msg: 'Vyapari updated / अपडेट हुआ' };
    }
    const name = str_(p.name);
    if (!name) throw new Error('Name needed / नाम ज़रूरी');
    if (list.some(function (r) { return key_(r.name) === key_(name); })) throw new Error('Already in list / पहले से है: ' + name);
    append_('Vyapari', { id: nextNo_('Vyapari', 'id', 'V'), name: name, phone: str_(p.phone), city: str_(p.city), opening: num_(p.opening), note: str_(p.note) });
    return { msg: 'Vyapari added / व्यापारी जुड़ गया' };
  });
}

function dmy_(s) { s = str_(s); return s.length >= 10 ? s.slice(8, 10) + '-' + s.slice(5, 7) + '-' + s.slice(0, 4) : s; }

/** Full hisab of one vyapari: totals and date-wise entries (newest first) with running balance. */
function vyapariStatement(p) {
  guard_();
  const k = key_(p.name);
  const v = readAll_('Vyapari').filter(function (r) { return key_(r.name) === k; })[0] || {};
  let phone = str_(v.phone);
  const rows = [];
  readAll_('Purchases').forEach(function (r) {
    if (key_(r.supplier) !== k) return;
    if (!phone && str_(r.phone)) phone = str_(r.phone);
    rows.push({ date: str_(r.date), text: 'Maal / खरीद: ' + r.name + ' x' + r.qty + ' @ ₹' + r.rate, debit: num_(r.amount), credit: 0 });
    if (num_(r.paid) > 0) rows.push({ date: str_(r.date), text: 'Paid with purchase / खरीद पर दिया (' + (str_(r.mode) || 'Cash') + ')', debit: 0, credit: num_(r.paid) });
  });
  readAll_('Payments').forEach(function (r) {
    if (r.partyType !== 'Supplier' || key_(r.party) !== k) return;
    rows.push({
      date: str_(r.date), debit: 0, credit: num_(r.amount),
      text: 'Payment / भुगतान (' + (str_(r.mode) || 'Cash') + ')' + (str_(r.ref) ? ' Ref ' + r.ref : '') + (str_(r.note) ? ' · ' + r.note : ''),
      pay: { no: str_(r.id), mode: str_(r.mode) || 'Cash', ref: str_(r.ref), note: str_(r.note), amount: num_(r.amount) }
    });
  });
  rows.sort(function (a, b) { return a.date.localeCompare(b.date); });
  const name = str_(v.name) || str_(p.name);
  let bal = num_(v.opening), purchased = 0, paid = 0;
  rows.forEach(function (r) {
    const before = bal;
    bal = round2_(bal + r.debit - r.credit);
    r.balance = bal;
    purchased += r.debit; paid += r.credit;
    if (r.pay) {
      r.receipt = { no: r.pay.no, date: dmy_(r.date), party: name, phone: phone, amount: r.pay.amount, mode: r.pay.mode,
        ref: r.pay.ref, note: r.pay.note, before: round2_(before), after: bal };
      delete r.pay;
    }
  });
  return {
    name: name, id: str_(v.id), phone: phone, city: str_(v.city), note: str_(v.note), opening: num_(v.opening),
    purchased: round2_(purchased), paid: round2_(paid), pending: bal, rows: rows.reverse()
  };
}

// ===================== Customers (grahak database) =====================

function phone10_(p) { const d = str_(p).replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : d; }

/** Finds a customer by mobile (or by name when no mobile); adds if new, fills missing details. */
function ensureCustomer_(name, phone, address) {
  name = str_(name); const ph = phone10_(phone);
  if (!name && !ph) return;
  const list = readAll_('Customers');
  let c = null;
  if (ph) c = list.filter(function (r) { return phone10_(r.phone) === ph; })[0];
  if (!c && name) c = list.filter(function (r) { return key_(r.name) === key_(name) && (!ph || !phone10_(r.phone)); })[0];
  if (!c) {
    append_('Customers', { id: nextNo_('Customers', 'id', 'CU'), name: name, phone: ph, address: str_(address), note: '', since: new Date() });
    return;
  }
  if (ph && !phone10_(c.phone)) setField_('Customers', c._row, 'phone', ph);
  if (name && !str_(c.name)) setField_('Customers', c._row, 'name', name);
  if (str_(address) && !str_(c.address)) setField_('Customers', c._row, 'address', str_(address));
}

/** Adds customers from old sales/orders that are not in the Customers tab yet. */
function backfillCustomers_() {
  readAll_('Orders').forEach(function (o) { ensureCustomer_(o.customer, o.phone, ''); });
  readAll_('Sales').forEach(function (s) { if (str_(s.customer)) ensureCustomer_(s.customer, s.phone, ''); });
}

/** Customer list for the app with order count, last visit and udhaar. */
function clients_(src, udhaarList) {
  const udhaar = {};
  udhaarList.forEach(function (c) { udhaar[key_(c.name)] = c.balance; });
  return src.customers.filter(function (c) { return str_(c.name) || str_(c.phone); }).map(function (c) {
    const ph = phone10_(c.phone), k = key_(c.name);
    const match = function (r) { return (ph && phone10_(r.phone) === ph) || (k && key_(r.customer) === k); };
    let orders = 0, open = 0, last = str_(c.since).slice(0, 10), business = 0;
    src.orders.forEach(function (o) {
      if (!match(o)) return;
      orders++;
      if (o.status === 'Pending' || o.status === 'Ready') open++;
      if (str_(o.date).slice(0, 10) > last) last = str_(o.date).slice(0, 10);
    });
    src.sales.forEach(function (s) {
      if (!match(s)) return;
      business += num_(s.net);
      if (str_(s.date).slice(0, 10) > last) last = str_(s.date).slice(0, 10);
    });
    return { id: str_(c.id), name: str_(c.name), phone: ph, address: str_(c.address), note: str_(c.note), opening: num_(c.opening),
      orders: orders, open: open, last: last, business: round2_(business), udhaar: udhaar[k] || 0 };
  }).sort(function (a, b) { return b.last.localeCompare(a.last); });
}

function saveCustomer(p) {
  return run_(function () {
    const name = str_(p.name), ph = phone10_(p.phone);
    if (!name) throw new Error('Name needed / नाम ज़रूरी');
    const list = readAll_('Customers');
    if (ph && list.some(function (r) { return phone10_(r.phone) === ph && str_(r.id) !== str_(p.id); })) {
      throw new Error('This mobile is already saved / यह नंबर पहले से है');
    }
    if (str_(p.id)) {
      const c = list.filter(function (r) { return str_(r.id) === str_(p.id); })[0];
      if (!c) throw new Error('Customer not found');
      setField_('Customers', c._row, 'phone', ph);
      setField_('Customers', c._row, 'address', str_(p.address));
      setField_('Customers', c._row, 'note', str_(p.note));
      setField_('Customers', c._row, 'opening', num_(p.opening));
      return { msg: 'Customer updated / अपडेट हुआ' };
    }
    append_('Customers', { id: nextNo_('Customers', 'id', 'CU'), name: name, phone: ph, address: str_(p.address), note: str_(p.note), since: new Date(), opening: num_(p.opening) });
    return { msg: 'Customer added / ग्राहक जुड़ गया' };
  });
}

/** Everything about one customer: orders, bills, payments, udhaar. */
function customerProfile(p) {
  guard_();
  const c = readAll_('Customers').filter(function (r) { return str_(r.id) === str_(p.id); })[0];
  if (!c) throw new Error('Customer not found');
  const ph = phone10_(c.phone), k = key_(c.name);
  const match = function (r) { return (ph && phone10_(r.phone) === ph) || (k && key_(r.customer) === k); };
  const allPay = readAll_('Payments');
  const orders = readAll_('Orders').filter(match).reverse();
  const paidMap = orderPaid_(orders, allPay);
  orders.forEach(function (o) { o.paid = paidMap[str_(o.no)] || 0; });
  const sales = readAll_('Sales').filter(match).reverse();
  const payments = allPay.filter(function (r) { return r.partyType === 'Customer' && key_(r.party) === k; }).reverse();
  let udhaar = num_(c.opening), business = 0;
  sales.forEach(function (s) { udhaar += num_(s.balance); business += num_(s.net); });
  payments.forEach(function (r) { udhaar -= num_(r.amount); });
  return {
    id: str_(c.id), name: str_(c.name), phone: ph, address: str_(c.address), note: str_(c.note), since: str_(c.since).slice(0, 10),
    udhaar: round2_(udhaar), opening: num_(c.opening), business: round2_(business), orders: orders, sales: sales, payments: payments
  };
}

// ===================== Order payments (before delivery) =====================

/** Money received for each order before delivery: advance + later payments. */
function orderPaid_(orders, payments) {
  const m = {};
  orders.forEach(function (o) { m[str_(o.no)] = num_(o.advance); });
  payments.forEach(function (p) {
    if (!m.hasOwnProperty(str_(p.orderNo))) return;
    if (p.partyType === 'Order') m[str_(p.orderNo)] += num_(p.amount);
    if (p.partyType === 'Refund') m[str_(p.orderNo)] -= num_(p.amount);
  });
  Object.keys(m).forEach(function (k) { m[k] = round2_(m[k]); });
  return m;
}

/** Customer pays part or all of the remaining amount before taking delivery. */
function saveOrderPayment(p) {
  return run_(function (by) {
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    if (o.status === 'Delivered' || o.status === 'Cancelled') throw new Error('Order is ' + o.status);
    const amount = num_(p.amount);
    if (amount <= 0) throw new Error('Enter amount / रकम डालें');
    const before = orderPaid_([o], readAll_('Payments'))[str_(o.no)];
    const remaining = round2_(num_(o.amount) - before);
    if (amount > remaining + 0.5) throw new Error('More than remaining (₹' + remaining + ') / बाकी से ज़्यादा');
    const id = nextNo_('Payments', 'id', 'P');
    append_('Payments', {
      date: new Date(), partyType: 'Order', party: str_(o.customer), amount: amount, mode: mode_(p.mode),
      note: str_(p.note), by: by, ref: str_(p.ref), id: id, orderNo: str_(o.no)
    });
    return { msg: '₹' + amount + ' received / मिले', orderNo: str_(o.no), received: { amount: amount, mode: mode_(p.mode), ref: str_(p.ref) } };
  });
}

/** Last labour per piece used for each item, from the Production tab. */
function lastLabour_() {
  const m = {};
  readAll_('Production').forEach(function (r) { if (str_(r.labour) !== '') m[str_(r.itemId)] = num_(r.labour); });
  return m;
}

// ===================== Reports (screen, PDF, Excel) =====================

const REPORT_SECTIONS = ['summary', 'bahi', 'sales', 'orders', 'purchases', 'expenses', 'udhaar', 'vyapari', 'stock'];

function inRange_(d, from, to) { const x = str_(d).slice(0, 10); return x >= from && x <= to; }

/** On-screen report. p = {from:'yyyy-MM-dd', to:'yyyy-MM-dd', sections:[...]} */
function getReport(p) { guard_(); return reportData_(p); }

/**
 * Builds all report numbers for the period as generic tables, used by both the screen and the PDF/Excel export.
 * Each group = {key, sheet, title, tables:[{title, headers, rows, money:[col], rowMoney:[bool], total:[...]}]}
 */
function reportData_(p) {
  p = p || {};
  const from = str_(p.from), to = str_(p.to);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new Error('Choose a correct date range / सही तारीख चुनें');
  }
  const want = {};
  ((p.sections && p.sections.length) ? p.sections : REPORT_SECTIONS).forEach(function (s) { want[s] = true; });
  const src = readSrc_();
  const L = ledger_(src);
  const paidMap = orderPaid_(src.orders, src.payments);
  const r2 = round2_;
  const groups = [];

  // ---- cash book for the period
  let openCash = 0, openBank = 0, moneyIn = 0, moneyOut = 0;
  const period = [];
  L.forEach(function (e) {
    const d = e.date.slice(0, 10);
    if (d < from) { openCash += e.cash; openBank += e.bank; }
    else if (d <= to) {
      period.push(e);
      if (e.dir === 'in') moneyIn += e.amt;
      if (e.dir === 'out') moneyOut += e.amt;
    }
  });
  let runC = openCash, runB = openBank;
  const bahiRows = period.map(function (e) {
    runC += e.cash; runB += e.bank;
    return [dmyTime_(e.date), e.text, e.dir === 'transfer' ? 'Transfer' : e.cat, e.mode,
      e.dir === 'in' ? e.amt : 0, e.dir === 'out' ? e.amt : 0, r2(runC), r2(runB)];
  });

  // ---- sales, manual entries, orders, purchases in the period
  const sales = src.sales.filter(function (s) { return inRange_(s.date, from, to); });
  const S = { count: sales.length, net: 0, discount: 0, balance: 0, profit: 0 };
  sales.forEach(function (s) { S.net += num_(s.net); S.discount += num_(s.discount); S.balance += num_(s.balance); S.profit += num_(s.profit); });
  const manual = src.cashbook.filter(function (c) { return inRange_(c.date, from, to) && num_(c.amount) > 0; });
  let otherIncome = 0, expenses = 0, home = 0;
  const byCat = {};
  manual.forEach(function (c) {
    const a = num_(c.amount);
    if (c.type === 'In' && str_(c.category) === OTHER_INCOME) otherIncome += a;
    if (c.type === 'Out') {
      if (str_(c.category) === HOME_CAT) home += a;
      if (!NOT_EXPENSE[str_(c.category)]) { expenses += a; byCat[str_(c.category)] = (byCat[str_(c.category)] || 0) + a; }
    }
  });
  const ordersTaken = src.orders.filter(function (o) { return inRange_(o.date, from, to); });
  let orderValue = 0, orderAdv = 0, kept = 0, cancelled = 0;
  ordersTaken.forEach(function (o) { orderValue += num_(o.amount); orderAdv += num_(o.advance); });
  src.orders.forEach(function (o) {
    if (o.status === 'Cancelled' && inRange_(o.closed, from, to)) { cancelled++; kept += Math.max(0, paidMap[str_(o.no)] || 0); }
  });
  const delivered = sales.filter(function (s) { return str_(s.ref); }).length;
  const openOrders = src.orders.filter(function (o) { return o.status === 'Pending' || o.status === 'Ready'; });
  let toCollect = 0;
  openOrders.forEach(function (o) { toCollect += Math.max(0, num_(o.amount) - (paidMap[str_(o.no)] || 0)); });
  const purchases = src.purchases.filter(function (x) { return inRange_(x.date, from, to); });
  let purAmt = 0, purPaid = 0, suppPaid = 0;
  purchases.forEach(function (x) { purAmt += num_(x.amount); purPaid += num_(x.paid); });
  src.payments.forEach(function (x) { if (x.partyType === 'Supplier' && inRange_(x.date, from, to)) suppPaid += num_(x.amount); });

  // ---- dues as on the last day of the period
  const upto = function (x) { return str_(x.date).slice(0, 10) <= to; };
  const dues = parties_(src.sales.filter(upto), src.purchases.filter(upto), src.payments.filter(upto), src.vyapari, src.customers);
  let toTake = 0, toPay = 0;
  dues.customers.forEach(function (c) { if (c.balance > 0.5) toTake += c.balance; });
  dues.suppliers.forEach(function (c) { if (c.balance > 0.5) toPay += c.balance; });

  const net = S.profit + otherIncome + kept - expenses;
  const toD = dmy_(to);

  if (want.summary) {
    const t = function (title, rows) {   // rows: [label, value, isMoney]
      return { title: title, headers: ['', ''], rows: rows.map(function (r) { return [r[0], r2(r[1])]; }),
        rowMoney: rows.map(function (r) { return r[2] !== false; }) };
    };
    groups.push({ key: 'summary', sheet: 'Summary', title: 'Summary · सारांश', tables: [
      t('Sales · बिक्री', [['Bills · बिल', S.count, false], ['Total sale · कुल बिक्री', S.net], ['Discount given · छूट', S.discount],
        ['Udhaar given in these bills · उधार दिया', S.balance], ['Profit on sales · बिक्री का मुनाफ़ा', S.profit]]),
      t('Profit & Loss · नफ़ा-नुकसान', [['Profit on sales', S.profit], ['+ Other income · अन्य आमदनी', otherIncome],
        ['+ Advance kept (cancelled orders) · रखा एडवांस', kept], ['− Shop expenses · दुकान खर्च', expenses],
        ['= Net profit · असली मुनाफ़ा', net], ['Taken for home · घर खर्च', home]]),
      t('Cash & Bank · रोकड़', [['Opening cash · शुरुआती नकद', openCash], ['Opening bank / UPI · शुरुआती बैंक', openBank],
        ['Money in · आया', moneyIn], ['Money out · गया', moneyOut], ['Closing cash · बंद नकद', runC], ['Closing bank / UPI · बंद बैंक', runB]]),
      t('Orders · ऑर्डर', [['Orders taken · नए ऑर्डर', ordersTaken.length, false], ['Value of orders taken · ऑर्डर की रकम', orderValue],
        ['Advance on those orders · एडवांस', orderAdv], ['Orders delivered · डिलीवर हुए', delivered, false],
        ['Orders cancelled · रद्द', cancelled, false], ['Open orders now · चालू ऑर्डर', openOrders.length, false],
        ['To collect on open orders · लेना है', toCollect]]),
      t('Purchases · खरीद', [['Purchases · खरीद', purchases.length, false], ['Purchase amount · रकम', purAmt],
        ['Paid at purchase · खरीद पर दिया', purPaid], ['Paid to vyaparis later · व्यापारी को दिया', suppPaid]]),
      t('Dues as on ' + toD + ' · बाकी', [['Customers owe us · ग्राहकों से लेना', toTake], ['We owe vyaparis · व्यापारियों को देना', toPay]])
    ] });
  }

  if (want.bahi) {
    groups.push({ key: 'bahi', sheet: 'Bahi Khata', title: 'Bahi Khata (cash book) · बही खाता', tables: [{
      title: '', headers: ['Date / तारीख', 'Particulars / विवरण', 'Category / खाता', 'Mode / तरीका', 'In / आया', 'Out / गया', 'Cash / नकद', 'Bank / बैंक'],
      rows: [['', 'Opening balance / शुरुआती', '', '', '', '', r2(openCash), r2(openBank)]].concat(bahiRows),
      money: [4, 5, 6, 7],
      total: ['', 'Total & closing / कुल और बंद', '', '', r2(moneyIn), r2(moneyOut), r2(runC), r2(runB)]
    }] });
  }

  if (want.sales) {
    groups.push({ key: 'sales', sheet: 'Sales', title: 'Sales · बिक्री', tables: [{
      title: '', headers: ['Bill', 'Date / तारीख', 'Customer / ग्राहक', 'Mobile', 'Items / सामान', 'Total / कुल', 'Discount / छूट',
        'Net / देय', 'Paid / जमा', 'Balance / बाकी', 'Profit / मुनाफ़ा', 'Mode'],
      rows: sales.map(function (s) {
        return [str_(s.bill), dmyTime_(s.date), str_(s.customer) || 'Cash customer', str_(s.phone), str_(s.items), num_(s.total), num_(s.discount),
          num_(s.net), num_(s.paid), num_(s.balance), num_(s.profit), str_(s.mode) || 'Cash'];
      }),
      money: [5, 6, 7, 8, 9, 10],
      total: sumRow_(sales.length + ' bills', 12, [5, 6, 7, 8, 9, 10], sales.map(function (s) {
        return [0, 0, 0, 0, 0, num_(s.total), num_(s.discount), num_(s.net), num_(s.paid), num_(s.balance), num_(s.profit)];
      }))
    }] });
  }

  if (want.orders) {
    groups.push({ key: 'orders', sheet: 'Orders', title: 'Orders taken in this period · ऑर्डर', tables: [{
      title: '', headers: ['Order', 'Date / तारीख', 'Customer / ग्राहक', 'Mobile', 'Details / विवरण', 'Delivery / डिलीवरी', 'Status / स्थिति',
        'Amount / रकम', 'Paid / जमा', 'Remaining / बाकी'],
      rows: ordersTaken.map(function (o) {
        const paid = paidMap[str_(o.no)] || 0;
        const left = (o.status === 'Delivered' || o.status === 'Cancelled') ? 0 : Math.max(0, num_(o.amount) - paid);
        return [str_(o.no), dmy_(o.date), str_(o.customer), str_(o.phone), str_(o.details), dmy_(o.delivery), str_(o.status),
          num_(o.amount), r2(paid), r2(left)];
      }),
      money: [7, 8, 9]
    }] });
    const t = groups[groups.length - 1].tables[0];
    t.total = sumRow_(t.rows.length + ' orders', 10, [7, 8, 9], t.rows);
  }

  if (want.purchases) {
    groups.push({ key: 'purchases', sheet: 'Purchases', title: 'Purchases · खरीद', tables: [{
      title: '', headers: ['Date / तारीख', 'Vyapari / व्यापारी', 'Item / माल', 'Qty / मात्रा', 'Rate / दाम', 'Amount / रकम',
        'Paid / दिया', 'Balance / बाकी', 'Mode'],
      rows: purchases.map(function (x) {
        return [dmy_(x.date), str_(x.supplier), str_(x.name), num_(x.qty), num_(x.rate), num_(x.amount), num_(x.paid), num_(x.balance), str_(x.mode) || 'Cash'];
      }),
      money: [4, 5, 6, 7]
    }] });
    const t = groups[groups.length - 1].tables[0];
    t.total = sumRow_(t.rows.length + ' purchases', 9, [5, 6, 7], t.rows);
  }

  if (want.expenses) {
    const rows = manual.map(function (c) {
      return [dmy_(c.date), c.type === 'In' ? 'Money in / आया' : c.type === 'Out' ? 'Out / गया' : 'Transfer',
        c.type === 'Transfer' ? str_(c.mode) : str_(c.category), c.type === 'Transfer' ? '' : (str_(c.mode) || 'Cash'), num_(c.amount), str_(c.note)];
    });
    const catRows = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; }).map(function (k) { return [k, r2(byCat[k])]; });
    groups.push({ key: 'expenses', sheet: 'Expenses', title: 'Expenses & other entries · खर्चे', tables: [
      { title: 'Shop expenses by category · खर्च खाते अनुसार', headers: ['Category / खाता', 'Amount / रकम'], rows: catRows, money: [1],
        total: ['Total shop expenses', r2(expenses)] },
      { title: 'All entries · सभी एंट्री', headers: ['Date / तारीख', 'Type', 'Category / खाता', 'Mode', 'Amount / रकम', 'Note / नोट'], rows: rows, money: [4] }
    ] });
  }

  if (want.udhaar) {
    const rows = dues.customers.filter(function (c) { return c.balance > 0.5; }).map(function (c) { return [c.name, c.phone, c.balance]; });
    groups.push({ key: 'udhaar', sheet: 'Udhaar', title: 'Customer udhaar as on ' + toD + ' · ग्राहक उधार', tables: [{
      title: '', headers: ['Customer / ग्राहक', 'Mobile', 'Udhaar / बाकी'], rows: rows, money: [2],
      total: [rows.length + ' customers', '', r2(toTake)] }] });
  }

  if (want.vyapari) {
    const rows = dues.suppliers.filter(function (v) { return Math.abs(v.balance) > 0.5 || v.purchased > 0; }).map(function (v) {
      return [v.name, v.phone, v.city, r2(v.purchased + v.opening), v.paid, v.balance];
    });
    groups.push({ key: 'vyapari', sheet: 'Vyapari', title: 'Vyapari dues as on ' + toD + ' · व्यापारी बाकी', tables: [{
      title: '', headers: ['Vyapari / व्यापारी', 'Mobile', 'City / शहर', 'Maal incl. old due / माल', 'Paid / दिया', 'Pending / बाकी'],
      rows: rows, money: [3, 4, 5] }] });
    const t = groups[groups.length - 1].tables[0];
    t.total = sumRow_(rows.length + ' vyaparis', 6, [3, 4, 5], rows);
  }

  if (want.stock) {
    const items = readAll_('Items').filter(function (i) { return str_(i.id); });
    const raw = readAll_('RawMaterial').filter(function (i) { return str_(i.id); });
    const made = readAll_('Production').filter(function (x) { return inRange_(x.date, from, to); });
    const itRows = items.map(function (i) {
      return [label_(i), num_(i.stock), num_(i.cost), r2(num_(i.stock) * num_(i.cost)), num_(i.price), r2(num_(i.stock) * num_(i.price))];
    });
    const rwRows = raw.map(function (i) { return [str_(i.name), str_(i.unit), num_(i.stock), num_(i.rate), r2(num_(i.stock) * num_(i.rate))]; });
    const mkRows = made.map(function (x) { return [dmy_(x.date), str_(x.itemName), num_(x.qty), num_(x.unitCost), r2(num_(x.qty) * num_(x.unitCost)), str_(x.rawUsed), str_(x.ref)]; });
    groups.push({ key: 'stock', sheet: 'Stock', title: 'Stock · स्टॉक', tables: [
      { title: 'Ready items (current) · तैयार माल', headers: ['Item / आइटम', 'Stock', 'Cost / लागत', 'Stock value at cost', 'Sell price', 'Stock value at sell price'],
        rows: itRows, money: [2, 3, 4, 5], total: sumRow_('Total', 6, [1, 3, 5], itRows) },
      { title: 'Raw material (current) · कच्चा माल', headers: ['Raw material / कच्चा माल', 'Unit', 'Stock', 'Rate / दाम', 'Value / कीमत'],
        rows: rwRows, money: [3, 4], total: sumRow_('Total', 5, [4], rwRows) },
      { title: 'Made in this period · इस अवधि में बना', headers: ['Date', 'Item / आइटम', 'Qty', 'Cost / pc', 'Total cost', 'Raw used / माल', 'Order'],
        rows: mkRows, money: [3, 4], total: sumRow_('Total', 7, [2, 4], mkRows) }
    ] });
  }

  return {
    from: from, to: to, generated: fmt_(new Date(), 'dd-MM-yyyy HH:mm'),
    shop: { name: SHOP_NAME, owner: SHOP_OWNER, address: SHOP_ADDRESS, phone: SHOP_PHONE },
    groups: groups
  };
}

function sumRow_(label, width, cols, rows) {
  const out = [];
  for (let i = 0; i < width; i++) out.push('');
  out[0] = label;
  cols.forEach(function (c) { let t = 0; rows.forEach(function (r) { t += num_(r[c]); }); out[c] = round2_(t); });
  return out;
}
function dmyTime_(s) { s = str_(s); return s.length > 10 ? dmy_(s) + s.slice(10) : dmy_(s); }

/** Makes a PDF or Excel file of the report in the user's Drive and returns its links. p.format = 'pdf' | 'xlsx' */
function exportReport(p) {
  guard_();
  const R = reportData_(p);
  const ext = p.format === 'pdf' ? 'pdf' : 'xlsx';
  const name = SHOP_NAME + ' Report ' + dmy_(R.from) + (R.from !== R.to ? ' to ' + dmy_(R.to) : '');
  const tmp = SpreadsheetApp.create(name);
  try {
    tmp.setSpreadsheetTimeZone(TZ);
    R.groups.forEach(function (g, i) {
      const sh = i === 0 ? tmp.getSheets()[0].setName(g.sheet) : tmp.insertSheet(g.sheet);
      writeReportSheet_(sh, g, R);
    });
    SpreadsheetApp.flush();
    const q = ext === 'pdf'
      ? 'format=pdf&size=A4&portrait=false&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=CENTER&fzr=true' +
        '&top_margin=0.5&bottom_margin=0.5&left_margin=0.4&right_margin=0.4'
      : 'format=xlsx';
    const resp = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?' + q,
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Could not make the file (error ' + resp.getResponseCode() + '). Please try again.');
    const blob = resp.getBlob().setName(name + '.' + ext);
    const file = reportFolder_().createFile(blob);
    const out = { name: file.getName(), url: file.getUrl(), download: 'https://drive.google.com/uc?export=download&id=' + file.getId() };
    if (API_USER) {   // Android app: send the file itself, since the Drive copy belongs to the owner's account
      out.data64 = Utilities.base64Encode(blob.getBytes());
      out.mime = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return out;
  } finally {
    try { DriveApp.getFileById(tmp.getId()).setTrashed(true); } catch (e) { /* temporary sheet stays in Drive; harmless */ }
  }
}

function reportFolder_() {
  const n = SHOP_NAME + ' Reports';
  const it = DriveApp.getFoldersByName(n);
  return it.hasNext() ? it.next() : DriveApp.createFolder(n);
}

/** Writes one report group onto a sheet with a title, period line, bold headers, ₹ formats and totals. */
function writeReportSheet_(sh, g, R) {
  const width = Math.max.apply(null, g.tables.map(function (t) { return t.headers.length; }).concat([2]));
  const cell = function (v) { return typeof v === 'string' && v !== '' ? "'" + v : v; };   // keep text as text
  const MONEY = '"₹"#,##0';
  let r = 1;
  sh.getRange(r, 1).setValue(cell(R.shop.name + ' · ' + g.title)).setFontSize(14).setFontWeight('bold').setFontColor('#1f4e79');
  r++;
  sh.getRange(r, 1).setValue(cell('Period: ' + dmy_(R.from) + (R.from !== R.to ? ' to ' + dmy_(R.to) : '') +
    '   ·   ' + R.shop.address + ' · ' + R.shop.phone + '   ·   Made on ' + R.generated)).setFontColor('#5a6573');
  r += 2;
  g.tables.forEach(function (t) {
    if (t.title) { sh.getRange(r, 1).setValue(cell(t.title)).setFontWeight('bold').setFontSize(12); r++; }
    const isSummary = t.headers.every(function (h) { return !h; });
    if (!isSummary) {
      sh.getRange(r, 1, 1, t.headers.length).setValues([t.headers.map(cell)])
        .setFontWeight('bold').setBackground('#1f4e79').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
      r++;
    }
    const rows = t.rows.length ? t.rows : [['No entries / कोई एंट्री नहीं'].concat(new Array(t.headers.length - 1).fill(''))];
    if (rows.length) {
      const startRow = r;
      sh.getRange(r, 1, rows.length, t.headers.length).setValues(rows.map(function (row) { return row.map(cell); }));
      (t.money || []).forEach(function (c) { sh.getRange(startRow, c + 1, rows.length, 1).setNumberFormat(MONEY); });
      if (t.rowMoney) t.rowMoney.forEach(function (m, i) { if (m) sh.getRange(startRow + i, 2).setNumberFormat(MONEY); });
      if (isSummary) {
        sh.getRange(startRow, 2, rows.length, 1).setFontWeight('bold');
        rows.forEach(function (row, i) { if (/^=/.test(String(row[0]))) sh.getRange(startRow + i, 1, 1, 2).setBackground('#eaf6ee'); });
      }
      r += rows.length;
    }
    if (t.total) {
      sh.getRange(r, 1, 1, t.total.length).setValues([t.total.map(cell)]).setFontWeight('bold').setBackground('#eef2f7');
      (t.money || []).forEach(function (c) { sh.getRange(r, c + 1).setNumberFormat(MONEY); });
      r++;
    }
    r++;
  });
  sh.autoResizeColumns(1, width);
  for (let c = 1; c <= width; c++) {
    const w = sh.getColumnWidth(c);
    if (w > 300) { sh.setColumnWidth(c, 300); sh.getRange(4, c, Math.max(1, r - 4), 1).setWrap(true); }
    else if (w < 70) sh.setColumnWidth(c, 70);
  }
}

// ===================== Delete a wrong entry =====================

/** Saves a copy of the row in the Deleted tab, so nothing disappears without a record. */
function keepDeleted_(by, kind, ref, row) {
  const copy = {};
  Object.keys(row).forEach(function (k) { if (k !== '_row') copy[k] = row[k]; });
  append_('Deleted', { date: new Date(), kind: kind, ref: ref, data: JSON.stringify(copy), by: by });
}

/** Puts back into stock what a sale bill took out. */
function restoreSaleStock_(sale) {
  const items = byId_(readAll_('Items'));
  let lines = [];
  try { lines = JSON.parse(str_(sale.stockLines) || '[]'); } catch (e) { lines = []; }
  if (!str_(sale.stockLines)) {   // bills made before this column existed: match "Name Size xQty @Price"
    const byLabel = {};
    Object.keys(items).forEach(function (id) { byLabel[label_(items[id])] = id; });
    str_(sale.items).replace(/\[([^\]]+)\]/g, '; $1').split(/;\s*/).forEach(function (part) {
      const m = part.match(/^(.*) x([\d.]+)(?: @[\d.]+)?$/);
      if (m && byLabel[m[1].trim()]) lines.push({ id: byLabel[m[1].trim()], qty: num_(m[2]) });
    });
  }
  lines.forEach(function (l) {
    const it = items[str_(l.id)];
    if (it && tracked_(it)) { setField_('Items', it._row, 'stock', round2_(num_(it.stock) + num_(l.qty))); it.stock = num_(it.stock) + num_(l.qty); }
  });
  return lines.length;
}

/** Deletes a sale bill entered by mistake: removed from sales, bahi, reports and udhaar; items go back to stock. */
function deleteSale(p) {
  return run_(function (by) {
    const sale = readAll_('Sales').filter(function (r) { return str_(r.bill) === str_(p.bill); })[0];
    if (!sale) throw new Error('Bill not found');
    if (str_(sale.ref)) throw new Error('This bill belongs to order ' + sale.ref + '. Delete that order instead / यह ऑर्डर ' + sale.ref + ' का बिल है');
    restoreSaleStock_(sale);
    keepDeleted_(by, 'Sale bill', str_(sale.bill), sale);
    sh_('Sales').deleteRow(sale._row);
    return { msg: 'Bill ' + sale.bill + ' deleted / बिल हटाया' };
  });
}

/**
 * Deletes an order entered by mistake, with its advance/payments/refund, and its delivery bill (items back to stock).
 * Raw material already used for making stays used, because the gadis were really made.
 */
function deleteOrder(p) {
  return run_(function (by) {
    const o = readAll_('Orders').filter(function (r) { return str_(r.no) === str_(p.no); })[0];
    if (!o) throw new Error('Order not found');
    const pays = readAll_('Payments').filter(function (r) { return (r.partyType === 'Order' || r.partyType === 'Refund') && str_(r.orderNo) === str_(o.no); });
    pays.forEach(function (r) { keepDeleted_(by, 'Order payment', str_(o.no), r); });
    pays.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; }).forEach(function (row) { sh_('Payments').deleteRow(row); });
    const sale = readAll_('Sales').filter(function (r) { return str_(r.ref) === str_(o.no); })[0];
    if (sale) {
      restoreSaleStock_(sale);
      keepDeleted_(by, 'Order bill', str_(sale.bill), sale);
      sh_('Sales').deleteRow(sale._row);
    }
    keepDeleted_(by, 'Order', str_(o.no), o);
    sh_('Orders').deleteRow(o._row);
    return { msg: 'Order ' + o.no + ' deleted / ऑर्डर हटाया' };
  });
}

// ===================== Items added automatically =====================

/** Items marked "No" in Track stock are sold without stock checks (small things not counted). */
function tracked_(it) { return str_(it.track) !== 'No'; }

function guessType_(name) {
  const n = str_(name).toLowerCase();
  if (/gadi|gaddi|गादी|गद्दी/.test(n)) return 'Gadi';
  if (/mattress|मैट्रेस/.test(n)) return 'Mattress';
  if (/pillow|takiya|तकिया/.test(n)) return 'Pillow';
  if (/razai|quilt|रजाई/.test(n)) return 'Quilt';
  if (/bedsheet|chadar|चादर/.test(n)) return 'Bedsheet';
  return 'Other';
}

/** Finds an item by its name (as shown in the list), or adds it. Returns {id, created}. */
function ensureItem_(name, f) {
  name = str_(name);
  if (!name) throw new Error('Write the item name / आइटम का नाम लिखें');
  const k = key_(name);
  const found = readAll_('Items').filter(function (it) {
    return str_(it.id) && (key_(label_(it)) === k || key_(it.name) === k);
  })[0];
  if (found) return { id: str_(found.id), created: false };
  const id = nextNo_('Items', 'id', 'I');
  append_('Items', { id: id, name: name, type: guessType_(name), size: '', material: '', thickness: '',
    cost: num_(f.cost), price: num_(f.price), stock: 0, low: 0, made: f.made || 'No', track: f.track || 'Yes' });
  return { id: id, created: true };
}

// ===================== Android app (PIN login) =====================
// The installable app (pwa/index.html, hosted on GitHub Pages) talks to this script through doPost.
// Deploy a SECOND web app for it: Execute as "Me", Who has access "Anyone". Every request needs a
// login token, which is only given for a correct PIN. PINs are stored hashed in Script Properties.

let API_USER = '';                       // set per request after the token is checked
const LOGIN_DAYS = 30;                   // stay logged in this long on a phone
const MAX_FAILS = 5, LOCK_MINUTES = 15;  // per person: 5 wrong PINs → locked 15 minutes
const MAX_FAILS_ALL = 30;                // all people together, per hour → logins paused 1 hour

// Only these may be called from the app.
const API_FNS = ['getData', 'saveSale', 'savePurchase', 'makeGadi', 'makeForOrder', 'saveRecipe', 'saveOrder',
  'setOrderStatus', 'deliverOrder', 'savePayment', 'adjustStock', 'saveItem', 'saveRaw', 'getBahi', 'saveCashEntry',
  'deleteCashEntry', 'saveVyapari', 'vyapariStatement', 'saveCustomer', 'customerProfile', 'saveOrderPayment',
  'getReport', 'exportReport', 'deleteSale', 'deleteOrder', 'partyHistory', 'updateOrder'];

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (req.fn === 'login') out = { ok: true, result: apiLogin_(req.arg || {}) };
    else if (req.fn === 'users') out = { ok: true, result: { shop: SHOP_NAME, users: Object.keys(pinUsers_()) } };
    else if (req.fn === 'logout') { apiLogout_(req.token); out = { ok: true, result: true }; }
    else {
      if (API_FNS.indexOf(req.fn) < 0) throw new Error('Unknown action');
      API_USER = checkToken_(req.token);
      const fn = globalThis[req.fn];
      let result = fn(req.arg);
      if (req.fn === 'getData') result.user = API_USER;
      out = { ok: true, result: result };
    }
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  } finally {
    API_USER = '';
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function props_() { return PropertiesService.getScriptProperties(); }
function pinUsers_() { try { return JSON.parse(props_().getProperty('APP_USERS') || '{}'); } catch (e) { return {}; } }
function hash_(salt, pin) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pin, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/** Sets (or changes) a person's PIN. Changing a PIN logs that person out on every phone. */
function setPin_(name, pin) {
  name = str_(name); pin = str_(pin);
  if (!/^[A-Za-z][A-Za-z0-9 ]{1,19}$/.test(name)) throw new Error('Name: 2–20 English letters/numbers, e.g. Imran');
  if (!/^\d{6,8}$/.test(pin)) throw new Error('PIN must be 6 to 8 digits');
  if (/^(\d)\1+$/.test(pin) || '0123456789012345'.indexOf(pin) >= 0 || '9876543210987654'.indexOf(pin) >= 0) {
    throw new Error('PIN is too easy to guess (like 111111 or 123456). Choose another.');
  }
  const users = pinUsers_();
  const salt = Utilities.getUuid();
  users[name] = { salt: salt, hash: hash_(salt, pin), ver: ((users[name] && users[name].ver) || 0) + 1 };
  props_().setProperty('APP_USERS', JSON.stringify(users));
}

function apiLogin_(a) {
  const name = str_(a.name), pin = str_(a.pin);
  const cache = CacheService.getScriptCache();
  if (cache.get('lock_all')) throw new Error('Too many wrong PINs. Logins are paused for 1 hour.');
  if (cache.get('lock_' + name)) throw new Error('Too many wrong PINs for ' + name + '. Try again after ' + LOCK_MINUTES + ' minutes.');
  const u = pinUsers_()[name];
  if (!u || hash_(u.salt, pin) !== u.hash) {
    const f = +(cache.get('fail_' + name) || 0) + 1, fa = +(cache.get('fail_all') || 0) + 1;
    cache.put('fail_' + name, String(f), LOCK_MINUTES * 60);
    cache.put('fail_all', String(fa), 3600);
    if (f >= MAX_FAILS) cache.put('lock_' + name, '1', LOCK_MINUTES * 60);
    if (fa >= MAX_FAILS_ALL) cache.put('lock_all', '1', 3600);
    throw new Error('Wrong name or PIN / गलत PIN' + (f < MAX_FAILS ? ' (' + (MAX_FAILS - f) + ' tries left)' : ''));
  }
  cache.remove('fail_' + name);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  props_().setProperty('TOK_' + token, JSON.stringify({ user: name, ver: u.ver, exp: Date.now() + LOGIN_DAYS * 864e5 }));
  cleanTokens_();
  return { token: token, user: name, shop: SHOP_NAME };
}

function checkToken_(token) {
  token = str_(token);
  const raw = token ? props_().getProperty('TOK_' + token) : null;
  if (!raw) throw new Error('AUTH: please log in again / फिर से लॉगिन करें');
  const t = JSON.parse(raw), u = pinUsers_()[t.user];
  if (!u || u.ver !== t.ver || t.exp < Date.now()) {
    props_().deleteProperty('TOK_' + token);
    throw new Error('AUTH: please log in again / फिर से लॉगिन करें');
  }
  return t.user;
}

function apiLogout_(token) { if (str_(token)) props_().deleteProperty('TOK_' + str_(token)); }

function cleanTokens_() {
  const all = props_().getProperties(), now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('TOK_') !== 0) return;
    try { if (JSON.parse(all[k]).exp < now) props_().deleteProperty(k); } catch (e) { props_().deleteProperty(k); }
  });
}

// ---- Sheet menu: manage who can use the app (run by the owner in the Google Sheet)
function menuSetPin() {
  const ui = SpreadsheetApp.getUi();
  const n = ui.prompt('App PIN · ऐप PIN', 'Person\'s name in English (e.g. Imran or Abbu):', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  const pinR = ui.prompt('App PIN · ऐप PIN', 'New PIN for ' + n.getResponseText().trim() + ' (6 to 8 digits):', ui.ButtonSet.OK_CANCEL);
  if (pinR.getSelectedButton() !== ui.Button.OK) return;
  try {
    setPin_(n.getResponseText(), pinR.getResponseText());
    ui.alert('PIN saved for ' + n.getResponseText().trim() + '. If this person was logged in on a phone, they must log in again.');
  } catch (e) { ui.alert('Not saved: ' + e.message); }
}
function menuRemovePin() {
  const ui = SpreadsheetApp.getUi();
  const n = ui.prompt('Remove from app · हटाएं', 'Name to remove:', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  const users = pinUsers_(), name = n.getResponseText().trim();
  if (!users[name]) { ui.alert('No app user named ' + name); return; }
  delete users[name];
  props_().setProperty('APP_USERS', JSON.stringify(users));
  ui.alert(name + ' removed. Their phone is logged out.');
}
function menuListPins() {
  const names = Object.keys(pinUsers_());
  SpreadsheetApp.getUi().alert(names.length ? 'App users: ' + names.join(', ') : 'No app users yet. Use "Set app PIN".');
}