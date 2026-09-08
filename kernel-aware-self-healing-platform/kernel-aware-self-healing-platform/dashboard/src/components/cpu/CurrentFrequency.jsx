function CurrentFrequency() {
    return (
        <iframe
            title="Current Frequency"
            src="http://localhost:3000/d-solo/cpu-performance-dash/cpu-and-performance?var-interval=$__auto&orgId=1&timezone=browser&var-filter0=&var-DS_PROMETHEUS=ffsoo1vfqiku8a&var-instance=$__all&refresh=5s&panelId=panel-205&from=now-30m&to=now"
            width="100%"
            height="314"
            frameBorder="0"
        />
    );
}

export default CurrentFrequency;
