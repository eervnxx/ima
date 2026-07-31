/**
 * VACT - المساعد الذكي المتطور
 * @version 2.0.0
 * @author أحمد الجابري
 * @copyright 2026 VACT. All rights reserved.
 * @description تطبيق محادثة ذكي يستخدم Gemini API
 */

// ==================== الإعدادات والتكوين ====================
const CONFIG = {
    // مفتاح API
    API_KEY: 'AQ.Ab8RN6IGZRMkT7ra-jIZIa1hIfs-MqcT_8telpN0hoF2XS2TCQ',
    
    // إعدادات API
    API: {
        BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
        MODEL: 'gemini-2.0-flash',
        MAX_TOKENS: 4096,
        TEMPERATURE: 0.7,
        TOP_P: 0.95,
        TOP_K: 40,
    },
    
    // إعدادات التطبيق
    APP: {
        NAME: 'VACT',
        VERSION: '2.0.0',
        MAX_HISTORY: 50,
        MAX_CONTEXT_MESSAGES: 20,
        STORAGE_KEYS: {
            PREFERENCES: 'vact_preferences',
            CHATS: 'vact_chats',
            THEME: 'vact_theme',
        },
    },
};

// ==================== إدارة الأخطاء ====================
class VACTError extends Error {
    constructor(message, type = 'general') {
        super(message);
        this.name = 'VACTError';
        this.type = type;
        this.timestamp = new Date().toISOString();
    }
}

// ==================== نظام التخزين ====================
class StorageManager {
    static set(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage read error:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// ==================== إدارة المحادثة ====================
class ChatManager {
    constructor() {
        this.currentChatId = null;
        this.conversationHistory = [];
        this.chats = {};
        this.isProcessing = false;
    }

    init() {
        this.loadChats();
        this.newChat();
    }

    newChat() {
        if (this.conversationHistory.length > 0) {
            this.saveCurrentChat();
        }
        this.currentChatId = this.generateId();
        this.conversationHistory = [];
        this.isProcessing = false;
    }

    loadChat(chatId) {
        const chat = this.chats[chatId];
        if (!chat) return false;

        if (this.conversationHistory.length > 0) {
            this.saveCurrentChat();
        }

        this.currentChatId = chatId;
        this.conversationHistory = [...chat.messages];
        return true;
    }

    deleteChat(chatId) {
        delete this.chats[chatId];
        StorageManager.set(CONFIG.APP.STORAGE_KEYS.CHATS, this.chats);
        
        if (this.currentChatId === chatId) {
            this.newChat();
        }
    }

    saveCurrentChat() {
        if (this.conversationHistory.length === 0) return;

        const firstUserMessage = this.conversationHistory.find(m => m.role === 'user');
        const title = firstUserMessage 
            ? firstUserMessage.content.substring(0, 50) 
            : 'محادثة جديدة';

        this.chats[this.currentChatId] = {
            id: this.currentChatId,
            title: title,
            date: new Date().toISOString(),
            messages: [...this.conversationHistory],
        };

        this.cleanupOldChats();
        StorageManager.set(CONFIG.APP.STORAGE_KEYS.CHATS, this.chats);
    }

    loadChats() {
        this.chats = StorageManager.get(CONFIG.APP.STORAGE_KEYS.CHATS, {});
    }

    cleanupOldChats() {
        const chatIds = Object.keys(this.chats);
        if (chatIds.length > CONFIG.APP.MAX_HISTORY) {
            const oldestIds = chatIds
                .sort((a, b) => new Date(this.chats[a].date) - new Date(this.chats[b].date))
                .slice(0, chatIds.length - CONFIG.APP.MAX_HISTORY);
            
            oldestIds.forEach(id => delete this.chats[id]);
        }
    }

    getChatList() {
        return Object.values(this.chats)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    exportChat() {
        if (this.conversationHistory.length === 0) return null;

        let exportText = '📝 سجل محادثة VACT\n';
        exportText += `© 2026 VACT | تطوير: أحمد الجابري\n`;
        exportText += `التاريخ: ${new Date().toLocaleDateString('ar-SA')}\n`;
        exportText += '='.repeat(50) + '\n\n';

        this.conversationHistory.forEach(msg => {
            const role = msg.role === 'user' ? '👤 المستخدم' : '🤖 VACT';
            exportText += `${role}:\n${msg.content}\n\n${'-'.repeat(30)}\n\n`;
        });

        return exportText;
    }

    generateId() {
        return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ==================== إدارة Gemini API ====================
class GeminiAPI {
    constructor() {
        this.apiKey = CONFIG.API_KEY;
        this.baseUrl = CONFIG.API.BASE_URL;
        this.model = CONFIG.API.MODEL;
    }

    get endpoint() {
        return `${this.baseUrl}/models/${this.model}:generateContent`;
    }

    async sendMessage(userMessage, conversationHistory, preferences) {
        const contents = this.buildContents(conversationHistory, userMessage, preferences);
        const requestBody = this.buildRequestBody(contents, preferences);

        try {
            const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                await this.handleErrorResponse(response);
            }

            const data = await response.json();
            return this.extractResponse(data);
        } catch (error) {
            if (error instanceof VACTError) throw error;
            throw new VACTError(
                'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
                'network'
            );
        }
    }

    buildContents(conversationHistory, userMessage, preferences) {
        const contents = [];
        
        const systemPrompt = this.buildSystemPrompt(preferences);
        
        if (conversationHistory.length === 0) {
            contents.push({
                role: 'user',
                parts: [{ text: systemPrompt }],
            });
        }

        const recentHistory = conversationHistory.slice(-CONFIG.APP.MAX_CONTEXT_MESSAGES);
        recentHistory.forEach(msg => {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            });
        });

        contents.push({
            role: 'user',
            parts: [{ text: userMessage }],
        });

        return contents;
    }

    buildSystemPrompt(preferences) {
        let prompt = 'أنت VACT، مساعد ذكي متطور ومفيد. ';
        
        switch (preferences.style) {
            case 'concise':
                prompt += 'قدم إجابات مختصرة ومباشرة. ';
                break;
            case 'creative':
                prompt += 'كن مبدعاً وابتكارياً في ردودك. ';
                break;
            case 'professional':
                prompt += 'استخدم أسلوباً مهنياً ورسمياً. ';
                break;
            default:
                prompt += 'قدم إجابات مفصلة وشاملة مع أمثلة عند الحاجة. ';
        }

        if (preferences.name) {
            prompt += `خاطب المستخدم باسم "${preferences.name}". `;
        }
        if (preferences.interest) {
            prompt += `المستخدم مهتم بـ: ${preferences.interest}. `;
        }

        prompt += 'أجب دائماً باللغة العربية. استخدم تنسيق Markdown لتنظيم الردود.';
        
        return prompt;
    }

    buildRequestBody(contents, preferences) {
        return {
            contents: contents,
            generationConfig: {
                temperature: preferences.style === 'creative' ? 0.9 : 0.7,
                topP: CONFIG.API.TOP_P,
                topK: CONFIG.API.TOP_K,
                maxOutputTokens: CONFIG.API.MAX_TOKENS,
                stopSequences: [],
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                },
            ],
        };
    }

    extractResponse(data) {
        if (!data.candidates || data.candidates.length === 0) {
            throw new VACTError('لم يتم الحصول على رد من النموذج.', 'empty_response');
        }

        const candidate = data.candidates[0];
        
        if (candidate.finishReason === 'SAFETY') {
            throw new VACTError('تم حظر الرد لأسباب تتعلق بالسلامة.', 'safety');
        }

        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new VACTError('الرد فارغ. حاول مجدداً.', 'empty_content');
        }

        return candidate.content.parts[0].text;
    }

    async handleErrorResponse(response) {
        const status = response.status;
        let errorMessage = 'حدث خطأ غير معروف.';
        let errorType = 'api_error';

        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
            // لا يمكن قراءة الجسم
        }

        switch (status) {
            case 400:
                errorType = 'invalid_request';
                errorMessage = 'طلب غير صالح. تحقق من المدخلات.';
                break;
            case 401:
            case 403:
                errorType = 'auth_error';
                errorMessage = 'مفتاح API غير صالح أو منتهي الصلاحية.';
                break;
            case 404:
                errorType = 'not_found';
                errorMessage = 'النموذج غير موجود. تحقق من اسم النموذج.';
                break;
            case 429:
                errorType = 'quota_exceeded';
                errorMessage = 'تم تجاوز الحد المسموح. انتظر قليلاً ثم حاول مجدداً.';
                break;
            case 500:
            case 502:
            case 503:
                errorType = 'server_error';
                errorMessage = 'خطأ في خادم Google. حاول مجدداً لاحقاً.';
                break;
        }

        throw new VACTError(errorMessage, errorType);
    }
}

// ==================== واجهة المستخدم ====================
class UIManager {
    constructor() {
        this.elements = {};
        this.toastTimeout = null;
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.updateCharCount();
    }

    cacheElements() {
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            messages: document.getElementById('messages'),
            userInput: document.getElementById('userInput'),
            sendBtn: document.getElementById('sendBtn'),
            charCount: document.getElementById('charCount'),
            historyList: document.getElementById('historyList'),
            noHistory: document.getElementById('noHistory'),
            connectionStatus: document.getElementById('connectionStatus'),
            userName: document.getElementById('userName'),
            userInterest: document.getElementById('userInterest'),
            responseStyle: document.getElementById('responseStyle'),
        };
    }

    setupEventListeners() {
        const { userInput } = this.elements;

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                VACT.Chat.sendMessage();
            }
        });

        userInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResize();
        });
    }

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        const formattedContent = role === 'assistant' 
            ? this.formatMarkdown(content) 
            : this.escapeHtml(content);

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">${formattedContent}</div>
        `;

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.removeTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message assistant';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        this.elements.messages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) indicator.remove();
    }

    clearMessages() {
        this.elements.messages.innerHTML = `
            <div class="welcome-message">
                <div class="bot-avatar">🤖</div>
                <div class="message-content">
                    <h2>محادثة جديدة مع VACT ⚡</h2>
                    <p>كيف يمكنني مساعدتك اليوم؟</p>
                </div>
            </div>
        `;
    }

    restoreMessages(messages) {
        this.elements.messages.innerHTML = '';
        messages.forEach(msg => {
            this.addMessage(
                msg.role === 'assistant' ? 'assistant' : 'user',
                msg.content
            );
        });
    }

    updateChatHistory(chats) {
        const { historyList, noHistory } = this.elements;
        historyList.innerHTML = '';

        if (chats.length === 0) {
            noHistory.classList.add('visible');
            return;
        }

        noHistory.classList.remove('visible');

        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (chat.id === VACT.chatManager.currentChatId) {
                item.classList.add('active');
            }

            const date = new Date(chat.date).toLocaleDateString('ar-SA', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });

            item.innerHTML = `
                <div class="history-item-title">${this.escapeHtml(chat.title)}</div>
                <div class="history-item-date">${date}</div>
                <div class="history-item-actions">
                    <button onclick="event.stopPropagation(); VACT.Chat.deleteChat('${chat.id}')" 
                            title="حذف المحادثة">🗑️</button>
                </div>
            `;

            item.addEventListener('click', () => {
                VACT.Chat.loadChat(chat.id);
            });

            historyList.appendChild(item);
        });
    }

    formatMarkdown(text) {
        if (typeof marked !== 'undefined') {
            marked.setOptions({
                breaks: true,
                gfm: true,
            });
            return marked.parse(text);
        }
        
        // Fallback basic formatting
        return this.escapeHtml(text)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateCharCount() {
        const count = this.elements.userInput.value.length;
        this.elements.charCount.textContent = `${count}/4000`;
        
        if (count > 3500) {
            this.elements.charCount.style.color = 'var(--warning)';
        } else {
            this.elements.charCount.style.color = 'var(--text-muted)';
        }
    }

    autoResize() {
        const textarea = this.elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        });
    }

    setConnectionStatus(status, message) {
        const statusEl = this.elements.connectionStatus;
        const textEl = statusEl.querySelector('.status-text');
        
        statusEl.classList.remove('error');
        
        switch (status) {
            case 'connected':
                textEl.textContent = 'متصل';
                break;
            case 'error':
                statusEl.classList.add('error');
                textEl.textContent = message || 'خطأ';
                break;
            case 'processing':
                textEl.textContent = 'جاري المعالجة...';
                break;
        }
    }

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setSendButtonState(disabled) {
        this.elements.sendBtn.disabled = disabled;
    }

    clearInput() {
        this.elements.userInput.value = '';
        this.updateCharCount();
        this.autoResize();
    }

    getUserInput() {
        return this.elements.userInput.value.trim();
    }
}

// ==================== التطبيق الرئيسي ====================
class VACTApp {
    constructor() {
        this.chatManager = new ChatManager();
        this.api = new GeminiAPI();
        this.ui = new UIManager();
        this.preferences = {
            name: '',
            interest: '',
            style: 'detailed',
        };
    }

    init() {
        console.log(`🚀 ${CONFIG.APP.NAME} v${CONFIG.APP.VERSION} | Developed by أحمد الجابري`);
        console.log('© 2026 VACT - All Rights Reserved');
        
        this.loadPreferences();
        this.ui.init();
        this.chatManager.init();
        this.ui.updateChatHistory(this.chatManager.getChatList());
    }

    async sendMessage() {
        if (this.chatManager.isProcessing) return;

        const message = this.ui.getUserInput();
        if (!message) return;

        this.chatManager.isProcessing = true;
        this.ui.setSendButtonState(true);
        this.ui.setConnectionStatus('processing');

        this.ui.addMessage('user', message);
        this.chatManager.conversationHistory.push({
            role: 'user',
            content: message,
        });
        this.ui.clearInput();

        this.ui.showTypingIndicator();

        try {
            const response = await this.api.sendMessage(
                message,
                this.chatManager.conversationHistory,
                this.preferences
            );

            this.ui.removeTypingIndicator();
            this.ui.addMessage('assistant', response);
            this.chatManager.conversationHistory.push({
                role: 'assistant',
                content: response,
            });

            this.ui.setConnectionStatus('connected');
            this.chatManager.saveCurrentChat();
            this.ui.updateChatHistory(this.chatManager.getChatList());
        } catch (error) {
            this.ui.removeTypingIndicator();
            
            let errorMessage = '❌ حدث خطأ غير متوقع.';
            
            if (error instanceof VACTError) {
                switch (error.type) {
                    case 'auth_error':
                        errorMessage = '🔑 مفتاح API غير صالح. تأكد من المفتاح.';
                        break;
                    case 'quota_exceeded':
                        errorMessage = '⏳ تم تجاوز الحد المسموح. انتظر قليلاً.';
                        break;
                    case 'network':
                        errorMessage = '🌐 خطأ في الاتصال. تحقق من الإنترنت.';
                        break;
                    case 'safety':
                        errorMessage = '🛡️ تم حظر الرد لأسباب تتعلق بالسلامة.';
                        break;
                    default:
                        errorMessage = `❌ ${error.message}`;
                }
            }

            this.ui.addMessage('assistant', errorMessage);
            this.ui.setConnectionStatus('error', 'خطأ');
            console.error('Send message error:', error);
        } finally {
            this.chatManager.isProcessing = false;
            this.ui.setSendButtonState(false);
        }
    }

    newChat() {
        this.ui.clearMessages();
        this.chatManager.newChat();
        this.ui.updateChatHistory(this.chatManager.getChatList());
        this.ui.setConnectionStatus('connected');
    }

    loadChat(chatId) {
        const success = this.chatManager.loadChat(chatId);
        if (success) {
            this.ui.restoreMessages(this.chatManager.conversationHistory);
            this.ui.updateChatHistory(this.chatManager.getChatList());
            this.ui.toggleSidebar();
        }
    }

    deleteChat(chatId) {
        if (confirm('هل أنت متأكد من حذف هذه المحادثة؟')) {
            this.chatManager.deleteChat(chatId);
            this.ui.clearMessages();
            this.ui.updateChatHistory(this.chatManager.getChatList());
            this.ui.showToast('🗑️ تم حذف المحادثة', 'success');
        }
    }

    exportChat() {
        const exportData = this.chatManager.exportChat();
        if (!exportData) {
            this.ui.showToast('⚠️ لا توجد محادثة لتصديرها', 'warning');
            return;
        }

        const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VACT-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.ui.showToast('📥 تم تصدير المحادثة بنجاح', 'success');
    }

    clearChat() {
        if (this.chatManager.conversationHistory.length === 0) {
            this.ui.showToast('⚠️ المحادثة فارغة بالفعل', 'warning');
            return;
        }

        if (confirm('هل تريد مسح المحادثة الحالية؟')) {
            this.chatManager.conversationHistory = [];
            this.chatManager.saveCurrentChat();
            this.ui.clearMessages();
            this.ui.showToast('🗑️ تم مسح المحادثة', 'success');
        }
    }

    savePreferences() {
        this.preferences.name = this.ui.elements.userName.value.trim();
        this.preferences.interest = this.ui.elements.userInterest.value.trim();
        this.preferences.style = this.ui.elements.responseStyle.value;

        StorageManager.set(CONFIG.APP.STORAGE_KEYS.PREFERENCES, this.preferences);
        this.ui.showToast('✅ تم حفظ التفضيلات بنجاح', 'success');
    }

    loadPreferences() {
        const saved = StorageManager.get(CONFIG.APP.STORAGE_KEYS.PREFERENCES);
        if (saved) {
            this.preferences = { ...this.preferences, ...saved };
        }

        if (this.ui.elements.userName) {
            this.ui.elements.userName.value = this.preferences.name;
            this.ui.elements.userInterest.value = this.preferences.interest;
            this.ui.elements.responseStyle.value = this.preferences.style;
        }
    }
}

// ==================== التهيئة ====================
const VACT = new VACTApp();

window.VACT = {
    Chat: {
        sendMessage: () => VACT.sendMessage(),
        newChat: () => VACT.newChat(),
        loadChat: (id) => VACT.loadChat(id),
        deleteChat: (id) => VACT.deleteChat(id),
        exportChat: () => VACT.exportChat(),
    },
    UI: {
        toggleSidebar: () => VACT.ui.toggleSidebar(),
        clearChat: () => VACT.clearChat(),
    },
    savePreferences: () => VACT.savePreferences(),
};

document.addEventListener('DOMContentLoaded', () => {
    VACT.init();
});

window.addEventListener('beforeunload', () => {
    VACT.chatManager.saveCurrentChat();
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
