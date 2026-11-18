CREATE TABLE `commit_weeks` (
	`repo_id` integer NOT NULL,
	`week` text NOT NULL,
	`commits` integer NOT NULL,
	`additions` integer NOT NULL,
	`deletions` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `week`)
);
--> statement-breakpoint
CREATE TABLE `forks` (
	`repo_id` integer NOT NULL,
	`date` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `repo_counters` (
	`repo_id` integer NOT NULL,
	`date` text NOT NULL,
	`stars` integer NOT NULL,
	`forks` integer NOT NULL,
	`watchers` integer NOT NULL,
	`open_issues` integer NOT NULL,
	PRIMARY KEY(`repo_id`, `date`)
);
