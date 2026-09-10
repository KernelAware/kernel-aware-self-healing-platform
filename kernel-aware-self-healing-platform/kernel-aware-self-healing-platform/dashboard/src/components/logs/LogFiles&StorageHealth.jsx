function ConfiguredLogFiles() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-74&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function ExistingLogFiles2() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-75&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function MissingLogFiles2() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-76&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function RecentlyModifiedLogs() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-77&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function LargeLogFiles2() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-78&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function EmptyLogFiles() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-79&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}



function ApplicationLogTail() {
  return (
    <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-81&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}

export {
  ConfiguredLogFiles,
  ExistingLogFiles2,
  MissingLogFiles2,
  RecentlyModifiedLogs,
  LargeLogFiles2,
  EmptyLogFiles,

  ApplicationLogTail,
};