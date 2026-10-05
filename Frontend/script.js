console.log("Frontend Script Loaded Successfully");

// =====================================================
// WEBSOCKET
// =====================================================

let socket = null;

let myUsername = "";
let joinedRoomID = "";

let reconnectTimer = null;
let reconnectAttempts = 0;

// =====================================================
// AUDIO
// =====================================================

const incomingSfx = new Audio("Audios/incoming_sfx.mp3");
const sentSfx = new Audio("Audios/sent_sfx.mp3");

// =====================================================
// CHAT ELEMENTS
// =====================================================

const MsgInput = document.getElementById("messageInput");
const SendButton = document.getElementById("sendbtn");

const chatBody = document.querySelector(".chatBody");

const typingIndicator =
    document.getElementById("typingIndicator");

// =====================================================
// OPENING SCREEN
// =====================================================

const openingScreen =
    document.querySelector(".OpeningContainer");

const mainChatScreen =
    document.querySelector(".CHAT");

// =====================================================
// CREATE ROOM
// =====================================================

const usernameInput =
    document.getElementById("username");

const createBtn =
    document.getElementById("createbtn");

// =====================================================
// JOIN ROOM
// =====================================================

const usernameInputJoin =
    document.getElementById("username2");

const roomIDInput =
    document.getElementById("roomID");

const joinBtn =
    document.getElementById("joinbtn");

// =====================================================
// ONLINE COUNT
// =====================================================

const peopleOnline =
    document.getElementById("onlineCount");

// =====================================================
// WEBSOCKET CONNECTION
// =====================================================

function connectSocket() {

    // Don't create another connection
    if (
        socket &&
        (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    console.log("Connecting to WebSocket server...");

    socket = new WebSocket(
        "wss://connect-io-hb6l.onrender.com"
    );

    // =================================================
    // SOCKET OPEN
    // =================================================

    socket.onopen = () => {

        console.log(
            "browser: socket has been connected"
        );

        reconnectAttempts = 0;

        // ---------------------------------------------
        // If user was already in a room,
        // rejoin automatically after reconnect.
        // ---------------------------------------------

        if (
            myUsername &&
            joinedRoomID
        ) {

            console.log(
                "Rejoining room after reconnect..."
            );

            socket.send(JSON.stringify({
                type: "join-room",
                username: myUsername,
                roomID: joinedRoomID
            }));
        }
    };

    // =================================================
    // SOCKET MESSAGE
    // =================================================

    socket.onmessage = (event) => {

        console.log(
            "WebSocket received:",
            event.data
        );

        let data;

        try {

            data = JSON.parse(event.data);

        } catch (error) {

            console.error(
                "Invalid server message:",
                event.data
            );

            return;
        }

        // =================================================
        // ONLINE COUNT
        // =================================================

        if (data.type === "online-count") {

            peopleOnline.textContent = data.count;

            return;
        }

        // =================================================
        // USER LEFT
        // =================================================

        if (data.type === "user-left") {

            const notice =
                document.createElement("div");

            notice.className = "systemMessage";

            notice.textContent =
                `${data.username} left the room`;

            chatBody.appendChild(notice);

            chatBody.scrollTop =
                chatBody.scrollHeight;

            return;
        }

        // =================================================
        // CHAT MESSAGE
        // =================================================

        if (data.type === "chat-message") {

            const messageBox =
                document.createElement("div");

            const now = new Date();

            const timeString =
                now.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                });

            const timestamp =
                document.createElement("p");

            timestamp.textContent =
                timeString;

            // ---------------------------------------------
            // My message
            // ---------------------------------------------

            if (data.username === myUsername) {

                messageBox.className =
                    "myMsg";

                timestamp.className =
                    "timestampRight";

                sentSfx.currentTime = 0;

                sentSfx.play().catch(() => {});
            }

            // ---------------------------------------------
            // Opponent message
            // ---------------------------------------------

            else {

                messageBox.className =
                    "opponentMsg";

                timestamp.className =
                    "timestampLeft";

                incomingSfx.currentTime = 0;

                incomingSfx.play().catch(() => {});
            }

            // ---------------------------------------------
            // Sender name
            // ---------------------------------------------

            const senderName =
                document.createElement("p");

            senderName.className =
                "senderName";

            senderName.textContent =
                data.username;

            // ---------------------------------------------
            // Actual message
            // ---------------------------------------------

            const actualMsg =
                document.createElement("p");

            actualMsg.textContent =
                data.message;

            // ---------------------------------------------
            // Build message bubble
            // ---------------------------------------------

            messageBox.appendChild(senderName);
            messageBox.appendChild(actualMsg);
            messageBox.appendChild(timestamp);

            chatBody.appendChild(messageBox);

            chatBody.scrollTop =
                chatBody.scrollHeight;

            return;
        }

        // =================================================
        // TYPING INDICATOR
        // =================================================

        if (data.type === "typing") {

            if (data.isTyping) {

                typingIndicator.textContent =
                    `${data.username} is typing...`;

            } else {

                typingIndicator.textContent = "";
            }

            return;
        }

        // =================================================
        // SERVER ERROR
        // =================================================

        if (data.type === "error") {

            console.error(
                "Server error:",
                data.message
            );

            return;
        }
    };

    // =================================================
    // SOCKET CLOSE
    // =================================================

    socket.onclose = () => {

        console.log(
            "WebSocket connection closed"
        );

        // Don't reconnect infinitely fast

        reconnectAttempts++;

        const delay =
            Math.min(
                3000 * reconnectAttempts,
                10000
            );

        clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(() => {

            console.log(
                "Trying to reconnect..."
            );

            connectSocket();

        }, delay);
    };

    // =================================================
    // SOCKET ERROR
    // =================================================

    socket.onerror = (error) => {

        console.error(
            "WebSocket error:",
            error
        );
    };
}

// Start WebSocket connection immediately

connectSocket();

// =====================================================
// WAIT FOR SOCKET
// =====================================================

function waitForSocket() {

    return new Promise((resolve, reject) => {

        // Already connected

        if (
            socket &&
            socket.readyState === WebSocket.OPEN
        ) {

            resolve();
            return;
        }

        // If socket doesn't exist,
        // create one.

        if (!socket) {
            connectSocket();
        }

        const startTime = Date.now();

        const checkConnection = () => {

            if (
                socket &&
                socket.readyState === WebSocket.OPEN
            ) {

                resolve();
                return;
            }

            // Wait maximum 15 seconds

            if (Date.now() - startTime >= 15000) {

                reject(
                    new Error(
                        "WebSocket connection timed out"
                    )
                );

                return;
            }

            setTimeout(
                checkConnection,
                100
            );
        };

        checkConnection();
    });
}

// =====================================================
// ENTER KEY
// =====================================================

MsgInput.addEventListener("keypress", (event) => {

    if (event.key === "Enter") {

        event.preventDefault();

        SendButton.click();
    }
});

// =====================================================
// TYPING INDICATOR
// =====================================================

let typingTimeout;

MsgInput.addEventListener("input", () => {

    // Don't send typing event if socket isn't connected

    if (
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {
        return;
    }

    // Don't send typing if user hasn't joined room

    if (!joinedRoomID) {
        return;
    }

    socket.send(JSON.stringify({
        type: "typing",
        isTyping: true
    }));

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        socket.send(JSON.stringify({
            type: "typing",
            isTyping: false
        }));

    }, 1000);
});

// =====================================================
// SEND MESSAGE
// =====================================================

SendButton.addEventListener("click", async () => {

    const message =
        MsgInput.value.trim();

    if (message === "") {
        return;
    }

    // Check if user is inside a room

    if (!joinedRoomID) {

        alert(
            "Please create or join a room first."
        );

        return;
    }

    // Wait for WebSocket connection

    try {

        await waitForSocket();

    } catch (error) {

        console.error(
            "Unable to connect:",
            error
        );

        alert(
            "Connecting to chat server. Please try again."
        );

        return;
    }

    console.log(
        "Sending message:",
        message
    );

    socket.send(JSON.stringify({
        type: "chat-message",
        message: message
    }));

    MsgInput.value = "";

    chatBody.scrollTop =
        chatBody.scrollHeight;
});

// =====================================================
// CREATE ROOM
// =====================================================

createBtn.addEventListener("click", async () => {

    const username =
        usernameInput.value.trim();

    if (username === "") {

        alert(
            "Please enter a valid username."
        );

        return;
    }

    try {

        // ---------------------------------------------
        // Create room using HTTP
        // ---------------------------------------------

        const response = await fetch(
            "https://connect-io-hb6l.onrender.com/create-room",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username: username
                })
            }
        );

        const data =
            await response.json();

        console.log(
            "Create room response:",
            data
        );

        if (!data.success) {

            alert(
                data.message ||
                "Unable to create room."
            );

            return;
        }

        // ---------------------------------------------
        // Update UI
        // ---------------------------------------------

        const currentRoomHostDisplay =
            document.getElementById(
                "currentRoomHost"
            );

        currentRoomHostDisplay.textContent =
            data.users[0];

        currentRoomHostDisplay.className =
            "currentRoomHost";

        const currentRoomID =
            document.getElementById(
                "roomIdDisplay"
            );

        currentRoomID.className =
            "roomIdDisplay";

        currentRoomID.textContent =
            data.roomID;

        // ---------------------------------------------
        // Save user information
        // ---------------------------------------------

        myUsername = username;

        joinedRoomID =
            data.roomID.toUpperCase();

        console.log(
            "My username:",
            myUsername
        );

        console.log(
            "My room:",
            joinedRoomID
        );

        // ---------------------------------------------
        // WAIT FOR WEBSOCKET
        // ---------------------------------------------

        try {

            await waitForSocket();

        } catch (error) {

            console.error(
                "WebSocket connection failed:",
                error
            );

            alert(
                "Chat server is taking too long to connect. Please try again."
            );

            return;
        }

        // ---------------------------------------------
        // Join room through WebSocket
        // ---------------------------------------------

        socket.send(JSON.stringify({
            type: "join-room",
            username: myUsername,
            roomID: joinedRoomID
        }));

        console.log(
            "WebSocket join-room sent"
        );

        // ---------------------------------------------
        // Show chat
        // ---------------------------------------------

        openingScreen.style.display =
            "none";

        mainChatScreen.style.display =
            "flex";

    } catch (error) {

        console.error(
            "Create room failed:",
            error
        );

        alert(
            "Something went wrong while creating the room."
        );
    }
});

// =====================================================
// JOIN ROOM
// =====================================================

joinBtn.addEventListener("click", async () => {

    const username =
        usernameInputJoin.value.trim();

    const roomID =
        roomIDInput.value.trim().toUpperCase();

    if (
        username === "" ||
        roomID === ""
    ) {

        alert(
            "Please enter a valid username and room ID."
        );

        return;
    }

    try {

        // ---------------------------------------------
        // Join room using HTTP
        // ---------------------------------------------

        const response = await fetch(
            "https://connect-io-hb6l.onrender.com/join-room",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    roomID: roomID,
                    username: username
                })
            }
        );

        const data =
            await response.json();

        console.log(
            "Join room response:",
            data
        );

        if (!data.success) {

            alert(
                data.message ||
                "Room does not exist."
            );

            return;
        }

        // ---------------------------------------------
        // Update UI
        // ---------------------------------------------

        const currentRoomHostDisplay =
            document.getElementById(
                "currentRoomHost"
            );

        currentRoomHostDisplay.textContent =
            data.users[0];

        const currentRoomID =
            document.getElementById(
                "roomIdDisplay"
            );

        currentRoomID.textContent =
            data.roomId;

        // ---------------------------------------------
        // Save user information
        // ---------------------------------------------

        myUsername = username;

        joinedRoomID =
            roomID;

        console.log(
            "My username:",
            myUsername
        );

        console.log(
            "My room:",
            joinedRoomID
        );

        // ---------------------------------------------
        // WAIT FOR WEBSOCKET
        // ---------------------------------------------

        try {

            await waitForSocket();

        } catch (error) {

            console.error(
                "WebSocket connection failed:",
                error
            );

            alert(
                "Chat server is taking too long to connect. Please try again."
            );

            return;
        }

        // ---------------------------------------------
        // Join room through WebSocket

        socket.send(JSON.stringify({
            type: "join-room",
            username: myUsername,
            roomID: joinedRoomID
        }));

        console.log(
            "WebSocket join-room sent"
        );

        // ---------------------------------------------
        // Show chat
       

        openingScreen.style.display =
            "none";

        mainChatScreen.style.display =
            "flex";

    } catch (error) {

        console.error(
            "Join room failed:",
            error
        );

        alert(
            "Something went wrong while joining the room."
        );
    }
});

// =====================================================
// THEMES
// =====================================================

const themeButtons =
    document.querySelectorAll(
        ".colorSection button"
    );

function applyTheme(theme) {

    if (!theme) {

        document.body.removeAttribute(
            "data-theme"
        );

    } else {

        document.body.setAttribute(
            "data-theme",
            theme
        );
    }

    localStorage.setItem(
        "connect-theme",
        theme || ""
    );
}

// Load saved theme

applyTheme(
    localStorage.getItem(
        "connect-theme"
    ) || ""
);

// Theme buttons

themeButtons.forEach((btn) => {

    btn.addEventListener("click", () => {

        applyTheme(btn.id);
    });
});