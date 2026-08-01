/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */

const API_KEY = 'AQ.Ab8RN6K0T5DTdTlv5H-GP3ni-BRwLGGxohfzkRxb3_5MMKdQJQ';
const API_MODEL = 'gemini-2.0-flash';

// استخدام وكيل CORS مجاني
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + API_MODEL + ':generateContent';

let conversationHistory = [];
let isProcessing = false;

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🚀 VACT جاهز | تطوير: أحمد الجابري');
    
    const messagesDiv = document.getElementById('messages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const savePrefsBtn = document.getElementById('savePrefsBtn');
    const charCount = document.getElementById('charCount');
    const connectionStatus = document.getElementById('connectionStatus');
    
    function setStatus(text, isError) {
        if (!connectionStatus) return;
        const dot = connectionStatus.querySelector('.status-dot');
        const txt = connectionStatus.querySelector('.status-text');
        txt.textContent = text;
        if (isError) {
            dot.style.background = '#ef4444';
            txt.style.color = '#ef4444';
        } else {
            dot.style.background = '#10b981';
            txt.style.color = '#10b981';
        }
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('collapsed');
    }
    
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', function() {
            const prefs = {
                name: document.getElementById('userName').value,
                interest: document.getElementById('userInterest').value,
                style: document.getElementById('responseStyle').value
            };
            localStorage.setItem('vact_preferences', JSON.stringify(prefs));
            showToast('✅ تم حفظ التفضيلات!');
        });
    }
    
    function resetChat() {
        conversationHistory = [];
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            resetChat();
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>محادثة جديدة ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
                '</div>';
        });
    }
    
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            resetChat();
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>تم المسح ✅</h2></div>' +
                '</div>';
        });
    }
    
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', function() {
            let text = '📝 VACT Chat\n© أحمد الجابري\n\n';
            conversationHistory.forEach(function(m) {
                text += (m.role === 'user' ? '👤' : '🤖') + ': ' + m.content + '\n\n';
            });
            const blob = new Blob([text], {type: 'text/plain'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'VACT-chat.txt';
            a.click();
        });
    }
    
    userInput.addEventListener('input', function() {
        if (charCount) charCount.textContent = userInput.value.length + '/4000';
    });
    
    function addMessage(role, text) {
        const div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'assistant');
        const avatar = role === 'user' ? '👤' : '🤖';
        let formatted = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        div.innerHTML = '<div class="message-avatar">' + avatar + '</div>' +
                       '<div class="message-content">' + formatted + '</div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function showTyping() {
        removeTyping();
        const div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typingIndicator';
        div.innerHTML = '<div class="message-avatar">🤖</div>' +
            '<div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function removeTyping() {
        const el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }
    
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f1f5f9;padding:10px 20px;border-radius:8px;z-index:999;font-size:14px;border:1px solid #334155;';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2500);
    }
    
    async function sendMessage() {
        if (isProcessing) return;
        const message = userInput.value.trim();
        if (!message) return;
        
        isProcessing = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>⏳</span>';
        setStatus('جاري الإرسال...', false);
        
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        if (charCount) charCount.textContent = '0/4000';
        
        showTyping();
        
        try {
            const contents = [];
            
            // إضافة system prompt
            contents.push({
                role: 'user',
                parts: [{ text: 'أنت VACT، مساعد ذكي ومفيد. أجب دائماً باللغة العربية.' }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'حسناً، أنا VACT. سأجيب بالعربية.' }]
            });
            
            // إضافة آخر 10 رسائل من التاريخ
            const recentHistory = conversationHistory.slice(-10);
            recentHistory.forEach(function(m) {
                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                });
            });
            
            const requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            };
            
            // بناء الرابط مع المفتاح
            const targetUrl = API_URL + '?key=' + API_KEY;
            const proxyUrl = PROXY_URL + encodeURIComponent(targetUrl);
            
            console.log('🔄 جاري الاتصال...');
            
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('خطأ ' + response.status + ': ' + errorText.substring(0, 100));
            }
            
            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('لم يتم الحصول على رد');
            }
            
            const botReply = data.candidates[0].content.parts[0].text;
            
            removeTyping();
            addMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            setStatus('متصل', false);
            
        } catch (error) {
            removeTyping();
            console.error('❌', error.message);
            addMessage('assistant', '❌ ' + error.message);
            setStatus('خطأ', true);
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
    
    const saved = localStorage.getItem('vact_preferences');
    if (saved) {
        try {
            const p = JSON.parse(saved);
            if (document.getElementById('userName')) document.getElementById('userName').value = p.name || '';
            if (document.getElementById('userInterest')) document.getElementById('userInterest').value = p.interest || '';
            if (document.getElementById('responseStyle')) document.getElementById('responseStyle').value = p.style || 'detailed';
        } catch(e) {}
    }
    
    window.VACT = {
        Chat: { sendMessage, newChat: function() { resetChat(); messagesDiv.innerHTML = ''; } },
        UI: { toggleSidebar, clearChat: function() { resetChat(); } },
        savePreferences: function() { showToast('✅ تم الحفظ!'); }
    };
    
    console.log('✅ VACT جاهز');
});
