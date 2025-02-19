const express  = require('express');
const mysql    = require('mysql2');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const app      = express();

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
  const { username, password, firstname, lastname, companyName,
          platoon, section, bed, role } = req.body;
  if (!username || !password || !firstname || !lastname ||
      !companyName || !platoon || !section || !bed || role === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO soldiers
         (username, password, firstname, lastname, companyName, platoon, section, bed, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [username, hashedPassword, firstname, lastname, companyName,
                    platoon, section, bed, role];
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Error registering user" });
      }
      res.json({ message: "User registered successfully" });
    });
  } catch (err) {
    console.error(err);
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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});