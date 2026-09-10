import React from "react";
import { MemoryStick } from "lucide-react";
import { Panel, PanelHeader } from "@/components/kit";

export default function AvailableMemory() {
  return (
    <Panel>
      {/*<PanelHeader*/}
      {/*  title="Available Memory"*/}
      {/*  icon={MemoryStick}*/}
      {/*/>*/}

      <iframe
        src="http://localhost:3000/d-solo/adbgpks/available-memory?orgId=1&from=now-5m&to=now&refresh=5s&theme=dark&panelId=panel-1"
        width="100%"
        height="320"
        frameBorder="0"
      />
    </Panel>
  );
}