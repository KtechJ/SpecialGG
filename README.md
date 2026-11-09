# Mattress & Gadi Shop Manager

A free stock, sales, and udhaar app for a mattress / handloom gadi shop.
It runs on **Google Sheets + Apps Script**. The sheet keeps all the records and a phone-friendly web app does the daily work.
Labels are in English with Hindi.

## What it does

| Screen | What it does |
|---|---|
| 🏠 **Home** | **Deliveries coming** (late / today / tomorrow / in N days) on top, then today's sale, today's cash in, month sale and profit, udhaar to take and to pay, orders due, low stock |
| 🧾 **New Sale · बिक्री** | Pick items → bill → stock goes down → send the bill on WhatsApp. Anything unpaid goes into udhaar automatically |
| 🛏️ **Stock · स्टॉक** | Ready items and raw material (cotton, fabric, thread…). Add/edit items, correct stock after counting |
| 🧵 **Make Gadi · गादी बनाओ** | "Made 3 Double gadi" → cotton and fabric go down, gadi stock goes up, making cost is calculated |
| 🚚 **Purchase · खरीद** | Raw material or ready mattress bought → stock goes up, supplier dues are tracked |
| 📋 **Orders · ऑर्डर** | Orders with mobile, item, qty, weight (kg), rate, advance, remaining and delivery date. An **order receipt picture + WhatsApp message** goes to the customer. Mark Ready, send "ready" message, Deliver → bill (advance counted) |
| 🏪 **Vyapari Khata · व्यापारी** | All vyaparis (suppliers): total maal, paid, pending for each. Date-wise hisab, pay with Cash/UPI/Bank/Cheque, payment **receipt picture** ("Account Cleared ✓") to send on WhatsApp, share full hisab |
| 👥 **Customers · ग्राहक** | Customer database (name, mobile, address). Type a mobile number in a sale/order and an old customer is recognised. Each customer's profile shows all past orders, bills, payments and udhaar, with WhatsApp udhaar reminder |
| 📔 **Bahi Khata · बही खाता** | Daily cash book (roznamcha): every rupee in/out with opening & closing balance, cash in galla vs bank/UPI, shop expenses, monthly profit & loss |
| 📊 **Reports · रिपोर्ट** | Choose a period (Day, Week, Month, Quarter, Year, Financial year Apr–Mar, or any date to date, with ◀ ▶ to move back/forward) and which parts to include (Summary & P&L, Bahi Khata, Sales, Orders, Purchases, Expenses, Customer udhaar, Vyapari dues, Stock). View it on screen or make a **PDF** or **Excel** file, saved in Google Drive folder "Special Gadi Ghar Reports" |

## Android app

The `docs/` folder is an installable Android app (own icon, full screen, PIN login per person) that uses the same
Google Sheet. It is served by GitHub Pages from `docs/`. See [`docs/README.md`](docs/README.md) for setup. Rebuild it after changing `Index.html` with
`python3 tools/build_app.py`.

There is also a real Android **APK** (`android/`, ready file `docs/SpecialGadiGhar.apk`) that opens the same app full screen,
with WhatsApp sharing and downloads working. See [`android/README.md`](android/README.md).

## Setup from scratch (about 15 minutes)

You need: a laptop/computer for setup (easier than phone), Imran bhai's Gmail account, his father's Gmail address,
and the two files [`Code.gs`](Code.gs) and [`Index.html`](Index.html).

### Part A: Create the Google Sheet (owner's Gmail)

1. On the computer, open Chrome and sign in with **Imran bhai's Gmail** (the shop owner owns the data).
2. Go to **<https://sheets.new>**. A blank sheet opens.
3. Click the title "Untitled spreadsheet" (top-left) and rename it **Special Gadi Ghar – Records**.
4. *(Optional)* **File → Settings → Locale: India**, then **Save settings**. (Time zone is set automatically in step 13.)

### Part B: Add the code

5. In the sheet menu click **Extensions → Apps Script**. A new tab opens with a file called `Code.gs`
   containing `function myFunction() {...}`.
6. Click the project name "Untitled project" at the top and rename it **Shop App**.
7. In `Code.gs`: select everything (**Ctrl+A**), delete it, and paste the full contents of **Code.gs**.
8. Check the settings at the top of the file:
   ```js
   const SHOP_NAME = 'Special Gadi Ghar';
   const SHOP_OWNER = 'Imran Khan';
   const SHOP_ADDRESS = 'Mama Chowk, Jalna';
   const SHOP_PHONE = '9822552403';
   const ALLOWED_EMAILS = [];
   ```
   Put the two Gmail addresses that may use the app into `ALLOWED_EMAILS` (recommended), for example
   `const ALLOWED_EMAILS = ['imran@gmail.com', 'father@gmail.com'];`. Anyone else is refused.
9. On the left, next to **Files**, click **＋ → HTML**. Type the name **`Index`** (capital I, no `.html`; Google adds it)
   and press Enter.
10. In the new `Index.html` file: select everything, delete it, and paste the full contents of **Index.html**.
11. Press **Ctrl+S** (or the 💾 icon) to save. Both files must show no red error.

### Part C: Create the tabs (run setup once)

12. *(The app also creates the tabs by itself the first time it opens, but running setup here lets you check everything worked.)*
    At the top of the editor, in the dropdown next to **▷ Run** / **Debug**, choose **`setup`**.
13. Click **▷ Run**. Google asks for permission the first time:
    - **Review permissions** → choose Imran bhai's account.
    - You'll see *"Google hasn't verified this app"*. This is normal for your own script.
      Click **Advanced** → **Go to Shop App (unsafe)** → **Allow**.
14. Wait for **"Execution completed"** at the bottom. Go back to the sheet tab: you'll now see tabs
    `Items, RawMaterial, Recipe, Production, Sales, Purchases, Orders, Customers, Payments, Vyapari, Cashbook, StockLog`,
    plus a new menu **Shop / दुकान**. `Items`, `RawMaterial` and `Recipe` have a few sample rows (you'll fix them on day one).

### Part D: Publish it as the phone app

15. In the Apps Script tab click **Deploy → New deployment**.
16. Next to *Select type* click the **⚙️ gear → Web app**, and fill:
    - **Description:** `v1`
    - **Execute as:** **User accessing the web app**
    - **Who has access:** **Anyone with Google account**
17. Click **Deploy** (click **Authorize access** and allow again if asked).
18. Copy the **Web app URL** (it ends in `/exec`). This link is the app. Send it to yourself and to the father on WhatsApp.

> "Execute as: User accessing" + "Anyone with Google account" means: the person must log in with Google, **and** must have
> edit access to the sheet (step 19), **and** be in `ALLOWED_EMAILS` if you filled it. Strangers who get the link can't see anything.

### Part E: Give the father access

19. In the Google Sheet click **Share** (top-right) → type the father's Gmail → role **Editor** → **Send**.

### Part F: Install on both phones

20. On each phone, open the Web app URL in **Chrome**, signed in with **that person's own Gmail**.
21. The first time, Google asks for permission again (same as step 13: **Advanced → Go to Shop App → Allow**).
    Each person does this once.
22. The app opens on the home screen. Tap Chrome's **⋮ menu → Add to Home screen → Add**.
    Now there's an icon on the phone that opens the app directly.

**Test it:** make one test sale on the phone, then look at the `Sales` tab in the sheet; the row should be there.
Delete the test row afterwards (and fix the stock with *Correct stock*).

## Day one: enter the real data

Do these once, in this order, from the phone app (or the sheet where mentioned).

1. **Items (finished goods).** The sample items are only examples.
   - In the app: **Stock → Ready Items → Edit** each sample item (name, size, material, thickness, cost price, sell price,
     low-stock alert, "Made in shop" Yes/No), or **+ Add new item** for your own.
   - Items you don't sell: delete that row in the `Items` tab of the sheet **and** its rows in the `Recipe` tab.
2. **Raw material.** **Stock → Raw Material**: edit/add cotton (kg), handloom fabric (meter), thread, foam, cover cloth…,
   each with today's **rate per unit**.
3. **Opening stock.** For every item and raw material tap **Correct stock / गिनती** and enter today's actual count.
4. **Recipes.** **Make Gadi →** pick each item you make → **Set/Edit recipe**: how much raw material ONE piece uses
   (e.g. Double gadi = 9 kg cotton + 5 m fabric). Also enter the usual **labour per piece** the first time you make it;
   the app remembers it.
5. **Vyaparis.** **Vyapari Khata → + Add** each vyapari with phone and city. In **Old due** write what you owe them today.
6. **Old customer udhaar.** **Customers → + Add** each customer who owes you money, with mobile number and
   **Old udhaar (before app)**.
7. **Opening cash.** **Bahi Khata → + Money in → "Opening balance"**: today's cash in the galla (mode **Cash**),
   then again for the bank/UPI balance (mode **Bank**).
8. **Pending orders.** Enter any orders already taken (**Orders → + New order**) with the advance already received.

From now on, everything is done in the app and the numbers stay correct by themselves.

## If something goes wrong

| Problem | Fix |
|---|---|
| "Sorry, unable to open the file at this time" | The phone/browser is signed into **more than one Google account**. Open the link in a Chrome profile (or Incognito) with only that person's account. |
| "Access denied / अनुमति नहीं" | That Gmail is not in `ALLOWED_EMAILS`, or the sheet isn't shared with it as Editor. |
| "You do not have permission" / app won't load data | Share the sheet with that Gmail as **Editor** (step 19). |
| "Sheet … missing. Run setup" | A tab was renamed or deleted. Run `setup` again (it never deletes data). |
| Hindi shows as `‡§ö‡§≤‡§æ` / red "broken Hindi letters" box in the app | Code.gs was copied from a file opened in TextEdit/Notepad, which breaks Hindi. Copy Code.gs again from the copy page (or GitHub), paste over the old one, Save, delete rows 2+ in `Items`, `RawMaterial` and `Recipe` (sample rows with broken Hindi), run `setup`, then deploy a new version. |
| Changed the code but phone shows the old app | **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy.** The link stays the same. |
| Wrong entry | **Sale bill:** tap it on Home (or in the customer's profile) → *Delete this bill (wrong entry)*; items go back to stock. **Order:** Orders → *Delete (wrong entry)*; its advance/payments and delivery bill are removed too. Either way it disappears from Bahi Khata, reports and udhaar, and a copy is kept in the `Deleted` tab. Purchases: fix or delete the row in the sheet, then *Correct stock*. Bahi khata manual entries have a **Delete** button. |

**Updating to a newer version later:** paste the new `Code.gs` and `Index.html` over the old ones, Save, run `setup` once
(adds any new tabs/columns, keeps all data), then **Manage deployments → Edit → New version → Deploy**.

## Daily use

- **Sold something** → New Sale. If they paid less, the rest becomes udhaar under their name.
  Item not in the list? Choose **✏️ Not in list – type it** and write the name, qty, price (and cost if you know it, for profit).
  It is **added to the item list automatically** with that price (as a small item whose stock is not counted; switch on
  counting in Stock → Edit if you want). A custom "What to make" in a new order is added the same way, and its raw material
  is saved as the recipe the first time you use *Make for this order*.
  If stock shows 0 for an item that is really in the shop, the app asks **Sell anyway** (stock goes minus; fix it later with *Correct stock*).
- **Made gadis** → Make Gadi. (Add labour per piece to get the true cost and profit.)
  Not in the list? Choose **✏️ Not in list – type it**: name, sell price and raw material per piece; it is added to the
  item list with that recipe. If raw material shows less than needed (stock not entered yet), the app asks **Make anyway**
  (raw stock shows minus until you enter a Purchase or *Correct stock*). Same for *Make for this order*.
- **Bought cotton/fabric or ready mattresses** → Purchase.
- **New order** → Orders → + New order. Type the **mobile first**: an old customer's name fills in by itself.
  Fill what to make, qty, weight, rate (total is calculated), advance, and delivery date (+3 / +7 / +10 / +15 days buttons).
  Save → order receipt appears → **Share picture** or **WhatsApp message** to the customer.
- **Customer pays more before delivery** → Orders → **💰 Receive payment** on that order (part amount, or **Full clear**).
  An updated receipt (advance + paid later + remaining, or **"Fully paid"** stamp) is ready to send on WhatsApp.
  The money shows in Bahi Khata on the day it was received.
- Orders appear on the home screen **3 days before** delivery (change `REMIND_DAYS` in `Code.gs`).
- **Making the gadis for an order** → Orders → **🧵 Make for this order**. Cotton is filled from the order's weight
  (e.g. 10 kg × 5), add fabric etc. per piece, check the cost and expected profit, then save: raw material goes down,
  the making cost is recorded on the order, and it is marked **Ready** with a WhatsApp "your order is ready" button.
  (If the item is already in stock, e.g. a ready-made mattress, use **Ready (from stock)** instead.)
- When handed over → *Deliver*. For a stock item, keep the pre-selected item so stock and profit stay right.
- **Cancelling an order** → *Cancel*. If the customer paid, enter how much you return (Full refund / Keep advance / any amount).
  The refund goes out of galla/bank in Bahi Khata; whatever you keep shows as income ("Advance kept") in the month P&L.
- **Paying a vyapari** → Vyapari Khata → tap the name → 💸 Pay. Use **Full clear** to settle the whole account.
  A receipt picture is made: tap **Share picture** (or long-press it) and send it to the vyapari on WhatsApp.
  Old receipts can be opened again from the 🧾 button in their hisab.
- **Vyapari asks for hisab** → tap the name → 📤 Share hisab (sends totals and recent entries on WhatsApp).
- **Customer paid old udhaar** → Udhaar Khata → Money received.
- **Any shop expense** (rent, electricity, salary, tea, transport…) → Bahi Khata → − Expense.
  Money taken for home → category *Home / personal*. Paying the karigar for making gadis → *Karigar* (this is already
  in the gadi cost, so it is not counted twice as an expense).
- **Put cash in bank / withdrew from bank** → Bahi Khata → ⇄ Bank.
- **Evening check**: Bahi Khata → Day. "Closing Cash" should match the cash in the galla.
- **Counted stock and it doesn't match** → Stock → Correct stock (the change is logged in `StockLog`).

- **Reports** → pick the period and the parts you want → **Show**, **PDF** or **Excel**. Files are saved in your Google Drive
  (folder "Special Gadi Ghar Reports"); open one and use Drive's Share to send it on WhatsApp or email.
  The first time you make a PDF/Excel, Google asks for permission once more (Drive access), because the app now saves files to Drive.

## Good to know

- **Bahi Khata fills itself**: sales, order advances, udhaar received, purchases and supplier payments appear
  automatically. You only enter expenses and other money by hand. Pick the right **mode** (Cash / UPI / Bank) on each
  form so the galla and bank balances stay correct.
- **Net profit** (Bahi → Month) = profit on sales + other income − shop expenses. Purchases are not expenses
  (they become stock); home withdrawals are shown separately.

- Everything is saved in the Google Sheet, so you can open it on a computer anytime, filter, or print.
  Google keeps version history (**File → Version history**) if something gets deleted by mistake.
- Profit = sale price − cost price. Cost of a made gadi is updated each time you use *Make Gadi*
  (raw material rate × quantity + labour). For bought items it's the last purchase rate.
- Needs internet (mobile data is fine).

## Checking the calculations

`tests/audit.js` runs a full shop day (opening balance, purchases, making, sales, orders with advance, part payment,
make-for-order, delivery, cancellation with refund, vyapari payments, expenses) against a fake sheet and prints every
expected vs actual number. Run `node tests/audit.js Code.gs` after changing the code.

## Sheet tabs

`Items`, `RawMaterial`, `Recipe`, `Production`, `Sales`, `Purchases`, `Orders`, `Payments`, `Vyapari`, `Customers`, `Cashbook`, `StockLog`.
Keep each vyapari's name spelled the same way, because entries are matched by name (pick it from the suggestion list).

Don't rename tabs or reorder columns. Editing values (prices, names, low alert) directly in the sheet is fine.
