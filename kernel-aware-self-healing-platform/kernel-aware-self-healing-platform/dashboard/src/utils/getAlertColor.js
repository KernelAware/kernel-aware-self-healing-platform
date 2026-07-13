export function getAlertColor(tone) {
  const toneClasses = {
    success: 'text-primary border-primary/30 bg-primary/12',
    warning: 'text-warning border-warning/30 bg-warning/12',
    danger: 'text-destructive border-destructive/30 bg-destructive/12',
    info: 'text-accent border-accent/30 bg-accent/15',
    muted: 'text-muted-foreground border-border bg-muted',
  }
  return toneClasses[tone] || toneClasses.muted
}
