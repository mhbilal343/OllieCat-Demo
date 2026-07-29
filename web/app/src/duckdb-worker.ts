import initXmatch, { crossmatch_flat } from 'xmatch';
import * as duckdb from '@duckdb/duckdb-wasm';
import { expose } from 'comlink';

// 1. Create a blank variable to hold our running database instance
let db: duckdb.AsyncDuckDB | null = null;
let wasmReady = false;

async function ensureWasm() {
  if (!wasmReady) {
    await initXmatch();
    wasmReady = true;
  }
}

// 2. The Startup Engine
async function init() {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
}

// 3. Our custom database work horse function
async function loadCSVAndCount(csvText: string): Promise<number> {
  if (!db) await init(); // If the database isn't turned on yet, boot it up!

  const conn = await db!.connect(); // Open a connection line to the database

  // Create a virtual file in the browser memory out of our text data
  await db!.registerFileText('data.csv', csvText);

  // Parse that virtual CSV file and load it into a table named 'mytable'
  await conn.insertCSVFromPath('data.csv', { name: 'mytable' });

  // Run a real SQL query to count the rows in our table
  const result = await conn.query('SELECT COUNT(*) AS n FROM mytable');

  // Extract the raw number out of DuckDB's internal layout
  const count = result.toArray()[0].n;

  await conn.close(); // Close our connection line
  return Number(count); // Return the final count safely as a normal number
}

// 4. Real crossmatch: pull real columns out of DuckDB, hand them to our compiled Rust code
async function loadAndCrossmatchSelf(csvText: string, radiusArcsec: number): Promise<number> {
  if (!db) await init();   // make sure DuckDB is running
  await ensureWasm();      // make sure our Rust/WASM module is running

  const conn = await db!.connect();

  // Load this CSV into its own table, separate from 'mytable' above
  await db!.registerFileText('xmatch_data.csv', csvText);
  await conn.insertCSVFromPath('xmatch_data.csv', { name: 'xtable' });

  // Pull just the coordinate columns out as real rows
  const result = await conn.query('SELECT ra, dec FROM xtable');
  const rows = result.toArray();

  // Convert them into the typed-array format our Rust function expects
  const ra = new Float64Array(rows.map((r) => Number(r.ra)));
  const dec = new Float64Array(rows.map((r) => Number(r.dec)));

  await conn.close();

  // Match the catalogue against itself — every row should match exactly once
  const flat = crossmatch_flat(ra, dec, ra, dec, radiusArcsec);

  // flat is [index_a, index_b, separation, index_a, index_b, separation, ...]
  // so the number of matches is the total length divided by 3
  return flat.length / 3;
}

// 5. Connect Comlink's phone line to both functions so the outside world can call them
expose({ loadCSVAndCount, loadAndCrossmatchSelf });