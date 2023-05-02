const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");

// Create an HTTP server
const server = http.createServer();

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Load existing users from JSON
let users;
try {
  users = JSON.parse(fs.readFileSync("users.json", "utf-8"));
} catch (error) {
  users = [];
}

function saveUsers() {
  fs.writeFileSync("users.json", JSON.stringify(users), "utf-8");
}

function isEmailInUse(email) {
  return users.some((user) => user.email === email);
}

function isUsernameInUse(username) {
  return users.some((user) => user.username === username);
}

function registerUser(username, email, password) {
  const newUser = {
    username,
    email,
    password,
  };
  users.push(newUser);
  saveUsers();
}

function authenticateUser(username, password) {
  const user = users.find((user) => user.username === username);
  if (user && user.password === password) {
    return true;
  }
  return false;
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message);
    } catch (error) {
      console.error("Failed to parse message:", error);
      return;
    }

    if (parsedMessage.action === "register") {
      const { username, email, password } = parsedMessage;
      if (isEmailInUse(email)) {
        ws.send(JSON.stringify({ error: "Email is already in use" }));
      } else if (isUsernameInUse(username)) {
        ws.send(JSON.stringify({ error: "Username is already in use" }));
      } else {
        registerUser(username, email, password);
        ws.send(JSON.stringify({ success: "User registered" }));
      }
    } else if (parsedMessage.action === "authenticate") {
      const { username, password } = parsedMessage;
      if (authenticateUser(username, password)) {
        ws.send(JSON.stringify({ success: "User authenticated" }));
      } else {
        ws.send(JSON.stringify({ error: "Invalid username or password" }));
      }
    } else if (parsedMessage.text) {
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedMessage));
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Start the server on port 8080
server.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
