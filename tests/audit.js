// Full-day audit of all money and stock calculations, run against a fake Google Sheet.
// Usage: node tests/audit.js Code.gs   (needs Node.js; prints every expected vs actual number)
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const sheets={};
function mkSheet(name){const s={name,data:[],
 getDataRange(){return{getValues:()=>s.data.map(r=>r.slice())}},
 getLastRow(){return s.data.length},
 appendRow(r){s.data.push(r.map(v=>typeof v==='string'&&v[0]==="'"?v.slice(1):v))},
 getRange(r,c,nr,nc){const rng={setValues(v){v.forEach((row,i)=>{while(s.data.length<r+i)s.data.push([]);row.forEach((x,j)=>s.data[r-1+i][c-1+j]=x)});return rng},
   setValue(v){while(s.data.length<r)s.data.push([]);s.data[r-1][c-1]=typeof v==='string'&&v[0]==="'"?v.slice(1):v;return rng},
   setFontWeight(){return rng},setBackground(){return rng},setFontColor(){return rng},setWrap(){return rng}};return rng},
 setFrozenRows(){},deleteRow(r){s.data.splice(r-1,1)}};return s}
const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=mkSheet(n)),getSheets:()=>Object.values(sheets),deleteSheet(){},setSpreadsheetTimeZone(){},getId:()=>'x'};
const ctx={console,SpreadsheetApp:{getActiveSpreadsheet:()=>ss,flush(){}},
 Utilities:{formatDate:(d,tz,p)=>{const x=new Date(d.getTime()+5.5*3600e3).toISOString();return p==='yyyy-MM-dd'?x.slice(0,10):p==='dd-MM-yyyy'?x.slice(8,10)+'-'+x.slice(5,7)+'-'+x.slice(0,4):x.slice(0,10)+' '+x.slice(11,16)}},
 Session:{getActiveUser:()=>({getEmail:()=>'owner@gmail.com'})},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
 // fake Drive / export, only to run the PDF/Excel code path end to end
 ...(()=>{const writes=[];const chain=()=>{const f=new Proxy(function(){},{get:(t,k)=>k==='getColumnWidth'?()=>120:k==='getId'?()=>'tmp':k==='getSheets'?()=>[f]:k==='setValues'?(v)=>{writes.push(v);return f}:(...a)=>f,apply:()=>f});return f;};
   return {__writes:writes, ScriptApp:{getOAuthToken:()=>'x'}, UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getBlob:()=>({setName(n){this.n=n;return this}})})},
     DriveApp:{getFoldersByName:()=>({hasNext:()=>false}),createFolder:()=>({createFile:(b)=>({getName:()=>b.n,getUrl:()=>'https://drive/x',getId:()=>'id1'})}),getFileById:()=>({setTrashed(){}})},
     __chain:chain};})(),
 PropertiesService:{getScriptProperties:(()=>{const st={};return ()=>({setProperty(k,v){st[k]=v},getProperty(k){return st[k]||null}})})()}};
ctx.SpreadsheetApp.create=()=>ctx.__chain();
// The test data is dated 07/08-11-2026, so pin the script's clock to 08-11-2026 (11:30 IST) to make it pass on any day.
ctx.Date=(()=>{const R=Date,off=new R('2026-11-08T06:00:00Z')-R.now();class D extends R{constructor(...a){a.length?super(...a):super(R.now()+off)}static now(){return R.now()+off}}return D})();
vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);
const g=ctx;
let fails=0;const eq=(label,got,exp)=>{const ok=Math.abs(got-exp)<0.01;if(!ok)fails++;console.log((ok?'  ✓ ':'  ✗ ')+label.padEnd(46)+' expected '+String(exp).padStart(7)+'   app '+String(got).padStart(7));};
g.setup();
// ---- Yesterday (07-11): opening balances, one expense
g.saveCashEntry({type:'In',category:'Opening balance / शुरुआती रकम',amount:10000,mode:'Cash',date:'2026-11-07'});
g.saveCashEntry({type:'In',category:'Opening balance / शुरुआती रकम',amount:50000,mode:'Bank',date:'2026-11-07'});
g.saveCashEntry({type:'Out',category:'Transport / भाड़ा',amount:200,mode:'Cash',date:'2026-11-07'});
// ---- Today (08-11)
g.adjustStock({kind:'Raw',id:'R1',stock:30});g.adjustStock({kind:'Raw',id:'R2',stock:20});
g.savePurchase({kind:'Raw',id:'R1',qty:50,rate:120,supplier:'Ramesh',paid:2000,mode:'Cash'});
g.saveVyapari({name:'Shaikh',opening:3000});
g.savePurchase({kind:'Raw',id:'R2',qty:30,rate:90,supplier:'Shaikh',paid:0});
g.makeGadi({id:'I2',qty:3,labour:100});
g.savePurchase({kind:'Item',id:'I4',qty:2,rate:4500,supplier:'Gupta',paid:9000,mode:'Bank'});
g.saveSale({lines:[{id:'I2',qty:1,price:2900},{id:'I4',qty:1,price:6500}],discount:400,customer:'Salim',phone:'9000000001',paid:6000,mode:'UPI'});
g.saveSale({lines:[{id:'I2',qty:1,price:2900}],paid:2900,mode:'Cash'});
const stockBeforeOrder=g.getData().items.find(i=>i.id==='I2').stock, rawBeforeOrder=g.getData().raw.find(i=>i.id==='R1').stock;
let r=g.saveOrder({customer:'Imtiyaz',phone:'9876511111',itemId:'I2',qty:5,rate:1800,details:'5 x Double gadi',advance:5000,mode:'UPI',delivery:'2026-11-15'});
const O1=r.orderNo;
g.saveOrderPayment({no:O1,amount:2000,mode:'Cash'});
const stockBeforeMake=g.getData();
g.makeGadi({id:'I2',qty:5});
g.deliverOrder({no:O1,itemId:'I2',qty:5,paidNow:1500,mode:'Cash'});
r=g.saveOrder({customer:'Ayesha',details:'1 x Razai',amount:1400,advance:400,mode:'Cash',delivery:'2026-11-12'});
g.setOrderStatus({no:r.orderNo,status:'Cancelled'});
g.savePayment({partyType:'Customer',party:'Salim',amount:1000,mode:'Cash'});
g.savePayment({partyType:'Supplier',party:'Ramesh',amount:4000,mode:'UPI'});
g.savePayment({partyType:'Supplier',party:'Shaikh',amount:2000,mode:'Cash'});
g.saveCashEntry({type:'Out',category:'Rent / किराया',amount:3000,mode:'Cash'});
g.saveCashEntry({type:'Out',category:'Karigar - gadi making / कारीगर',amount:500,mode:'Cash'});
g.saveCashEntry({type:'Out',category:'Home / personal / घर खर्च',amount:1000,mode:'Cash'});
g.saveCashEntry({type:'In',category:'Other income / अन्य आमदनी',amount:300,mode:'Cash'});
g.saveCashEntry({type:'Transfer',amount:5000,mode:'Cash→Bank'});

const d=g.getData(), b=g.getBahi({}), m=b.month_;
const it=id=>d.items.find(i=>i.id===id), rw=id=>d.raw.find(i=>i.id===id);
console.log('\nSTOCK');
eq('Cotton R1: 30 +50 bought −27 (3 gadi) −45 (5 gadi)',rw('R1').stock,8);
eq('Fabric R2: 20 +30 bought −15 −25',rw('R2').stock,10);
eq('Double gadi I2: +3 made −1 −1 sold, +5 made −5 delivered',it('I2').stock,1);
eq('Foam I4: +2 bought −1 sold',it('I4').stock,1);
eq('Double gadi cost/pc: 9kg×120 + 5m×90 + 100 labour',it('I2').cost,1630);
eq('Saving the order did not change gadi stock',stockBeforeMake.items.find(i=>i.id==='I2').stock,stockBeforeOrder);
eq('Saving the order did not change cotton stock',stockBeforeMake.raw.find(i=>i.id==='R1').stock,rawBeforeOrder);
eq('Labour remembered: 2nd making left blank',g.getData().labour.I2,100);
console.log('\nBAHI KHATA — today');
eq('Opening cash (10000 − 200 yesterday)',b.openCash,9800);
eq('Opening bank',b.openBank,50000);
eq('Money in today (excl. transfer)',b.dayIn,19100);
eq('Money out today (excl. transfer)',b.dayOut,21500);
eq('Closing cash in galla',b.closeCash,4400);
eq('Closing bank / UPI',b.closeBank,53000);
eq('Check: open + in − out = close',b.openCash+b.openBank+b.dayIn-b.dayOut,b.closeCash+b.closeBank);
console.log('\nBAHI KHATA — month P&L');
eq('Total sale (9000 + 2900 + 9000)',m.sales,20900);
eq('Profit on sales (2870 + 1270 + 850)',m.grossProfit,4990);
eq('Other income',m.otherIncome,300);
eq('Shop expenses (transport 200 + rent 3000)',m.expenses,3200);
eq('Advance kept from cancelled order (Ayesha 400)',m.kept,400);
eq('Net profit (4990 + 300 + 400 kept − 3200)',m.net,2490);
eq('Home withdrawal (shown separately)',m.home,1000);
console.log('\nHOME SCREEN');
eq('Today sale',d.dash.todaySales,20900);
eq('Today cash in from customers',d.dash.todayCollect,18800);
eq('Month profit',d.dash.monthProfit,4990);
eq('Cash in galla',d.dash.cash,4400);
eq('Bank / UPI',d.dash.bank,53000);
eq('To take (Salim 2000 + Imtiyaz 500)',d.dash.toTake,2500);
eq('To pay (Shaikh 3000 + 2700 − 2000)',d.dash.toPay,3700);
console.log('\nCUSTOMERS & VYAPARI');
const imt=g.customerProfile({id:d.clients.find(c=>c.phone==='9876511111').id});
eq('Imtiyaz: paid before delivery (5000 + 2000)',imt.orders[0].paid,7000);
eq('Imtiyaz: udhaar after delivery (9000 − 8500)',imt.udhaar,500);
eq('Salim udhaar (3000 − 1000)',d.customers.find(c=>c.name==='Salim').balance,2000);
const sh=g.vyapariStatement({name:'Shaikh'});
eq('Shaikh pending (3000 old + 2700 − 2000)',sh.pending,3700);
eq('Ramesh pending (6000 − 2000 − 4000)',g.vyapariStatement({name:'Ramesh'}).pending,0);

// ---- Part 2: "Make for this order" and cancel with refund
g.savePurchase({kind:'Raw',id:'R1',qty:30,rate:120,supplier:'Ramesh',paid:3600,mode:'Cash'});   // R1 8→38
g.savePurchase({kind:'Raw',id:'R2',qty:15,rate:90,supplier:'Shaikh',paid:1350,mode:'Cash'});    // R2 10→25
let o3=g.saveOrder({customer:'Nadeem',phone:'9123412345',details:'2 x Kapas gadi, 12 kg each',qty:2,weight:'12',amount:6000,advance:2000,mode:'Cash',delivery:'2026-11-20'}).orderNo;
g.makeForOrder({no:o3,parts:[{rawId:'R1',qty:12},{rawId:'R2',qty:6}],labour:200});              // custom: R1 −24, R2 −12
let dd=g.getData(), O3=dd.orders.find(x=>x.no===o3);
console.log('\nMAKE FOR ORDER (custom 2 x 12 kg gadi)');
eq('Cotton after (38 − 2×12)',dd.raw.find(i=>i.id==='R1').stock,14);
eq('Fabric after (25 − 2×6)',dd.raw.find(i=>i.id==='R2').stock,13);
eq('Making cost (12×120 + 6×90 + 200) × 2',O3.madeCost,4360);
eq('Order is now Ready (1 = yes)',O3.status==='Ready'?1:0,1);
eq('Gadi stock untouched by custom making',dd.items.find(i=>i.id==='I2').stock,1);
let threw=0;try{g.makeForOrder({no:o3,parts:[{rawId:'R1',qty:1}]});}catch(e){threw=1;} eq('Cannot make the same order twice',threw,1);
g.deliverOrder({no:o3,paidNow:4000,mode:'Cash'});                                               // profit 6000 − 4360 = 1640
let o5=g.saveOrder({customer:'Rafiq',details:'1 x Double gadi',itemId:'I2',qty:1,rate:2900,advance:0,delivery:'2026-11-20'}).orderNo;
g.makeForOrder({no:o5,itemId:'I2'});                                                             // recipe 9 + 5, labour remembered 100
dd=g.getData();
console.log('\nMAKE FOR ORDER (stock item, recipe)');
eq('Cotton after (14 − 9)',dd.raw.find(i=>i.id==='R1').stock,5);
eq('Fabric after (13 − 5)',dd.raw.find(i=>i.id==='R2').stock,8);
eq('Double gadi stock +1',dd.items.find(i=>i.id==='I2').stock,2);
g.deliverOrder({no:o5,itemId:'I2',qty:1,paidNow:2900,mode:'Cash'});                              // profit 2900 − 1630 = 1270
eq('Double gadi stock after delivery',g.getData().items.find(i=>i.id==='I2').stock,1);
let o4=g.saveOrder({customer:'Farhan',details:'1 x Razai',amount:1500,advance:1000,mode:'UPI',delivery:'2026-11-20'}).orderNo;
threw=0;try{g.setOrderStatus({no:o4,status:'Cancelled',refund:1200});}catch(e){threw=1;} eq('Refund more than paid is refused',threw,1);
g.setOrderStatus({no:o4,status:'Cancelled',refund:600,mode:'Cash'});                             // keep 400
const d2=g.getData(), b2=g.getBahi({}), m2=b2.month_;
console.log('\nAFTER PART 2');
eq('Cash: 4400 −4950 +2000 +4000 −600 +2900',d2.dash.cash,7750);
eq('Bank: 53000 + 1000 advance',d2.dash.bank,54000);
eq('Money in today: 19100 + 2000 + 4000 + 1000 + 2900',b2.dayIn,29000);
eq('Money out today: 21500 + 4950 + 600 refund',b2.dayOut,27050);
eq('Today cash in from customers (refund subtracted)',d2.dash.todayCollect,28100);
eq('Profit on sales: 4990 + 1640 + 1270',m2.grossProfit,7900);
eq('Advance kept: Ayesha 400 + Farhan 400',m2.kept,800);
eq('Net profit: 7900 + 300 + 800 − 3200',m2.net,5800);
eq('Refund is not an expense',m2.expenses,3200);
eq('Udhaar unchanged by order money',d2.dash.toTake,2500);

// ---- Part 3: reports
console.log('\nREPORTS');
const val=(R,key,label)=>{for(const g of R.groups) if(g.key===key) for(const t of g.tables) for(const r of t.rows) if(String(r[0]).startsWith(label)) return r[1]; return NaN;};
let R=g.getReport({from:'2026-11-08',to:'2026-11-08'});
eq('Day report: total sale (20900 + 6000 + 2900)',val(R,'summary','Total sale'),29800);
eq('Day report: profit on sales',val(R,'summary','Profit on sales'),7900);
eq('Day report: net profit (7900 + 300 + 800 − 3000 rent)',val(R,'summary','= Net profit'),6000);
eq('Day report: opening cash',val(R,'summary','Opening cash'),9800);
eq('Day report: closing cash',val(R,'summary','Closing cash'),7750);
eq('Day report: closing bank',val(R,'summary','Closing bank'),54000);
eq('Day report: money in',val(R,'summary','Money in'),29000);
eq('Day report: customers owe us',val(R,'summary','Customers owe us'),2500);
eq('Day report: we owe vyaparis',val(R,'summary','We owe vyaparis'),3700);
const bahiT=R.groups.find(x=>x.key==='bahi').tables[0];
eq('Day report: bahi last row cash = closing cash',bahiT.rows[bahiT.rows.length-1][6],7750);
eq('Day report: bahi total in',bahiT.total[4],29000);
const salesT=R.groups.find(x=>x.key==='sales').tables[0];
eq('Day report: sales rows',salesT.rows.length,5);
eq('Day report: sales total net',salesT.total[7],29800);
R=g.getReport({from:'2026-11-01',to:'2026-11-30'});
eq('Month report: net profit (matches Bahi month)',val(R,'summary','= Net profit'),g.getBahi({}).month_.net);
eq('Month report: shop expenses (200 + 3000)',val(R,'summary','− Shop expenses'),3200);
R=g.getReport({from:'2026-11-07',to:'2026-11-07',sections:['summary','udhaar','vyapari']});
eq('As on 07-11: customers owe us',val(R,'summary','Customers owe us'),0);
eq('As on 07-11: we owe vyaparis (Shaikh old due)',val(R,'summary','We owe vyaparis'),3000);
eq('Only chosen sections returned',R.groups.length,3);
threw=0;try{g.getReport({from:'2026-11-09',to:'2026-11-01'});}catch(e){threw=1;} eq('Wrong date range refused',threw,1);
const ex1=g.exportReport({from:'2026-11-01',to:'2026-11-30',format:'pdf'}), ex2=g.exportReport({from:'2026-11-08',to:'2026-11-08',format:'xlsx'});
eq('PDF file made',ex1.name==='Special Gadi Ghar Report 01-11-2026 to 30-11-2026.pdf'?1:0,1);
eq('Excel file made',ex2.name==='Special Gadi Ghar Report 08-11-2026.xlsx'?1:0,1);
const bad=ctx.__writes.filter(v=>v.some(r=>r.length!==v[0].length));
eq('Every table written to the sheet is rectangular',bad.length,0);
// ---- Part 4: delete wrong entries
console.log('\nDELETE WRONG ENTRIES');
const I2=()=>g.getData().items.find(i=>i.id==='I2').stock, D0=g.getData();
const billOf=no=>g.getData().recentSales.find(x=>x.ref===no).bill;
threw=0;try{g.deleteSale({bill:billOf(o5)});}catch(e){threw=1;} eq('Order bill cannot be deleted on its own',threw,1);
const cashBill=g.getData().recentSales.find(x=>x.net===2900&&!x.ref&&!x.customer).bill;
g.deleteSale({bill:cashBill});                                            // cash bill 2900, 1 Double gadi
let d4=g.getData();
eq('Delete cash bill: gadi back in stock (1 + 1)',d4.items.find(i=>i.id==='I2').stock,2);
eq('Delete cash bill: cash 7750 − 2900',d4.dash.cash,4850);
eq('Delete cash bill: month profit 7900 − 1270',d4.dash.monthProfit,6630);
g.deleteOrder({no:o5});                                             // delivered with 1 gadi from stock, paid 2900 cash
d4=g.getData();
eq('Delete delivered order: gadi back (2 + 1)',d4.items.find(i=>i.id==='I2').stock,3);
eq('Delete delivered order: cash 4850 − 2900',d4.dash.cash,1950);
eq('Delete delivered order: gone from orders list',d4.orders.some(x=>x.no===o5)?1:0,0);
g.deleteOrder({no:O1});                                             // UPI 5000 adv + 2000 + 1500 cash, 500 udhaar, 5 gadis
d4=g.getData();
eq('Delete order O1: bank 54000 − 5000 advance',d4.dash.bank,49000);
eq('Delete order O1: cash 1950 − 2000 − 1500',d4.dash.cash,-1550);
eq('Delete order O1: Imtiyaz udhaar gone (2500 − 500)',d4.dash.toTake,2000);
eq('Delete order O1: 5 gadis back (3 + 5)',d4.items.find(i=>i.id==='I2').stock,8);
eq('Month net profit: 5800 − 1270 − 1270 − 850',g.getBahi({}).month_.net,2410);
eq('Report agrees after deletes',val(g.getReport({from:'2026-11-01',to:'2026-11-30'}),'summary','= Net profit'),2410);
eq('Deleted tab keeps a copy of each (2 orders, 2 bills, 2 payments)',sheets.Deleted.data.length-1,6);
r=g.saveSale({lines:[{id:'I6',qty:1,price:250}],paid:250,allowShort:true});
eq('Next bill number does not reuse a deleted one (B6)',r.bill.bill==='B6'?1:0,1);
// Apps Script garbles emoji typed directly in the files; they must be written as escape codes.
const big=/[\u{10000}-\u{10FFFF}]/u, dir=require('path').dirname(process.argv[2]);
eq('No raw emoji in Code.gs',big.test(fs.readFileSync(process.argv[2],'utf8'))?1:0,0);
eq('No raw emoji in Index.html',big.test(fs.readFileSync(dir+'/Index.html','utf8'))?1:0,0);
console.log(fails?`\n${fails} MISMATCH(ES)`:'\nALL NUMBERS MATCH');
