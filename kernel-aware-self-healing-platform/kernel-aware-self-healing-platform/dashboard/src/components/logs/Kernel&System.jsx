function OOMEvents() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-19&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}


function FileSystemErrors() {
    return (
        <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-20&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
    );
}


function HardwareErrors() {
    return (
        <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-21&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
    );
}

function NetworkErrors() {
    return (
        <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-22&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
  );
}

function BootLogs() {
    return (
        <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-23&from=now-12h&to=now"
          width="100%" height="100" frameBorder="0"></iframe>
    );
}

function KernelJournalLogs() {
    return (
        <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-24&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function KernelLogs2() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-25&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function OOMKillerLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-26&from=now-5y&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function FilesystemErrorLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-27&from=now-5y&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function HardwareErrorLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-28&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function NetworkErrorLogs() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-29&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}
function BootLogs2() {
  return (
      <iframe
          src="http://localhost:3000/d-solo/ad9kz2v/logs-viewer?orgId=1&timezone=browser&refresh=10s&panelId=panel-30&from=now-12h&to=now"
          width="100%" height="400" frameBorder="0"></iframe>
  );
}





export { OOMEvents,FileSystemErrors,HardwareErrors , NetworkErrors ,BootLogs, KernelJournalLogs ,KernelLogs2 ,OOMKillerLogs ,FilesystemErrorLogs, HardwareErrorLogs ,NetworkErrorLogs,BootLogs2};