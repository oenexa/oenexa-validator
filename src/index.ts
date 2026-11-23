import http from 'node:http';
import { ValidatorService } from './service/ValidatorService.js';
import { ValidatorSlashingLedgerBridge } from './service/ValidatorSlashingLedgerBridge.js';

export * from './domain/types.js';
export * from './domain/events.js';
export * from './service/ValidatorService.js';
export * from './service/ValidatorSlashingLedgerBridge.js';

const val = new ValidatorService();
const slashingBridge = new ValidatorSlashingLedgerBridge();
const PORT = Number(process.env.PORT) || 8088;

export const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ status: 'UP', service: 'oenexa-validator', timestamp: new Date().toISOString() }));
  }

  if (req.url === '/api/validators' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ success: true, data: val.getAllValidators() }));
  }

  res.writeHead(404);
  return res.end(JSON.stringify({ success: false, error: 'Endpoint Not Found' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[oenexa-validator] PoS Consensus Validator Microservice listening on port ${PORT}`);
  });
}
