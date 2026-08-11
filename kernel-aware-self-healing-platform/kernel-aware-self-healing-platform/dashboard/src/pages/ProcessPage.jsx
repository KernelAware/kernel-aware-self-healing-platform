import React from 'react'
import { ListFilter, Zap } from 'lucide-react'
import { PageHeader, ActionButton, Panel, ProgressBar, CircularGauge } from '@/components/kit'
import ServicesTable from '@/components/process/ServicesTable'
import ProcessesTable from '../components/process/ProcessesTable'
import T0talProcesses from "../components/process/totalProcesses.jsx";
import Total_servieses from "../components/process/total_servieses.jsx";
import ProcessesStatus from "../components/process/ProcessesStatus.jsx";
import ServiceStatus from "../components/process/serviceStatus.jsx";

export default function ProcessPage() {
  return (
    <>
      <PageHeader
        title="Processes & Services Orchestration"
        description="Real-time kernel-level oversight of active sub-systems and binary executions."
        actions={
          <>
            <ActionButton icon={ListFilter}>Filters</ActionButton>
            <ActionButton variant="primary" icon={Zap}>Quick Actions</ActionButton>
          </>
        }
      />

      <div className="space-y-4">
       <div
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          style={{
            display: "flex",
            flexDirection: "row",
          }}
        >
          <div className="flex flex-col gap-4" style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}>
            <Panel className="p-4" style={{display:"flex" ,flexDirection: "column"}}>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Processes Info Summery</p>
              </div>
              <div style={{display:"flex" , flexDirection: "row ",justifyContent: "space-between",gap:"3px",
            width: "100%",}}>
                  <div style={{flex:1}}><T0talProcesses/></div>
                  <div style={{flex:2}}><ProcessesStatus/></div>
              </div>
            </Panel>

            <Panel className="p-4" style={{display:"flex" ,flexDirection: "column"}}>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Processes Info Summery</p>
              </div>
              <div style={{display:"flex" , flexDirection: "row ",justifyContent: "space-between",gap:"3px",
            width: "100%",}}>
                  <div style={{flex:1}}><Total_servieses/></div>
                  <div style={{flex:2}}><ServiceStatus/></div>
              </div>
            </Panel>
          </div>
        </div>
        <ProcessesTable />
        <ServicesTable/>
      </div>
    </>
  )
}
