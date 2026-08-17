# Maya – Kapture Finance Collections Voicebot

Outbound voice agent for collecting overdue EMIs.

---

## What this is

Maya calls customers who have an overdue personal loan EMI, verifies who she’s talking to, tells them about the outstanding amount only after verification, tries to get a payment commitment, and logs what happened at the end of the call.

Sample customer used throughout:
- Name: Rahul Sharma
- Account: ACC-88392
- Amount: ₹8,499
- Days overdue: 12

---

## Folder structure

```
kapture-collections-voicebot/
├── README.md
├── docs/
│   └── HLD_Document.md
├── vapi/
│   ├── system_prompt.txt
│   └── tool_definitions.json
├── server/
│   ├── package.json
│   ├── server.js
│   └── .env.example
└── tests/
    └── test_cases.json
```

---

## How to run the server

```bash
cd server
npm install
node server.js
```

Then expose it:

```bash
npx http 3000
```

---

## Vapi setup notes

I used:
- **Model**: GPT-4o, temperature 0.2 (wanted it to stick to the rules tightly)
- **Transcriber**: Deepgram Nova-2 (best latency + accuracy I could get on the free tier)
- **Voice**: ElevenLabs Sarah – sounded the most natural and professional among the ones I tried
- **First message**: “Hello, this is Maya calling from Kapture Finance. Am I speaking with Mr. Rahul Sharma?”

System prompt is in `vapi/system_prompt.txt`.  
Tool schemas are in `vapi/tool_definitions.json`.

Accepted verification codes for testing: `1234` or `1995`.

---

## Design decisions I made

**Auth before anything else**  
The biggest requirement was that the bot must never mention the debt until the customer is verified. I didn’t trust the prompt alone for this, so I made the state machine depend on the `verify_customer` tool actually returning `verified: true`. The prompt is very explicit about waiting for the tool result.

**Disposition on every call**  
I wanted every path (success, already paid, wrong person, DNC, etc.) to end with a clean `mark_disposition` call. Makes it much easier to plug into a real CRM later.

**Keeping the prompt strict but still natural**  
Temperature 0.2 + very clear state instructions. The bot still sounds okay in conversation, but it doesn’t wander off and invent policies or offer random discounts.

**Server is kept simple for now**  
Just enough to return the right JSON so the conversation can continue. No database, no real SMS yet. That can come later.

---

## What actually broke while building this

1. **ngrok URL kept changing**  
   Every time I restarted ngrok the URL changed and the tools stopped working. I wasted a good 20 minutes before I realised I had to update the Server URL on *every* tool again.

2. **Arguments sometimes arrived as a string**  
   Vapi occasionally sent the function arguments as a JSON string instead of an object. Added a small parse fallback in `server.js`.

3. **Bot was leaking the amount too early**  
   First version of the prompt was too soft. The model would still say the amount if the user asked “how much do I owe?” before verification. Had to make the zero-disclosure rule much more aggressive and tell it explicitly not to answer that question until the tool succeeded.

4. **Verification felt flaky at first**  
   Was comparing the code too strictly. Normalised it to string + trim and it became reliable.

---

## Demo paths I tested

**Happy path**
- “Yes, this is Rahul”
- “1234”
- “I’ll pay this Friday”
→ Bot logs PTP, sends payment link, marks disposition, ends cleanly.

**Already paid**
- After verification: “I already paid yesterday through UPI”
→ Asks for a bit more detail, logs ALREADY_PAID, explains the 24-48 hour lag.

**Do not call**
- “Please stop calling me and put me on the do not call list”
→ Immediately logs DO_NOT_CALL and hangs up.

---

## What I’d improve if I had more time

- Pull real account data instead of hard-coding Rahul’s details
- Actually send an SMS/WhatsApp payment link (Twilio or WhatsApp Business API)
- Store conversation state on the server side so the bot doesn’t rely only on the LLM’s memory
- Add proper bilingual support (right now it can handle basic Hindi but it’s not great)
- Write a small test harness that runs the cases in `tests/test_cases.json` automatically
- Better handling of long silences and voicemail

---

## Files for submission

- This README
- `docs/HLD_Document.md` (has the architecture diagram)
- `vapi/system_prompt.txt`
- `vapi/tool_definitions.json`
- Working demo recording (Happy path + one edge case)
- Link to the live Vapi assistant if possible
