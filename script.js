/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */

// ========== الإعدادات ==========
var API_KEY = 'AIzaSyBc0HqGg0FZXKxPRVGZJXyGdxXGPWJNlPY';
var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ========== المتغيرات ==========
var conversationHistory = [];
var isProcessing = false;

// ========== انتظر تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    
    console.log('🚀 VACT جاهز | تطوير: أحمد الجابري');
    
    // ========== جلب العناصر ==========
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
    
    // ========== التحقق من وجود العناصر ==========
    if (!sendBtn) {
        console.error('خطأ: زر الإرسال غير موجود في الصفحة!');
        return;
    }
    if (!userInput) {
        console.error('خطأ: حقل الكتابة غير موجود!');
        return;
    }
    
    // ========== تبديل القائمة الجانبية ==========
    function toggleSidebar() {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    }
    
    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    
    // ========== حفظ التفضيلات ==========
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener('click', function() {
            var name = document.getElementById('userName').value;
            var interest = document.getElementById('userInterest').value;
            var style = document.getElementById('responseStyle').value;
            
            var prefs = { name: name, interest: interest, style: style };
            localStorage.setItem('vact_preferences', JSON.stringify(prefs));
            alert('✅ تم حفظ التفضيلات!');
        });
    }
    
    // ========== محادثة جديدة ==========
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            conversationHistory = [];
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>محادثة جديدة ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
                '</div>';
        });
    }
    
    // ========== مسح المحادثة ==========
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            if (conversationHistory.length > 0 && !confirm('مسح المحادثة؟')) return;
            conversationHistory = [];
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>تم المسح ✅</h2><p>ابدأ محادثة جديدة</p></div>' +
                '</div>';
        });
    }
    
    // ========== تصدير المحادثة ==========
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', function() {
            if (conversationHistory.length === 0) {
                alert('لا توجد محادثة لتصديرها');
                return;
            }
            var text = '📝 سجل محادثة VACT\n© 2026 VACT | أحمد الجابري\n\n';
            for (var i = 0; i < conversationHistory.length; i++) {
                var role = conversationHistory[i].role === 'user' ? '👤' : '🤖';
                text += role + ': ' + conversationHistory[i].content + '\n\n';
            }
            var blob = new Blob([text], {type: 'text/plain'});
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'VACT-chat.txt';
            a.click();
        });
    }
    
    // ========== عداد الأحرف ==========
    userInput.addEventListener('input', function() {
        if (charCount) {
            charCount.textContent = userInput.value.length + '/4000';
        }
    });
    
    // ========== إضافة رسالة للشاشة ==========
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'assistant');
        
        var avatar = role === 'user' ? '👤' : '🤖';
        
        var formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>');
        
        div.innerHTML = '<div class="message-avatar">' + avatar + '</div>' +
                       '<div class="message-content">' + formatted + '</div>';
        
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // ========== مؤشر الكتابة ==========
    function showTyping() {
        removeTyping();
        var div = document.createElement('div');
        div.className = 'message assistant';
        div.id = 'typingIndicator';
        div.innerHTML = '<div class="message-avatar">🤖</div>' +
                       '<div class="message-content">' +
                       '<div class="typing-indicator"><span></span><span></span><span></span></div>' +
                       '</div>';
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    function removeTyping() {
        var el = document.getElementById('typingIndicator');
        if (el) el.remove();
    }
    
    // ========== دالة الإرسال ==========
    async function sendMessage() {
        if (isProcessing) return;
        
        var message = userInput.value.trim();
        if (!message) return;
        
        isProcessing = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>⏳ جاري الإرسال...</span>';
        
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        if (charCount) charCount.textContent = '0/4000';
        userInput.style.height = 'auto';
        
        showTyping();
        
        try {
            var contents = [];
            
            // System prompt للمحادثة الجديدة
            if (conversationHistory.length <= 1) {
                contents.push({
                    role: 'user',
                    parts: [{ text: 'أنت VACT، مساعد ذكي ومفيد. أجب دائماً باللغة العربية.' }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'حسناً، أنا VACT. سأجيب بالعربية. كيف يمكنني مساعدتك؟' }]
                });
            }
            
            // تاريخ المحادثة
            for (var i = 0; i < conversationHistory.length; i++) {
                contents.push({
                    role: conversationHistory[i].role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: conversationHistory[i].content }]
                });
            }
            
            var response = await fetch(API_URL + '?key=' + API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                })
            });
            
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
            console.error('خطأ:', error.message);
            addMessage('assistant', '❌ ' + error.message);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>إرسال</span><span class="send-icon">📤</span>';
        }
    }
    
    // ========== ربط زر الإرسال ==========
    sendBtn.addEventListener('click', sendMessage);
    
    // ========== ربط مفتاح Enter ==========
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // ========== تحميل التفضيلات ==========
    var savedPrefs = localStorage.getItem('vact_preferences');
    if (savedPrefs) {
        try {
            var prefs = JSON.parse(savedPrefs);
            if (document.getElementById('userName')) document.getElementById('userName').value = prefs.name || '';
            if (document.getElementById('userInterest')) document.getElementById('userInterest').value = prefs.interest || '';
            if (document.getElementById('responseStyle')) document.getElementById('responseStyle').value = prefs.style || 'detailed';
        } catch(e) {}
    }
    
    // ========== كائن VACT للتوافق ==========
    window.VACT = {
        Chat: {
            sendMessage: sendMessage,
            newChat: function() {
                conversationHistory = [];
                messagesDiv.innerHTML = '<div class="welcome-message">' +
                    '<div class="bot-avatar">🤖</div>' +
                    '<div class="message-content"><h2>محادثة جديدة ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
                    '</div>';
            },
            exportChat: function() {
                if (conversationHistory.length === 0) return;
                var text = '📝 VACT Chat\n\n';
                for (var i = 0; i < conversationHistory.length; i++) {
                    text += conversationHistory[i].content + '\n\n';
                }
                var blob = new Blob([text], {type: 'text/plain'});
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'chat.txt';
                a.click();
            }
        },
        UI: {
            toggleSidebar: toggleSidebar,
            clearChat: function() { conversationHistory = []; }
        },
        savePreferences: function() {
            var name = document.getElementById('userName').value;
            var interest = document.getElementById('userInterest').value;
            var style = document.getElementById('responseStyle').value;
            localStorage.setItem('vact_preferences', JSON.stringify({ name: name, interest: interest, style: style }));
            alert('✅ تم الحفظ!');
        }
    };
    
    console.log('✅ جميع الأزرار جاهزة للعمل');
    
});
