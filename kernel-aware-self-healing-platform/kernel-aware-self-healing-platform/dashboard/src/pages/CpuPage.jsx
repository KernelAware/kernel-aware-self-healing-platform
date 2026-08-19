import React from 'react'
import { Activity, Download } from 'lucide-react'
import { PageHeader, ActionButton } from '@/components/kit'
import CpuUsageGauge from '@/components/cpu/CpuUsageGauge'
import LoadAverageGraph from '@/components/cpu/LoadAverageGraph'
import PerCoreBreakdown from '@/components/cpu/PerCoreBreakdown'
import CpuHistoryGraph from '@/components/cpu/CpuHistoryGraph'
import TopProcessesTable from '@/components/cpu/TopProcessesTable'
import TotalCpuUtilization from '@/components/cpu/TotalCpuUtilization'
import LoadAverage from '@/components/cpu/LoadAverage'
import CoreUtilization16Core from '@/components/cpu/CoreUtilization16Core'
import PerformanceOverview from "../components/cpu/PerformanceOverview.jsx";
import PhysicalCores from "../components/cpu/PhysicalCores.jsx";
import LogicalCores from "../components/cpu/LogicalCores.jsx";
import MinFrequency from "../components/cpu/MinFrequency.jsx";
import MaxFrequency from "../components/cpu/MaxFrequency.jsx";
import CurrentFrequency from "../components/cpu/CurrentFrequency.jsx";
import ContextSwitches from "../components/cpu/ContextSwitches.jsx";
import HardwareInterrupts from "../components/cpu/HardwareInterrupts.jsx";
import SoftInterrupts from "../components/cpu/SoftInterrupts.jsx";

export default function CpuPage() {
  return (
    <>
      <PageHeader
        title="CPU Performance"
        description="Real-time kernel-level telemetry and resource allocation tracking."
        actions={
          <>
            <ActionButton icon={Download}>Export CSV</ActionButton>
            <ActionButton variant="primary" icon={Activity}>Diagnostic Run</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

            <div className="flex flex-col gap-4">
                <TotalCpuUtilization />
                <LoadAverage />
            </div>
            <div className="lg:col-span-1">
                <CoreUtilization16Core />
            </div>

            <div className="lg:col-span-1">
                <LoadAverageGraph />
            </div>

           {/*<TotalCpuUtilization/>*/}
            {/*<LoadAverage/>*/}
            {/*<CoreUtilization16Core/>*/}

        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5">
              <PerformanceOverview />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
                <PhysicalCores />
                <MinFrequency />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
                <LogicalCores />
                <MaxFrequency />
          </div>

          <div className="lg:col-span-3">
                <CurrentFrequency />
          </div>


        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
              <ContextSwitches />
          </div>
          <div className="lg:col-span-4">
              <HardwareInterrupts />
          </div>
          <div className="lg:col-span-4">
              <SoftInterrupts />
          </div>

        </div>

      </div>
    </>
  )
}
