# Disk Rule SQL Fixture

`disk_rules.sql` creates a minimal Disk monitoring rule using the existing KAISP user-rule tables.

## Load

The project configures MySQL as `user_rules`. Load the fixture with:

```bash
mysql -u <user> -p user_rules < testing/disk/disk_rules.sql
```

The fixture uses explicit IDs in the `9001` range so it is easy to identify and remove from a test database.

## Records created

- One system in `systems`: hostname `server-01`
- One enabled Disk rule in `rules`: `High Disk Usage`
- One target in `rule_targets`: filesystem mount point `/data`
- One metric in `rule_metrics`: `Disk Usage (%) > 90`
- One duration: `300` seconds, equivalent to 5 minutes
- One action in `rule_actions`: `send-notification`
- One notification in `rule_notifications`: incident detected by email

The fixture intentionally does not add a recovery row because the requested minimum fixture does not require one. The existing schema does not have separate device, mountpoint, or filesystem columns on `rule_targets`; this fixture therefore uses the supported `target_type` and `target` columns.

## Disk detector test use

A Disk detector test can load rule `9001` through the existing rule repository or analytics rule loader, then verify that:

```text
monitor_type = disk
target_type = Filesystem / Mount Point
target = /data
metric = Disk Usage (%)
operator = Greater Than (>)
threshold = 90
duration_seconds = 300
action_type = send-notification
```

The monitoring agent's exporter identifies partition metrics with `device`, `mountpoint`, and `filesystem` Prometheus labels. The current database fixture stores only `/data`, matching the existing `rule_targets` model; a detector test that needs exact device/filesystem matching should provide those values in its test target context.
