const express  = require('express');
const mysql    = require('mysql2');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const app      = express();
const http = require('http'); // Import http module
const WebSocket = require('ws'); // Import ws module
const { v4: uuidv4 } = require('uuid'); // For unique command IDs

// Use the provided database configuration
const db = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "123456",
  database: "safroapp",
  port: 3306
});

// JWT secret (in production, store securely e.g. in env variables)
const JWT_SECRET = 'BMT-1_2.3-4';

app.use(express.json());

//
// Middleware to verify JSON Web Tokens
//
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expecting header format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalid" });
    req.user = user;
    next();
  });
}

//
// Middleware to allow only commanders (role = 1)
//
function isCommander(req, res, next) {
  if (req.user.role !== 1) {
    return res.status(403).json({ error: "Access denied. Commanders only." });
  }
  next();
}

//
// Endpoint: /register
// Registers a new soldier. Expects: username, password, firstname,
// lastname, companyName, platoon, section, bed, role (0 or 1).
// (Note: the identifier is computed automatically.)
//
app.post('/register', async (req, res) => {
  console.log("Register Request Received");
  // Only take fullName, email, and password from the request body.
  const { fullName, email, password } = req.body;
  console.log(req.body);

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Map values to your DB columns.
    const username = email;           // username is set as email
    const firstname = fullName;       // store the full name in firstname (lastname left blank)
    const lastname = '';
    const companyName = 'NA';         // default value
    const platoon = 0;                // default value
    const section = 0;                // default value
    const bed = 0;                    // default value
    const role = 0;                   // default value

    const sql = `INSERT INTO soldiers
         (username, password, firstname, lastname, companyName, platoon, section, bed, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [username, hashedPassword, firstname, lastname, companyName, platoon, section, bed, role];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("DB Error:", err);
        return res.status(500).json({ error: "Error registering user" });
      }
      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

//
// Endpoint: /login
// Logs in a user. Expects: username and password.
// Returns a JWT token on success.
//
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if(!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }
  const sql = 'SELECT * FROM soldiers WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    if (results.length === 0) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if(!validPassword) {
      return res.status(400).json({ error: "Invalid username or password" });
    }
    // Create token payload. For commanders, add extra fields.
    const tokenPayload = {
      userid: user.userid,
      username: user.username,
      role: user.role
    };
    if(user.role == 1) {  // commander
      tokenPayload.companyName = user.companyName;
      tokenPayload.platoon = user.platoon;
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

//
// Endpoint: /updateRealTimeLocation
// POST that accepts userid, lat and long. Inserts or updates the row
// in the liveLocation table using an upsert query.
//
app.post('/updateRealTimeLocation', (req, res) => {
  const { userid, lat, long } = req.body;
  if(userid === undefined || lat === undefined || long === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const sql = `INSERT INTO liveLocation (userid, lat, \`long\`)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE lat = VALUES(lat), \`long\` = VALUES(\`long\`)`;
  db.query(sql, [userid, lat, long], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json({ message: "Location updated successfully" });
  });
});

//
// Endpoint: /searchByUsername
// GET that accepts a query parameter "username" and returns matching rows.
// (It does a substring (LIKE) search on the soldiers table.)
//
app.get('/searchByUsername', (req, res) => {
  const { username } = req.query;
  if(!username) {
    return res.status(400).json({ error: "Username query parameter is required" });
  }
  const searchTerm = '%' + username + '%';
  const sql = `SELECT userid, username, firstname, lastname, companyName,
                      platoon, section, bed, identifier, role 
               FROM soldiers WHERE username LIKE ?`;
  db.query(sql, [searchTerm], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});

//
// Endpoint: /getUserByUsername
// GET that accepts a query parameter "username" and returns the soldier row.
//
app.get('/getUserByUsername', (req, res) => {
  const { username } = req.query;
  if(!username){
    return res.status(400).json({ error: "Username query parameter is required" });
  }
  const sql = `SELECT userid, username, firstname, lastname, companyName,
                      platoon, section, bed, identifier, role 
               FROM soldiers WHERE username = ?`;
  db.query(sql, [username], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    if(results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log(results[0])
    res.json(results[0]);
  });
});

//
// Endpoint: /addFriend
// Adds a row to the friendsList table. Expects: userid and friendid in the body.
//
app.post('/addFriend', (req, res) => {
  const { userid, friendid } = req.body;
  if(userid === undefined || friendid === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const sql = "INSERT INTO friendsList (userid, friendid) VALUES (?, ?)";
  db.query(sql, [userid, friendid], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Error adding friend" });
    }
    res.json({ message: "Friend added successfully" });
  });
});

//
// Endpoint: /sendMessage
// Sends a message by inserting into the messages table.
// Expects: userid, recipientid, messagebody (the timestamp is generated on the server).
//
app.post('/sendMessage', (req, res) => {
  const { userid, recipientid, messagebody } = req.body;
  if(userid === undefined || recipientid === undefined || !messagebody) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const sql = `INSERT INTO messages (userid, recipientid, messagebody, timestamp)
               VALUES (?, ?, ?, ?)`;
  db.query(sql, [userid, recipientid, messagebody, timestamp], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Error sending message" });
    }
    res.json({ message: "Message sent successfully" });
  });
});

//
// Endpoint: /retrieveMessage
// GET that accepts a query parameter "username" (the recipient's username)
// and returns all messages for that recipient.
//
app.get('/retrieveMessage', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: "Username query parameter is required" });
  }
  // First get the recipient's userid from soldiers
  const sqlUser = "SELECT userid FROM soldiers WHERE username = ?";
  db.query(sqlUser, [username], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    if(results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const recipientid = results[0].userid;
    const sqlMessages = "SELECT * FROM messages WHERE recipientid = ? ORDER BY timestamp DESC";
    db.query(sqlMessages, [recipientid], (err, messages) => {
      if(err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
      res.json(messages);
    });
  });
});

app.get('/getChatMessages', (req, res) => {
  const { userid, recipientid } = req.query;
  if (!userid || !recipientid) {
    return res.status(400).json({ error: "Both userid and recipientid are required." });
  }
  
  // Query to retrieve messages in both directions.
  const sql = `
    SELECT * FROM messages 
    WHERE (userid = ? AND recipientid = ?)
       OR (userid = ? AND recipientid = ?)
    ORDER BY timestamp ASC
  `;
  const values = [userid, recipientid, recipientid, userid];
  
  db.query(sql, values, (err, results) => {
    if (err) {
      console.error("Error retrieving chat messages:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});


app.get('/getUsersByPlatoon', (req, res) => {
  const { platoon } = req.query;
  if (!platoon) {
    return res.status(400).json({ error: "Platoon query parameter is required." });
  }
  
  const platoonNumber = parseInt(platoon, 10);
  if (isNaN(platoonNumber)) {
    return res.status(400).json({ error: "Invalid platoon number provided." });
  }
  
  const sql = `SELECT userid, username, firstname, lastname, companyName, platoon, section, bed, identifier, role 
               FROM soldiers 
               WHERE platoon = ?`;
  db.query(sql, [platoonNumber], (err, results) => {
    if (err) {
      console.error("Error fetching users by platoon:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});


app.get('/getUsersBySection', (req, res) => {
  const { section } = req.query;
  if (!section) {
    return res.status(400).json({ error: "Section query parameter is required." });
  }
  
  const sectionNumber = parseInt(section, 10);
  if (isNaN(sectionNumber)) {
    return res.status(400).json({ error: "Invalid section number provided." });
  }
  
  const sql = `SELECT userid, username, firstname, lastname, companyName, platoon, section, bed, identifier, role 
               FROM soldiers 
               WHERE section = ?`;
  db.query(sql, [sectionNumber], (err, results) => {
    if (err) {
      console.error("Error fetching users by section:", err);
      return res.status(500).json({ error: "Server error" });
    }
    res.json(results);
  });
});




//
// Endpoints accessible only to commanders (they require a valid token and role === 1)
//

//
// Endpoint: /broadcastMessage
// The logged-in commander sends a broadcast message to all recruits in the
// same company and platoon. Expects: messagebody in the POST body.
//
app.post('/broadcastMessage', authenticateToken, isCommander, (req, res) => {
  const commanderId = req.user.userid;
  const { messagebody } = req.body;
  if (!messagebody) {
    return res.status(400).json({ error: "messagebody is required" });
  }
  // Grab the commander’s companyName and platoon from the database.
  const sqlCommander = "SELECT companyName, platoon FROM soldiers WHERE userid = ?";
  db.query(sqlCommander, [commanderId], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    if(results.length === 0) {
      return res.status(404).json({ error: "Commander not found" });
    }
    const { companyName, platoon } = results[0];
    // Select all recruits in the same company and platoon.
    const sqlRecruits = "SELECT userid FROM soldiers WHERE role = 0 AND companyName = ? AND platoon = ?";
    db.query(sqlRecruits, [companyName, platoon], (err, recruits) => {
      if(err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
      if(recruits.length === 0) {
        return res.status(404).json({ error: "No recruits found in your company/platoon" });
      }
      const timestamp = Math.floor(Date.now() / 1000);
      let insertedCount = 0;
      // Insert a message for each recruit.
      recruits.forEach((recruit) => {
        const sqlInsert = `INSERT INTO messages (userid, recipientid, messagebody, timestamp)
                           VALUES (?, ?, ?, ?)`;
        db.query(sqlInsert, [commanderId, recruit.userid, messagebody, timestamp],
          (err, result) => {
            if(err) {
              console.error(err);
            }
            insertedCount++;
            if(insertedCount === recruits.length) {
              res.json({ message: "Broadcast message sent to all recruits" });
            }
          }
        );
      });
    });
  });
});

//
// Endpoint: /viewLocationByUsername
// Accessible only to commanders. Accepts a query parameter "username" (of a recruit)
// and returns that recruit's location (lat and long). Also checks that the user is a recruit.
//
app.get('/viewLocationByUsername', authenticateToken, isCommander, (req, res) => {
  const { username } = req.query;
  if(!username) {
    return res.status(400).json({ error: "Username query parameter is required" });
  }
  const sqlUser = "SELECT userid, role FROM soldiers WHERE username = ?";
  db.query(sqlUser, [username], (err, results) => {
    if(err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
    if(results.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = results[0];
    if(user.role !== 0) {  // Ensure the target user is a recruit.
      return res.status(403).json({ error: "User is not a recruit" });
    }
    const sqlLocation = "SELECT lat, `long` FROM liveLocation WHERE userid = ?";
    db.query(sqlLocation, [user.userid], (err, locations) => {
      if(err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
      if(locations.length === 0) {
        return res.status(404).json({ error: "Location data not found for this user" });
      }
      res.json(locations[0]);
    });
  });
});




/*
  Endpoint: PUT /updateMember
  This endpoint expects a JSON body like:
  {
    "username": "user@example.com",
    "fullName": "John Doe",
    "role": "Recruit",             // OR "Platoon Sergeant" or "Platoon Commander"
    "platoon": "Platoon 1",        // Example string; we extract the number (1)
    "section": "Section 2"         // Example string; we extract the number (2)
  }
  It updates the soldier’s record based on the username.
*/
app.put('/updateMember', (req, res) => {
  const { username, fullName, role, platoon, section, bed, letter } = req.body;
  if (!username || !fullName || !role || !platoon || !section || !bed || !letter) {
    return res.status(400).json({ error: "All fields (username, fullName, role, platoon, section, bed, letter) are required." });
  }
  
  // Map textual role to a numeric value as your table expects:
  // "Recruit"             -> 0
  // "Platoon Commander"   -> 2
  // "Platoon Sergeant"    -> 1
  let roleNum;
  if (role === "Recruit") {
    roleNum = 0;
  } else if (role === "Platoon Commander") {
    roleNum = 2;
  } else if (role === "Platoon Sergeant") {
    roleNum = 1;
  } else {
    return res.status(400).json({ error: "Invalid role provided" });
  }

  // Extract the numeric part from strings such as "Platoon 1" and "Section 2"
  const platoonNumber = parseInt(platoon.replace(/[^0-9]/g, ''), 10);
  const sectionNumber = parseInt(section.replace(/[^0-9]/g, ''), 10);
  const bedNumber = parseInt(bed, 10);
  if (isNaN(platoonNumber) || isNaN(sectionNumber) || isNaN(bedNumber)) {
    return res.status(400).json({ error: "Invalid platoon, section, or bed format" });
  }
  
  // Update the soldier’s record.
  // Here, we update firstname (fullName), role, platoon, section, bed and companyName (set to the selected letter).
  const sql = "UPDATE soldiers SET firstname = ?, role = ?, platoon = ?, section = ?, bed = ?, companyName = ? WHERE username = ?";
  const values = [fullName, roleNum, platoonNumber, sectionNumber, bedNumber, letter, username];
  
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ error: "Error updating user" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User updated successfully" });
  });
});




















// === WebSocket and Remote Command Logic ===

// Store connected devices: Map<userId, WebSocket connection>
const connectedDevices = new Map();
// Store pending command promises: Map<commandId, { resolve, reject, timer }>
const pendingCommands = new Map();
const COMMAND_TIMEOUT = 30000; // 30 seconds timeout for commands

// --- NEW Endpoint: /listDevices ---
app.get('/listDevices', (req, res) => {
    // Return the user IDs of currently connected devices
    const deviceIds = Array.from(connectedDevices.keys());
    res.json(deviceIds);
});

// --- NEW Endpoint: /runRemote/<deviceId>/:command ---
app.get('/runRemote/:deviceId/:command', async (req, res) => { // Mark as async
    const { deviceId, command } = req.params;
    const args = req.query.args; 

    console.log(`[Backend /runRemote] Received request: deviceId=${deviceId}, command=${command}, args=${args}`);


    if (!deviceId || !command) {
        return res.status(400).json({ error: "Device ID and command are required." });
    }

    const ws = connectedDevices.get(deviceId); // Get the WebSocket connection
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        // If device isn't connected or connection isn't open
        connectedDevices.delete(deviceId); // Clean up if connection is dead
        return res.status(404).json({ error: `Device '${deviceId}' not connected or connection closed.` });
    }

    const commandId = uuidv4(); // Generate unique ID for this command

    // Create a promise that will resolve/reject when the result comes back or times out
    const commandPromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pendingCommands.delete(commandId); // Clean up on timeout
            reject(new Error(`Command timed out after ${COMMAND_TIMEOUT / 1000} seconds.`));
        }, COMMAND_TIMEOUT);

        pendingCommands.set(commandId, { resolve, reject, timer });
    });

    try {
        // Send command to the specific device via WebSocket
        const message = JSON.stringify({
            type: 'execute_command',
            commandId: commandId,
            command: command,
            ...(args !== undefined && { args: args })
        });
        ws.send(message);
        console.log(`Sent command '${command}' (ID: ${commandId}) to device '${deviceId}'`);

        // Wait for the promise to resolve (or reject on timeout/error)
        const result = await commandPromise;
        console.log(`Received result for command ID ${commandId} from device '${deviceId}'`);
        res.json({ deviceId: deviceId, command: command, output: result });

    } catch (error) {
        console.error(`Error running remote command ${commandId}:`, error.message);
        // If promise rejects (e.g., timeout)
        res.status(500).json({ error: `Failed to get response from device: ${error.message}` });
         // Ensure cleanup happens even if ws.send fails, although unlikely here
         if(pendingCommands.has(commandId)) {
             clearTimeout(pendingCommands.get(commandId).timer);
             pendingCommands.delete(commandId);
         }
    }
});


// === WebSocket Server Setup ===

// Create HTTP server from Express app
const server = http.createServer(app);

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    let currentUserId = null; // Store the userId for this connection

    console.log('WebSocket Client connected');

    // Handle messages received from mobile clients
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data);

            if (data.type === 'register' && data.userId) {
                // --- Device Registration ---
                currentUserId = data.userId;
                connectedDevices.set(currentUserId, ws); // Store connection associated with userId
                console.log(`Device registered with userId: ${currentUserId}`);
                // Optional: Send confirmation back
                 ws.send(JSON.stringify({ type: 'registered', status: 'success' }));

            } else if (data.type === 'command_result' && data.commandId) {
                // --- Result from a Command Execution ---
                const pending = pendingCommands.get(data.commandId);
                if (pending) {
                    clearTimeout(pending.timer); // Clear the timeout timer
                    if(data.error) {
                        pending.reject(new Error(data.error)); // Reject promise if device sent an error
                    } else {
                         pending.resolve(data.output); // Resolve the promise with the output
                    }
                    pendingCommands.delete(data.commandId); // Remove from pending map
                } else {
                    console.warn(`Received result for unknown/timed-out commandId: ${data.commandId}`);
                }
            } else {
                 console.warn("Received unknown WebSocket message format:", data);
                 ws.send(JSON.stringify({ type: 'error', message: 'Unknown message format' }));
            }

        } catch (e) {
            console.error('Failed to parse WebSocket message or invalid JSON:', message.toString(), e);
             ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log(`WebSocket Client disconnected${currentUserId ? ` (userId: ${currentUserId})` : ''}`);
        if (currentUserId) {
            connectedDevices.delete(currentUserId); // Remove from connected devices map
            // Optional: Reject any pending commands for this disconnected user
            pendingCommands.forEach((value, key) => {
                 // This check isn't perfect, need to associate commandId with userId if needed
                 // For now, let them time out or handle potentially dangling promises
            });
        }
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error${currentUserId ? ` for userId: ${currentUserId}` : ''}:`, error);
        if (currentUserId) {
            connectedDevices.delete(currentUserId); // Clean up on error too
        }
    });
});















const HOST = '0.0.0.0'; // Listen on all available network interfaces
const PORT = process.env.PORT || 3000;
server.listen(PORT, HOST, () => {
    console.log(`Server (HTTP & WebSocket) is running on http://${HOST}:${PORT}`);
});