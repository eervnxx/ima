/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */

// ========== الإعدادات ==========
var API_KEY = 'AQ.Ab8RN6JTedhHhrcHxpsKHT_qveZLPdsoTz9YadOLfBjiEm4hHQ';
var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ========== المتغيرات ==========
var conversationHistory = [];
var isProcessing = false;

// ========== تهيئة بعد تحميل الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    
    // العناصر
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
    
    console.log('🚀 VACT جاهز | تطوير: أحمد الجابري');
    
    // ========== زر الإرسال ==========
    sendBtn.addEventListener('click', function() {
        console.log('تم الضغط على زر الإرسال');
        sendMessage();
    });
    
    // ========== إرسال بـ Enter ==========
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('تم الضغط على Enter');
            sendMessage();
        }
    });
    
    // ========== زر محادثة جديدة ==========
    newChatBtn.addEventListener('click', function() {
        conversationHistory = [];
        messagesDiv.innerHTML = '<div class="welcome-message">' +
            '<div class="bot-avatar">🤖</div>' +
            '<div class="message-content"><h2>محادثة جديدة ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
            '</div>';
    });
    
    // ========== زر مسح ==========
    clearChatBtn.addEventListener('click', function() {
        conversationHistory = [];
        messagesDiv.innerHTML = '<div class="welcome-message">' +
            '<div class="bot-avatar">🤖</div>' +
            '<div class="message-content"><h2>تم المسح ✅</h2><p>ابدأ محادثة جديدة</p></div>' +
            '</div>';
    });
    
    // ========== زر تصدير ==========
    exportChatBtn.addEventListener('click', function() {
        var text = '📝 سجل محادثة VACT\n© 2026 VACT | أحمد الجابري\n\n';
        conversationHistory.forEach(function(m) {
            text += (m.role === 'user' ? '👤' : '🤖') + ': ' + m.content + '\n\n';
        });
        var blob = new Blob([text], {type: 'text/plain'});
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'VACT-chat.txt';
        a.click();
    });
    
    // ========== تبديل القائمة ==========
    function toggleSidebar() {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    }
    
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    menuBtn.addEventListener('click', toggleSidebar);
    
    // ========== حفظ التفضيلات ==========
    savePrefsBtn.addEventListener('click', function() {
        alert('✅ تم حفظ التفضيلات!');
    });
    
    // ========== تحديث عداد الأحرف ==========
    userInput.addEventListener('input', function() {
        charCount.textContent = userInput.value.length + '/4000';
    });
    
    // ========== دالة الإرسال الرئيسية ==========
    async function sendMessage() {
        if (isProcessing) {
            console.log('جاري المعالجة...');
            return;
        }
        
        var message = userInput.value.trim();
        if (!message) {
            console.log('الرسالة فارغة');
            return;
        }
        
        console.log('إرسال: ' + message);
        
        isProcessing = true;
        sendBtn.disabled = true;
        sendBtn.textContent = '⏳';
        
        // إظهار رسالة المستخدم
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        charCount.textContent = '0/4000';
        
        // إظهار مؤشر الكتابة
        showTyping();
        
        try {
            // بناء الطلب
            var contents = [];
            
            // إضافة system prompt للمحادثة الجديدة
            if (conversationHistory.length <= 1) {
                contents.push({
                    role: 'user',
                    parts: [{ text: 'أنت VACT، مساعد ذكي ومفيد. أجب باللغة العربية.' }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'حسناً، سأجيب بالعربية. كيف يمكنني مساعدتك؟' }]
                });
            }
            
            // إضافة تاريخ المحادثة
            for (var i = 0; i < conversationHistory.length; i++) {
                contents.push({
                    role: conversationHistory[i].role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: conversationHistory[i].content }]
                });
            }
            
            console.log('إرسال طلب إلى Gemini...');
            
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
            
            console.log('حالة الاستجابة: ' + response.status);
            
            if (!response.ok) {
                var errorText = 'خطأ ' + response.status;
                try {
                    var errorData = await response.json();
                    errorText = errorData.error.message;
                } catch(e) {}
                throw new Error(errorText);
            }
            
            var data = await response.json();
            console.log('تم استلام الرد');
            
            var botReply = data.candidates[0].content.parts[0].text;
            
            removeTyping();
            addMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            
        } catch (error) {
            console.error('خطأ:', error);
            removeTyping();
            addMessage('assistant', '❌ خطأ: ' + error.message);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>إرسال</span><span class="send-icon">📤</span>';
        }
    }
    
    // ========== إضافة رسالة للشاشة ==========
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'message ' + (role === 'user' ? 'user' : 'assistant');
        
        var avatar = role === 'user' ? '👤' : '🤖';
        
        // تنسيق بسيط
        var formatted = text
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
    
});
