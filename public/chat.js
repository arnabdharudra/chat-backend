const socket = io();

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');

// Send message
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('message', message);
        messageInput.value = '';
    }
});

// Receive message
socket.on('message', (data) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = data;
    messagesDiv.appendChild(messageElement);
});