import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals/attribution'
import { track } from './telemetry'

interface Attribution {
  [field: string]: string | number | undefined
}

// Only flat fields: raw entries are large, and URLs can carry a query string.
const logVital = (metric: Metric, attribution: Attribution = {}) =>
  track('web_vital', 'info', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    ...attribution,
  })

// Call once per page load. The attribution build says which element or phase was slow.
export const reportWebVitals = () => {
  onLCP(({ attribution: a, ...metric }) =>
    logVital(metric, {
      target: a.target,
      timeToFirstByte: a.timeToFirstByte,
      resourceLoadDelay: a.resourceLoadDelay,
      resourceLoadDuration: a.resourceLoadDuration,
      elementRenderDelay: a.elementRenderDelay,
    }),
  )
  onINP(({ attribution: a, ...metric }) =>
    logVital(metric, {
      interactionTarget: a.interactionTarget,
      interactionType: a.interactionType,
      inputDelay: a.inputDelay,
      processingDuration: a.processingDuration,
      presentationDelay: a.presentationDelay,
    }),
  )
  onCLS(({ attribution: a, ...metric }) =>
    logVital(metric, {
      largestShiftTarget: a.largestShiftTarget,
      largestShiftValue: a.largestShiftValue,
      loadState: a.loadState,
    }),
  )
  onFCP((metric) => logVital(metric))
  onTTFB((metric) => logVital(metric))
}
