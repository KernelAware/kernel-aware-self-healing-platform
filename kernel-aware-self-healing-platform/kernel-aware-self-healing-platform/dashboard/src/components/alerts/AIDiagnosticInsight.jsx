import React from 'react'

import {
  BrainCircuit,
  Lightbulb,
  Search,
  Sparkles
} from 'lucide-react'


export default function AIDiagnosticInsight({
  insight
}) {

  if (!insight) {
    return null
  }


  return (
    <div className="
      rounded-lg
      border border-purple-500/20
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

          <BrainCircuit
            size={17}
            className="text-purple-400"
          />

          <h2 className="font-semibold">
            AI Diagnostic Insight
          </h2>

        </div>


        <span className="
          flex items-center gap-1
          rounded
          border border-emerald-500/30
          bg-emerald-500/10
          px-2 py-1
          text-xs
          text-emerald-400
        ">

          <Sparkles size={12} />

          {insight.confidence || 'Unknown'}
          {' '}
          Confidence

        </span>

      </div>


      <div className="space-y-5 p-4">


        {/* LIKELY CAUSE */}

        <section>

          <p className="
            mb-2
            text-xs uppercase
            tracking-wide
            text-blue-400
          ">
            Likely Cause
          </p>


          <p className="
            text-sm
            leading-6
            text-zinc-300
          ">
            {insight.likely_cause}
          </p>

        </section>


        {/* EVIDENCE */}

        <section>

          <div className="
            mb-2
            flex items-center gap-2
          ">

            <Search
              size={14}
              className="text-blue-400"
            />

            <p className="
              text-xs uppercase
              tracking-wide
              text-zinc-500
            ">
              Evidence
            </p>

          </div>


          <div className="space-y-2">

            {insight.evidence?.map(
              (item, index) => (

                <div
                  key={index}
                  className="
                    flex gap-2
                    text-sm
                    text-zinc-400
                  "
                >

                  <span className="
                    text-blue-400
                  ">
                    •
                  </span>

                  <span>
                    {item}
                  </span>

                </div>

              )
            )}

          </div>

        </section>


        {/* PREVENTION */}

        <section className="
          rounded-lg
          border border-zinc-800
          bg-zinc-900/40
          p-4
        ">

          <div className="
            mb-3
            flex items-center gap-2
          ">

            <Lightbulb
              size={16}
              className="text-yellow-400"
            />

            <h3 className="
              text-sm
              font-medium
            ">
              Recommended Future Prevention
            </h3>

          </div>


          <div className="space-y-2">

            {insight.recommendations?.map(
              (item, index) => (

                <div
                  key={index}
                  className="
                    flex gap-2
                    text-sm
                    text-zinc-400
                  "
                >

                  <span className="
                    text-emerald-400
                  ">
                    ✓
                  </span>

                  <span>
                    {item}
                  </span>

                </div>

              )
            )}

          </div>

        </section>

      </div>

    </div>
  )
}