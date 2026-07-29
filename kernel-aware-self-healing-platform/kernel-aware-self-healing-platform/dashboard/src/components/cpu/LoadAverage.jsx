function LoadAverage() {
    return (
        <iframe
            title="Load Average Panel"
            src="http://localhost:3000/d-solo/cpu-performance-dash/cpu-and-performance?var-interval=$__auto&orgId=1&from=now-5m&to=now&timezone=browser&var-DS_PROMETHEUS=bfsuulzu5z4sgb&var-instance=$__all&refresh=5s&panelId=102"
            width="100%"
            height="250"
            frameBorder="0"
        />
    );
}

export default LoadAverage;