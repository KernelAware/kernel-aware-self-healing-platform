import React from 'react'

import {
  Wrench,
  CheckCircle,
  XCircle,
  LoaderCircle,
  Circle
} from 'lucide-react'


export default function HealingExecution({
  incident
}) {

  const healing = incident?.healing


  if (!healing) {
    return null
  }


  return (
    <div className="
      rounded-lg
      border border-zinc-800
      bg-zinc-950
    ">


      {/* HEADER */}

      <div className="
        flex items-center justify-between
        border-b border-zinc-800
        p-4
      ">

        <div className="
          flex items-center gap-2
        ">

          <Wrench
            size={17}
            className="text-emerald-400"
          />

          <h2 className="font-semibold">
            Healing Execution
          </h2>

        </div>


        <HealingStatus
          status={healing.status}
        />

      </div>


      <div className="space-y-5 p-4">


        {/* EXECUTION INFO */}

        <div className="
          grid grid-cols-2
          gap-4
          md:grid-cols-4
        ">

          <Info
            label="Action"
            value={healing.action}
          />

          <Info
            label="Executor"
            value={healing.executor}
          />

          <Info
            label="Attempts"
            value={
              `${healing.attempts || 0} /
              ${
                (healing.max_retries || 0)
                + 1
              }`
            }
          />

          <Info
            label="Execution Time"
            value={
              healing.execution_time ||
              'Running'
            }
          />

        </div>


        {/* STEPS */}

        {healing.steps && (

          <div>

            <p className="
              mb-3
              text-xs uppercase
              tracking-wide
              text-zinc-500
            ">
              Execution Steps
            </p>


            <div className="space-y-2">

              {healing.steps.map(
                (step, index) => (

                  <div
                    key={index}
                    className="
                      flex
                      items-center
                      justify-between
                      rounded-md
                      border border-zinc-800
                      bg-zinc-900/40
                      px-3 py-2.5
                    "
                  >

                    <div className="
                      flex items-center gap-2
                    ">

                      <StepIcon
                        status={step.status}
                      />

                      <span className="
                        text-sm
                        text-zinc-200
                      ">
                        {step.name}
                      </span>

                    </div>


                    <span className="
                      text-xs
                      text-zinc-500
                    ">
                      {step.status}
                    </span>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        {/* VERIFICATION */}

        {healing.verification && (

          <div className="
            rounded-lg
            border border-emerald-500/20
            bg-emerald-500/5
            p-4
          ">

            <div className="
              mb-4
              flex items-center gap-2
            ">

              <CheckCircle
                size={16}
                className="text-emerald-400"
              />

              <h3 className="font-medium">
                Healing Verification
              </h3>

            </div>


            <div className="
              grid grid-cols-2
              gap-4
              md:grid-cols-4
            ">

              <Info
                label="Metric"
                value={
                  healing.verification.metric
                }
              />

              <Info
                label="Before"
                value={
                  healing.verification.before
                }
              />

              <Info
                label="After"
                value={
                  healing.verification.after
                }
              />

              <Info
                label="Result"
                value={
                  healing.verification.result
                }
              />

            </div>

          </div>

        )}

      </div>

    </div>
  )
}


function StepIcon({ status }) {

  switch (status) {

    case 'SUCCESS':
      return (
        <CheckCircle
          size={15}
          className="text-emerald-400"
        />
      )

    case 'FAILED':
      return (
        <XCircle
          size={15}
          className="text-red-400"
        />
      )

    case 'RUNNING':
      return (
        <LoaderCircle
          size={15}
          className="
            animate-spin
            text-blue-400
          "
        />
      )

    default:
      return (
        <Circle
          size={15}
          className="text-zinc-600"
        />
      )
  }
}


function HealingStatus({ status }) {

  let style = `
    border-zinc-700
    bg-zinc-800
    text-zinc-400
  `


  if (status === 'SUCCESS') {

    style = `
      border-emerald-500/30
      bg-emerald-500/10
      text-emerald-400
    `
  }


  if (status === 'FAILED') {

    style = `
      border-red-500/30
      bg-red-500/10
      text-red-400
    `
  }


  if (status === 'RUNNING') {

    style = `
      border-blue-500/30
      bg-blue-500/10
      text-blue-400
    `
  }


  return (
    <span className={`
      rounded
      border
      px-2 py-1
      text-xs
      font-semibold
      ${style}
    `}>
      {status}
    </span>
  )
}


function Info({ label, value }) {

  return (
    <div>

      <p className="
        text-xs uppercase
        tracking-wide
        text-zinc-500
      ">
        {label}
      </p>

      <p className="
        mt-1
        text-sm
        text-zinc-200
      ">
        {value || 'N/A'}
      </p>

    </div>
  )
}