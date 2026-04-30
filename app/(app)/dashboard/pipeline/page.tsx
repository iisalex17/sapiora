'use client'

export default function PipelinePage() {
  return (
    <iframe
      src="/static/pipeline.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block'
      }}
      title="Pipeline"
    />
  )
}