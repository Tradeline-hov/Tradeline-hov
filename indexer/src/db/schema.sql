-- Tradeline Postgres schema

CREATE TABLE IF NOT EXISTS jobs (
    id            BIGINT PRIMARY KEY,
    client        VARCHAR(56) NOT NULL,
    arbiter       VARCHAR(56) NOT NULL,
    token         VARCHAR(56) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
    id              SERIAL PRIMARY KEY,
    job_id          BIGINT NOT NULL REFERENCES jobs(id),
    milestone_index INTEGER NOT NULL,
    freelancer      VARCHAR(56) NOT NULL,
    amount          NUMERIC(30, 7) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'Funded',
    funded_at       TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,
    disputed_at     TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    freelancer_bps  INTEGER,          -- set on resolution
    UNIQUE(job_id, milestone_index)
);

CREATE TABLE IF NOT EXISTS reputation (
    id              SERIAL PRIMARY KEY,
    ratee           VARCHAR(56) NOT NULL,
    rater           VARCHAR(56) NOT NULL,
    stars           INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    job_id          BIGINT,
    milestone_id    INTEGER,
    recorded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rep_summary (
    address         VARCHAR(56) PRIMARY KEY,
    total_ratings   INTEGER NOT NULL DEFAULT 0,
    total_stars     BIGINT  NOT NULL DEFAULT 0,
    average_x100    BIGINT  NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cursor (
    key   VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- Default cursor starting point (overwritten on first run)
INSERT INTO cursor (key, value) VALUES ('ledger', '0') ON CONFLICT DO NOTHING;
