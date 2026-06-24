import http from 'http';
import https from 'https';

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/send-sms') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { accountSid, authToken, from, to, message, type } = JSON.parse(body);

        if (!accountSid || !authToken || !from || !to || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing parameters' }));
          return;
        }

        // Format phone numbers for WhatsApp if specified
        let twilioFrom = from;
        let twilioTo = to;
        if (type === 'whatsapp') {
          twilioFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
          twilioTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        }

        // Make HTTPS request to Twilio API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const postData = new URLSearchParams({
          To: twilioTo,
          From: twilioFrom,
          Body: message
        }).toString();

        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const twilioReq = https.request(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (twilioRes) => {
          let responseBody = '';
          twilioRes.on('data', d => {
            responseBody += d;
          });
          twilioRes.on('end', () => {
            res.writeHead(twilioRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(responseBody);
          });
        });

        twilioReq.on('error', (e) => {
          console.error("Twilio request error:", e);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        });

        twilioReq.write(postData);
        twilioReq.end();

      } catch (err) {
        console.error("Server parse error:", err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server parse error' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Bebo local helper server listening on port ${PORT}`);
});
