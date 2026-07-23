import { wrap } from 'comlink';

// 1. Tell the browser to boot up our background worker thread
const worker = new Worker(
  new URL('./duckdb-worker.ts', import.meta.url), 
  { type: 'module' }
);

// 2. Wrap the worker with Comlink to create our invisible phone line
const api = wrap<{ loadCSVAndCount: (csv: string) => Promise<number> }>(worker);

// 3. Make a small dummy catalog of stars with RA, Dec, and Magnitude columns
const sampleCSV = `ra,dec,mag
10.5,20.3,15.2
10.6,20.4,14.9
11.0,21.0,16.1`;

// 4. Run our pipeline
async function run() {
  // Send our text catalog over the wire to DuckDB and wait for the row count
  const count = await api.loadCSVAndCount(sampleCSV);
  
  // Find the blank container on our webpage and write the result inside it
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <h1>Success!</h1>
    <p>DuckDB counted <strong>${count}</strong> stars in your background thread.</p>
  `;
}

run();
