const API_KEY = `AIzaSyCJJuKbw90mXE_z1hGKuNws********`;//UR API KEY 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const themeToggle = document.getElementById("theme-toggle");
const clearHistoryBtn = document.getElementById("clear-history");


function markdownToHtml(text) {
    if (!text) return "";
    
    // 1. Newlines to <br>
    let html = text.replace(/\n/g, '<br>');
    
    // 2. Strong/Bold (**text** or __text__)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // 3. Emphasis/Italics (*text* or _text_)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    return html;
}

// ---------- Persistence: Restore chat history ----------
window.onload = () => {
    const saved = JSON.parse(localStorage.getItem("rchat_history")) || [];
    saved.forEach(msg => addMessage(msg.text, msg.sender, false)); // Don't save on load
    
    // Set theme based on saved preference
    const isDark = localStorage.getItem("rchat_theme") === "dark";
    if (isDark) {
        document.body.classList.add("dark");
        themeToggle.textContent = "☀️";
    } else {
        themeToggle.textContent = "🌙";
    }
};

// ---------- Persistence: Save message ----------
function saveMessage(text, sender) {
    const history = JSON.parse(localStorage.getItem("rchat_history")) || [];
    history.push({ text, sender });
    // Limit history size to prevent storage overflow, e.g., 50 messages
    if (history.length > 50) history.shift(); 
    localStorage.setItem("rchat_history", JSON.stringify(history));
}

// ---------- UI: Add message ----------
function addMessage(text, sender, save = true) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender === "user" ? "user-message" : "bot-message");
    
    // Use innerHTML to render formatted text
    msg.innerHTML = markdownToHtml(text);
    
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (save) saveMessage(text, sender);
}

// ---------- UI: Typing animation ----------
function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.classList.add("message", "bot-message", "typing-bubble");

    const typing = document.createElement("div");
    typing.classList.add("typing");

    typing.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;

    wrapper.appendChild(typing);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    return wrapper;
}

// ---------- API: Gemini Fetch (Robust) ----------
async function getGeminiResponse(message) {
    const payload = { 
        contents: [{ parts: [{ text: message }] }],
        // Enhance response quality by setting temperature slightly higher
        config: { temperature: 0.7 } 
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            // Log the full response status and URL being used
            console.error("API Request Failed. Status:", res.status, "URL:", API_URL);
            
            // Read and log the detailed error message from the response body
            const errorData = await res.json();
            console.error("Detailed API Error Response:", errorData);
            
            return `**Error:** API call failed with status ${res.status}. Check the console for full details.`;
        }

        const data = await res.json();
        // Check for common error structure if candidates array is empty
        if (data.candidates && data.candidates[0].finishReason === 'SAFETY') {
            return `**Blocked:** Your request was blocked due to safety settings. Please rephrase your query.`;
        }
        
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "**Error:** The model returned an empty response. Please try again.";

    } catch (e) {
        console.error("Fetch/Network Error:", e);
        return "**Error:** Could not connect to the API. Please check your network connection.";
    }
}

// ---------- Core Logic: Send message ----------
async function handleSend() {
    const message = userInput.value.trim();
    if (!message) return;

    // 1. Display user message
    addMessage(message, "user");
    userInput.value = "";
    userInput.disabled = true;
    sendBtn.disabled = true;

    // 2. Show typing indicator
    const typingBubble = showTyping();

    // 3. Fetch response
    const reply = await getGeminiResponse(message);

    // 4. Remove typing indicator
    typingBubble.remove();
    
    // 5. Display bot response with type effect
    typeEffect(reply);

    // Re-enable input
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}

// ---------- UI: Typing effect for bot ----------
function typeEffect(text) {
    const bubble = document.createElement("div");
    bubble.classList.add("message", "bot-message");
    chatBox.appendChild(bubble);

    let i = 0;
    const speed = 20; // Typing speed in milliseconds

    function typing() {
        // Render text one character at a time, converting Markdown progressively
        bubble.innerHTML = markdownToHtml(text.slice(0, i));
        
        chatBox.scrollTop = chatBox.scrollHeight;
        i++;
        
        if (i <= text.length) {
            setTimeout(typing, speed);
        } else {
            // Save message only once the typing effect is complete
            saveMessage(text, "bot"); 
        }
    }

    typing();
}

// ---------- Event Listeners ----------
sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !userInput.disabled) handleSend();
});

// Theme toggle
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("rchat_theme", isDark ? "dark" : "light");
});

// Clear history feature
clearHistoryBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear ALL chat history? This action cannot be undone.")) {
        localStorage.removeItem("rchat_history");
        chatBox.innerHTML = ''; // Clear the UI
        alert("Chat history cleared!");
    }
});