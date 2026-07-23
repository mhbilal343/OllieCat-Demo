import * as duckdb from '@duckdb/duckdb-wasm';
import { expose } from 'comlink';

// 1. Create a blank variable to hold our running database instance
let db: duckdb.AsyncDuckDB | null = null;

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

// 4. Connect Comlink's phone line to this function so the outside world can call it
expose({ loadCSVAndCount });
