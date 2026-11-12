import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const app = express();
const PORT = 3000;

function parseJsonl(content) {
  return content
    .trim()
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error('Failed to parse line:', line);
        return null;
      }
    })
    .filter((item) => item !== null);
}

// ✅ API Endpoint: Returns JSON
app.get('/api/logs', async (req, res) => {
  try {
    const filePath = path.join(
      process.cwd(),
      'data',
      'logs',
      'activities.jsonl',
    );
    const fileContent = await readFile(filePath, 'utf-8');
    const logs = parseJsonl(fileContent);
    res.json(logs);
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ UI Endpoint: Returns HTML Table
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live Activity Logs</title>
      <style>
        body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
        h1 { color: #333; }
        button { padding: 8px 16px; margin-bottom: 15px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
        button:hover { background: #0056b3; }
        
        /* Table Styles */
        table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #007bff; color: white; }
        tr:hover { background-color: #f1f1f1; }
        .path-cell { font-family: monospace; font-size: 0.9em; color: #555; word-break: break-all; }
        .time-cell { white-space: nowrap; color: #666; }
      </style>
    </head>
    <body>
      <h1>📄 Latest 5 Activities</h1>
      <button onclick="loadLogs()">Refresh Now</button>
      
      <table id="logTable">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Item Path</th>
            <th>Action</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="4">Loading...</td></tr>
        </tbody>
      </table>

      <script>
        async function loadLogs() {
          try {
            const response = await fetch('/api/logs');
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            let data = await response.json();
            
            // Get last 5 items
            data = data.slice(-5);
            
            const tbody = document.querySelector('#logTable tbody');
            tbody.innerHTML = ''; // Clear current rows

            if (data.length === 0) {
              tbody.innerHTML = '<tr><td colspan="4">No logs found.</td></tr>';
              return;
            }

            // Create rows for each log entry
            data.forEach(log => {
              const row = document.createElement('tr');
              
              // Handle missing fields gracefully
              const name = log.item_name || '-';
              const pathVal = log.item_path || '-';
              const action = log.action || '-';
              const time = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';

              row.innerHTML = \`
                <td>\${name}</td>
                <td class="path-cell">\${pathVal}</td>
                <td>\${action}</td>
                <td class="time-cell">\${time}</td>
              \`;
              
              tbody.appendChild(row);
            });

          } catch (err) {
            console.error(err);
            document.querySelector('#logTable tbody').innerHTML = 
              '<tr><td colspan="4" style="color:red;">Error loading logs</td></tr>';
          }
        }

        loadLogs();
        setInterval(loadLogs, 3000);
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
