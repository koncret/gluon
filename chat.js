document.addEventListener("DOMContentLoaded", () => {
    fetch('/api/greet')
        .then(response => response.json())
        .then(data => displayTypingEffect(data.reply, messagesContainer)) // Pass messagesContainer explicitly
        .catch(error => console.error("Error fetching greeting:", error));
});

const userInput = document.getElementById("user-input");
const messagesContainer = document.getElementById("messages");
const chatContainer = document.getElementById("chat-container");
const openTerminalButton = document.getElementById("open-terminal");
const openAboutButton = document.getElementById("open-about");
const aboutPopup = document.getElementById("about-popup");
const aboutContent = document.getElementById("about-content");
const openCAButton = document.getElementById("open-CA");
const CAPopup = document.getElementById("CA-popup");
const CAContent = document.getElementById("CA-content");

// Open terminal button
openTerminalButton.addEventListener("click", () => {
    chatContainer.style.display = "flex";
});

// About Gluon Popup
openAboutButton.addEventListener("click", () => {
    aboutPopup.style.display = "flex";
    aboutContent.innerHTML = ""; // Clear previous content
    displayTypingEffect("You can use Gluon terminal to find your Quark by saying 'I want to know my Quark'.\n\n" +
                        "Once you know, you can ask Gluon questions about your Quark, or others, or talk to Gluon about whatever you'd like.\n\n" +
                        "When important information arises about a Quark group Gluon will share that information on X.\n\n" +
                        "You can follow Gluon on X to ensure you never miss a fortune: @g_l_uon", aboutContent);
});

// CA Gluon Popup
openCAButton.addEventListener("click", () => {
    CAPopup.style.display = "flex";
    CAContent.innerHTML = ""; // Clear previous content
    displayTypingEffect("Not yet.", CAContent);
});

// Window controls for terminal and about popup
document.querySelectorAll(".minimize").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const container = e.target.closest(".minimize").parentNode.parentNode;
        
        if (container.classList.contains("adjust-minimize")) {
            container.classList.remove("adjust-minimize")
            
        } else if (container.classList.contains("adjust-maximize")) {
            container.classList.add("adjust-minimize")
            container.classList.remove("adjust-maximize")
            
        } else {
            container.classList.add("adjust-minimize")
            
        }
    });
});

document.querySelectorAll(".maximize").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const container = e.target.closest(".maximize").parentNode.parentNode;
        
        if (container.classList.contains("adjust-maximize")) {
            container.classList.remove("adjust-maximize")
            
        } else if (container.classList.contains("adjust-minimize")) {
            container.classList.remove("adjust-minimize")
            
        } else {
            container.classList.add("adjust-maximize")
            
        }
    });
});

document.querySelectorAll(".close").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const container = e.target.closest(".close").parentNode.parentNode;
        
        if (container.classList.contains("adjust-maximize")) {
            container.classList.remove("adjust-maximize")
            
        } else {
            container.style.display = "none";
            
        }
    });
});


userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

async function sendMessage() {
    const userMessage = userInput.value;
    if (!userMessage) return;

    userInput.value = "";
    addMessageToChat(userMessage, "user");

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: userMessage,
                userId: 'unique-user-id'
            })
        });
        const data = await response.json();
        displayTypingEffect(data.reply, messagesContainer);
    } catch (error) {
        console.error("Error:", error);
        addMessageToChat("Error: Unable to get a response from the server.", "ai");
    }
}

function addMessageToChat(message, sender) {
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    messageElement.classList.add("message", sender);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayTypingEffect(text, container, speed = 25) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", "ai"); // Ensures correct styling
    container.appendChild(messageElement);
    let index = 0;

    function typeCharacter() {
        if (index < text.length) {
            messageElement.textContent += text.charAt(index);
            index++;
            
            // Scroll to the bottom with each new character typed
            container.scrollTop = container.scrollHeight;

            setTimeout(typeCharacter, speed);
        } else {
            // Ensure final scroll to the bottom when typing is complete
            container.scrollTop = container.scrollHeight;
        }
    }
    typeCharacter();
}

// Dragging functionality for both chat and about popup
function makeDraggable(headerSelector, container) {
    let isDragging = false;
    let offsetX, offsetY;

    document.querySelector(headerSelector).addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - container.offsetLeft;
        offsetY = e.clientY - container.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            container.style.left = `${e.clientX - offsetX}px`;
            container.style.top = `${e.clientY - offsetY}px`;
            container.style.position = "absolute";
        }
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
}

// Apply draggable functionality
makeDraggable("#header", chatContainer);
makeDraggable("#about-header", aboutPopup);
makeDraggable("#CA-header", CAPopup);