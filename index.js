import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";

const PORT = process.env.PORT || 5000;

// reCAPTCHA
const RECAPTCHA_SITE_KEY = "6LfqD9ArAAAAAA0JB90vvbin8uptMtrwC9-mOo0";
const RECAPTCHA_SECRET   = process.env.RECAPTCHA_SECRET || "6LfqD9ArAAAAANCDMVkNfv-U9cfv9s3PYSAB6cj8";

// OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_CHAT_MODEL = "gpt-4o-mini";
const OPENAI_MODERATION_MODEL = "omni-moderation-latest";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change_this_admin_token_NOW";

// ----------------------------
// FAQ data
// ----------------------------
let FAQS = [
  { q: "How do I create an account?", a: "Fill out the signup form, complete the reCAPTCHA, and submit." },
  { q: "What are the community rules?", a: "Be respectful, no spam, and keep posts on UH and sports topics." },
  { q: "How do I reset my password?", a: "Use the 'Forgot password' link or contact support." },
  { q: "Can I promote my business?", a: "Only in the Marketplace/Promotions area." },
  { q: "How do I report a post?", a: "Click 'Report' on the post. AI triages, then admin reviews." }
];

function findBestFAQMatch(question = "") {
  const q = question.toLowerCase();
  let best = null, score = 0;
  for (const f of FAQS) {
    const text = (f.q + " " + f.a).toLowerCase();
    let s = 0;
    for (const w of q.split(/\W+/)) if (text.includes(w)) s++;
    if (s > score) { score = s; best = f; }
  }
  return score >= 2 ? best : null;
}

const limiter = rateLimit({ windowMs: 60*1000, max: 60 });
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(limiter);

// Shared chat widget (appears bottom-right)
function chatWidget() {
  return `
<style>
#ai-bubble{position:fixed;bottom:20px;right:20px;background:#c8102e;color:#fff;border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:9999;}
#ai-chatbox{display:none;position:fixed;bottom:80px;right:20px;width:350px;max-width:90%;height:400px;background:#fff;border:1px solid #ccc;border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,.2);z-index:9999;flex-direction:column;}
#ai-chatbox header{background:#c8102e;color:#fff;padding:10px;border-top-left-radius:12px;border-top-right-radius:12px;}
#ai-chatbox .messages{flex:1;padding:10px;overflow-y:auto;font-size:14px;}
#ai-chatbox .input{display:flex;border-top:1px solid #ccc;}
#ai-chatbox .input textarea{flex:1;border:none;resize:none;padding:8px;}
#ai-chatbox .input button{background:#c8102e;color:white;border:none;padding:8px 12px;cursor:pointer;}
@media(max-width:600px){#ai-chatbox{width:90%;height:60%;right:5%;bottom:80px;}}
</style>
<div id="ai-bubble">💬</div>
<div id="ai-chatbox"><header>Ask CoogsNation AI</header><div class="messages" id="ai-messages"></div><div class="input"><textarea id="ai-input" rows="1" placeholder="Type your question..."></textarea><button id="ai-send">Send</button></div></div>
<script>
const b=document.getElementById('ai-bubble'),x=document.getElementById('ai-chatbox'),s=document.getElementById('ai-send'),i=document.getElementById('ai-input'),m=document.getElementById('ai-messages');
b.onclick=()=>{x.style.display=(x.style.display==='flex')?'none':'flex';x.style.flexDirection='column';};
function addMsg(w,t){const d=document.createElement('div');d.innerHTML="<b>"+w+":</b> "+t;m.appendChild(d);m.scrollTop=m.scrollHeight;}
s.onclick=async()=>{const q=i.value.trim();if(!q)return;addMsg("You",q);i.value="";addMsg("AI","Thinking...");const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});const d=await r.json();m.lastChild.innerHTML="<b>AI:</b> "+(d.answer||"No answer.");};
</script>`;
}

// Pages
app.get("/", (req,res)=>res.send(`<html><body><h1>Signup</h1>
<form action="/api/signup" method="POST"><input name="username" placeholder="Username"><br><input name="email"><br><input name="password" type="password"><br><div class="g-recaptcha" data-sitekey="${RECAPTCHA_SITE_KEY}"></div><button>Sign Up</button></form><script src="https://www.google.com/recaptcha/api.js" async defer></script>${chatWidget()}</body></html>`));

app.get("/post",(req,res)=>res.send(`<html><body><h1>Create Post</h1><form id="f"><input name="title"><br><textarea name="content"></textarea><br><button>Submit</button></form><pre id="o"></pre><script>f.onsubmit=async e=>{e.preventDefault();const fd=new FormData(f);const r=await fetch('/api/moderate-post',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:fd.get('title'),content:fd.get('content')})});o.textContent=JSON.stringify(await r.json(),null,2);};</script>${chatWidget()}</body></html>`));

app.get("/ask",(req,res)=>res.send(`<html><body><h1>Ask AI</h1><form id="f"><textarea name="q"></textarea><br><button>Ask</button></form><pre id="a"></pre><script>f.onsubmit=async e=>{e.preventDefault();const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:f.q.value})});a.textContent=(await r.json()).answer;};</script>${chatWidget()}</body></html>`));

// APIs
app.post("/api/signup",async(req,res)=>{
  const c=req.body["g-recaptcha-response"];
  if(!c)return res.status(400).send("Captcha required.");
  const v=await fetch("https://www.google.com/recaptcha/api/siteverify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({secret:RECAPTCHA_SECRET,response:c})});
  const d=await v.json();if(!d.success)return res.status(400).send("Captcha failed.");res.send("Signup success ✅");
});

app.post("/api/moderate-post",async(req,res)=>{
  const {title="",content=""}=req.body||{};const t=`${title}\n${content}`;
  if(!OPENAI_API_KEY)return res.json({ok:true,message:"Accepted (no key set)"});
  const r=await fetch("https://api.openai.com/v1/moderations",{method:"POST",headers:{Authorization:`Bearer ${OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:OPENAI_MODERATION_MODEL,input:t})});
  const data=await r.json();if(data.results?.[0]?.flagged)return res.json({ok:false,message:"Blocked by AI moderation"});res.json({ok:true,message:"Approved"});
});

app.post("/api/ask",async(req,res)=>{
  const q=req.body.question||"";const best=findBestFAQMatch(q);
  if(best)return res.json({answer:best.a,source:"faq"});
  if(!OPENAI_API_KEY)return res.json({answer:"AI not enabled."});
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:OPENAI_CHAT_MODEL,messages:[{role:"system",content:"You are CoogsNation AI Assistant"},{role:"user",content:q}]})});
  const d=await r.json();res.json({answer:d.choices?.[0]?.message?.content?.trim()||"No answer",source:"ai"});
});

app.listen(PORT, '0.0.0.0', ()=>console.log("✅ Running on http://0.0.0.0:"+PORT));