
const http = require("http");
const { json } = require("stream/consumers");
const WebSocket = require("ws");







//ROOM ID GENERATION 
function generateRoomID() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};



// ROOMS
const rooms = {};



//CORS ERROR HANDLING:

const server = http.createServer((req, res) => {

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }


    if (req.url === "/message") {
        res.end("Connect.io Server received the message!");
        return;
    }


    // ----------  Create ROUTE 

    if (req.method === "POST" && req.url === "/create-room") {

        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {

            if (!body) {
                res.end(JSON.stringify({
                    success: false,
                    message: "Request body is empty"
                }));
                return;
            }



            const data = JSON.parse(body);

            const randomRoomID = generateRoomID();

            rooms[randomRoomID] = {
                users: []
            };

            rooms[randomRoomID].users.push(data.username);

            const response = {
                success: true,
                roomID: randomRoomID,
                users: rooms[randomRoomID].users
            };

            console.log("Recived Room Host Details:", body);


            // RESPONSE has to SEND here ONLY
            res.end(JSON.stringify(response));

        });

        return;
    }

    // ----------  Join  ROUTE 

    if (req.method === "POST" && req.url === "/join-room") {
        let body = "";

        req.on("data", chunk => {
            body += chunk;
        });

        req.on("end", () => {
            const requestData = JSON.parse(body);
            // console.log(requestData.roomID);



            if (rooms[requestData.roomID]) {

                rooms[requestData.roomID].users.push(requestData.username);

                const response = {
                    success: true,
                    roomId: requestData.roomID,
                    username: requestData.username,
                    users: rooms[requestData.roomID].users
                }
                res.end(JSON.stringify(response));

            } else {
                const response = {
                    success: false,
                    message: "room dose not exist"
                }
                res.end(JSON.stringify(response));

            }

        });

        return;
    }

    res.end("Connect.io Server is running!");

});

const wss = new WebSocket.Server({ server });

// Function to calculate and send online users count
function broadcastOnlineCount(roomID) {

    let onlineUsers = 0;

    // Count users in this room
    wss.clients.forEach((client) => {

        if (client.roomID === roomID) {
            onlineUsers++;
        }

    });

    // Send count to everyone in this room
    wss.clients.forEach((client) => {

        if (client.roomID === roomID) {

            client.send(JSON.stringify({
                type: "online-count",
                count: onlineUsers
            }));

        }

    });

    console.log("Online users:", onlineUsers);
}


wss.on("connection", (socket) => {

    console.log("1 User Has Connected");


    socket.on("message", (message) => {

         const data = JSON.parse(message.toString());

        if (data.type === "typing") {

            wss.clients.forEach((client) => {

                if (
                    client.roomID === socket.roomID &&
                    client !== socket
                ) {

                    client.send(JSON.stringify({
                        type: "typing",
                        username: socket.username,
                        isTyping: data.isTyping
                    }));

                }

            });

        }




       

        // console.log(data);


        // USER JOINS ROOM
        if (data.type === "join-room") {

            socket.username = data.username;
            socket.roomID = data.roomID;

            console.log("Username: ", socket.username);
            console.log("RoomID: ", socket.roomID);

            // Update online count
            broadcastOnlineCount(socket.roomID);
        }


        // CHAT MESSAGE
        if (data.type === "chat-message") {

            wss.clients.forEach((client) => {

                if (client.roomID === socket.roomID) {

                    client.send(JSON.stringify({
                        type: "chat-message",
                        username: socket.username,
                        message: data.message
                    }));

                }

            });

            console.log("Chat:", data.message);
        }

    });


    // USER LEAVES
    socket.on("close", () => {

        const roomID = socket.roomID;

        // If user never joined a room
        if (!roomID) {
            return;
        }


        // Tell other users that someone left
        wss.clients.forEach((client) => {

            if (
                client.roomID === roomID &&
                client !== socket
            ) {

                client.send(JSON.stringify({
                    type: "user-left",
                    username: socket.username
                }));

            }

        });


        // Update online count
        broadcastOnlineCount(roomID);

    });

});


// * * SERVER PORT * *

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});