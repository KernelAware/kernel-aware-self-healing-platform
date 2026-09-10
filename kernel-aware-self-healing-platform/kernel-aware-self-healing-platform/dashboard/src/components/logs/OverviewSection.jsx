function KernelLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-4&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}


function JournalLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-5&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}


function AuthLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-6&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function SecurityEvents() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-7&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function FailedLogins() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-8&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function FailedServices() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-9&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function LoggedInUsers() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-10&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function ApplicationLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-11&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function CronLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-12&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function ExistingLogFiles() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-13&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function MissingLogFiles() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-14&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function TotalLogSize() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-15&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function LargeLogFiles() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-16&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}
function ServiceRestarts() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-17&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}




export { KernelLogs, JournalLogs, AuthLogs ,SecurityEvents ,FailedLogins ,FailedServices,LoggedInUsers , ApplicationLogs ,CronLogs, ExistingLogFiles ,MissingLogFiles ,TotalLogSize ,LargeLogFiles, ServiceRestarts };