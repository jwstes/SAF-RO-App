-- Create database and use it
DROP DATABASE IF EXISTS safroapp;
CREATE DATABASE IF NOT EXISTS safroapp;
USE safroapp;

-- Create soldiers table
CREATE TABLE IF NOT EXISTS soldiers (
    userid INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    companyName VARCHAR(255) NOT NULL,
    platoon INT NOT NULL,               -- values: 1-5 
    section INT NOT NULL,               -- values: 1-4
    bed INT NOT NULL,                   -- values: 1-12
    -- The identifier consists of the first word of companyName concatenated with platoon,
    -- section and a 2-digit bed number (so 8 becomes 08), e.g. "J3408"
    identifier VARCHAR(255) GENERATED ALWAYS AS (
               CONCAT(SUBSTRING_INDEX(companyName, ' ', 1),
                      platoon,
                      section,
                      LPAD(bed, 2, '0'))
    ) STORED,
    role TINYINT NOT NULL CHECK (role IN (0,1,2))  -- 0: recruit, 1: sergeant, 2: commander
);

-- Create liveLocation table (store one row per soldier)
CREATE TABLE IF NOT EXISTS liveLocation (
    userid INT PRIMARY KEY,
    lat DOUBLE NOT NULL,
    `long` DOUBLE NOT NULL,
    FOREIGN KEY (userid) REFERENCES soldiers(userid) ON DELETE CASCADE
);

-- Create friendsList table (each friendship row)
CREATE TABLE IF NOT EXISTS friendsList (
    userid INT,
    friendid INT,
    PRIMARY KEY (userid, friendid),
    FOREIGN KEY (userid) REFERENCES soldiers(userid) ON DELETE CASCADE,
    FOREIGN KEY (friendid) REFERENCES soldiers(userid) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid INT NOT NULL,            -- sender ID
    recipientid INT NOT NULL,       -- recipient ID
    messagebody TEXT NOT NULL,
    timestamp BIGINT NOT NULL,      -- Unix time
    FOREIGN KEY (userid) REFERENCES soldiers(userid) ON DELETE CASCADE,
    FOREIGN KEY (recipientid) REFERENCES soldiers(userid) ON DELETE CASCADE
);