# SAF-RO-APP Backend API

This application is designed for the Singapore military's BMT environment. Commanders post routine orders that recruits can view, recruits can chat with one another, and commanders can track the live locations of the recruits.

---

## SQL Tables

- **soldiers**  
  Columns: userid, username, password, firstname, lastname, companyName, platoon, section, bed, identifier (computed), role (0: recruit, 1: commander)

- **liveLocation**  
  Columns: userid, lat, long

- **friendsList**  
  Columns: userid, friendid

- **messages**  
  Columns: id, userid, recipientid, messagebody, timestamp (Unix format)

---

## Endpoints

### Accessible to Everyone
- **POST /register**  
  Register a new soldier.

- **POST /login**  
  Login and receive a JWT.

- **POST /updateRealTimeLocation**  
  Upsert a soldier’s live location with userid, lat, long.

- **GET /searchByUsername**  
  Query soldiers by username (substring search).

- **GET /getUserByUsername**  
  Get full soldier details by username.

- **POST /addFriend**  
  Add a friend.

- **POST /sendMessage**  
  Send a message (requires userid, recipientid, messagebody).

- **GET /retrieveMessage**  
  Retrieve all messages for a given username.

### Accessible Only to Commanders (JWT Protected)
- **POST /broadcastMessage**  
  Broadcast a message to all recruits in your company & platoon.

- **GET /viewLocationByUsername**  
  View a recruit’s location by username.

---

## Quick Setup

1. Install dependencies:  
   npm install express mysql bcrypt jsonwebtoken

2. Execute sql.sql

3. Adjust DB config in the code as needed.

4. Start the app:  
   node main.js
