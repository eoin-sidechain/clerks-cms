import React from 'react'
import { Metadata } from 'next'
import PushApplicationLive from './PushApplicationLive'

export const metadata: Metadata = {
  title: 'Push Application Live',
  description: 'Deploy application sections to production quiz templates',
}

export default function PushLivePage() {
  return <PushApplicationLive />
}
