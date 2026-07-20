CREATE DATABASE IF NOT EXISTS riftbound;
USE riftbound;

CREATE TABLE IF NOT EXISTS metadata (
	id TINYINT PRIMARY KEY DEFAULT 1,
	schema_version INT NOT NULL,
	last_synced TIMESTAMP,
	CONSTRAINT single_row CHECK (id = 1)
);