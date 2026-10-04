console.log("Frontend Script Loaded Successfully");

// - - - - - - SOCKET SERVER CREATION - - - - - - //
const socket = new WebSocket("ws://localhost:3000");
let myUsername = "";


const incomingSfx = new Audio("Audios/incoming_sfx.mp3");
const sentSfx = new Audio("Audios/sent_sfx.mp3");

const MsgInput = document.getElementById("messageInput");
const SendButton = document.getElementById("sendbtn");




const chatBody = document.querySelector(".chatBody");


MsgInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        SendButton.click();
    };
});

// - - - - - - - - - - - Typing Indicator  - - - - - - - - - - - - 

let typingTimeout;

MsgInput.addEventListener("input", () => {

    socket.send(JSON.stringify({
        type: "typing",
        isTyping: true
    }));

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {

        socket.send(JSON.stringify({
            type: "typing",
            isTyping: false
        }));

    }, 1000);

});



// * * * * * SEND BUTTON * * * * * //


SendButton.addEventListener("click", () => {

    const message = MsgInput.value;




    //const MyMsg = document.createElement("div");
    //const timestamp = document.createElement("p");


    if (message.trim() === "") return;

    console.log("sending msg: ", message);
    // *********** Sending CHAT MSG to SOCKET Server *********** //
    socket.send(JSON.stringify({
        type: "chat-message",
        message: message
    }));
    // * * * * * * * * * * * * ENDED * * * * * * * * * * * * * * //


    //MyMsg.className = "myMsg";
    //MyMsg.textContent = message;

    //timestamp.className = "timestampRight";
    //timestamp.textContent = timeString;

    const chatbody = document.querySelector(".chatBody");
    //chatbody.appendChild(MyMsg);
    //MyMsg.appendChild(timestamp);



    MsgInput.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;
});


// ********** OPENING SCREEN ************* //

// Room creation and username input
const openingScreen = document.querySelector(".OpeningContainer");
const mainChatScreen = document.querySelector(".CHAT");
const usernameInput = document.getElementById("username");

const createBtn = document.getElementById("createbtn");


// Room joining and username input
const usernameInputJoin = document.getElementById("username2");
const roomIDInput = document.getElementById("roomID");



const joinBtn = document.getElementById("joinbtn");

const peopleOnline = document.getElementById("onlineCount");


// sending a request to the server to * CREATE * a room and receive the room ID

createBtn.addEventListener("click", async () => {


    if (usernameInput.value.trim() === "") {
        alert("Please enter a valid username.");
        return;
    }

    const response = await fetch("http://localhost:3000/create-room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: usernameInput.value
        })
    });


    const data = JSON.parse(await response.text());

    console.log(data);

    if (data.success) {

        const currentHostNameDisplay = document.getElementById("currentRoomHost");
        currentHostNameDisplay.textContent = data.users[0];
        currentHostNameDisplay.className = "currentRoomHost";

        const currentRoomID = document.getElementById("roomIdDisplay");
        currentRoomID.className = "roomIdDisplay";
        currentRoomID.textContent = data.roomID;




        myUsername = usernameInput.value;
        console.log("my username:", myUsername);


        socket.send(JSON.stringify({
            type: "join-room",
            username: usernameInput.value,
            roomID: data.roomID
        }));

        openingScreen.style.display = "none";
        mainChatScreen.style.display = "flex";
    }

});


// sending a request to the server to * JOIN * a room with the provided room ID

joinBtn.addEventListener("click", async () => {

    const username = usernameInputJoin.value;
    const roomID = roomIDInput.value;

    if (username.trim() === "" || roomID.trim() === "") {
        alert("Please Enter a valid username and room ID.");
        return;
    }

    const response = await fetch("http://localhost:3000/join-room", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            roomID: roomID,
            username: username
        })
    });




    // const data = await response.text();

    const data = JSON.parse(await response.text());
    console.log(data);

    if (data.success) {

        const currentHostNameDisplay = document.getElementById("currentRoomHost");
        currentHostNameDisplay.textContent = data.users[0];

        const currentRoomID = document.getElementById("roomIdDisplay");
        currentRoomID.textContent = data.roomId;


        myUsername = username;
        console.log("my username:", myUsername);

        socket.send(JSON.stringify({
            type: "join-room",
            username: username,
            roomID: roomID
        }));


        openingScreen.style.display = "none";
        mainChatScreen.style.display = "flex";
    }

});




// ************** SOCKET SERVER *************//



const typingIndicator = document.getElementById("typingIndicator");

socket.onmessage = (event) => {

    console.log(event.data);
    const data = JSON.parse(event.data);


    // Left The Chat ------------

    if (data.type === "user-left") {

        const notice = document.createElement("div");

        notice.className = "systemMessage";

        notice.textContent = `${data.username} left the room`;

        chatBody.appendChild(notice);

        chatBody.scrollTop = chatBody.scrollHeight;
    }

    if (data.type === "online-count") {
        peopleOnline.textContent = data.count;
        return;
    }



    if (data.type === "chat-message") {

        const messageBox = document.createElement("div");

        const now = new Date();
        const timeString = now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        const timestamp = document.createElement("p");

        timestamp.textContent = timeString;


        if (data.username === myUsername) {
            messageBox.className = "myMsg"
            timestamp.className = "timestampRight"

            sentSfx.currentTime = 0;
            sentSfx.play();

        } else {

            incomingSfx.currentTime = 0;
            incomingSfx.play();

            messageBox.className = "opponentMsg"
            timestamp.className = "timestampLeft"
        }




        const senderName = document.createElement("p");
        senderName.className = "senderName";
        senderName.textContent = data.username;


        const actuallMsg = document.createElement("p");
        actuallMsg.textContent = data.message;

        messageBox.appendChild(senderName);
        messageBox.appendChild(actuallMsg);
        messageBox.appendChild(timestamp);


        chatBody.appendChild(messageBox);

        chatBody.scrollTop = chatBody.scrollHeight;
    };

    // Typing Indicator: ---------------

    if (data.type === "typing") {

        if (data.isTyping) {

            typingIndicator.textContent =
                `${data.username} is typing...`;

        } else {

            typingIndicator.textContent = "";

        }

        return;
    }
}

socket.onopen = () => {
    console.log("browser: socket has been connected");
}


// - - - - - - - - - THEMES CHANGE - - - - - - - - - -  //

const themeButtons = document.querySelectorAll(".colorSection button");

function applyTheme(theme) {
  if (!theme) {
    document.body.removeAttribute("data-theme");
  } else {
    document.body.setAttribute("data-theme", theme);
  }

  // SAVE Choice in localStorage
  localStorage.setItem("connect-theme", theme || "");
}

applyTheme(localStorage.getItem("connect-theme") || "");

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => applyTheme(btn.id));
});