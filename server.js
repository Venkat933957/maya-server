const express = require('express');
const app = express();
app.use(express.json());

// Allow requests from Vapi
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('\n----- Incoming request -----');
  console.log(JSON.stringify(body, null, 2));

  // Handle tool calls from Vapi
  if (body.message && body.message.type === 'tool-calls') {
    const toolCalls = body.message.toolCalls || [];
    const results = [];

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name || toolCall.name;
      const args = toolCall.function?.arguments || toolCall.arguments || {};
      const callId = toolCall.id;

      // Sometimes arguments come as a string
      let parsedArgs = args;
      if (typeof args === 'string') {
        try {
          parsedArgs = JSON.parse(args);
        } catch (e) {
          parsedArgs = {};
        }
      }

      console.log(`Tool called: ${name}`, parsedArgs);

      let result = {};

      switch (name) {
        case 'verify_customer':
          const code = String(parsedArgs.verification_code || '').trim();
          // Accept these codes for testing
          if (code === '1234' || code === '1995') {
            result = {
              verified: true,
              customer_name: 'Rahul Sharma',
              message: 'Identity verified successfully.'
            };
          } else {
            result = {
              verified: false,
              message: 'Verification failed. Incorrect code.'
            };
          }
          break;

        case 'log_promise_to_pay':
          result = {
            success: true,
            ptp_id: `PTP-${Math.floor(1000 + Math.random() * 9000)}`,
            confirmed_date: parsedArgs.ptp_date,
            amount: parsedArgs.amount
          };
          break;

        case 'send_payment_link':
          result = {
            success: true,
            message: `Payment link sent via ${parsedArgs.channel || 'SMS'} to the registered number.`
          };
          break;

        case 'mark_disposition':
          result = {
            success: true,
            disposition_logged: parsedArgs.status,
            notes: parsedArgs.notes || null,
            timestamp: new Date().toISOString()
          };
          break;

        case 'escalate_to_agent':
          result = {
            success: true,
            escalated: true,
            reason: parsedArgs.reason,
            message: 'Call queued for human agent.'
          };
          break;

        default:
          result = {
            success: false,
            message: `Unknown function: ${name}`
          };
      }

      results.push({
        toolCallId: callId,
        result: JSON.stringify(result)
      });
    }

    return res.status(200).json({ results });
  }

  // Acknowledge other events
  return res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Maya Collections Webhook' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Maya webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
});
