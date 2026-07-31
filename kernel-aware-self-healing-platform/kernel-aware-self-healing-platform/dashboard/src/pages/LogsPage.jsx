import React, { useState } from 'react'
import { PageHeader, Panel } from '@/components/kit'
import LogFilter from '@/components/logs/LogFilter'
import LogLevelChart from '@/components/logs/LogLevelChart'
import LogStream from '@/components/logs/LogStream'
import {KernelLogs, JournalLogs, AuthLogs ,SecurityEvents ,FailedLogins ,FailedServices,LoggedInUsers , ApplicationLogs ,CronLogs, ExistingLogFiles ,MissingLogFiles ,TotalLogSize ,LargeLogFiles, ServiceRestarts }  from '@/components/logs/OverviewSection'
import {OOMEvents,FileSystemErrors,HardwareErrors , NetworkErrors ,BootLogs, KernelJournalLogs ,KernelLogs2 ,OOMKillerLogs ,FilesystemErrorLogs, HardwareErrorLogs ,NetworkErrorLogs,BootLogs2} from '@/components/logs/Kernel&System'
import {SSHEvents,SudoEvents,PermissionDenied,PrivilegeEscalation,AuthFailures,SuccessfulLogins ,AuthenticationLogs,FailedLogins2,SuccessfulLogins2,SSHLogs,SudoLogs,PermissionDeniedLogs, PrivilegeEscalationLogs,AuthenticationFailures,SecurityEvents2,RootLoginEvents} from '@/components/logs/Authentication&Security'
import {RunningServices,  FailedServices2,  RestartEvents, StatusChanges, ServiceLogs,  StartedServices,  StoppedServices,  ReloadedServices,  FailedServicesLogs,  RestartEventsLogs,  RunningServicesLogs,  ServiceStatusChanges} from '@/components/logs/Services'
import {ActiveUsers, LoginHistory, RootLogins, RemoteLogins, LocalLogins, LoggedInUsers2, LoginHistory2, RootLoginEvents2, RemoteLoginEvents, CronLogs2, ApplicationLogs2} from '@/components/logs/Users&Sessions '
import {ConfiguredLogFiles,ExistingLogFiles2,MissingLogFiles2,RecentlyModifiedLogs,LargeLogFiles2,EmptyLogFiles,ApplicationLogTail} from '@/components/logs/LogFiles&StorageHealth'
import { AllLogs }  from '@/components/logs/LiveLogExplorer'


const LOGS = [
  { time: '14:02:10.432', sev: 'INFO', tag: 'kernel', msg: 'eBPF probe attached to syscall:__x64_sys_execve successfully.' },
  { time: '14:02:11.112', sev: 'INFO', tag: 'sentinel-daemon', msg: 'Refreshing autonomous policies from core engine.' },
  { time: '14:02:11.890', sev: 'WARN', tag: 'memory', msg: 'Swappiness threshold exceeded on Node_04 (Current: 92%).' },
  { time: '14:02:12.001', sev: 'INFO', tag: 'self-healing', msg: 'Initiating cache purge on worker_svc_7.' },
  { time: '14:02:12.445', sev: 'ERROR', tag: 'docker', msg: 'Runtime mismatch detected in container context [uuid: a8f921].' },
  { time: '14:02:13.112', sev: 'INFO', tag: 'audit', msg: "User 'admin' accessed log viewer module." },
  { time: '14:02:13.567', sev: 'INFO', tag: 'kernel', msg: 'Memory page compaction complete (Duration: 142ms).' },
  { time: '14:02:14.221', sev: 'WARN', tag: 'network', msg: 'Retransmission rate spiked on eth0 (Current: 1.4%).' },
  { time: '14:02:15.002', sev: 'INFO', tag: 'sentinel-daemon', msg: 'Syncing state with Prometheus HA cluster.' },
  { time: '14:02:15.678', sev: 'ERROR', tag: 'postgres', msg: "Connection timeout from pool 'analytics_backend' after 5000ms." },
  { time: '14:02:16.110', sev: 'INFO', tag: 'self-healing', msg: 'PostgreSQL connection pool increased to 200.' },
  { time: '14:02:16.443', sev: 'INFO', tag: 'kernel', msg: 'Kprobes successfully deployed to audit file descriptors.' },
  { time: '14:02:17.001', sev: 'INFO', tag: 'audit', msg: 'Successfully authenticated session for client IP 192.168.1.10.' },
  { time: '14:02:18.537', sev: 'ERROR', tag: 'network', msg: 'Heartbeat lost from remote agent Node_05.' },
]

export default function LogsPage() {
  const [live, setLive] = useState(true)
  const [active, setActive] = useState(['INFO', 'WARN', 'ERROR'])
  const [sources, setSources] = useState(['Kernel eBPF', 'Systemd Service'])

  const toggleSev = (s) =>
    setActive((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const toggleSrc = (s) =>
    setSources((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const resetAll = () => {
    setActive(['INFO', 'WARN', 'ERROR', 'DEBUG'])
    setSources(['Kernel eBPF', 'Systemd Service', 'Container Runtime', 'Auth.log'])
  }

  const visible = LOGS.filter((l) => active.includes(l.sev))

  return (
    <>
      <PageHeader
        title="Logs Viewer"
        description="Unified kernel, service, and container log streaming with Loki-backed pattern recognition."
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <KernelLogs />
          <JournalLogs />
          <AuthLogs />
          <ApplicationLogs />
          <CronLogs />
          <FailedServices />
          <ServiceRestarts />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <SecurityEvents />
          <FailedLogins />
          <ExistingLogFiles />
          <MissingLogFiles />
          <TotalLogSize />
          <LargeLogFiles />
          <LoggedInUsers />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Kernel & System Logs
      </h2>

      <div className="space-y-4">

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <OOMEvents />
          <FileSystemErrors />
          <HardwareErrors />
          <NetworkErrors />
          <BootLogs />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KernelJournalLogs />
          <KernelLogs2 />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <OOMKillerLogs />
          <FilesystemErrorLogs />
          <HardwareErrorLogs />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <NetworkErrorLogs />
            <BootLogs2 />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Authentication & Security Logs
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <SSHEvents />
          <SudoEvents />
          <PermissionDenied />
          <PrivilegeEscalation />
          <AuthFailures />
          <SuccessfulLogins />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
          <AuthenticationLogs />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FailedLogins2 />
          <SuccessfulLogins2 />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SSHLogs />
          <SudoLogs />
          <PermissionDeniedLogs />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PrivilegeEscalationLogs />
          <AuthenticationFailures />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SecurityEvents2 />
          <RootLoginEvents />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Services Logs
      </h2>

      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <RunningServices />
          <FailedServices2 />
          <RestartEvents />
          <StatusChanges />
        </div>

        {/* Main Service Logs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ServiceLogs />
          <ServiceStatusChanges />
        </div>

        {/* Started & Stopped Services */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StartedServices />
          <StoppedServices />
          <ReloadedServices />
        </div>

        {/* Failed & Running Services */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FailedServicesLogs />
          <RestartEventsLogs />
          <RunningServicesLogs />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Users & Sessions Logs
      </h2>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <ActiveUsers />
          <LoginHistory />
          <RootLogins />
          <RemoteLogins />
          <LocalLogins />
        </div>

        {/* Main Login Logs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LoggedInUsers2 />
          <LoginHistory2 />
        </div>

        {/* Root, Remote & Cron Events */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <RootLoginEvents2 />
          <RemoteLoginEvents />
          <CronLogs2 />
        </div>

        {/* Application Logs */}
        <div className="grid grid-cols-1 gap-4">
          <ApplicationLogs2 />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Log Files / Storage Health
      </h2>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <ConfiguredLogFiles />
          <ExistingLogFiles2 />
          <MissingLogFiles2 />
          <RecentlyModifiedLogs />
          <LargeLogFiles2 />
          <EmptyLogFiles />
        </div>

        {/* Application Log Tail */}
        <div className="grid grid-cols-1 gap-4">
          <ApplicationLogTail />
        </div>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold text-white">
        Live Log Explorer
      </h2>

      <div className="space-y-1">
        <div className="grid grid-cols-1 gap-4">
          <AllLogs />
        </div>
      </div>

      {/*<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">*/}
      {/*  <Panel className="h-fit p-5">*/}
      {/*    <LogFilter */}
      {/*      active={active} */}
      {/*      sources={sources} */}
      {/*      toggleSev={toggleSev} */}
      {/*      toggleSrc={toggleSrc} */}
      {/*      resetAll={resetAll} */}
      {/*    />*/}
      {/*    <div className="mt-4 pt-4 border-t border-border">*/}
      {/*      <LogLevelChart />*/}
      {/*    </div>*/}
      {/*  </Panel>*/}

      {/*  <Panel className="overflow-hidden">*/}
      {/*    <LogStream logs={visible} live={live} setLive={setLive} />*/}
      {/*  </Panel>*/}
      {/*</div>*/}
    </>
  )
}
