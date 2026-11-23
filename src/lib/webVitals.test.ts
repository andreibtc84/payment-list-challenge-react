import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals/attribution'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setTelemetrySink } from './telemetry'
import { reportWebVitals } from './webVitals'

// jsdom lacks the browser performance APIs web-vitals needs.
vi.mock('web-vitals/attribution', () => ({
  onCLS: vi.fn(),
  onFCP: vi.fn(),
  onINP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}))

const baseMetric = {
  value: 1200,
  rating: 'good',
  delta: 1200,
  id: 'v5-1',
  navigationType: 'navigate',
  entries: [{}],
}

describe('reportWebVitals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportWebVitals()
  })

  it('should register each metric exactly once', () => {
    for (const register of [onCLS, onFCP, onINP, onLCP, onTTFB]) {
      expect(register).toHaveBeenCalledOnce()
    }
  })

  // Field names from the web-vitals README and its attribution types.
  it.each([
    [
      'LCP',
      onLCP,
      {
        url: 'https://example.com/hero.png?user=1',
        target: 'h2#payments-heading',
        timeToFirstByte: 100,
        resourceLoadDelay: 0,
        resourceLoadDuration: 0,
        elementRenderDelay: 50,
      },
      {
        target: 'h2#payments-heading',
        timeToFirstByte: 100,
        resourceLoadDelay: 0,
        resourceLoadDuration: 0,
        elementRenderDelay: 50,
      },
    ],
    [
      'INP',
      onINP,
      {
        interactionTarget: 'button.search',
        interactionType: 'pointer',
        inputDelay: 5,
        processingDuration: 30,
        presentationDelay: 10,
        longAnimationFrameEntries: [{}],
      },
      {
        interactionTarget: 'button.search',
        interactionType: 'pointer',
        inputDelay: 5,
        processingDuration: 30,
        presentationDelay: 10,
      },
    ],
    [
      'CLS',
      onCLS,
      { largestShiftTarget: 'table', largestShiftValue: 0.02, loadState: 'complete' },
      { largestShiftTarget: 'table', largestShiftValue: 0.02, loadState: 'complete' },
    ],
    ['FCP', onFCP, { timeToFirstByte: 100 }, {}],
    ['TTFB', onTTFB, { waitingDuration: 10 }, {}],
  ])(
    'should log %s as one web_vital event with its rating and attribution, without raw entries or URLs',
    (name, register, attribution, expectedAttribution) => {
      const sink = vi.fn()
      setTelemetrySink(sink)
      const onReport = vi.mocked(register).mock.calls[0][0] as (metric: unknown) => void

      onReport({ ...baseMetric, name, attribution })

      expect(sink).toHaveBeenCalledOnce()
      const [[event]] = sink.mock.calls
      expect(event).toEqual(
        expect.objectContaining({
          event: 'web_vital',
          level: 'info',
          name,
          value: 1200,
          rating: 'good',
          delta: 1200,
          id: 'v5-1',
          navigationType: 'navigate',
          ...expectedAttribution,
        }),
      )
      expect(event).not.toHaveProperty('entries')
      expect(event).not.toHaveProperty('url')
      expect(event).not.toHaveProperty('longAnimationFrameEntries')
    },
  )
})
