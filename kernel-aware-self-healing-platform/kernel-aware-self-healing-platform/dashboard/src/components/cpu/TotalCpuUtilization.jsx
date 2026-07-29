function TotalCpuUtilization() {
    return (
        <iframe
            title="Total Cpu Utilization"
            src="http://localhost:3000/d-solo/cpu-performance-dash/cpu-and-performance?var-interval=$__auto&orgId=1&from=now-5m&to=now&timezone=browser&var-DS_PROMETHEUS=ffsun0z5azx1cf&var-instance=$__all&refresh=5s&panelId=101"
            width="100%"
            height="133"
            frameBorder="0"
        />
    );
}

export default TotalCpuUtilization;
