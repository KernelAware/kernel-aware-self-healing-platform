export default function GrafanaPanel({
  url,
  height = "320px",
}) {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-border">
      <iframe
        src={url}
        title="Grafana Panel"
        width="100%"
        height={height}
        frameBorder="0"
      />
    </div>
  );
}