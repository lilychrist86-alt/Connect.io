const http = require("http");
const WebSocket = require("ws");

// =====================================================
// ROOM ID GENERATION
// =====================================================

function generateRoomID() {
    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
}

// =====================================================
// ROOMS
// =====================================================

const rooms = {};

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer((req, res) => {

    // ---------------- CORS ----------------

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    // ---------------- TEST ROUTE ----------------

    if (req.url === "/message") {
        res.end("Connect.io Server received the message!");
        return;
    }

    // =================================================
    // CREATE ROOM
    // =================================================

    if (req.method === "POST" && req.url === "/create-room") {

        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {

            if (!body) {
                res.writeHead(400, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: false,
                    message: "Request body is empty"
                }));

                return;
            }

            try {

                const data = JSON.parse(body);

                if (!data.username || data.username.trim() === "") {

                    res.writeHead(400, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify({
                        success: false,
                        message: "Username is required"
                    }));

                    return;
                }

                const username = data.username.trim();

                const randomRoomID = generateRoomID();

                rooms[randomRoomID] = {
                    users: [username]
                };

                const response = {
                    success: true,
                    roomID: randomRoomID,
                    users: rooms[randomRoomID].users
                };

                console.log("Room Created:", randomRoomID);
                console.log("Host:", username);

                res.writeHead(200, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify(response));

            } catch (error) {

                console.error("Create room error:", error);

                res.writeHead(400, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: false,
                    message: "Invalid request"
                }));
            }
        });

        return;
    }

    // =================================================
    // JOIN ROOM
    // =================================================

    if (req.method === "POST" && req.url === "/join-room") {

        let body = "";

        req.on("data", (chunk) => {
            body += chunk;
        });

        req.on("end", () => {

            try {

                const requestData = JSON.parse(body);

                const username = requestData.username?.trim();
                const roomID = requestData.roomID?.trim().toUpperCase();

                if (!username || !roomID) {

                    res.writeHead(400, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify({
                        success: false,
                        message: "Username and room ID are required"
                    }));

                    return;
                }

                // Check if room exists

                if (rooms[roomID]) {

                    // Add user to room's HTTP user list
                    rooms[roomID].users.push(username);

                    const response = {
                        success: true,
                        roomId: roomID,
                        username: username,
                        users: rooms[roomID].users
                    };

                    console.log("User Joined Room:", username);
                    console.log("Room:", roomID);

                    res.writeHead(200, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify(response));

                } else {

                    res.writeHead(404, {
                        "Content-Type": "application/json"
                    });

                    res.end(JSON.stringify({
                        success: false,
                        message: "Room does not exist"
                    }));
                }

            } catch (error) {

                console.error("Join room error:", error);

                res.writeHead(400, {
                    "Content-Type": "application/json"
                });

                res.end(JSON.stringify({
                    success: false,
                    message: "Invalid request"
                }));
            }
        });

        return;
    }

    // =================================================
    // DEFAULT RESPONSE
    // =================================================

    res.end("Connect.io Server is running!");
});

// =====================================================
// WEBSOCKET SERVER
// =====================================================

const wss = new WebSocket.Server({
    server: server
});

// =====================================================
// BROADCAST ONLINE COUNT
// =====================================================

function broadcastOnlineCount(roomID) {

    let onlineUsers = 0;

    wss.clients.forEach((client) => {

        if (
            client.readyState === WebSocket.OPEN &&
            client.roomID === roomID
        ) {
            onlineUsers++;
        }
    });

    wss.clients.forEach((client) => {

        if (
            client.readyState === WebSocket.OPEN &&
            client.roomID === roomID
        ) {

            client.send(JSON.stringify({
                type: "online-count",
                count: onlineUsers
            }));
        }
    });

    console.log(
        `Online users in ${roomID}: ${onlineUsers}`
    );
}

// =====================================================
// SEND MESSAGE TO ROOM
// =====================================================

function broadcastToRoom(roomID, data) {

    wss.clients.forEach((client) => {

        if (
            client.readyState === WebSocket.OPEN &&
            client.roomID === roomID
        ) {

            client.send(JSON.stringify(data));
        }
    });
}

// =====================================================
// WEBSOCKET CONNECTION
// =====================================================

wss.on("connection", (socket) => {

    console.log("A user has connected to WebSocket");

    socket.username = null;
    socket.roomID = null;

    // =================================================
    // MESSAGE RECEIVED
    // =================================================

    socket.on("message", (message) => {

        let data;

        // ---------------- Parse JSON ----------------

        try {

            data = JSON.parse(message.toString());

        } catch (error) {

            console.error(
                "Invalid WebSocket message:",
                message.toString()
            );

            return;
        }

        // =================================================
        // JOIN ROOM
        // =================================================

        if (data.type === "join-room") {

            const username = data.username?.trim();
            const roomID = data.roomID?.trim().toUpperCase();

            if (!username || !roomID) {

                console.log(
                    "Invalid join-room request"
                );

                return;
            }

            // Check that HTTP room exists

            if (!rooms[roomID]) {

                socket.send(JSON.stringify({
                    type: "error",
                    message: "Room does not exist"
                }));

                return;
            }

            // If socket was already inside another room,
            // remove it from that room first.

            if (
                socket.roomID &&
                socket.roomID !== roomID
            ) {

                const oldRoomID = socket.roomID;

                socket.roomID = null;
                socket.username = null;

                broadcastOnlineCount(oldRoomID);
            }

            socket.username = username;
            socket.roomID = roomID;

            console.log(
                `WebSocket Join -> ${username} joined ${roomID}`
            );

            // Send current online count

            broadcastOnlineCount(roomID);

            return;
        }

        // =================================================
        // CHAT MESSAGE
        // =================================================

        if (data.type === "chat-message") {

            // User must be inside a room

            if (!socket.roomID) {

                console.log(
                    "Chat message rejected: user is not in a room"
                );

                return;
            }

            const messageText =
                typeof data.message === "string"
                    ? data.message.trim()
                    : "";

            if (!messageText) {
                return;
            }

            broadcastToRoom(socket.roomID, {
                type: "chat-message",
                username: socket.username,
                message: messageText
            });

            console.log(
                `Chat [${socket.roomID}] ${socket.username}: ${messageText}`
            );

            return;
        }

        // =================================================
        // TYPING INDICATOR
        // =================================================

        if (data.type === "typing") {

            if (!socket.roomID) {
                return;
            }

            wss.clients.forEach((client) => {

                if (
                    client.readyState === WebSocket.OPEN &&
                    client.roomID === socket.roomID &&
                    client !== socket
                ) {

                    client.send(JSON.stringify({
                        type: "typing",
                        username: socket.username,
                        isTyping: Boolean(data.isTyping)
                    }));
                }
            });

            return;
        }
    });

    // =================================================
    // USER DISCONNECTS
    // =================================================

    socket.on("close", () => {

        const roomID = socket.roomID;
        const username = socket.username;

        if (!roomID) {
            console.log("A user disconnected before joining a room");
            return;
        }

        console.log(
            `User disconnected: ${username} from ${roomID}`
        );

        // Tell other users

        wss.clients.forEach((client) => {

            if (
                client.readyState === WebSocket.OPEN &&
                client.roomID === roomID &&
                client !== socket
            ) {

                client.send(JSON.stringify({
                    type: "user-left",
                    username: username
                }));
            }
        });

        // Update count

        broadcastOnlineCount(roomID);
    });

    // =================================================
    // WEBSOCKET ERROR
    // =================================================

    socket.on("error", (error) => {

        console.error(
            "WebSocket error:",
            error.message
        );
    });
});

// =====================================================
// SERVER PORT
// =====================================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Connect.io Server is running on port ${PORT}`
    );
});