// DOM elements
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const typingIndicator = document.getElementById('typingIndicator');
const newChatBtn = document.getElementById('newChatBtn');
const historyContainer = document.getElementById('history');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const apiStatus = document.getElementById('apiStatus');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeySetupMessage = document.getElementById('apiKeySetupMessage');

// API configuration
let API_KEY = '';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// State management
let currentChat = [];
let chatHistory = JSON.parse(localStorage.getItem('thb-ai-chat-history')) || [];

// Initialize the app
function init() {
    loadApiKey();
    loadChatHistory();
    setupEventListeners();
    
    // Check if API key is available
    if (!API_KEY) {
        userInput.disabled = true;
        sendButton.disabled = true;
        apiKeySetupMessage.style.display = 'flex';
    } else {
        userInput.disabled = false;
        sendButton.disabled = false;
        apiKeySetupMessage.style.display = 'none';
        apiStatus.classList.add('connected');
        apiStatus.innerHTML = '<i class="fas fa-circle"></i> API সংযুক্ত';
    }
}

// Load API key from localStorage
function loadApiKey() {
    API_KEY = localStorage.getItem('thb-ai-api-key') || '';
}

// Save API key to localStorage
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
        API_KEY = key;
        localStorage.setItem('thb-ai-api-key', key);
        userInput.disabled = false;
        sendButton.disabled = false;
        apiKeySetupMessage.style.display = 'none';
        apiStatus.classList.add('connected');
        apiStatus.innerHTML = '<i class="fas fa-circle"></i> API সংযুক্ত';
        
        // Show success message
        addMessage('API কী সফলভাবে সংরক্ষণ করা হয়েছে! এখন আপনি THB AI এর সাথে চ্যাট করতে পারেন।', 'ai');
    }
}

// Event listeners setup
function setupEventListeners() {
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    newChatBtn.addEventListener('click', startNewChat);
    
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    
    // Mobile menu toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
}

// Load chat history to sidebar
function loadChatHistory() {
    historyContainer.innerHTML = '';
    
    if (chatHistory.length === 0) {
        historyContainer.innerHTML = '<div class="history-item">কোন চ্যাট ইতিহাস নেই</div>';
        return;
    }
    
    chatHistory.forEach((chat, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `<i class="fas fa-message"></i> ${getChatTitle(chat)}`;
        
        historyItem.addEventListener('click', () => loadChat(index));
        historyContainer.appendChild(historyItem);
    });
}

// Generate a title for chat based on first message
function getChatTitle(chat) {
    if (chat.length === 0) return 'খালি চ্যাট';
    const firstMessage = chat[0].content;
    return firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
}

// Start a new chat
function startNewChat() {
    if (currentChat.length > 0) {
        chatHistory.push([...currentChat]);
        localStorage.setItem('thb-ai-chat-history', JSON.stringify(chatHistory));
    }
    
    currentChat = [];
    chatContainer.innerHTML = '';
    userInput.value = '';
    
    addMessage('হ্যালো! আমি THB AI, আপনার ব্যক্তিগত AI সহকারী। আজ আমি আপনাকে কিভাবে সাহায্য করতে পারি?', 'ai');
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    
    loadChatHistory();
}

// Load a previous chat
function loadChat(index) {
    if (currentChat.length > 0) {
        chatHistory.push([...currentChat]);
    }
    
    currentChat = [...chatHistory[index]];
    chatHistory.splice(index, 1);
    
    renderChat();
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// Render current chat to UI
function renderChat() {
    chatContainer.innerHTML = '';
    
    currentChat.forEach(message => {
        addMessage(message.content, message.role, false);
    });
    
    scrollToBottom();
}

// Send message to API
async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Add user message to UI
    addMessage(message, 'user');
    userInput.value = '';
    sendButton.disabled = true;
    
    // Add to current chat
    currentChat.push({ role: 'user', content: message });
    
    // Show typing indicator
    typingIndicator.style.display = 'block';
    scrollToBottom();
    
    try {
        // Prepare messages for API
        const messages = [
            { role: 'system', content: 'You are THB AI, a helpful assistant that speaks Bengali and English.' },
            ...currentChat
        ];
        
        // Call OpenAI API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: messages,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        const aiResponse = data.choices[0].message.content;
        
        // Add AI response to UI
        addMessage(aiResponse, 'ai');
        
        // Add to current chat
        currentChat.push({ role: 'assistant', content: aiResponse });
        
    } catch (error) {
        console.error('Error:', error);
        addMessage('দুঃখিত, একটি ত্রুটি হয়েছে। অনুগ্রহপূর্বক পরে আবার চেষ্টা করুন।', 'ai');
        
        // If it's an authentication error, show API key setup again
        if (error.message.includes('authentication')) {
            apiKeySetupMessage.style.display = 'flex';
            userInput.disabled = true;
            sendButton.disabled = true;
            apiStatus.classList.remove('connected');
            apiStatus.innerHTML = '<i class="fas fa-circle"></i> API সংযোগ বিচ্ছিন্ন';
        }
    } finally {
        // Hide typing indicator
        typingIndicator.style.display = 'none';
        sendButton.disabled = false;
        
        // Save chat to history
        localStorage.setItem('thb-ai-current-chat', JSON.stringify(currentChat));
    }
}

// Add message to chat UI
function addMessage(text, sender, saveToHistory = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender === 'user' ? 'user-avatar' : ''}`;
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format message with paragraphs
    const paragraphs = text.split('\n');
    paragraphs.forEach(p => {
        if (p.trim() !== '') {
            const pElement = document.createElement('p');
            pElement.textContent = p;
            contentDiv.appendChild(pElement);
        }
    });
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll chat to bottom
function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);