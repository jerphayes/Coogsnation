import express from "express";
const app = express();
const PORT = 8081;

const chatWidget = `
<style>
#ai-bubble{position:fixed;bottom:20px;right:20px;background:#c8102e;color:#fff;border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:9999;border:none;}
#ai-chatbox{display:none;position:fixed;bottom:80px;right:20px;width:350px;max-width:90%;height:400px;background:#fff;border:1px solid #ccc;border-radius:12px;box-shadow:0 4px 8px rgba(0,0,0,.2);z-index:9999;flex-direction:column;}
#ai-chatbox header{background:#c8102e;color:#fff;padding:10px;border-top-left-radius:12px;border-top-right-radius:12px;font-weight:bold;}
#ai-chatbox .messages{flex:1;padding:10px;overflow-y:auto;font-size:14px;background:#f9f9f9;}
#ai-chatbox .input{display:flex;border-top:1px solid #ccc;}
#ai-chatbox .input textarea{flex:1;border:none;resize:none;padding:8px;outline:none;}
#ai-chatbox .input button{background:#c8102e;color:white;border:none;padding:8px 12px;cursor:pointer;font-weight:bold;}
#ai-chatbox .input button:hover{background:#a00;}
@media(max-width:600px){#ai-chatbox{width:90%;height:60%;right:5%;bottom:80px;}}
</style>
<div id="ai-bubble" title="Click to chat with AI">💬</div>
<div id="ai-chatbox">
  <header>Ask CoogsNation AI</header>
  <div class="messages" id="ai-messages">
    <div><b>AI:</b> Hello! I'm here to help answer questions about CoogsNation. Click the 💬 to start chatting!</div>
  </div>
  <div class="input">
    <textarea id="ai-input" rows="1" placeholder="Type your question..."></textarea>
    <button id="ai-send">Send</button>
  </div>
</div>
<script>
console.log("Loading chat widget...");
const bubble = document.getElementById('ai-bubble');
const chatbox = document.getElementById('ai-chatbox');
const sendBtn = document.getElementById('ai-send');
const input = document.getElementById('ai-input');
const messages = document.getElementById('ai-messages');

if (bubble && chatbox && sendBtn && input && messages) {
  console.log("All chat elements found successfully");
  
  bubble.onclick = () => {
    if (chatbox.style.display === 'flex') {
      chatbox.style.display = 'none';
    } else {
      chatbox.style.display = 'flex';
      chatbox.style.flexDirection = 'column';
      input.focus();
    }
  };
  
  function addMessage(sender, text) {
    const div = document.createElement('div');
    div.innerHTML = "<b>" + sender + ":</b> " + text;
    div.style.margin = "5px 0";
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  
  sendBtn.onclick = () => {
    const question = input.value.trim();
    if (!question) return;
    
    addMessage("You", question);
    input.value = "";
    
    addMessage("AI", "Thanks for your question! This is a demo response. In the real app, I would search our FAQ or use OpenAI to provide helpful answers about CoogsNation.");
  };
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });
} else {
  console.error("Chat widget elements not found!");
}
</script>
`;

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>CoogsNation - Test Chat Widget</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
  <h1 style="color: #c8102e;">CoogsNation Homepage</h1>
  <p>This is a test page to demonstrate the AI chat widget functionality.</p>
  <p><strong>Look for the red 💬 bubble in the bottom-right corner!</strong></p>
  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h2>Instructions:</h2>
    <ol>
      <li>The 💬 chat bubble should be visible in the bottom-right corner</li>
      <li>Click on it to open/close the chat window</li>
      <li>Type a message and press Enter or click Send</li>
      <li>The widget is mobile-friendly and responsive</li>
    </ol>
  </div>
  ${chatWidget}
</body>
</html>
  `);
});

app.get("/post", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Create Post - CoogsNation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
  <h1 style="color: #c8102e;">Create Post</h1>
  <form style="background: white; padding: 20px; border-radius: 8px;">
    <input type="text" placeholder="Post Title" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;">
    <textarea placeholder="Post Content" rows="4" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px;"></textarea>
    <button type="button" style="background: #c8102e; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Submit Post</button>
  </form>
  ${chatWidget}
</body>
</html>
  `);
});

app.get("/ask", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Ask AI - CoogsNation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5;">
  <h1 style="color: #c8102e;">Ask AI</h1>
  <div style="background: white; padding: 20px; border-radius: 8px;">
    <textarea placeholder="Ask a question..." rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
    <button type="button" style="background: #c8102e; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">Ask Question</button>
  </div>
  ${chatWidget}
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Chat widget test server running on http://localhost:${PORT}`);
  console.log("Visit the following pages to test the chat widget:");
  console.log(`- http://localhost:${PORT}/`);
  console.log(`- http://localhost:${PORT}/post`);
  console.log(`- http://localhost:${PORT}/ask`);
});
