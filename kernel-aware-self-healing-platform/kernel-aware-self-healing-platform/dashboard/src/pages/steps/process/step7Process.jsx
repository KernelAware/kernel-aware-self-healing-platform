
import { useState } from "react";
import { Info, Code, X } from "lucide-react";
import { Panel } from "@/components/kit";
import { cn } from "@/utils/cn";
import { Checkbox } from "../wizardComponents";
import { ACTION_TYPES_PROCESSES } from "../wizardConstants";

export default function Step7({ form, setForm }) {
  const [dialogAction, setDialogAction] = useState(null);
  const [script, setScript] = useState("");

  const selected = Array.isArray(form.actions) ? form.actions : [];

  const requiresScript = (action) => {
    const value = `${action.id} ${action.title}`.toLowerCase();

    return (
      value.includes("restart") ||
      value.includes("start") ||
      value.includes("automation")
    );
  };

  const getActionType = (action) =>
    String(action.id).toUpperCase();

  const openScriptDialog = (action) => {
    const existingAction = selected.find(
      (item) => item.type === getActionType(action)
    );

    setDialogAction(action);
    setScript(existingAction?.action_script ?? "");
  };

  const toggle = (action) => {
    const type = getActionType(action);

    const exists = selected.some((item) => item.type === type);

    if (exists) {
      setForm((f) => ({
        ...f,
        actions: (Array.isArray(f.actions) ? f.actions : []).filter(
          (item) => item.type !== type
        ),
      }));

      if (dialogAction && getActionType(dialogAction) === type) {
        setDialogAction(null);
        setScript("");
      }

      return;
    }

    setForm((f) => ({
      ...f,
      actions: [
        ...(Array.isArray(f.actions) ? f.actions : []),
        {
          type,
          action_script: null,
        },
      ],
    }));

    if (requiresScript(action)) {
      openScriptDialog(action);
    }
  };

  const saveScript = () => {
    if (!dialogAction || !script.trim()) return;

    const type = getActionType(dialogAction);

    setForm((f) => ({
      ...f,
      actions: (Array.isArray(f.actions) ? f.actions : []).map(
        (item) =>
          item.type === type
            ? {
                ...item,
                action_script: script,
              }
            : item
      ),
    }));

    setDialogAction(null);
    setScript("");
  };

  const closeDialog = () => {
    setDialogAction(null);
    setScript("");
  };

  return (
    <>
      <Panel className="p-6">
        <div className="mb-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
            7. Actions (What to Do)
          </p>

          <p className="text-xs text-muted-foreground mt-0.5">
            Select the action type to perform when the condition is triggered.
          </p>
        </div>

        <p className="font-mono text-[11px] text-foreground mb-3">
          Action Type <span className="text-destructive">*</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ACTION_TYPES_PROCESSES.map((action) => {
            const Icon = action.icon;
            const type = getActionType(action);

            const selectedAction = selected.find(
              (item) => item.type === type
            );

            const isSelected = Boolean(selectedAction);
            const hasScript = Boolean(selectedAction?.action_script);

            return (
              <div
                key={action.id}
                onClick={() => toggle(action)}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3.5 cursor-pointer transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    action.bg
                  )}
                >
                  <Icon className="size-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-semibold text-foreground leading-tight">
                    {action.title}
                  </p>

                  <p className="font-mono text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {action.desc}
                  </p>

                  {isSelected && requiresScript(action) && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openScriptDialog(action);
                      }}
                      className="mt-2 text-[10px] font-mono text-primary underline"
                    >
                      {hasScript ? "Edit script" : "Configure script"}
                    </button>
                  )}
                </div>

                <div onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onClick={() => toggle(action)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex gap-2 rounded-md border border-accent/20 bg-accent/5 p-3">
          <Info className="size-4 text-accent shrink-0 mt-0.5" />

          <div>
            <p className="font-mono text-[11px] text-foreground">
              Configure scripts for restart, start, and automation actions.
            </p>

            <p className="font-mono text-[11px] text-accent mt-0.5">
              Each script is stored directly with its corresponding action.
            </p>
          </div>
        </div>
      </Panel>

      {dialogAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="script-dialog-title"
            className="w-full max-w-2xl rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                  <Code className="size-5 text-primary" />
                </div>

                <div>
                  <h2
                    id="script-dialog-title"
                    className="text-base font-semibold"
                  >
                    Configure {dialogAction.title}
                  </h2>

                  <p className="text-xs text-muted-foreground mt-1">
                    Enter the command or script for this action.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close dialog"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <label
              htmlFor="action-script"
              className="block text-sm font-medium mb-2"
            >
              Script / Command
            </label>

            <textarea
              id="action-script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              placeholder={`# Example shell command\nsystemctl restart nginx`}
              rows={10}
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary resize-y"
            />

            <p className="mt-2 text-xs text-muted-foreground">
              Enter a shell command or automation script supported by your backend.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveScript}
                disabled={!script.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                Save Script
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
