/**
 * VACT - المساعد الذكي
 * @author أحمد الجابري
 * @copyright 2026 VACT
 */

import { GoogleGenAI } from '@google/genai';

const API_KEY = 'AQ.Ab8RN6K0T5DTdTlv5H-GP3ni-BRwLGGxohfzkRxb3_5MMKdQJQ';

let ai;
let chat;
let conversationHistory = [];
let isProcessing = false;

// تهيئة Gemini
try {
    ai = new GoogleGenAI({ apiKey: API_KEY });
    console.log('✅ تم الاتصال بـ Gemini API');
} catch(e) {
    console.error('❌ فشل الاتصال:', e.message);
}

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
            alert('✅ تم حفظ التفضيلات!');
        });
    }
    
    function resetChat() {
        conversationHistory = [];
        chat = null;
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
            .replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code>$1</code>');
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
    
    async function sendMessage() {
        if (isProcessing || !ai) return;
        const message = userInput.value.trim();
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
            // إنشاء محادثة جديدة إذا ما موجودة
            if (!chat) {
                chat = ai.chats.create({
                    model: 'gemini-2.0-flash',
                    config: {
                        systemInstruction: 'أنت VACT، مساعد ذكي ومفيد. أجب دائماً باللغة العربية.',
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                });
            }
            
            // إرسال الرسالة
            const result = await chat.sendMessage({ message: message });
            const botReply = result.text;
            
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
    
    // تحميل التفضيلات
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
        savePreferences: function() { alert('✅ تم الحفظ!'); }
    };
    
    console.log('✅ VACT جاهز');
});
