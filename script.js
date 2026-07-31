/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */
(function() {
    'use strict';

    // ========== الإعدادات ==========
    var API_KEY = 'AQ.Ab8RN6JTedhHhrcHxpsKHT_qveZLPdsoTz9YadOLfBjiEm4hHQ';
    var API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // ========== المتغيرات ==========
    var conversationHistory = [];
    var isProcessing = false;
    
    // ========== عناصر الصفحة ==========
    var messagesDiv = document.getElementById('messages');
    var userInput = document.getElementById('userInput');
    var sendBtn = document.getElementById('sendBtn');
    var sidebar = document.getElementById('sidebar');
    
    // ========== الدوال الأساسية ==========
    
    // إرسال رسالة
    async function sendMessage() {
        if (isProcessing) return;
        
        var message = userInput.value.trim();
        if (!message) return;
        
        isProcessing = true;
        sendBtn.disabled = true;
        
        // إظهار رسالة المستخدم
        addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });
        userInput.value = '';
        
        // إظهار مؤشر الكتابة
        showTyping();
        
        try {
            // بناء الطلب
            var contents = [];
            
            // إضافة system prompt
            if (conversationHistory.length <= 1) {
                contents.push({
                    role: 'user',
                    parts: [{ text: 'أنت VACT، مساعد ذكي. أجب بالعربية.' }]
                });
                contents.push({
                    role: 'model',
                    parts: [{ text: 'حسناً، سأجيب بالعربية.' }]
                });
            }
            
            // إضافة آخر 10 رسائل
            var recentHistory = conversationHistory.slice(-10);
            for (var i = 0; i < recentHistory.length; i++) {
                contents.push({
                    role: recentHistory[i].role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: recentHistory[i].content }]
                });
            }
            
            // إرسال الطلب
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
                    errorText = 'Status: ' + response.status;
                }
                throw new Error(errorText);
            }
            
            var data = await response.json();
            var botReply = data.candidates[0].content.parts[0].text;
            
            // إظهار الرد
            removeTyping();
            addMessage('assistant', botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });
            
        } catch (error) {
            removeTyping();
            console.error('Error:', error);
            addMessage('assistant', '❌ خطأ: ' + error.message);
        } finally {
            isProcessing = false;
            sendBtn.disabled = false;
        }
    }
    
    // إضافة رسالة
    function addMessage(role, text) {
        var div = document.createElement('div');
        div.className = 'message ' + role;
        
        var avatar = role === 'user' ? '👤' : '🤖';
        var escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        escapedText = escapedText.replace(/\n/g, '<br>');
        escapedText = escapedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        escapedText = escapedText.replace(/`(.+?)`/g, '<code>$1</code>');
        
        div.innerHTML = '<div class="message-avatar">' + avatar + '</div>' +
                       '<div class="message-content">' + escapedText + '</div>';
        
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // مؤشر الكتابة
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
    
    // محادثة جديدة
    function newChat() {
        conversationHistory = [];
        messagesDiv.innerHTML = '<div class="welcome-message">' +
            '<div class="bot-avatar">🤖</div>' +
            '<div class="message-content"><h2>محادثة جديدة مع VACT ⚡</h2><p>كيف يمكنني مساعدتك؟</p></div>' +
            '</div>';
    }
    
    // تبديل القائمة
    function toggleSidebar() {
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
        } else {
            sidebar.classList.add('collapsed');
        }
    }
    
    // ========== ربط الأحداث ==========
    sendBtn.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // ========== تصدير الدوال للـ HTML ==========
    window.VACT = {
        Chat: {
            sendMessage: sendMessage,
            newChat: newChat,
            exportChat: function() {
                var text = 'سجل محادثة VACT\n© 2026 VACT | أحمد الجابري\n\n';
                conversationHistory.forEach(function(m) {
                    text += (m.role === 'user' ? '👤' : '🤖') + ': ' + m.content + '\n\n';
                });
                var blob = new Blob([text], {type: 'text/plain'});
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'VACT-chat.txt';
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
            alert('✅ تم حفظ التفضيلات!');
        }
    };
    
    console.log('🚀 VACT جاهز | تطوير: أحمد الجابري');
    
})();
