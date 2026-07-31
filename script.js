// ==================== VACT - الإعدادات ====================
// © 2026 VACT | تطوير: أحمد الجابري
const GEMINI_API_KEY = 'AQ.Ab8RN6JaNYBiyr2ajVKuOEtqTqooUOjp-k2x_P-0Ohu8c-JMsw';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// ==================== المتغيرات العامة ====================
let conversationHistory = [];
let currentChatId = Date.now();
let chats = {};
let userPreferences = {
    name: '',
    interest: '',
    style: 'detailed'
};

// ==================== التهيئة ====================
document.addEventListener('DOMContentLoaded', () => {
    loadPreferences();
    loadChats();
    setupEventListeners();
    autoResizeTextarea();
    console.log('🚀 VACT AI Assistant - Developed by أحمد الجابري');
    console.log('© 2026 VACT - All Rights Reserved');
});

function setupEventListeners() {
    const textarea = document.getElementById('userInput');
    
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    textarea.addEventListener('input', autoResizeTextarea);
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
}

// ==================== وظائف المحادثة ====================
async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    document.getElementById('sendBtn').disabled = true;
    
    addMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    
    input.value = '';
    autoResizeTextarea();
    
    showTypingIndicator();
    
    try {
        const response = await callGeminiAPI(message);
        removeTypingIndicator();
        addMessage('bot', response);
        conversationHistory.push({ role: 'assistant', content: response });
        saveCurrentChat();
    } catch (error) {
        removeTypingIndicator();
        addMessage('bot', '❌ عذراً، حدث خطأ في الاتصال. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.');
        console.error('Error:', error);
    } finally {
        document.getElementById('sendBtn').disabled = false;
    }
}

async function callGeminiAPI(userMessage) {
    const systemPrompt = buildSystemPrompt();
    const contextMessages = conversationHistory.slice(-10).map(msg => 
        `${msg.role === 'user' ? 'المستخدم' : 'VACT'}: ${msg.content}`
    ).join('\n');
    
    const fullPrompt = `${systemPrompt}\n\nسجل المحادثة:\n${contextMessages}\n\nالمستخدم: ${userMessage}\nVACT:`;
    
    const requestBody = {
        contents: [{
            parts: [{
                text: fullPrompt
            }]
        }],
        generationConfig: {
            temperature: userPreferences.style === 'creative' ? 0.9 : 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: userPreferences.style === 'concise' ? 500 : 2048,
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };
    
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'فشل الاتصال بـ Gemini API');
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function buildSystemPrompt() {
    let prompt = 'أنت VACT، المساعد الذكي المتطور. ';
    
    switch(userPreferences.style) {
        case 'concise':
            prompt += 'قدم إجابات مختصرة ومباشرة. ';
            break;
        case 'creative':
            prompt += 'كن مبدعاً واستخدم أسلوباً خيالياً. ';
            break;
        case 'professional':
            prompt += 'استخدم أسلوباً مهنياً ورسمياً. ';
            break;
        default:
            prompt += 'قدم إجابات مفصلة وشاملة. ';
    }
    
    if (userPreferences.name) {
        prompt += `خاطب المستخدم باسم "${userPreferences.name}". `;
    }
    if (userPreferences.interest) {
        prompt += `المستخدم مهتم بـ ${userPreferences.interest}. `;
    }
    
    prompt += 'أجب باللغة العربية. استخدم تنسيق markdown للتنظيم. تم تطويرك بواسطة أحمد الجابري.';
    
    return prompt;
}

// ==================== واجهة المستخدم ====================
function addMessage(type, content) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = type === 'user' ? '👤' : '🤖';
    const formattedContent = type === 'bot' ? formatMarkdown(content) : escapeHtml(content);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${formattedContent}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
}

// ==================== تنسيق النص ====================
function formatMarkdown(text) {
    let formatted = escapeHtml(text);
    
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br>');
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== معلومات المستخدم ====================
function saveUserInfo() {
    userPreferences.name = document.getElementById('userName').value.trim();
    userPreferences.interest = document.getElementById('userInterest').value.trim();
    userPreferences.style = document.getElementById('responseStyle').value;
    
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    showToast('✅ تم حفظ التفضيلات بنجاح!');
}

function loadPreferences() {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
        userPreferences = JSON.parse(saved);
        document.getElementById('userName').value = userPreferences.name || '';
        document.getElementById('userInterest').value = userPreferences.interest || '';
        document.getElementById('responseStyle').value = userPreferences.style || 'detailed';
    }
}

// ==================== إدارة المحادثات ====================
function newChat() {
    if (conversationHistory.length > 0) {
        saveCurrentChat();
    }
    conversationHistory = [];
    currentChatId = Date.now();
    document.getElementById('messages').innerHTML = `
        <div class="welcome-message">
            <div class="bot-avatar">🤖</div>
            <div class="message-content">
                <h2>محادثة جديدة مع VACT</h2>
                <p>كيف يمكنني مساعدتك؟</p>
            </div>
        </div>
    `;
}

function saveCurrentChat() {
    if (conversationHistory.length === 0) return;
    
    const firstMessage = conversationHistory[0].content.substring(0, 50);
    chats[currentChatId] = {
        id: currentChatId,
        title: firstMessage,
        date: new Date().toLocaleDateString('ar-SA'),
        messages: [...conversationHistory]
    };
    
    localStorage.setItem('chats', JSON.stringify(chats));
    updateHistoryList();
}

function loadChats() {
    const saved = localStorage.getItem('chats');
    if (saved) {
        chats = JSON.parse(saved);
        updateHistoryList();
    }
}

function loadChat(chatId) {
    if (conversationHistory.length > 0) {
        saveCurrentChat();
    }
    
    const chat = chats[chatId];
    if (!chat) return;
    
    currentChatId = chatId;
    conversationHistory = chat.messages;
    
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';
    
    chat.messages.forEach(msg => {
        addMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
    });
    
    toggleSidebar();
}

function updateHistoryList() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    Object.values(chats).reverse().forEach(chat => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.cssText = `
            padding: 0.8rem;
            margin-bottom: 0.5rem;
            background: var(--surface-light);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        item.innerHTML = `
            <strong>${chat.title}...</strong>
            <br><small style="color: var(--text-secondary)">${chat.date}</small>
        `;
        item.onclick = () => loadChat(chat.id);
        item.onmouseover = () => item.style.background = 'var(--border)';
        item.onmouseout = () => item.style.background = 'var(--surface-light)';
        historyList.appendChild(item);
    });
}

// ==================== وظائف إضافية ====================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function clearContext() {
    if (confirm('هل تريد مسح سياق المحادثة الحالية؟')) {
        conversationHistory = [];
        showToast('🗑️ تم مسح السياق');
    }
}

function exportChat() {
    if (conversationHistory.length === 0) {
        showToast('⚠️ لا توجد محادثة لتصديرها');
        return;
    }
    
    let exportText = '📝 سجل محادثة VACT\n';
    exportText += '© 2026 VACT | تطوير: أحمد الجابري\n';
    exportText += '='.repeat(50) + '\n\n';
    
    conversationHistory.forEach(msg => {
        const role = msg.role === 'user' ? '👤 المستخدم' : '🤖 VACT';
        exportText += `${role}:\n${msg.content}\n\n${'-'.repeat(30)}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VACT-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 تم تصدير المحادثة');
}

function attachFile() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showToast(`📎 تم إرفاق: ${file.name}`);
}

function autoResizeTextarea() {
    const textarea = document.getElementById('userInput');
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--surface);
        color: var(--text);
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

window.addEventListener('beforeunload', () => {
    saveCurrentChat();
});
