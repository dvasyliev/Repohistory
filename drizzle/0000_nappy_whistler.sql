CREATE TABLE `clones` (
	`repo_id` integer NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`unique` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `paths` (
	`repo_id` integer NOT NULL,
	`path` text NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`unique` integer,
	PRIMARY KEY(`repo_id`, `path`, `date`)
);
--> statement-breakpoint
CREATE TABLE `referrers` (
	`repo_id` integer NOT NULL,
	`referrer` text NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`unique` integer,
	PRIMARY KEY(`repo_id`, `referrer`, `date`)
);
--> statement-breakpoint
CREATE TABLE `views` (
	`repo_id` integer NOT NULL,
	`date` text NOT NULL,
	`total` integer NOT NULL,
	`unique` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `date`)
);
