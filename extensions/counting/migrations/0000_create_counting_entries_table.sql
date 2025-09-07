CREATE TABLE counting_entries (
    id SERIAL PRIMARY KEY,
    last_user_id VARCHAR,
    guild_id VARCHAR NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
