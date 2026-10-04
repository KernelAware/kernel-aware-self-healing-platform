-- KAISP Disk rule fixture
-- Matches the SQLAlchemy user-rule models in backend/app/models/user_rules/.
-- Duration is stored in seconds: 5 minutes = 300 seconds.

START TRANSACTION;

INSERT INTO systems (
    id,
    hostname,
    ip_address,
    os_name,
    os_version,
    architecture,
    environment,
    status
) VALUES (
    9001,
    'server-01',
    '192.0.2.10',
    'Linux',
    'test',
    'x86_64',
    'Testing',
    'active'
);

INSERT INTO rules (
    id,
    system_id,
    name,
    status,
    priority,
    severity,
    owner,
    environment,
    region,
    monitor_type,
    target_type,
    target
) VALUES (
    9001,
    9001,
    'High Disk Usage',
    'ENABLED',
    'High',
    'High',
    'Disk Test',
    'Testing',
    'Test-Region',
    'disk',
    'Filesystem / Mount Point',
    '/data'
);

INSERT INTO rule_targets (
    id,
    rule_id,
    target_type,
    target
) VALUES (
    9001,
    9001,
    'Filesystem / Mount Point',
    '/data'
);

INSERT INTO rule_metrics (
    id,
    rule_id,
    metric,
    operator,
    threshold,
    duration_seconds
) VALUES (
    9001,
    9001,
    'Disk Usage (%)',
    'Greater Than (>)',
    90.0,
    300
);

INSERT INTO rule_actions (
    id,
    rule_id,
    action_type,
    automatic_execution,
    approval_required,
    allowed_during,
    max_retry_attempts,
    cooldown_seconds,
    suppress_duplicates
) VALUES (
    9001,
    9001,
    'send-notification',
    FALSE,
    'ALWAYS',
    'ALWAYS',
    0,
    0,
    TRUE
);

INSERT INTO rule_notifications (
    id,
    rule_id,
    event_type,
    channel,
    recipient
) VALUES (
    9001,
    9001,
    'Incident detected',
    'email',
    'disk-test@example.com'
);

COMMIT;
