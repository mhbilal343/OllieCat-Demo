import { wrap } from 'comlink';

// 1. Tell the browser to boot up our background worker thread
const worker = new Worker(
  new URL('./duckdb-worker.ts', import.meta.url), 
  { type: 'module' }
);

// 2. Wrap the worker with Comlink to create our invisible phone line
const api = wrap<{
  loadCSVAndCount: (csv: string) => Promise<number>;
  loadAndCrossmatchSelf: (csv: string, radiusArcsec: number) => Promise<number>;
}>(worker);

// 3. Make a small dummy catalog of stars with RA, Dec, and Magnitude columns
const sampleCSV2 = `ra,dec,mag
10.0,20.0,15.0
30.0,-10.0,14.2
100.5,45.3,13.8
200.0,-60.0,16.1`;

// 4. Run our pipeline
async function run() {
  // Send our text catalog over the wire to DuckDB and wait for the row count
  const count = await api.loadCSVAndCount(sampleCSV2);

  // Ask the worker to crossmatch that same catalog against itself
  const matchCount = await api.loadAndCrossmatchSelf(sampleCSV2, 5.0);

  // Find the blank container on our webpage and write both results inside it
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <h1>Success!</h1>
    <p>DuckDB counted <strong>${count}</strong> stars in your background thread.</p>
    <p>Self-match count: <strong>${matchCount}</strong></p>
  `;
}

run();