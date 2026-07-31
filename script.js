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
            console.log('تم إنشاء محادثة جديدة');
        });
    }
    
    // ========== مسح المحادثة ==========
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', function() {
            conversationHistory = [];
            messagesDiv.innerHTML = '<div class="welcome-message">' +
                '<div class="bot-avatar">🤖</div>' +
                '<div class="message-content"><h2>تم المسح ✅</h2><p>ابدأ محادثة جديدة</p></div>' +
                '</div>';
            console.log('تم مسح المحادثة');
        });
    }
    
    // ========== تصدير المحادثة ==========
    if (exportChatBtn) {
        exportChatBtn.addEventListener('click', function() {
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
            console.log('تم تصدير المحادثة');
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
        
        // تنسيق النص
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
        if (isProcessing) {
            console.log('⏳ جاري المعالجة... انتظر');
            return;
        }
        
        var message = userInput.value.trim();
        if (!message) {
            console.log('⚠️ الرسالة فارغة');
            return;
        }
        
        console.log('📤 إرسال: ' + message);
        
        isProcessing = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span>⏳</span>';
        
        // إظهار رسالة المستخدم
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        if (charCount) charCount.textContent = '0/4000';
        
        // مؤشر الكتابة
        showTyping();
        
        try {
            // بناء المحتوى
            var contents = [];
            
            if (conversationHistory.length <= 1) {
                contents.push({
                    role: 'user',
                    parts: [{ text: 'أنت VACT مساعد ذكي. أجب بالعربية.' }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'حسناً، سأجيب بالعربية.' }]
                });
            }
            
            for (var i = 0; i < conversationHistory.length; i++) {
                contents.push({
                    role: conversationHistory[i].role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: conversationHistory[i].content }]
                });
            }
            
            console.log('🔄 جاري الاتصال بـ Gemini API...');
            
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
            
            console.log('📥 حالة الاستجابة: ' + response.status);
            
            if (!response.ok) {
                var errorText = 'خطأ ' + response.status;
                try {
                    var errorData = await response.json();
                    errorText = errorData.error.message;
                } catch(e) {}
                throw new Error(errorText);
            }
            
            var data = await response.json();
            console.log('✅ تم استلام الرد بنجاح');
            
            var botReply = data.candidates[0].content.parts[0].text;
            
            removeTyping();
            addMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            
        } catch (error) {
            console.error('❌ خطأ:', error.message);
            removeTyping();
            addMessage('assistant', '❌ ' + error.message);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span>إرسال</span><span class="send-icon">📤</span>';
        }
    }
    
    // ========== ربط زر الإرسال ==========
    sendBtn.addEventListener('click', function() {
        console.log('🖱️ تم الضغط على زر الإرسال');
        sendMessage();
    });
    
    // ========== ربط مفتاح Enter ==========
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('⌨️ تم الضغط على Enter');
            sendMessage();
        }
    });
    
    // ========== كائن VACT للتوافق مع أي استدعاءات قديمة ==========
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
                var text = 'سجل محادثة VACT\n\n';
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
            clearChat: function() {
                conversationHistory = [];
            }
        },
        savePreferences: function() {
            alert('✅ تم الحفظ!');
        }
    };
    
    console.log('✅ جميع الأزرار جاهزة');
    console.log('💡 جرب كتابة رسالة والضغط على Enter أو زر إرسال');
    
});
