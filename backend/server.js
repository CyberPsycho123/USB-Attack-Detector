import { SerialPort } from 'serialport';
import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));


const portPath = 'COM8';
const bluetoothPort = new SerialPort({
  path: portPath,
  baudRate: 9600,
  autoOpen: true
});

bluetoothPort.on('error', (err) => {
  console.error('Serial Port Error:', err.message);
});

app.post('/', (req, res) => {
  let hasResponded = false;

  const handleData = (data) => {
    if (hasResponded) return;
    hasResponded = true;
    
    clearTimeout(timeout);
    bluetoothPort.removeListener('data', handleData);

    const receivedStr = data.toString().trim();
    const detected = receivedStr === "true";

    return res.json({ detected });
  };


  bluetoothPort.on('data', handleData);

  const timeout = setTimeout(() => {
    if (!hasResponded) {
      hasResponded = true;
      bluetoothPort.removeListener('data', handleData);
      return res.json({ detected: false, error: "Timeout waiting for serial data" });
    }
  }, 10000);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});