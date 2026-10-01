import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export const toolModules: Record<string, LazyExoticComponent<ComponentType>> = {
  'random-number': lazy(() => import('./random-number/RandomNumberTool')),
  timer: lazy(() => import('./timer/TimerTool')),
  'unit-converter': lazy(() => import('./unit-converter/UnitConverterTool')),
}
