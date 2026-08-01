var API_KEY = 'AQ.Ab8RN6K0T5DTdTlv5H-GP3ni-BRwLGGxohfzkRxb3_5MMKdQJQ';
var PROXY_URL = 'https://api.allorigins.win/raw?url=';
var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
var conversationHistory = [];
var isProcessing = false;

window.onload = function() {
    
    var sendBtn = document.getElementById('sendBtn');
    var userInput = document.getElementById('userInput');
    var messagesDiv = document.getElementById('messages');
    var newChatBtn = document.getElementById('newChatBtn');
    var clearChatBtn = document.getElementById('clearChatBtn');
    var sidebar = document.getElementById('sidebar');
    
    console.log('🚀 VACT جاهز');
    
    // زر القائمة
    document.getElementById('toggleSidebarBtn').onclick = function() {
        sidebar.classList.toggle('collapsed');
    };
    document.getElementById('menuBtn').onclick = function() {
        sidebar.classList.toggle('collapsed');
    };
    
    // حفظ التفضيلات
    document.getElementById('savePrefsBtn').onclick = function() {
        alert('✅ تم حفظ التفضيلات!');
    };
    
    // محادثة جديدة
    newChatBtn.onclick = function() {
        conversationHistory = [];
        messagesDiv.innerHTML = '<div class="welcome-message"><div class="bot-avatar">🤖</div><div class="message-content"><h2>محادثة جديدة ⚡</h2></div></div>';
    };
    
    // مسح
    clearChatBtn.onclick = function() {
        conversationHistory = [];
        messagesDiv.innerHTML = '<div class="welcome-message"><div class="bot-avatar">🤖</div><div class="message-content"><h2>تم المسح ✅</h2></div></div>';
    };
    
    // تصدير
    document.getElementById('exportChatBtn').onclick = function() {
        var text = 'VACT Chat\n\n';
        conversationHistory.forEach(function(m) {
            text += (m.role === 'user' ? '👤 ' : '🤖 ') + m.content + '\n\n';
        });
        var blob = new Blob([text], {type: 'text/plain'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chat.txt';
        a.click();
    };
    
    // زر الإرسال
    sendBtn.onclick = function() {
        sendMessage();
    };
    
    // Enter للإرسال
    userInput.onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'assistant');
        var avatar = role === 'user' ? '👤' : '🤖';
        var formatted = text.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        div.innerHTML = '<div class="message-avatar">' + avatar + '</div><div class="message-content">' + formatted + '</div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function showTyping() {
        var div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typingIndicator';
        div.innerHTML = '<div class="message-avatar">🤖</div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function removeTyping() {
        var el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }
    
    async function sendMessage() {
        if (isProcessing) return;
        var message = userInput.value.trim();
        if (!message) return;
        
        isProcessing = true;
        sendBtn.textContent = '⏳';
        sendBtn.disabled = true;
        
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        
        showTyping();
        
        try {
            var contents = [
                { role: 'user', parts: [{ text: 'أنت VACT مساعد ذكي. أجب بالعربية.' }] },
                { role: 'model', parts: [{ text: 'حسناً.' }] }
            ];
            
            conversationHistory.slice(-10).forEach(function(m) {
                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                });
            });
            
            var targetUrl = API_URL + '?key=' + API_KEY;
            var proxyUrl = PROXY_URL + encodeURIComponent(targetUrl);
            
            var response = await fetch(proxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                })
            });
            
            if (!response.ok) throw new Error('خطأ ' + response.status);
            
            var data = await response.json();
            var reply = data.candidates[0].content.parts[0].text;
            
            removeTyping();
            addMessage('assistant', reply);
            conversationHistory.push({ role: 'assistant', content: reply });
            
        } catch(e) {
            removeTyping();
            addMessage('assistant', '❌ ' + e.message);
        } finally {
            isProcessing = false;
            sendBtn.textContent = 'إرسال 📤';
            sendBtn.disabled = false;
        }
    }
    
    console.log('✅ جاهز للاستخدام');
};
