/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */

var API_KEY = 'AQ.Ab8RN6K0T5DTdTlv5H-GP3ni-BRwLGGxohfzkRxb3_5MMKdQJQ';
var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

var conversationHistory = [];
var isProcessing = false;

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🚀 VACT جاهز | تطوير: أحمد الجابري');
    
    var messagesDiv = document.getElementById('messages');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    var newChatBtn = document.getElementById('newChatBtn');
    var clearChatBtn = document.getElementById('clearChatBtn');
    var exportChatBtn = document.getElementById('exportChatBtn');
    var toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    var menuBtn = document.getElementById('menuBtn');
    var sidebar = document.getElementById('sidebar');
    var savePrefsBtn = document.getElementById('savePrefsBtn');
    var charCount = document.getElementById('charCount');
    
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
    }
    
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', function() {
            var prefs = {
                name: document.getElementById('userName').value,
                interest: document.getElementById('userInterest').value,
                style: document.getElementById('responseStyle').value
            };
            localStorage.setItem('vact_preferences', JSON.stringify(prefs));
            alert('✅ تم حفظ التفضيلات!');
        });
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            conversationHistory = [];
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>محادثة جديدة ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
                '</div>';
        });
    }
    
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            conversationHistory = [];
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>تم المسح ✅</h2></div>' +
                '</div>';
        });
    }
    
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', function() {
            var text = '📝 VACT Chat\n© أحمد الجابري\n\n';
            conversationHistory.forEach(function(m) {
                text += (m.role === 'user' ? '👤' : '🤖') + ': ' + m.content + '\n\n';
            });
            var blob = new Blob([text], {type: 'text/plain'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'VACT-chat.txt';
            a.click();
        });
    }
    
    userInput.addEventListener('input', function() {
        if (charCount) charCount.textContent = userInput.value.length + '/4000';
    });
    
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'assistant');
        var avatar = role === 'user' ? '👤' : '🤖';
        var formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>');
        div.innerHTML = '<div class="message-avatar">' + avatar + '</div>' +
                       '<div class="message-content">' + formatted + '</div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function showTyping() {
        removeTyping();
        var div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typingIndicator';
        div.innerHTML = '<div class="message-avatar">🤖</div>' +
            '<div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
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
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>⏳</span>';
        
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        if (charCount) charCount.textContent = '0/4000';
        
        showTyping();
        
        try {
            var contents = [];
            
            if (conversationHistory.length <= 1) {
                contents.push({ role: 'user', parts: [{ text: 'أنت VACT مساعد ذكي. أجب بالعربية.' }] });
                contents.push({ role: 'model', parts: [{ text: 'حسناً، سأجيب بالعربية.' }] });
            }
            
            conversationHistory.forEach(function(m) {
                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                });
            });
            
            // نجرب الطريقتين الرئيسيتين فقط
            var response;
            
            // طريقة 1: مفتاح في الرابط
            try {
                console.log('🔄 تجربة طريقة x-goog-api-key...');
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-goog-api-key': API_KEY
                    },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                    })
                });
                
                if (!response.ok) throw new Error('فشل');
                console.log('✅ نجحت طريقة x-goog-api-key');
            } catch(e1) {
                console.log('🔄 تجربة طريقة ?key=...');
                response = await fetch(API_URL + '?key=' + API_KEY, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: contents,
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                    })
                });
                console.log('📥 حالة الاستجابة: ' + response.status);
            }
            
            if (!response.ok) {
                var errorText = '';
                try {
                    var errorData = await response.json();
                    errorText = errorData.error.message;
                } catch(e) {
                    errorText = 'HTTP ' + response.status;
                }
                throw new Error(errorText);
            }
            
            var data = await response.json();
            var botReply = data.candidates[0].content.parts[0].text;
            
            removeTyping();
            addMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            
        } catch (error) {
            removeTyping();
            console.error('❌', error.message);
            addMessage('assistant', '❌ ' + error.message);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>إرسال</span><span class="send-icon">📤</span>';
        }
    }
    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    var saved = localStorage.getItem('vact_preferences');
    if (saved) {
        try {
            var p = JSON.parse(saved);
            if (document.getElementById('userName')) document.getElementById('userName').value = p.name || '';
            if (document.getElementById('userInterest')) document.getElementById('userInterest').value = p.interest || '';
            if (document.getElementById('responseStyle')) document.getElementById('responseStyle').value = p.style || 'detailed';
        } catch(e) {}
    }
    
    window.VACT = {
        Chat: { sendMessage: sendMessage, newChat: function() { conversationHistory = []; messagesDiv.innerHTML = ''; } },
        UI: { toggleSidebar: toggleSidebar, clearChat: function() { conversationHistory = []; } },
        savePreferences: function() { alert('✅ تم الحفظ!'); }
    };
    
    console.log('✅ VACT جاهز');
});
