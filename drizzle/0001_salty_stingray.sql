CREATE TABLE `stars` (
	`repo_id` integer NOT NULL,
	`date` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `date`)
);
