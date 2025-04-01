-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: safroapp
-- ------------------------------------------------------
-- Server version	8.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `friendslist`
--

DROP TABLE IF EXISTS `friendslist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `friendslist` (
  `userid` int NOT NULL,
  `friendid` int NOT NULL,
  PRIMARY KEY (`userid`,`friendid`),
  KEY `friendid` (`friendid`),
  CONSTRAINT `friendslist_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `soldiers` (`userid`) ON DELETE CASCADE,
  CONSTRAINT `friendslist_ibfk_2` FOREIGN KEY (`friendid`) REFERENCES `soldiers` (`userid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `friendslist`
--

LOCK TABLES `friendslist` WRITE;
/*!40000 ALTER TABLE `friendslist` DISABLE KEYS */;
/*!40000 ALTER TABLE `friendslist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `livelocation`
--

DROP TABLE IF EXISTS `livelocation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `livelocation` (
  `userid` int NOT NULL,
  `lat` double NOT NULL,
  `long` double NOT NULL,
  PRIMARY KEY (`userid`),
  CONSTRAINT `livelocation_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `soldiers` (`userid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `livelocation`
--

LOCK TABLES `livelocation` WRITE;
/*!40000 ALTER TABLE `livelocation` DISABLE KEYS */;
INSERT INTO `livelocation` VALUES (2,37.4895667,-121.9717833);
/*!40000 ALTER TABLE `livelocation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userid` int NOT NULL,
  `recipientid` int NOT NULL,
  `messagebody` text NOT NULL,
  `timestamp` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userid` (`userid`),
  KEY `recipientid` (`recipientid`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `soldiers` (`userid`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`recipientid`) REFERENCES `soldiers` (`userid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,2,3,'Hi',1741364649),(2,2,3,'konichiwa motherfucker\' lol',1741364656),(3,3,2,'Okay lol... Whatever',1741364666),(4,2,3,'Okay?',1741364909),(5,2,3,'Hi',1741365315),(6,2,3,'Hiiiiii',1741374933),(7,2,1,'Yo',1743449619);
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `soldiers`
--

DROP TABLE IF EXISTS `soldiers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `soldiers` (
  `userid` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `firstname` varchar(255) NOT NULL,
  `lastname` varchar(255) NOT NULL,
  `companyName` varchar(255) NOT NULL,
  `platoon` int NOT NULL,
  `section` int NOT NULL,
  `bed` int NOT NULL,
  `identifier` varchar(255) GENERATED ALWAYS AS (concat(substring_index(`companyName`,_utf8mb4' ',1),`platoon`,`section`,lpad(`bed`,2,_utf8mb4'0'))) STORED,
  `role` tinyint NOT NULL,
  `phonenumber` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`userid`),
  UNIQUE KEY `username` (`username`),
  CONSTRAINT `soldiers_chk_1` CHECK ((`role` in (0,1,2)))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `soldiers`
--

LOCK TABLES `soldiers` WRITE;
/*!40000 ALTER TABLE `soldiers` DISABLE KEYS */;
INSERT INTO `soldiers` (`userid`, `username`, `password`, `firstname`, `lastname`, `companyName`, `platoon`, `section`, `bed`, `role`, `phonenumber`) VALUES (1,'soldier1@gmail.com','$2b$10$Ry.74dPPGa9WjFTa.oKOmOWlSZwq/h8shnPpBB202Yvrw1aR.IKLe','Bob Tan','','J',4,0,0,2,'91001000'),(2,'soldier2@gmail.com','$2b$10$pdO262UsxwSNfZOVS6Rlu.ebW/KZh/NhtN4wJWFowRCmm7tfKhfx.','Alan Tan','','J',4,1,1,0,'91001001'),(3,'soldier3@gmail.com','$2b$10$nT21n3OKaKWFLPZyihK.DO.bAQDYc1y2QB7SIaecssNG0TjclTmgy','Alex Ning','','J',4,1,2,0,'91001002'),(4,'soldier4@gmail.com','$2b$10$XLZ6Fve9O3erLnk1jV7a9OLVT0/q.IdWTM/VrFrHZhy1akBoMo/n.','Marcus Sim','','J',4,2,1,0,'91001003'),(5,'soldier5@gmail.com','$2b$10$cSNUsJBfmmgu.nxp.mJ5MuErCgL/GEw7d9iFeZLQs4Nl38Kbc43Mq','Alan Neo','','J',4,2,2,0,'91001004'),(6,'soldier6@gmail.com','$2b$10$xiu24UXMmJYlVI6h5uh8P.FOh.QY8zMGWjvcne2AuXJ9FUtyeFQqm','soldier6@gmail.com','','J',4,3,1,0,'91001005'),(7,'soldier7@gmail.com','$2b$10$8Q/yFaIhSVblwKXgfypjTuCFIb5dbw3FK1zDs88rO6GI3bSz9wqX2','Lol Mo','','NA',0,0,0,0,'91001006'),(8,'soldier8@gmail.com','$2b$10$qWN8Huw7JiNc0oGfpeXae.rOismcNuEn3Gdww04dVnd6QxQPR7/WS','Heli Lim','','NA',0,0,0,0,'91001007'),(9,'soldier9@gmail.com','$2b$10$6vcWcmv0bMSIMbiDvAqMze7xeZZuKwtJ45D.rBmx21bIfj2vUHeU6','heli lim','','NA',0,0,0,0,'91001008');
/*!40000 ALTER TABLE `soldiers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-04-02  5:47:52
